import sharp from "sharp";
import { z } from "zod";
import { RECIPE_CATEGORIES, ingredientSectionSchema, recipeFaqSchema, recipeStepSchema } from "../shared/recipes";
import { getAllPublishedRecipeTitles, getPublishedRecipeTitlesSince, insertFailedRecipe, insertRecipe, toSlug } from "./recipeDb";
import { storagePutPublic } from "./storage";

const generatedContentSchema = z.object({
  title: z.string().trim().min(5).max(180),
  excerpt: z.string().trim().min(20).max(160),
  category: z.enum(RECIPE_CATEGORIES),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  coverImageAlt: z.string().trim().min(8).max(240),
  ingredients: z.array(ingredientSectionSchema).min(1).max(20),
  steps: z.array(recipeStepSchema).min(2).max(30),
  tips: z.array(z.string().trim().min(1).max(1000)).max(12).default([]),
  storageNotes: z.string().max(3000).default(""),
  faq: z.array(recipeFaqSchema).max(12).default([]),
  prepTimeMin: z.number().int().min(1).max(1440),
  cookTimeMin: z.number().int().min(0).max(1440).default(0),
  servings: z.number().int().min(1).max(500),
  difficulty: z.enum(["Fácil", "Média", "Difícil"]),
});

const allergenMap: Array<[RegExp, string]> = [
  [/\b(?:leite|manteiga|creme de leite|leite condensado|queijo|iogurte)\b/i, "leite"],
  [/\b(?:ovo|ovos|gema|gemas|clara|claras)\b/i, "ovos"],
  [/\b(?:farinha de trigo|trigo|glúten|biscoito|bolacha)\b/i, "glúten"],
  [/\b(?:castanha|noz|amêndoa|avelã|pistache|macadâmia)\b/i, "castanhas"],
  [/\b(?:amendoim|paçoca)\b/i, "amendoim"],
];
const blockedHealthClaims = /cura\w*|trat\w+ (?:a|o|do|da)|emagrec\w+|anti-?inflamatório|detox|controla (?:a|o) (?:glicemia|diabetes|pressão)/i;
const textModel = process.env.RECIPES_TEXT_MODEL ?? "gpt-4.1-mini";
const imageModel = process.env.RECIPES_IMAGE_MODEL ?? "gpt-image-1";

function apiBase() {
  return (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
}

async function withRetry<T>(name: string, action: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
  throw new Error(`${name}: ${lastError instanceof Error ? lastError.message : "falha externa"}`);
}

function chooseCategory(existing: Array<{ category: string }>) {
  const weekCounts = new Map<string, number>();
  for (const item of existing) weekCounts.set(item.category, (weekCounts.get(item.category) ?? 0) + 1);
  return [...RECIPE_CATEGORIES].sort((left, right) => (weekCounts.get(left) ?? 0) - (weekCounts.get(right) ?? 0))[0];
}

async function generateRecipeJson(existingTitles: Array<{ title: string; category: string; slug: string }>, category: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY não está configurada");
  const prompt = `Crie uma receita original da Chocolícia. A voz é calorosa, artesanal e acolhedora, em português do Brasil. As medidas devem ser em gramas, xícaras e colheres. A receita precisa ser realista e testável numa cozinha doméstica, com dicas de ponto, conservação e substituições. Categoria desejada: ${category}. Não repita nem faça variações dos títulos existentes: ${existingTitles.map((item) => item.title).join("; ") || "nenhum"}. Não copie textos de sites. Não faça alegações ou recomendações médicas/de saúde. Devolva somente um objeto JSON válido, sem Markdown, com: title, excerpt (até 160 caracteres), category (uma destas exatamente: ${RECIPE_CATEGORIES.join(" | ")}), tags, coverImageAlt, ingredients (array de grupos {name,items:[{quantity,unit,name,note?}]}), steps (array {title?,instruction}), tips (array), storageNotes, faq (array {question,answer}), prepTimeMin, cookTimeMin, servings e difficulty (Fácil, Média ou Difícil). Inclua tempos plausíveis, no mínimo dois passos detalhados e quantidades completas.`;
  const response = await fetch(`${apiBase()}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: textModel,
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Você é a redatora culinária da Chocolícia. Gere conteúdo original e seguro. Responda sempre apenas JSON válido e nunca ofereça alegações médicas." },
        { role: "user", content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(35_000),
  });
  if (!response.ok) throw new Error(`Modelo de texto respondeu HTTP ${response.status}`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string | null } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("A resposta do modelo de texto veio vazia");
  const parsed = generatedContentSchema.parse(JSON.parse(content));
  const allText = JSON.stringify(parsed);
  if (blockedHealthClaims.test(allText)) throw new Error("Conteúdo com alegação médica/de saúde bloqueado");
  const detected = allergenMap.filter(([pattern]) => pattern.test(allText)).map(([, label]) => label);
  if (detected.length) {
    const warning = `Atenção a alergênicos: esta receita contém ${detected.join(", ")}. Verifique os rótulos dos ingredientes e evite contaminação cruzada.`;
    if (!parsed.tips.some((tip) => tip.toLowerCase().includes("alergên"))) parsed.tips.push(warning);
  }
  return parsed;
}

async function generateImage(prompt: string): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY não está configurada");
  const response = await fetch(`${apiBase()}/images/generations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: imageModel, prompt, size: "1536x1024", quality: "medium", output_format: "png" }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`Modelo de imagem respondeu HTTP ${response.status}`);
  const payload = await response.json() as { data?: Array<{ b64_json?: string }> };
  const encoded = payload.data?.[0]?.b64_json;
  if (!encoded) throw new Error("O modelo de imagem não devolveu a imagem codificada");
  return Buffer.from(encoded, "base64");
}

async function storeVariants(title: string, image: Buffer) {
  const slug = toSlug(title) || `receita-${Date.now()}`;
  const sizes = [480, 800, 1280] as const;
  const variants: { w480?: string; w800?: string; w1280?: string; avif480?: string; avif800?: string; avif1280?: string } = {};
  for (const width of sizes) {
    const resized = sharp(image).resize({ width, withoutEnlargement: true });
    const [webp, avif] = await Promise.all([
      resized.clone().webp({ quality: 82 }).toBuffer(),
      resized.clone().avif({ quality: 55, effort: 4 }).toBuffer(),
    ]);
    const [webpObject, avifObject] = await Promise.all([
      storagePutPublic(`recipes/${slug}-${width}.webp`, webp, "image/webp"),
      storagePutPublic(`recipes/${slug}-${width}.avif`, avif, "image/avif"),
    ]);
    variants[`w${width}` as "w480" | "w800" | "w1280"] = webpObject.url;
    variants[`avif${width}` as "avif480" | "avif800" | "avif1280"] = avifObject.url;
  }
  return variants;
}

export async function runDailyRecipeGeneration() {
  const publishedSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [allPublished, recent] = await Promise.all([
    getAllPublishedRecipeTitles(),
    getPublishedRecipeTitlesSince(publishedSince),
  ]);
  const category = chooseCategory(recent);
  let draftTitle = `Receita Chocolícia ${new Date().toISOString().slice(0, 10)}`;
  let aiModel: string | undefined = textModel;
  try {
    const content = await withRetry("geração de texto", () => generateRecipeJson(allPublished, category));
    draftTitle = content.title;
    const slug = toSlug(content.title);
    if (!slug) throw new Error("Não foi possível gerar o slug da receita");
    const duplicate = allPublished.some((item) => item.title.toLowerCase() === content.title.toLowerCase() || item.slug === slug);
    if (duplicate) throw new Error("Receita repetida: título/slug já publicado");
    const imagePrompt = `Fotografia gastronômica artesanal, close-up editorial da receita ${content.title}. ${content.coverImageAlt}. Luz natural suave, tons quentes, louça simples, fundo creme e marrom, textura apetitosa e realista, composição acolhedora de confeitaria caseira, foco nítido no doce. Sem texto, sem logotipos, sem marcas, sem pessoas.`;
    const image = await withRetry("geração de imagem", () => generateImage(imagePrompt), 2);
    const variants = await storeVariants(content.title, image);
    const coverImageUrl = variants.w1280 ?? variants.w800 ?? variants.w480;
    if (!coverImageUrl) throw new Error("Não foi possível armazenar a imagem gerada");
    const status = process.env.AUTO_PUBLISH?.toLowerCase() === "false" ? "draft" : "published";
    const recipe = await insertRecipe({
      ...content,
      slug,
      coverImageUrl,
      coverImageVariants: variants,
      imagePrompt,
      status,
      publishedAt: status === "published" ? new Date() : undefined,
      aiModel,
      generationMeta: { generatedAt: new Date().toISOString(), textModel, imageModel, categoryChosen: category, source: "daily-cron" },
    });
    return { status: recipe.status, slug: recipe.slug, title: recipe.title, publishedAt: recipe.publishedAt };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Falha desconhecida";
    console.error("[RecipeAgent] failed:", detail);
    try {
      const failedSlug = `${(toSlug(draftTitle) || "receita").slice(0, 150)}-falha-${Date.now()}`.slice(0, 180);
      await insertFailedRecipe({ slug: failedSlug, title: draftTitle, error: detail, aiModel });
    } catch (auditError) {
      console.error("[RecipeAgent] failed to audit error:", auditError);
    }
    return { status: "failed" as const, title: draftTitle, error: detail };
  }
}
