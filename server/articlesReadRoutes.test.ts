import express from "express";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublishedArticleSummary } from "../shared/tipTopics";
import { TIP_TOPICS } from "../shared/tipTopics";
import { createArticlesReadRouter } from "./articlesReadRoutes";

let server: Server;
let baseUrl: string;
let received: Array<{ limit: number; type?: string }>;
let failList = false;

const sampleArticle: PublishedArticleSummary = {
  id: "00000000-0000-4000-8000-000000000005",
  type: "tip",
  status: "published",
  slug: "montagem-de-doces",
  title: "Como montar uma mesa de doces",
  excerpt: "Sugestões simples para organizar e apresentar os doces.",
  tipTopic: "montagem-e-apresentacao",
  coverImageUrl: null,
  coverImageAlt: null,
  coverImageVariants: {},
  publishedAt: "2026-11-20T12:00:00.000Z",
  updatedAt: "2026-11-20T12:00:00.000Z",
};

beforeEach(async () => {
  received = [];
  failList = false;
  const app = express();
  app.use("/api/articles", createArticlesReadRouter({
    listArticles: async (limit, type) => {
      received.push({ limit, type });
      if (failList) throw new Error("internal database detail must not be exposed");
      return [sampleArticle];
    },
  }));
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Servidor de teste não iniciou.");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  vi.restoreAllMocks();
});

describe("GET /api/articles", () => {
  it("devolve tópicos ativos no formato público existente", async () => {
    const response = await fetch(`${baseUrl}/api/articles/topics`);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
    expect(await response.json()).toEqual({ items: TIP_TOPICS });
  });

  it("devolve artigos publicados e respeita os filtros de limite e tipo", async () => {
    const response = await fetch(`${baseUrl}/api/articles?limit=12&type=tip`);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=60");
    expect(await response.json()).toEqual({ items: [sampleArticle] });
    expect(received).toEqual([{ limit: 12, type: "tip" }]);
  });

  it("rejeita parâmetros inválidos sem consultar o banco", async () => {
    for (const query of ["?limit=0&type=unknown", "?limit=4&limit=5", "?type=tip&type=news"]) {
      const response = await fetch(`${baseUrl}/api/articles${query}`);
      expect(response.status).toBe(400);
    }
    expect(received).toEqual([]);
  });

  it("devolve 503 genérico quando a API de dados falha, sem expor detalhes internos", async () => {
    failList = true;
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await fetch(`${baseUrl}/api/articles?type=tip`);
    const body = await response.text();
    expect(response.status).toBe(503);
    expect(body).toContain("server_error");
    expect(body).not.toContain("internal database detail");
    expect(JSON.stringify(log.mock.calls)).not.toContain("internal database detail");
  });
});
