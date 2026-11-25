import express, { type Response } from "express";
import { articleInputSchema, TIP_TOPICS } from "../shared/articles";
import { agentError, agentTokensConfigured, hashRequest, publishingAllowed, requestId, requireV1, resolveAgentScope } from "./agentAuth";
import { processAgentCover } from "./agentImages";
import {
  countAgentArticlesSince,
  countPublishedTipsSince,
  getArticleByIdempotencyKey,
  getArticleByTopicSlug,
  getPublishedArticleBySlug,
  insertArticle,
  listPublishedArticles,
} from "./articlesDb";
import { toSlug } from "./recipeDb";

const MEDICAL_CLAIMS = /\b(?:cura|curar|emagrece|emagrecimento|detox|medicinal|terap[eê]utico|previne\s+(?:doenças?|diabetes|câncer)|trata\s+(?:doenças?|diabetes|câncer)|tratamento\s+de\s+(?:doenças?|diabetes|câncer))\b/i;

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

function cap(name: string, fallback: number): number | null {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function articleUrl(slug: string): string {
  const base = (process.env.SITE_PUBLIC_URL ?? "https://www.chocolicia.site").replace(/\/$/, "");
  return `${base}/dicas/${encodeURIComponent(slug)}`;
}

export function createArticlesRouter() {
  const router = express.Router();

  router.get("/topics", (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json({
      items: TIP_TOPICS.map((topic) => ({
        slug: topic.slug,
        name: topic.name,
        active: true,
      })),
    });
  });

  router.get("/coverage", (req, res) => {
    if (!agentTokensConfigured()) {
      agentError(res, 503, "agent_auth_not_configured", "A autenticação do agente não está configurada.");
      return;
    }
    if (!resolveAgentScope(req)) {
      agentError(res, 401, "unauthorized", "Não autorizado.");
      return;
    }
    countPublishedTipsSince(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .then((publishedTipsThisWeek) => res.setHeader("Cache-Control", "no-store").json({ publishedTipsThisWeek }))
      .catch((error: unknown) => {
        console.error("[Articles] coverage failed:", error instanceof Error ? error.name : "UnknownError");
        agentError(res, 503, "server_error", "Não foi possível consultar a cadência.");
      });
  });

  router.get("/", async (_req, res) => {
    try {
      res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
      res.json({ items: await listPublishedArticles(24) });
    } catch (error) {
      console.error("[Articles] list failed:", error instanceof Error ? error.name : "UnknownError");
      res.status(503).json({ error: { code: "server_error", message: "Não foi possível carregar as dicas." } });
    }
  });

  router.post("/", async (req, res) => {
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
    const parsed = articleInputSchema.safeParse(req.body);
    if (!parsed.success) {
      agentError(res, 400, "validation_failed", "Artigo inválido.", parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        issue: issue.message,
      })));
      return;
    }
    const clean = parsed.data;
    const requestHash = hashRequest(clean);
    // Não permitir replay de conteúdo publicado com token de rascunho.
    if (!publishingAllowed(scope, clean.status, res)) return;
    try {
      const prior = await getArticleByIdempotencyKey(idempotencyKey);
      if (prior) {
        const priorRequestHash = typeof prior.generationMeta?.agent_request_hash === "string"
          ? prior.generationMeta.agent_request_hash
          : null;
        if (priorRequestHash !== requestHash) {
          agentError(res, 422, "idempotency_key_reuse", "A mesma chave foi usada com outro conteúdo.");
          return;
        }
        res.setHeader("Idempotent-Replay", "true");
        res.status(201).json({ id: prior.id, slug: prior.slug, status: prior.status, url: articleUrl(prior.slug) });
        return;
      }

      const meta = clean.generationMeta;
      const topicSlug = String(meta.topic_slug ?? "");
      const runId = String(meta.run_id ?? "");
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(topicSlug) || !runId) {
        agentError(res, 400, "validation_failed", "generationMeta precisa conter run_id e topic_slug válidos.");
        return;
      }
      if (clean.type !== "tip" || !clean.tipTopic || !TIP_TOPICS.some((topic) => topic.slug === clean.tipTopic)) {
        agentError(res, 422, "topic_not_enabled", "Somente assuntos de dica habilitados podem ser recebidos nesta fase.");
        return;
      }
      if (/<\/?[a-z][^>]*>/i.test(clean.bodyMd) || MEDICAL_CLAIMS.test(clean.bodyMd)) {
        agentError(res, 422, "content_rejected", "O conteúdo contém marcação HTML ou alegação médica não permitida.");
        return;
      }
      const approvedModels = (process.env.AGENT_APPROVED_MODELS ?? "").split(",").map((item) => item.trim()).filter(Boolean);
      if (clean.status === "published" && (!approvedModels.length || !approvedModels.includes(clean.aiModel))) {
        agentError(res, 403, "model_not_approved", "O modelo informado não está aprovado para publicação.");
        return;
      }

      const dayStart = saoPauloDayStart();
      const draftCap = cap("AGENT_DAILY_CAP_DRAFTS", 3);
      const articleCap = cap("AGENT_DAILY_CAP_ARTICLES", 2);
      if (draftCap === null || articleCap === null) {
        agentError(res, 503, "invalid_configuration", "O limite de artigos está inválido.");
        return;
      }
      if (clean.status === "draft" && await countAgentArticlesSince("draft", dayStart) >= draftCap) {
        agentError(res, 429, "daily_cap_reached", "O limite diário de rascunhos foi atingido.");
        return;
      }
      if (clean.status === "published" && (
        await countAgentArticlesSince("published", dayStart) >= articleCap ||
        await countPublishedTipsSince(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) >= 2
      )) {
        agentError(res, 429, "daily_cap_reached", "O limite de publicação de dicas foi atingido.");
        return;
      }
      if (await getArticleByTopicSlug(topicSlug)) {
        agentError(res, 409, "topic_exists", "Já existe conteúdo para esta pauta.");
        return;
      }
      const slug = clean.slug ?? toSlug(clean.title);
      if (!slug) {
        agentError(res, 400, "validation_failed", "Não foi possível gerar o slug do artigo.");
        return;
      }
      let cover;
      try {
        cover = await processAgentCover(clean.cover, slug);
      } catch (error) {
        console.error("[Articles] image processing failed:", error instanceof Error ? error.name : "UnknownError", res.getHeader("X-Request-Id"));
        agentError(res, 422, "image_processing_failed", "A imagem não pôde ser validada e armazenada.");
        return;
      }
      const article = await insertArticle({ ...clean, slug }, cover, { topicSlug, idempotencyKey, requestHash });
      res.status(201).json({ id: article.id, slug: article.slug, status: article.status, url: articleUrl(article.slug) });
    } catch (error) {
      const dbError = error as { code?: string };
      if (dbError.code === "23505") {
        // Releitura após conflito de índice: mesma chave e mesmo corpo = replay.
        const prior = await getArticleByIdempotencyKey(idempotencyKey).catch(() => null);
        if (prior) {
          const priorRequestHash = typeof prior.generationMeta?.agent_request_hash === "string"
            ? prior.generationMeta.agent_request_hash
            : null;
          if (priorRequestHash !== requestHash) {
            agentError(res, 422, "idempotency_key_reuse", "A mesma chave foi usada com outro conteúdo.");
            return;
          }
          res.setHeader("Idempotent-Replay", "true");
          res.status(201).json({ id: prior.id, slug: prior.slug, status: prior.status, url: articleUrl(prior.slug) });
          return;
        }
        agentError(res, 409, "topic_exists", "Já existe conteúdo com esta pauta ou chave idempotente.");
        return;
      }
      if (error instanceof Error && /não encontrada|não encontrado|inativo|AGENT_AUTHOR_ID|tags não foram encontradas/.test(error.message)) {
        agentError(res, 422, "editorial_reference_invalid", "Uma referência editorial não existe ou não está configurada.");
        return;
      }
      if (error instanceof Error && /não encontrada|Categoria é obrigatória|tags não foram encontradas|AGENT_AUTHOR_ID/.test(error.message)) {
        agentError(res, 422, "editorial_reference_invalid", "Uma referência editorial não existe ou não está configurada.");
        return;
      }
      console.error("[Articles] create failed:", error instanceof Error ? error.name : "UnknownError", res.getHeader("X-Request-Id"));
      agentError(res, 503, "server_error", "Não foi possível guardar a dica.");
    }
  });

  router.get("/:slug", async (req, res) => {
    const slug = String(req.params.slug);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      res.status(404).json({ error: { code: "not_found", message: "Dica não encontrada." } });
      return;
    }
    try {
      const article = await getPublishedArticleBySlug(slug);
      if (!article) {
        res.status(404).json({ error: { code: "not_found", message: "Dica não encontrada." } });
        return;
      }
      res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
      res.json(article);
    } catch (error) {
      console.error("[Articles] detail failed:", error instanceof Error ? error.name : "UnknownError");
      res.status(503).json({ error: { code: "server_error", message: "Não foi possível carregar esta dica." } });
    }
  });

  return router;
}
