import { createHash, timingSafeEqual } from "node:crypto";
import express, { type Request, type Response } from "express";
import { articleInputSchema } from "../shared/articles";
import {
  ArticleReferenceError,
  ArticleSlugConflictError,
  createArticle,
} from "./articleDb";

const MAX_BODY_BYTES = 1_000_000;

type CreateArticle = typeof createArticle;

type ArticlesRouterOptions = {
  getToken?: () => string | undefined;
  createArticle?: CreateArticle;
};

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
  const dbError = error as { code?: string; constraint?: string };
  return (
    dbError?.code === "23505" && dbError?.constraint === "articles_slug_key"
  );
}

export function createArticlesRouter(options: ArticlesRouterOptions = {}) {
  const router = express.Router();
  const getToken = options.getToken ?? (() => process.env.RECIPES_AGENT_TOKEN);
  const create = options.createArticle ?? createArticle;

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
        res
          .status(409)
          .json({
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
