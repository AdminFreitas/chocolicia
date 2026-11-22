import express from "express";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ArticleInput } from "../shared/articles";
import { ArticleReferenceError, ArticleSlugConflictError } from "./articleDb";
import { createArticlesRouter } from "./articlesRoutes";

const TOKEN = "unit-test-secret-never-log";
let server: Server;
let baseUrl: string;
let createMock: ReturnType<typeof vi.fn>;

function mockCreatedArticle(input: ArticleInput) {
  return Promise.resolve({
    id: "00000000-0000-4000-8000-000000000005",
    title: input.title,
    slug: input.slug,
    articleType: input.articleType,
    status: input.status,
    publishedAt:
      input.status === "published"
        ? new Date("2026-01-01T12:00:00.000Z")
        : null,
    tags: input.tags,
    images: input.images,
  });
}

async function post(body: unknown, authorization?: string) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (authorization) headers.authorization = authorization;
  return fetch(`${baseUrl}/api/articles`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    title: "Dica para chocolate",
    slug: "dica-para-chocolate",
    content: "Conteúdo editorial.",
    articleType: "dica",
    ...overrides,
  };
}

beforeEach(async () => {
  createMock = vi.fn((input: ArticleInput) => mockCreatedArticle(input));
  const app = express();
  app.use(express.json());
  app.use(
    "/api/articles",
    createArticlesRouter({
      getToken: () => TOKEN,
      createArticle: createMock as any,
    })
  );
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Servidor de teste não iniciou.");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close(error => (error ? reject(error) : resolve()))
  );
  vi.restoreAllMocks();
});

describe("POST /api/articles", () => {
  it.each(["dica", "tecnica", "materia"] as const)(
    "cria o tipo %s com resposta 201",
    async articleType => {
      const response = await post(
        validBody({ articleType }),
        `Bearer ${TOKEN}`
      );
      expect(response.status).toBe(201);
      const result = await response.json();
      expect(result).toMatchObject({
        slug: "dica-para-chocolate",
        articleType,
        status: "draft",
        publishedAt: null,
      });
    }
  );

  it("recusa token ausente com 401 e token inválido com 403", async () => {
    expect((await post(validBody())).status).toBe(401);
    expect((await post(validBody(), "Bearer wrong-token")).status).toBe(403);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("rejeita campos obrigatórios em falta, tipos e slugs inválidos com 400", async () => {
    expect((await post({ title: "Só título" }, `Bearer ${TOKEN}`)).status).toBe(
      400
    );
    expect(
      (await post(validBody({ articleType: "receita" }), `Bearer ${TOKEN}`))
        .status
    ).toBe(400);
    expect(
      (await post(validBody({ slug: "Slug Inválido" }), `Bearer ${TOKEN}`))
        .status
    ).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("retorna 409 para slug duplicado sem sobrescrever", async () => {
    createMock.mockRejectedValueOnce(new ArticleSlugConflictError());
    const response = await post(validBody(), `Bearer ${TOKEN}`);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "duplicate_slug" });
  });

  it("retorna 422 para referências editoriais inválidas", async () => {
    createMock.mockRejectedValueOnce(
      new ArticleReferenceError("Categoria inválida.", "category_not_found")
    );
    const response = await post(validBody(), `Bearer ${TOKEN}`);
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ code: "category_not_found" });
  });

  it("persiste e devolve tags e imagens recebidas no payload validado", async () => {
    const body = validBody({
      tags: ["chocolate", "técnica"],
      images: [
        {
          imageUrl: "https://example.com/imagem.jpg",
          altText: "Chocolate",
          position: 0,
        },
      ],
    });
    const response = await post(body, `Bearer ${TOKEN}`);
    expect(response.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ tags: body.tags, images: body.images })
    );
    expect(await response.json()).toMatchObject({
      tags: body.tags,
      images: body.images,
    });
  });

  it("não regista nem devolve o token quando ocorre um erro interno", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    createMock.mockRejectedValueOnce(new Error(`erro secreto ${TOKEN}`));
    const response = await post(validBody(), `Bearer ${TOKEN}`);
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain(TOKEN);
    expect(log).toHaveBeenCalledWith("[Articles] create failed.");
    expect(JSON.stringify(log.mock.calls)).not.toContain(TOKEN);
  });
});
