import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateRecipesSitemap } from "../server/recipeSitemap";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).end("Method not allowed");
    return;
  }
  try {
    const xml = await generateRecipesSitemap();
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    res.status(200).send(xml);
  } catch (error) {
    console.error("[RecipeSitemap] generation failed:", error);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.status(503).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
}
