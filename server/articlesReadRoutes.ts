import express from "express";
import { TIP_TOPICS } from "../shared/tipTopics";
import { isArticleType, listPublishedArticles } from "./articlesReadDb";
import type { PublishedArticleSummary } from "../shared/tipTopics";

type ListArticles = (limit: number, contentType?: "article" | "tip" | "technique" | "news") => Promise<PublishedArticleSummary[]>;

function parseLimit(value: unknown): number | null {
  if (value === undefined) return 24;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const limit = Number(value);
  return Number.isInteger(limit) && limit >= 1 && limit <= 24 ? limit : null;
}

export function createArticlesReadRouter(options: { listArticles?: ListArticles } = {}) {
  const router = express.Router();
  const loadArticles = options.listArticles ?? listPublishedArticles;

  router.get("/topics", (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json({ items: TIP_TOPICS });
  });

  router.get("/", async (req, res) => {
    const limit = parseLimit(req.query.limit);
    const typeValue = req.query.type;
    if (limit === null || (typeValue !== undefined && (typeof typeValue !== "string" || !isArticleType(typeValue)))) {
      res.status(400).json({ error: { code: "invalid_query", message: "Parâmetros de consulta inválidos." } });
      return;
    }
    const type = typeof typeValue === "string" ? typeValue : undefined;

    try {
      const items = await loadArticles(limit, type);
      res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
      res.json({ items });
    } catch (error) {
      console.error("[Articles] list failed:", error instanceof Error ? error.name : "UnknownError");
      res.status(503).json({ error: { code: "server_error", message: "Não foi possível carregar as dicas." } });
    }
  });

  return router;
}
