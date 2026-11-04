import { createHash, timingSafeEqual } from "node:crypto";
import express, { type Request, type Response } from "express";
import { recipeInputSchema, recipeListQuerySchema } from "../shared/recipes";
import { getPublishedRecipeBySlug, insertRecipe, listFeaturedRecipes, listRecipes, toSlug } from "./recipeDb";
import { runDailyRecipeGeneration } from "./recipeAgent";

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
