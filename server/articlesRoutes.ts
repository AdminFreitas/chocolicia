import { createHash, timingSafeEqual } from "node:crypto";
import express, { type Request, type Response } from "express";
import { z } from "zod";
import { articleInputSchema } from "../shared/articles";
import {
  ArticleReferenceError,
  ArticleSlugConflictError,
  createArticle,
  getPublishedTipBySlug,
  InvalidTipCursorError,
  listActiveTipTopics,
  listPublishedTips,
  type TipArticleDetail,
  type TipListParams,
  type TipListResult,
  type TipTopicSummary,
} from "./articleDb";

const MAX_BODY_BYTES = 1_000_000;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type CreateArticle = typeof createArticle;

type ArticlesRouterOptions = {
  getToken?: () => string | undefined;
  createArticle?: CreateArticle;
  listTipTopics?: () => Promise<TipTopicSummary[]>;
  listTips?: (params: TipListParams) => Promise<TipListResult>;
  getTip?: (slug: string) => Promise<TipArticleDetail | null>;
};

const tipsQuerySchema = z.object({
  topic: z.string().trim().min(1).max(180).regex(SLUG_PATTERN).optional(),
  limit: z.coerce.number().int().min(1).max(24).default(12),
  cursor: z.string().trim().min(1).max(512).optional(),
}).strict();

function timingSafeTokenEquals(received: string, expected: string) {
  const receivedDigest = createHash("sha256").update(received).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return received.length > 0 && timingSafeEqual(receivedDigest, expectedDigest);
}

function readBearer(req: Request) {
  const value = req.header("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

function isSlugUniqueViolation(error: unknown) {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth += 1) {
    const dbError = current as {
      code?: string;
      constraint?: string;
      constraint_name?: string;
      cause?: unknown;
    };
    const constraint = dbError.constraint_name ?? dbError.constraint;
    if (dbError.code === "23505" && constraint === "articles_slug_key") {
      return true;
    }
    current = dbError.cause;
  }
  return false;
}

function logPublicReadError(label: string, error: unknown) {
  console.error(
    "[Articles] " + label + " failed:",
    error instanceof Error ? error.name : "UnknownError"
  );
}

export function createArticlesRouter(options: ArticlesRouterOptions = {}) {
  const router = express.Router();
  const getToken = options.getToken ?? (() => process.env.RECIPES_AGENT_TOKEN);
  const create = options.createArticle ?? createArticle;
  const listTopics = options.listTipTopics ?? listActiveTipTopics;
  const listTips = options.listTips ?? listPublishedTips;
  const getTip = options.getTip ?? getPublishedTipBySlug;

  router.get("/topics", async (_req: Request, res: Response) => {
    try {
      const items = await listTopics();
      res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
      res.json({ items });
    } catch (error) {
      logPublicReadError("topics read", error);
      res.status(503).json({
        error: {
          code: "server_error",
          message: "Não foi possível carregar os assuntos das dicas.",
        },
      });
    }
  });

  router.get("/", async (req: Request, res: Response) => {
    const parsed = tipsQuerySchema.safeParse({
      topic: req.query.topic,
      limit: req.query.limit ?? 12,
      cursor: req.query.cursor,
    });
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: "invalid_query",
          message: "Os filtros de dicas são inválidos.",
        },
      });
      return;
    }

    try {
      const page = await listTips(parsed.data);
      res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
      res.json(page);
    } catch (error) {
      if (error instanceof InvalidTipCursorError) {
        res.status(400).json({
          error: {
            code: "invalid_cursor",
            message: "O cursor de paginação é inválido.",
          },
        });
        return;
      }
      logPublicReadError("public list", error);
      res.status(503).json({
        error: {
          code: "server_error",
          message: "Não foi possível carregar as dicas.",
        },
      });
    }
  });

  router.get("/:slug", async (req: Request, res: Response) => {
    const slug = String(req.params.slug);
    if (!SLUG_PATTERN.test(slug)) {
      res.status(404).json({
        error: { code: "not_found", message: "Dica não encontrada." },
      });
      return;
    }

    try {
      const article = await getTip(slug);
      if (!article) {
        res.status(404).json({
          error: { code: "not_found", message: "Dica não encontrada." },
        });
        return;
      }
      res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
      res.json(article);
    } catch (error) {
      logPublicReadError("public detail", error);
      res.status(503).json({
        error: {
          code: "server_error",
          message: "Não foi possível carregar esta dica.",
        },
      });
    }
  });

  router.post("/", async (req: Request, res: Response) => {
    const expected = getToken();
    if (!expected) {
      res
        .status(503)
        .json({ error: "A autenticação do endpoint não está configurada." });
      return;
    }

    const received = readBearer(req);
    if (!received) {
      res.status(401).json({ error: "É necessário enviar um token Bearer." });
      return;
    }
    if (!timingSafeTokenEquals(received, expected)) {
      res.status(403).json({ error: "Token inválido." });
      return;
    }

    const bodyBytes = Buffer.byteLength(JSON.stringify(req.body ?? {}), "utf8");
    if (bodyBytes > MAX_BODY_BYTES) {
      res.status(413).json({ error: "O conteúdo excede o limite permitido." });
      return;
    }

    const parsed = articleInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Artigo inválido.", details: parsed.error.flatten() });
      return;
    }

    try {
      const article = await create(parsed.data);
      res.status(201).json({
        id: article.id,
        title: article.title,
        slug: article.slug,
        articleType: article.articleType,
        status: article.status,
        publishedAt: article.publishedAt,
        tags: article.tags,
        images: article.images,
      });
    } catch (error) {
      if (
        error instanceof ArticleSlugConflictError ||
        isSlugUniqueViolation(error)
      ) {
        res.status(409).json({
          error: "Já existe um artigo com este slug.",
          code: "duplicate_slug",
        });
        return;
      }
      if (error instanceof ArticleReferenceError) {
        res.status(422).json({ error: error.message, code: error.code });
        return;
      }
      console.error("[Articles] create failed.");
      res.status(500).json({ error: "Não foi possível criar o artigo." });
    }
  });

  return router;
}
