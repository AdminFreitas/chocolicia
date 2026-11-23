import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import { createArticlesRouter } from "./articlesRoutes";

const servers: import("node:http").Server[] = [];
afterEach(async () => { await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve())))); });

describe("articles router", () => {
  it("is mountable and exposes the editorial topic contract", async () => {
    const app = express();
    app.use("/api/articles", createArticlesRouter());
    const server = await new Promise<import("node:http").Server>((resolve) => {
      const value = app.listen(0, () => resolve(value));
      servers.push(value);
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("server address unavailable");
    const response = await fetch(`http://127.0.0.1:${address.port}/api/articles/topics`);
    expect(response.status).toBe(200);
    expect((await response.json()).items).toEqual(expect.arrayContaining([expect.objectContaining({ slug: "preparo", active: true })]));
  });
});
