import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";

export type AgentScope = "draft" | "publish";

function tokenEquals(received: string, expected: string): boolean {
  const left = createHash("sha256").update(received).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right) && received.length > 0;
}

export function readBearer(req: Request): string {
  const value = req.header("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

export function resolveAgentScope(req: Request): AgentScope | null {
  const received = readBearer(req);
  if (!received) return null;

  const draft = process.env.RECIPES_AGENT_TOKEN_DRAFT ?? "";
  const publish = process.env.RECIPES_AGENT_TOKEN_PUBLISH ?? "";
  const legacy = process.env.RECIPES_AGENT_TOKEN ?? "";
  const matchesDraft = Boolean(draft && tokenEquals(received, draft));
  const matchesPublish = Boolean(publish && tokenEquals(received, publish));
  if (matchesDraft && matchesPublish) return null;
  if (matchesPublish) return "publish";
  if (matchesDraft) return "draft";
  if (legacy && tokenEquals(received, legacy)) {
    console.warn("[AgentAuth] Token legado usado com escopo draft.");
    return "draft";
  }
  return null;
}

export function agentTokensConfigured(): boolean {
  return Boolean(
    process.env.RECIPES_AGENT_TOKEN_DRAFT ||
    process.env.RECIPES_AGENT_TOKEN_PUBLISH ||
    process.env.RECIPES_AGENT_TOKEN,
  );
}

export function requestId(req: Request, res: Response): string {
  const received = req.header("x-request-id")?.trim();
  const id = received && /^[A-Za-z0-9._:-]{1,128}$/.test(received)
    ? received
    : randomUUID();
  res.setHeader("X-Request-Id", id);
  return id;
}

export function agentError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details: Array<{ field?: string; issue: string }> = [],
) {
  return res.status(status).json({ error: { code, message, details } });
}

export function publishingAllowed(scope: AgentScope, status: "draft" | "published", res: Response): boolean {
  if (status === "draft") return true;
  if (scope !== "publish") {
    agentError(res, 403, "scope_insufficient", "O token não permite publicar conteúdo.");
    return false;
  }
  if ((process.env.AGENT_PUBLISHING_ENABLED ?? "false").toLowerCase() !== "true") {
    agentError(res, 403, "publishing_disabled", "A publicação automática está desabilitada.");
    return false;
  }
  const phase = Number(process.env.AGENT_PHASE ?? "0");
  if (!Number.isInteger(phase) || phase < 1 || phase > 3) {
    agentError(res, 403, "phase_not_allowed", "A fase atual não permite publicação.");
    return false;
  }
  return true;
}

export function requireV1(req: Request, res: Response): boolean {
  const version = req.header("x-contract-version");
  if (version === "1") return true;
  if (version !== undefined) {
    agentError(res, 400, "unsupported_contract_version", "Versão de contrato não suportada.");
  } else {
    agentError(res, 400, "contract_version_required", "O cabeçalho X-Contract-Version é obrigatório.");
  }
  return false;
}

export function hashRequest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
