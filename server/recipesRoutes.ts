import { createHash, timingSafeEqual } from "node:crypto";
import express, { type Request, type Response } from "express";
import { RECIPE_TAXONOMY, recipeInputSchema, recipeListQuerySchema } from "../shared/recipes";
import { getPublishedRecipeBySlug, getRecipeBySlug, insertRecipe, listFeaturedRecipes, listRecipes, publishRecipe, toSlug } from "./recipeDb";
import { runDailyRecipeGeneration } from "./recipeAgent";
import { storagePutPublic } from "./storage";
import { createS3File } from "./db";

const PUBLIC_CACHE = "public, s-maxage=60, stale-while-revalidate=300";

function cachePublic(res: Response) { res.setHeader("Cache-Control", PUBLIC_CACHE); }
function readBearer(req: Request) {
  const value = req.header("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}
function timingSafeTokenEquals(received: string, expected: string) {
  const left = createHash("sha256").update(received).digest();
  const right = createHash("sha256").update(expected).digest();
  return received.length > 0 && timingSafeEqual(left, right);
}
function authorized(req: Request, res: Response, tokenName = "RECIPES_AGENT_TOKEN") {
  const expected = process.env[tokenName];
  if (!expected) { res.status(503).json({ error: "A publicação por agente não está configurada." }); return false; }
  if (!timingSafeTokenEquals(readBearer(req), expected)) { res.status(401).json({ error: "Não autorizado." }); return false; }
  return true;
}
function sanitizeString(value: string): string {
  return value.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<[^>]*>/g, " ").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim();
}
function sanitizeDeep<T>(value: T): T {
  if (typeof value === "string") return sanitizeString(value) as T;
  if (Array.isArray(value)) return value.map((item) => sanitizeDeep(item)) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeDeep(item)])) as T;
  return value;
}
function responseFor(row: any, res: Response, replay = false) {
  if (replay) res.setHeader("Idempotent-Replay", "true");
  res.status(replay ? 200 : 201).json({ ...row, url: `${process.env.PUBLIC_SITE_URL ?? "https://www.chocolicia.site"}/receitas/${row.slug}` });
}

function v1RecipeToInput(body: any) {
  const category = body.category;
  if (typeof category !== "string" || !RECIPE_TAXONOMY[category as keyof typeof RECIPE_TAXONOMY]) throw new Error("category é obrigatória e incompatível com a taxonomia do site");
  if (typeof body.coverImageUrl !== "string" || !body.coverImageUrl.startsWith("https://")) throw new Error("coverImageUrl HTTPS é obrigatória");
  const subcategories = RECIPE_TAXONOMY[category as keyof typeof RECIPE_TAXONOMY];
  const sub = body.subcategorySlug ? subcategories.find((item) => item.slug === body.subcategorySlug) : undefined;
  if (body.subcategorySlug && !sub) throw new Error("A subcategoria não pertence à categoria informada.");
  return recipeInputSchema.parse(sanitizeDeep({
    slug: body.slug ?? toSlug(body.title), title: body.title, excerpt: body.excerpt, category,
    subcategory: sub?.name, subcategorySlug: sub?.slug, tags: body.tags ?? [], coverImageUrl: body.coverImageUrl,
    coverImageAlt: body.coverImageAlt, imagePrompt: body.cover?.imagePrompt ?? "", coverImageVariants: body.coverImageVariants ?? {},
    ingredients: body.ingredients, steps: body.steps, tips: body.tips ?? [], storageNotes: body.storageNotes ?? "", faq: body.faq ?? [],
    prepTimeMin: body.prepTimeMin, cookTimeMin: body.cookTimeMin ?? 0, servings: body.servings, difficulty: body.difficulty,
    status: body.status ?? "draft", aiModel: body.aiModel, generationMeta: body.generationMeta ?? {},
  }));
}

export function createRecipesRouter() {
  const router = express.Router();
  router.get("/featured", async (_req, res) => { try { const rows = await listFeaturedRecipes(); cachePublic(res); res.json(rows); } catch (error) { console.error("[Recipes] featured:", error); res.status(503).json({ error: "As receitas estão temporariamente indisponíveis." }); } });
  router.get("/", async (req, res) => {
    const parsed = recipeListQuerySchema.safeParse(req.query);
    if (!parsed.success) { res.status(400).json({ error: "Parâmetros de pesquisa inválidos." }); return; }
    try { const result = await listRecipes(parsed.data); cachePublic(res); res.json(result); } catch (error) { console.error("[Recipes] list:", error); res.status(503).json({ error: "Não foi possível carregar as receitas." }); }
  });
  const dailyHandler = async (req: Request, res: Response) => {
    const expected = process.env.CRON_SECRET;
    if (!expected) { res.status(503).json({ error: "O cron diário não está configurado." }); return; }
    if (!timingSafeTokenEquals(readBearer(req), expected)) { res.status(401).json({ error: "Não autorizado." }); return; }
    try { const result = await runDailyRecipeGeneration(); res.status(result.status === "failed" ? 500 : 201).json(result); } catch (error) { console.error("[Recipes] daily generation:", error); res.status(500).json({ error: "A geração diária falhou." }); }
  };
  router.get("/generate-daily", dailyHandler); router.post("/generate-daily", dailyHandler);

  router.post("/", async (req, res) => {
    if (!authorized(req, res)) return;
    if (Buffer.byteLength(JSON.stringify(req.body ?? {}), "utf8") > 1_000_000) { res.status(413).json({ error: "O conteúdo excede o limite permitido." }); return; }
    try {
      const isV1 = req.header("x-contract-version") === "1" || Boolean(req.body?.cover);
      const clean = isV1 ? v1RecipeToInput(req.body) : recipeInputSchema.parse(sanitizeDeep(req.body));
      const slug = clean.slug ?? toSlug(clean.title);
      const existing = await getRecipeBySlug(slug);
      if (existing) {
        const oldRun = (existing.generationMeta as Record<string, unknown>)?.run_id;
        const newRun = (clean.generationMeta as Record<string, unknown>)?.run_id;
        if (oldRun && oldRun === newRun) { responseFor(existing, res, true); return; }
        res.status(409).json({ error: "Já existe uma receita com este slug.", code: "slug_conflict" }); return;
      }
      const recipe = await insertRecipe({ ...clean, slug });
      responseFor(recipe, res);
    } catch (error) {
      if (error instanceof Error && (error.message.includes("coverImageUrl") || error.message.includes("category") || error.message.includes("subcategoria"))) { res.status(422).json({ error: error.message, code: "validation_failed" }); return; }
      console.error("[Recipes] create:", error); res.status(400).json({ error: "Receita inválida." });
    }
  });

  router.post("/:slug/publish", async (req, res) => {
    if (!authorized(req, res)) return;
    try { const existing = await getRecipeBySlug(req.params.slug); if (!existing) { res.status(404).json({ error: "Receita não encontrada." }); return; } if (existing.status === "published") { responseFor(existing, res, true); return; } const recipe = await publishRecipe(req.params.slug); responseFor(recipe, res); } catch (error) { console.error("[Recipes] publish:", error); res.status(503).json({ error: "Não foi possível publicar a receita." }); }
  });
  router.get("/:slug/status", async (req, res) => { try { const recipe = await getRecipeBySlug(req.params.slug); if (!recipe) { res.status(404).json({ error: "Receita não encontrada." }); return; } res.json({ id: recipe.id, slug: recipe.slug, status: recipe.status, publishedAt: recipe.publishedAt, url: `${process.env.PUBLIC_SITE_URL ?? "https://www.chocolicia.site"}/receitas/${recipe.slug}` }); } catch { res.status(503).json({ error: "Não foi possível consultar a receita." }); } });
  router.get("/:slug", async (req, res) => { try { const recipe = await getPublishedRecipeBySlug(req.params.slug); if (!recipe) { res.status(404).json({ error: "Receita não encontrada." }); return; } cachePublic(res); res.json(recipe); } catch { res.status(503).json({ error: "Não foi possível carregar a receita." }); } });

  return router;
}

export function createUploadsRouter() {
  const router = express.Router();
  router.post("/", async (req, res) => {
    if (!authorized(req, res)) return;
    try {
      const { fileName, contentType, dataBase64, alt } = req.body ?? {};
      if (typeof fileName !== "string" || typeof contentType !== "string" || !/^image\/(jpeg|png|webp|avif)$/.test(contentType) || typeof dataBase64 !== "string" || typeof alt !== "string") { res.status(400).json({ error: "Upload de imagem inválido." }); return; }
      const data = Buffer.from(dataBase64, "base64");
      if (!data.length || data.length > 8 * 1024 * 1024) { res.status(413).json({ error: "A imagem deve ter entre 1 byte e 8 MB." }); return; }
      const stored = await storagePutPublic(`agent/${fileName.replace(/[^a-zA-Z0-9._-]/g, "-")}`, data, contentType);
      await createS3File({ objectKey: stored.key, fileUrl: stored.url, alt: alt.slice(0, 180), contentType, userId: "agent-chocolicia" });
      res.status(201).json({ key: stored.key, url: stored.url });
    } catch (error) { console.error("[Uploads] agent:", error); res.status(503).json({ error: "Não foi possível armazenar a imagem." }); }
  });
  return router;
}
