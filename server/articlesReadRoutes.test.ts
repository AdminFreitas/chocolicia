import express from "express";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createArticlesRouter } from "./articlesRoutes";
import type {
  TipArticleDetail,
  TipArticleSummary,
  TipListParams,
  TipListResult,
  TipTopicSummary,
} from "./articleDb";

const topicId = "00000000-0000-4000-8000-000000000001";
const articleId = "00000000-0000-4000-8000-000000000002";
const publishedAt = new Date("2026-11-20T12:00:00.000Z");

const topicFixture: TipTopicSummary = {
  id: topicId,
  slug: "confeitaria",
  name: "Confeitaria",
  description: "Técnicas e orientações de confeitaria.",
  articleCount: 1,
};

const summaryFixture: TipArticleSummary = {
  id: articleId,
  slug: "como-conservar-ganache",
  title: "Como conservar ganache",
  excerpt: "Orientações de conservação.",
  articleType: "dica",
  topic: { slug: "confeitaria", name: "Confeitaria" },
  coverImageUrl: "https://images.example.test/ganache.webp",
  coverImageAlt: "Ganache em uma tigela",
  publishedAt,
  updatedAt: publishedAt,
};

const articleFixture: TipArticleDetail = {
  ...summaryFixture,
  content: "Conserve em recipiente fechado.",
  author: "Equipe Chocolícia",
  seoTitle: null,
  seoDescription: null,
  tags: ["ganache"],
  images: [],
  sources: [],
};

let server: Server;
let baseUrl: string;
let topicsMock: ReturnType<typeof vi.fn>;
let listMock: ReturnType<typeof vi.fn>;
let detailMock: ReturnType<typeof vi.fn>;

async function get(path: string) {
  return fetch(baseUrl + path, {
    headers: { Accept: "application/json" },
  });
}

beforeEach(async () => {
  topicsMock = vi.fn(async () => [topicFixture]);
  listMock = vi.fn(async (_params: TipListParams): Promise<TipListResult> => ({
    items: [summaryFixture],
    nextCursor: null,
  }));
  detailMock = vi.fn(
    async (_slug: string): Promise<TipArticleDetail | null> => articleFixture
  );

  const app = express();
  app.use(
    "/api/articles",
    createArticlesRouter({
      listTipTopics: topicsMock as () => Promise<TipTopicSummary[]>,
      listTips: listMock as (params: TipListParams) => Promise<TipListResult>,
      getTip: detailMock as (slug: string) => Promise<TipArticleDetail | null>,
    })
  );
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Servidor de teste não iniciou.");
  }
  baseUrl = "http://127.0.0.1:" + address.port;
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
  vi.restoreAllMocks();
});

describe("API pública de dicas", () => {
  it("lista os tópicos ativos sem autenticação", async () => {
    const response = await get("/api/articles/topics");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ items: [topicFixture] });
    expect(topicsMock).toHaveBeenCalledOnce();
  });

  it("lista dicas e encaminha tópico, cursor e limite", async () => {
    const response = await get(
      "/api/articles?topic=confeitaria&limit=6&cursor=abc123"
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.items[0]).toMatchObject({
      id: articleId,
      slug: summaryFixture.slug,
      title: summaryFixture.title,
      publishedAt: publishedAt.toISOString(),
    });
    expect(body.nextCursor).toBeNull();
    expect(listMock).toHaveBeenCalledWith({
      topic: "confeitaria",
      limit: 6,
      cursor: "abc123",
    });
  });

  it("retorna uma página vazia quando não há dicas publicadas", async () => {
    listMock.mockResolvedValueOnce({ items: [], nextCursor: null });
    const response = await get("/api/articles?limit=9");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ items: [], nextCursor: null });
  });

  it("retorna 503 quando a consulta pública da lista falha", async () => {
    listMock.mockRejectedValueOnce(new Error("database offline"));
    const response = await get("/api/articles?limit=9");
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: { code: "server_error" },
    });
  });

  it("rejeita parâmetros inválidos sem consultar o banco", async () => {
    const response = await get("/api/articles?limit=100");
    expect(response.status).toBe(400);
    expect(listMock).not.toHaveBeenCalled();
  });

  it("carrega o detalhe público pelo slug sem autenticação", async () => {
    const response = await get("/api/articles/como-conservar-ganache");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      id: articleId,
      slug: articleFixture.slug,
      title: articleFixture.title,
      publishedAt: publishedAt.toISOString(),
      updatedAt: publishedAt.toISOString(),
      content: articleFixture.content,
    });
    expect(detailMock).toHaveBeenCalledWith("como-conservar-ganache");
  });

  it("retorna 404 para artigo inexistente ou slug inválido", async () => {
    detailMock.mockResolvedValueOnce(null);
    expect((await get("/api/articles/nao-existe")).status).toBe(404);
    expect((await get("/api/articles/Slug%20invalido")).status).toBe(404);
  });

  it("retorna 503 quando a leitura pública falha", async () => {
    topicsMock.mockRejectedValueOnce(new Error("database offline"));
    const response = await get("/api/articles/topics");
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: { code: "server_error" },
    });
  });
});
