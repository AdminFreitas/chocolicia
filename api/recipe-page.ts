import fs from "node:fs/promises";
import path from "node:path";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPublishedRecipeBySlug } from "../server/recipeDb";
import { renderRecipePageHtml } from "../server/recipePage";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).end("Method not allowed");
    return;
  }
  const slug = String(req.query.slug ?? "");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    res.setHeader("X-Robots-Tag", "noindex,follow");
    res.status(404).send("<!doctype html><html lang=\"pt-BR\"><head><title>Receita não encontrada | Chocolícia</title><meta name=\"robots\" content=\"noindex,follow\"></head><body><h1>Receita não encontrada</h1></body></html>");
    return;
  }
  try {
    const recipe = await getPublishedRecipeBySlug(slug);
    const templatePath = path.resolve(process.cwd(), "dist/recipe-shell.html");
    const template = await fs.readFile(templatePath, "utf8");
    const html = renderRecipePageHtml(template, recipe);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", recipe ? "public, s-maxage=60, stale-while-revalidate=300" : "no-store");
    res.status(recipe ? 200 : 404).send(html);
  } catch (error) {
    console.error("[RecipePage] render failed:", error);
    res.status(503).send("<!doctype html><html lang=\"pt-BR\"><title>Receitas | Chocolícia</title><h1>Não foi possível carregar esta receita.</h1></html>");
  }
}
