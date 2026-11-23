import type { VercelRequest, VercelResponse } from "@vercel/node";
import fs from "node:fs/promises";
import path from "node:path";
import { getPublishedArticleBySlug } from "../articlesDb";
import { renderArticlePageHtml } from "../articlePage";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const slug = String(req.query.slug ?? "");
  const article = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    ? await getPublishedArticleBySlug(slug)
    : null;
  const template = await fs.readFile(path.resolve(process.cwd(), "dist/article-shell.html"), "utf8");
  res.status(article ? 200 : 404)
    .setHeader("Cache-Control", article ? "public, s-maxage=60, stale-while-revalidate=300" : "no-store")
    .setHeader("Content-Type", "text/html; charset=utf-8")
    .send(renderArticlePageHtml(template, article));
}
