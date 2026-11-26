import express, { type Request, type Response } from "express";
import { TIP_TOPICS, tipInputSchema } from "../shared/tips";
import { agentError, agentTokensConfigured, hashRequest, publishingAllowed, requestId, requireV1, resolveAgentScope } from "./agentAuth";
import { processAgentCover } from "./agentImages";
import { getTipByIdempotencyKey, getPublishedTipBySlug, getTipByTopicSlug, insertTip, listPublishedTips, countTipsSince } from "./tipsDb";
import { toSlug } from "./recipeDb";

const PUBLIC_CACHE = "public, s-maxage=60, stale-while-revalidate=300";
function cachePublic(res: Response) { res.setHeader("Cache-Control", PUBLIC_CACHE); }
function sanitize(value: unknown): unknown {
  if (typeof value === "string") return value.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "").replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitize(v)]));
  return value;
}
function dayStart() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }

async function createTip(req: Request, res: Response) {
  requestId(req, res);
  if (!requireV1(req, res) || !agentTokensConfigured()) return;
  const scope = resolveAgentScope(req);
  if (!scope) { agentError(res, 401, "unauthorized", "Não autorizado."); return; }
  const key = req.header("idempotency-key")?.trim() ?? "";
  if (!/^[a-f0-9]{64}$/i.test(key)) { agentError(res, 400, "idempotency_key_required", "Idempotency-Key deve conter um SHA-256 hexadecimal."); return; }
  const parsed = tipInputSchema.safeParse(sanitize(req.body));
  if (!parsed.success) { agentError(res, 400, "validation_failed", "Conteúdo educativo inválido.", parsed.error.issues.map((i) => ({ field: i.path.join("."), issue: i.message }))); return; }
  const input = parsed.data;
  if ((input.type === "tecnica" || input.type === "materia") && input.status === "published") { agentError(res, 422, "review_required", "Técnicas e matérias devem entrar como rascunho para revisão."); return; }
  if (input.status === "published" && input.type !== "dica") { agentError(res, 422, "review_required", "Este tipo de conteúdo exige revisão editorial."); return; }
  if (!publishingAllowed(scope, input.status, res)) return;
  const requestHash = hashRequest(input);
  try {
    const prior = await getTipByIdempotencyKey(key);
    if (prior) {
      if (prior.agentRequestHash !== requestHash) { agentError(res, 422, "idempotency_key_reuse", "A mesma chave foi usada com outro conteúdo."); return; }
      res.setHeader("Idempotent-Replay", "true"); res.status(201).json({ id: prior.id, slug: prior.slug, status: prior.status, url: `${req.protocol}://${req.get("host")}/dicas/${encodeURIComponent(prior.slug)}` }); return;
    }
    const topicSlug = String(input.generationMeta.topic_slug ?? input.tipTopic);
    const runId = String(input.generationMeta.run_id ?? "");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(topicSlug) || !runId) { agentError(res, 400, "validation_failed", "generationMeta precisa conter run_id e topic_slug válidos."); return; }
    if (!TIP_TOPICS.some((topic) => topic.slug === input.tipTopic)) { agentError(res, 422, "topic_not_enabled", "O tópico não está habilitado para recebimento."); return; }
    const existing = await getTipByTopicSlug(topicSlug);
    if (existing) { agentError(res, 409, "topic_exists", "Já existe conteúdo para esta pauta."); return; }
    const slug = input.slug ?? toSlug(input.title);
    const dailyCap = input.status === "published" ? Number(process.env.AGENT_DAILY_CAP_TIPS ?? 1) : Number(process.env.AGENT_DAILY_CAP_DRAFTS ?? 3);
    if (!Number.isInteger(dailyCap) || dailyCap < 0) { agentError(res, 503, "invalid_configuration", "O limite diário está inválido."); return; }
    if (await countTipsSince(input.status, dayStart()) >= dailyCap) { agentError(res, 429, "daily_cap_reached", "O limite diário de conteúdos foi atingido."); return; }
    const cover = await processAgentCover(input.cover, slug);
    const row = await insertTip({ ...input, slug }, cover, { topicSlug, idempotencyKey: key, requestHash });
    res.status(201).json({ id: row.id, slug: row.slug, status: row.status, url: `${req.protocol}://${req.get("host")}/dicas/${encodeURIComponent(row.slug)}` });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") { agentError(res, 409, "duplicate_content", "Já existe conteúdo com esta chave, pauta ou slug."); return; }
    console.error("[Tips] create failed:", error instanceof Error ? error.name : "UnknownError", res.getHeader("X-Request-Id"));
    agentError(res, 503, "server_error", "Não foi possível guardar o conteúdo educativo.");
  }
}

export function createTipsRouter() {
  const router = express.Router();
  router.get("/topics", (_req, res) => { cachePublic(res); res.json(TIP_TOPICS); });
  router.get("/", async (req, res) => { try { const limit = Math.min(48, Math.max(1, Number(req.query.limit ?? 24))); cachePublic(res); res.json({ items: await listPublishedTips(limit) }); } catch { res.status(503).json({ error: "Não foi possível carregar as dicas." }); } });
  router.post("/", createTip);
  router.get("/:slug", async (req, res) => { try { const tip = await getPublishedTipBySlug(String(req.params.slug)); if (!tip) { res.status(404).json({ error: "Conteúdo não encontrado." }); return; } cachePublic(res); res.json(tip); } catch { res.status(503).json({ error: "Não foi possível carregar o conteúdo." }); } });
  return router;
}
