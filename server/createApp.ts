import "dotenv/config";
import express, { type Express, type NextFunction, type Response } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import { registerAuthRoutes } from "./_core/authRoutes";
import { createContext } from "./_core/context";
import { createRecipesRouter } from "./recipesRoutes";
import { getPublishedRecipeBySlug } from "./recipeDb";
import { renderRecipePageHtml } from "./recipePage";
import { generateRecipesSitemap } from "./recipeSitemap";
import fs from "node:fs/promises";
import path from "node:path";

async function serveRecipePage(slug: string, res: Response, next: NextFunction) {
  try {
    const recipe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? await getPublishedRecipeBySlug(slug) : null;
    const templatePath = process.env.NODE_ENV === "development"
      ? path.resolve(process.cwd(), "client/index.html")
      : path.resolve(process.cwd(), "dist/recipe-shell.html");
    const template = await fs.readFile(templatePath, "utf8");
    res.status(recipe ? 200 : 404)
      .type("html")
      .setHeader("Cache-Control", recipe ? "public, s-maxage=60, stale-while-revalidate=300" : "no-store")
      .send(renderRecipePageHtml(template, recipe));
  } catch (error) {
    next(error);
  }
}

async function serveSitemap(res: Response) {
  try {
    res.type("application/xml").setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    res.send(await generateRecipesSitemap());
  } catch (error) {
    console.error("[RecipeSitemap] generation failed:", error);
    res.status(503).type("application/xml").send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
}

export async function createApp(): Promise<Express> {
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerAuthRoutes(app);

  // Dedicated Vercel functions normally handle these paths; the Express routes also support rewrites to api/index.ts.
  app.get("/api/recipe-page", (req, res, next) => serveRecipePage(String(req.query.slug ?? ""), res, next));
  app.get("/api/recipes-sitemap", (_req, res) => serveSitemap(res));
  app.get("/sitemap.xml", (_req, res) => serveSitemap(res));
  app.get("/receitas/:slug", (req, res, next) => serveRecipePage(String(req.params.slug), res, next));

  app.use("/api/recipes", createRecipesRouter());
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  return app;
}
