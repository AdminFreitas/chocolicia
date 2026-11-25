import { createHash, timingSafeEqual } from "node:crypto";
import express, { type Request, type Response } from "express";
import { RECIPE_TAXONOMY, recipeInputSchema, recipeInputSchemaV1, recipeListQuerySchema } from "../shared/recipes";
import { getAgentRecipeByIdempotencyKey, getAgentRecipeByTopicSlug, getPublishedRecipeBySlug, insertRecipe, listFeaturedRecipes, listRecipes, toSlug, countAgentRecipesSince } from "./recipeDb";
import { runDailyRecipeGeneration } from "./recipeAgent";
import { agentError, agentTokensConfigured, hashRequest, publishingAllowed, requestId, requireV1, resolveAgentScope } from "./agentAuth";
import { processAgentCover } from "./agentImages";

const PUBLIC_CACHE = "public, s-maxage=60, stale-while-revalidate=300";

function cachePublic(res: Response) {
  res.setHeader("Cache-Control", PUBLIC_CACHE);
}

function timingSafeTokenEquals(received: string, expected: string) {
  const left = createHash("sha256").update(received).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right) && received.length > 0;
}

function readBearer(req: Request) {
  const value = req.header("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

function sanitizeString(value: string): string {
  return value.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<[^>]*>/g, " ").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ").trim();
}

function sanitizeDeep<T>(value: T): T {
  if (typeof value === "string") return sanitizeString(value) as T;
  if (Array.isArray(value)) return value.map((item) => sanitizeDeep(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeDeep(item)])) as T;
  }
  return value;
}

function slugify(title: string) {
  return toSlug(title);
}

function publicRecipe<T>(row: T): T {
  return row;
}

const V1_RECIPE_CATEGORIES: Record<string, { category: string; subcategory: string }> = {
  "bolos-simples": { category: "Bolos", subcategory: "Bolos simples" },
  "brigadeiros-e-docinhos": { category: "Brigadeiros e docinhos", subcategory: "Brigadeiros e docinhos" },
  "trufas-e-bombons": { category: "Chocolates", subcategory: "Trufas e bombons" },
  "doces-de-colher": { category: "Sobremesas", subcategory: "Doces de colher" },
};

function saoPauloDayStart(): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), 3));
}

function configuredCap(name: string, fallback: number): number | null {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

async function createV1Recipe(req: Request, res: Response) {
  requestId(req, res);
  if (!requireV1(req, res)) return;
  if (!agentTokensConfigured()) {
    agentError(res, 503, "agent_auth_not_configured", "A autenticação do agente não está configurada.");
    return;
  }
  const scope = resolveAgentScope(req);
  if (!scope) {
    agentError(res, 401, "unauthorized", "Não autorizado.");
    return;
  }
  const idempotencyKey = req.header("idempotency-key")?.trim() ?? "";
  if (!/^[a-f0-9]{64}$/i.test(idempotencyKey)) {
    agentError(res, 400, "idempotency_key_required", "Idempotency-Key deve conter um SHA-256 hexadecimal.");
    return;
  }
  const contentLength = Number(req.header("content-length") ?? 0);
  if (Math.max(contentLength, Buffer.byteLength(JSON.stringify(req.body ?? {}), "utf8")) > 1_000_000) {
    agentError(res, 413, "payload_too_large", "O conteúdo excede o limite permitido.");
    return;
  }
  const parsed = recipeInputSchemaV1.safeParse(req.body);
  if (!parsed.success) {
    agentError(res, 400, "validation_failed", "Receita inválida.", parsed.error.issues.map((issue) => ({
      field: issue.path.join("."),
      issue: issue.message,
    })));
    return;
  }
  const clean = sanitizeDeep(parsed.data);
  const requestHash = hashRequest(clean);
  // A autorização do status precisa ocorrer antes do replay idempotente.
  if (!publishingAllowed(scope, clean.status, res)) return;
  try {
    const prior = await getAgentRecipeByIdempotencyKey(idempotencyKey);
    if (prior) {
      if (prior.agentRequestHash !== requestHash) {
        agentError(res, 422, "idempotency_key_reuse", "A mesma chave foi usada com outro conteúdo.");
        return;
      }
      res.setHeader("Idempotent-Replay", "true");
      res.status(201).json({
        id: prior.id,
        title: prior.title,
        slug: prior.slug,
        status: prior.status,
        url: `${req.protocol}://${req.get("host")}/receitas/${encodeURIComponent(prior.slug)}`,
      });
      return;
    }

    const topicSlug = String(clean.generationMeta.topic_slug ?? "");
    const runId = String(clean.generationMeta.run_id ?? "");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(topicSlug) || !runId) {
      agentError(res, 400, "validation_failed", "generationMeta precisa conter run_id e topic_slug válidos.");
      return;
    }
    const taxonomy = V1_RECIPE_CATEGORIES[clean.subcategorySlug];
    if (!taxonomy) {
      agentError(res, 422, "subcategory_not_enabled", "A subcategoria não está habilitada para recebimento.");
      return;
    }
    const dayStart = saoPauloDayStart();
    const cap = clean.status === "published"
      ? configuredCap("AGENT_DAILY_CAP_RECIPES", 1)
      : configuredCap("AGENT_DAILY_CAP_DRAFTS", 3);
    if (cap === null) {
      agentError(res, 503, "invalid_configuration", "O limite diário de conteúdo está inválido.");
      return;
    }
    const count = await countAgentRecipesSince(clean.status, dayStart);
    if (count >= cap) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((dayStart.getTime() + 86_400_000 - Date.now()) / 1000))));
      agentError(res, 429, "daily_cap_reached", "O limite diário de receitas foi atingido.");
      return;
    }
    const existing = await getAgentRecipeByTopicSlug(topicSlug);
    if (existing) {
      agentError(res, 409, "topic_exists", "Já existe conteúdo para esta pauta.");
      return;
    }
    const slug = clean.slug ?? toSlug(clean.title);
    if (!slug) {
      agentError(res, 400, "validation_failed", "Não foi possível gerar o slug da receita.");
      return;
    }
    let image;
    try {
      image = await processAgentCover(clean.cover, slug);
    } catch (error) {
      console.error("[Recipes] v1 image processing failed:", typeName(error), res.getHeader("X-Request-Id"));
      agentError(res, 422, "image_processing_failed", "A imagem não pôde ser validada e armazenada.");
      return;
    }
    const generationMeta = {
      ...clean.generationMeta,
      contractV1: {
        intro: clean.intro ?? null,
        restTimeMin: clean.restTimeMin,
        yieldLabel: clean.yieldLabel ?? null,
        diet: clean.diet,
        occasions: clean.occasions,
        collections: clean.collections,
        cover: image.source,
      },
    };
    const recipe = await insertRecipe({
      slug,
      title: clean.title,
      excerpt: clean.excerpt,
      category: taxonomy.category as Parameters<typeof insertRecipe>[0]["category"],
      subcategory: taxonomy.subcategory,
      subcategorySlug: clean.subcategorySlug,
      tags: clean.tags,
      coverImageUrl: image.url,
      coverImageAlt: clean.coverImageAlt,
      imagePrompt: clean.cover.mode === "generate" ? clean.cover.imagePrompt : "",
      coverImageVariants: image.variants,
      ingredients: clean.ingredients.map((section) => ({
        name: section.name,
        items: section.items.map(({ ingredientSlug: _ingredientSlug, ...item }) => item),
      })),
      steps: clean.steps,
      tips: clean.tips,
      storageNotes: clean.storageNotes,
      faq: clean.faq,
      prepTimeMin: clean.prepTimeMin,
      cookTimeMin: clean.cookTimeMin,
      servings: clean.servings,
      difficulty: clean.difficulty,
      status: clean.status,
      aiModel: clean.aiModel,
      generationMeta,
    }, { topicSlug, idempotencyKey, requestHash });
    res.status(201).json({
      id: recipe.id,
      title: recipe.title,
      slug: recipe.slug,
      status: recipe.status,
      publishedAt: recipe.publishedAt,
      url: `${req.protocol}://${req.get("host")}/receitas/${encodeURIComponent(recipe.slug)}`,
    });
  } catch (error) {
    const dbError = error as { code?: string };
    if (dbError.code === "23505") {
      // Duas tentativas idênticas podem chegar juntas. A constraint única e
      // esta releitura transformam a segunda resposta em replay seguro.
      const prior = await getAgentRecipeByIdempotencyKey(idempotencyKey).catch(() => null);
      if (prior) {
        if (prior.agentRequestHash !== requestHash) {
          agentError(res, 422, "idempotency_key_reuse", "A mesma chave foi usada com outro conteúdo.");
          return;
        }
        res.setHeader("Idempotent-Replay", "true");
        res.status(201).json({
          id: prior.id,
          title: prior.title,
          slug: prior.slug,
          status: prior.status,
          url: `${req.protocol}://${req.get("host")}/receitas/${encodeURIComponent(prior.slug)}`,
        });
        return;
      }
      agentError(res, 409, "topic_exists", "Já existe conteúdo com esta pauta ou chave idempotente.");
      return;
    }
    console.error("[Recipes] v1 create failed:", typeName(error), res.getHeader("X-Request-Id"));
    agentError(res, 503, "server_error", "Não foi possível guardar a receita.");
  }
}

function typeName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

export function createRecipesRouter() {
  const router = express.Router();

  router.get("/featured", async (_req, res) => {
    try {
      const rows = await listFeaturedRecipes();
      cachePublic(res);
      res.json(rows.map(publicRecipe));
    } catch (error) {
      console.error("[Recipes] featured:", error);
      res.status(503).json({ error: "As receitas estão temporariamente indisponíveis." });
    }
  });

  router.get("/", async (req, res) => {
    const parsed = recipeListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Parâmetros de pesquisa inválidos." });
      return;
    }
    try {
      const { items, nextCursor } = await listRecipes(parsed.data);
      cachePublic(res);
      res.json({ items: items.map(publicRecipe), nextCursor });
    } catch (error) {
      if (error instanceof Error && error.message === "Cursor inválido") {
        res.status(400).json({ error: error.message });
        return;
      }
      console.error("[Recipes] list:", error);
      res.status(503).json({ error: "Não foi possível carregar as receitas." });
    }
  });

  const dailyHandler = async (req: Request, res: Response) => {
    const expected = process.env.CRON_SECRET;
    if (!expected) {
      res.status(503).json({ error: "O cron diário não está configurado." });
      return;
    }
    if (!timingSafeTokenEquals(readBearer(req), expected)) {
      res.status(401).json({ error: "Não autorizado." });
      return;
    }
    try {
      const result = await runDailyRecipeGeneration();
      res.status(result.status === "failed" ? 500 : 201).json(result);
    } catch (error) {
      console.error("[Recipes] daily generation:", error);
      res.status(500).json({ error: "A geração diária falhou." });
    }
  };

  router.get("/generate-daily", dailyHandler);
  router.post("/generate-daily", dailyHandler);

  router.post("/", async (req, res) => {
    if (req.header("x-contract-version") !== undefined) {
      await createV1Recipe(req, res);
      return;
    }
    const expected = process.env.RECIPES_AGENT_TOKEN;
    if (!expected) {
      res.status(503).json({ error: "A publicação por agente não está configurada." });
      return;
    }
    if (!timingSafeTokenEquals(readBearer(req), expected)) {
      res.status(401).json({ error: "Não autorizado." });
      return;
    }
    const contentLength = Number(req.header("content-length") ?? 0);
    const parsedLength = Buffer.byteLength(JSON.stringify(req.body ?? {}), "utf8");
    if (Math.max(contentLength, parsedLength) > 1_000_000) {
      res.status(413).json({ error: "O conteúdo excede o limite permitido." });
      return;
    }
    const parsed = recipeInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Receita inválida.", details: parsed.error.flatten() });
      return;
    }
    const clean = sanitizeDeep(parsed.data);
    if (clean.subcategorySlug) {
      const subcategories = RECIPE_TAXONOMY[clean.category] ?? [];
      const subcategory = subcategories.find((item) => item.slug === clean.subcategorySlug);
      if (!subcategory) {
        res.status(422).json({ error: "A subcategoria não pertence à categoria informada.", code: "invalid_subcategory" });
        return;
      }
      clean.subcategory = subcategory.name;
    }
    const imageUrl = new URL(clean.coverImageUrl);
    if (imageUrl.protocol !== "https:" && imageUrl.protocol !== "http:") {
      res.status(400).json({ error: "A imagem precisa de um URL HTTP ou HTTPS." });
      return;
    }
    const slug = clean.slug ?? slugify(clean.title);
    if (!slug) {
      res.status(400).json({ error: "Não foi possível gerar o slug da receita." });
      return;
    }
    try {
      const recipe = await insertRecipe({ ...clean, slug });
      res.status(201).json(recipe);
    } catch (error) {
      const dbError = error as { code?: string };
      if (dbError.code === "23505") {
        res.status(409).json({ error: "Já existe uma receita com este slug." });
        return;
      }
      console.error("[Recipes] create:", error);
      res.status(503).json({ error: "Não foi possível guardar a receita." });
    }
  });

  router.get("/:slug", async (req, res) => {
    const slug = String(req.params.slug);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      res.status(404).json({ error: "Receita não encontrada." });
      return;
    }
    try {
      const recipe = await getPublishedRecipeBySlug(slug);
      if (!recipe) {
        res.status(404).json({ error: "Receita não encontrada." });
        return;
      }
      cachePublic(res);
      res.json(recipe);
    } catch (error) {
      console.error("[Recipes] detail:", error);
      res.status(503).json({ error: "Não foi possível carregar esta receita." });
    }
  });

  return router;
}
