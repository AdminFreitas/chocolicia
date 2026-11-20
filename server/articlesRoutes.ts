import { createHash, timingSafeEqual } from "node:crypto";
import express, { type Request, type Response } from "express";
import { getArticleBySlug, insertArticle, publishArticle } from "./articleDb";
import { toSlug } from "./recipeDb";

function token(req: Request, res: Response) {
  const expected = process.env.RECIPES_AGENT_TOKEN;
  const received = (req.header("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!expected) { res.status(503).json({ error: "A publicação por agente não está configurada." }); return false; }
  const a = createHash("sha256").update(received).digest(); const b = createHash("sha256").update(expected).digest();
  if (!received || !timingSafeEqual(a, b)) { res.status(401).json({ error: "Não autorizado." }); return false; }
  return true;
}
function url(slug: string) { return `${process.env.PUBLIC_SITE_URL ?? "https://www.chocolicia.site"}/conteudos/${slug}`; }

export function createArticlesRouter() {
  const router = express.Router();
  router.post("/", async (req, res) => {
    if (!token(req, res)) return;
    const body = req.body ?? {};
    if (!body.coverImageUrl || !String(body.coverImageUrl).startsWith("https://")) { res.status(422).json({ error: "coverImageUrl HTTPS é obrigatória." }); return; }
    const slug = body.slug ?? toSlug(String(body.title ?? ""));
    if (!slug || !body.title || !body.excerpt || !body.bodyMd || !body.type) { res.status(400).json({ error: "Dica inválida." }); return; }
    try {
      const existing = await getArticleBySlug(slug);
      if (existing) {
        const oldRun = existing.generationMeta?.run_id;
        if (oldRun && oldRun === body.generationMeta?.run_id) { res.setHeader("Idempotent-Replay", "true"); res.status(200).json({ ...existing, url: url(existing.slug) }); return; }
        res.status(409).json({ error: "Já existe conteúdo com este slug.", code: "slug_conflict" }); return;
      }
      const row = await insertArticle({ slug, type: String(body.type), title: String(body.title), excerpt: String(body.excerpt), bodyMd: String(body.bodyMd), tipTopic: body.tipTopic ?? null, subcategorySlug: body.subcategorySlug ?? null, coverImageUrl: String(body.coverImageUrl), coverImageAlt: String(body.coverImageAlt ?? "Imagem do conteúdo"), payload: body, status: body.status === "published" ? "published" : "draft", generationMeta: body.generationMeta ?? {} });
      res.status(201).json({ ...row, url: url(row.slug) });
    } catch (error) { console.error("[Articles] create:", error); res.status(400).json({ error: "Dica inválida." }); }
  });
  router.post("/:slug/publish", async (req, res) => {
    if (!token(req, res)) return;
    try { const existing = await getArticleBySlug(req.params.slug); if (!existing) { res.status(404).json({ error: "Conteúdo não encontrado." }); return; } if (existing.status === "published") { res.setHeader("Idempotent-Replay", "true"); res.status(200).json({ ...existing, url: url(existing.slug) }); return; } const row = await publishArticle(req.params.slug); res.status(201).json({ ...row, url: url(req.params.slug) }); } catch { res.status(503).json({ error: "Não foi possível publicar o conteúdo." }); }
  });
  router.get("/:slug/status", async (req, res) => { const row = await getArticleBySlug(req.params.slug); if (!row) { res.status(404).json({ error: "Conteúdo não encontrado." }); return; } res.json({ id: row.id, slug: row.slug, status: row.status, publishedAt: row.publishedAt, url: url(row.slug) }); });
  return router;
}
