import { createHash, timingSafeEqual } from "node:crypto";
import express, { type Request } from "express";
import { tipInputSchema } from "../shared/tips";
import { createTipIdempotently, getPublishedTipBySlug, listPublishedTips, TipPersistenceError } from "./tipsDb";
import { toSlug } from "./recipeDb";

function tokenMatches(received: string, expected: string) {
  const a = createHash("sha256").update(received).digest();
  const b = createHash("sha256").update(expected).digest();
  return received.length > 0 && timingSafeEqual(a, b);
}

function bearer(req: Request) {
  const header = req.header("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function sanitizeString(value: string) {
  return value
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function sanitizeDeep<T>(value: T): T {
  if (typeof value === "string") return sanitizeString(value) as T;
  if (Array.isArray(value)) return value.map(sanitizeDeep) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeDeep(item)])) as T;
  }
  return value;
}

export function createTipsRouter() {
  const router = express.Router();

  router.get("/", async (req, res) => {
    const parsedLimit = Number(req.query.limit ?? 20);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
      res.status(400).json({ error: "O parâmetro limit deve ser um inteiro entre 1 e 50.", code: "invalid_limit" });
      return;
    }
    try {
      const rows = await listPublishedTips(parsedLimit);
      res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
      res.json({ items: rows });
    } catch (error) {
      console.error("[Tips] list:", error);
      res.status(503).json({ error: "Não foi possível carregar as dicas.", code: "tips_unavailable" });
    }
  });

  router.get("/:slug", async (req, res) => {
    const slug = String(req.params.slug);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      res.status(404).json({ error: "Dica não encontrada.", code: "tip_not_found" });
      return;
    }
    try {
      const tip = await getPublishedTipBySlug(slug);
      if (!tip) {
        res.status(404).json({ error: "Dica não encontrada.", code: "tip_not_found" });
        return;
      }
      res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
      res.json(tip);
    } catch (error) {
      console.error("[Tips] detail:", error);
      res.status(503).json({ error: "Não foi possível carregar esta dica.", code: "tips_unavailable" });
    }
  });

  router.post("/", async (req, res) => {
    const expected = process.env.TIPS_AGENT_TOKEN;
    if (!expected) {
      res.status(503).json({ error: "A API de dicas não está configurada.", code: "tips_api_unconfigured" });
      return;
    }
    if (!tokenMatches(bearer(req), expected)) {
      res.status(401).json({ error: "Não autorizado.", code: "unauthorized" });
      return;
    }

    const bodyLength = Buffer.byteLength(JSON.stringify(req.body ?? {}), "utf8");
    const contentLength = Number(req.header("content-length") ?? 0);
    if (Math.max(bodyLength, contentLength) > 1_000_000) {
      res.status(413).json({ error: "O conteúdo excede o limite permitido.", code: "payload_too_large" });
      return;
    }

    const parsed = tipInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dica inválida.", code: "invalid_tip", details: parsed.error.flatten() });
      return;
    }
    const input = sanitizeDeep(parsed.data);
    const requestHash = createHash("sha256").update(stableStringify({ ...input, agentRequestHash: undefined })).digest("hex");
    input.agentRequestHash = requestHash;
    const slug = input.slug ?? toSlug(input.title);
    if (!slug) {
      res.status(400).json({ error: "Não foi possível gerar o slug da dica.", code: "invalid_slug" });
      return;
    }

    try {
      const result = await createTipIdempotently({ ...input, slug });
      res.status(result.created ? 201 : 200).json({
        ...result,
        idempotent: !result.created,
      });
    } catch (error) {
      if (error instanceof TipPersistenceError) {
        res.status(error.statusCode).json({ error: error.message, code: error.code });
        return;
      }
      const dbError = error as { code?: string; constraint?: string };
      if (dbError.code === "23505") {
        res.status(409).json({
          error: dbError.constraint?.includes("slug")
            ? "Já existe uma dica com este slug."
            : "A chave de idempotência ou o tópico já foi utilizado.",
          code: "unique_conflict",
        });
        return;
      }
      if (dbError.code === "23514") {
        res.status(422).json({ error: "O tipo, status ou situação de revisão não é permitido pelo banco.", code: "invalid_tip_state" });
        return;
      }
      console.error("[Tips] create:", error);
      res.status(503).json({ error: "Não foi possível guardar a dica.", code: "tip_persistence_failed" });
    }
  });

  return router;
}
