import fs from "node:fs/promises";
import path from "node:path";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPublishedTipBySlug } from "../tipsDb";
import { renderTipPageHtml } from "../tipPage";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).end("Method not allowed");
    return;
  }
  const slug = String(req.query.slug ?? "");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    res.setHeader("X-Robots-Tag", "noindex,follow");
    res.status(404).send("<!doctype html><html lang=\"pt-BR\"><head><title>Dica não encontrada | Chocolícia</title><meta name=\"robots\" content=\"noindex,follow\"></head><body><h1>Dica não encontrada</h1></body></html>");
    return;
  }
  try {
    const tip = await getPublishedTipBySlug(slug);
    const templatePath = path.resolve(process.cwd(), "dist/tip-shell.html");
    const template = await fs.readFile(templatePath, "utf8");
    const html = renderTipPageHtml(template, tip);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", tip ? "public, s-maxage=60, stale-while-revalidate=300" : "no-store");
    res.status(tip ? 200 : 404).send(html);
  } catch (error) {
    console.error("[TipPage] render failed:", error);
    res.status(503).send("<!doctype html><html lang=\"pt-BR\"><title>Dicas | Chocolícia</title><h1>Não foi possível carregar esta dica.</h1></html>");
  }
}
