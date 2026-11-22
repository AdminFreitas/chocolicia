import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const putMock = vi.hoisted(() => vi.fn());
vi.mock("@vercel/blob", () => ({ put: putMock }));

import { storagePutPublic } from "./storage";

describe("storagePutPublic com Vercel Blob", () => {
  beforeEach(() => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "blob-test-token");
    putMock.mockResolvedValue({ pathname: "recipes/bolo_abcd1234.webp", url: "https://store.public.blob.vercel-storage.com/recipes/bolo_abcd1234.webp" });
  });

  afterEach(() => {
    putMock.mockReset();
    vi.unstubAllEnvs();
  });

  it("envia Buffer ao Blob com acesso público e devolve a URL pública", async () => {
    const data = Buffer.from("conteudo");

    const result = await storagePutPublic("recipes/bolo.webp", data, "image/webp");

    expect(result).toEqual({
      key: "recipes/bolo_abcd1234.webp",
      url: "https://store.public.blob.vercel-storage.com/recipes/bolo_abcd1234.webp",
    });
    const [key, body, options] = putMock.mock.calls[0];
    expect(key).toMatch(/^recipes\/bolo_[0-9a-f]{8}\.webp$/);
    expect(body).toBe(data);
    expect(options).toMatchObject({ access: "public", token: "blob-test-token", addRandomSuffix: false, contentType: "image/webp" });
  });

  it("converte Uint8Array em Buffer antes de enviar ao Blob", async () => {
    await storagePutPublic("recipes/bolo.avif", new Uint8Array([1, 2, 3]), "image/avif");

    const body = putMock.mock.calls[0][1];
    expect(Buffer.isBuffer(body)).toBe(true);
    expect([...body]).toEqual([1, 2, 3]);
  });

  it("falha com mensagem clara sem Blob nem URL pública configurados", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.stubEnv("RECIPES_PUBLIC_BASE_URL", "");

    await expect(storagePutPublic("recipes/x.webp", Buffer.from("x"), "image/webp")).rejects.toThrow("BLOB_READ_WRITE_TOKEN is required");
    expect(putMock).not.toHaveBeenCalled();
  });
});
