import { and, desc, eq, isNotNull } from "drizzle-orm";
import { articles, type Article } from "../drizzle/schema";
import type { RecipeDb } from "./recipeDb";
import { getDb } from "./db";

function requireDb(db: RecipeDb | null | undefined): RecipeDb {
  if (!db) throw new Error("A base de dados não está configurada");
  return db;
}

export async function getArticleBySlug(slug: string, dbOverride?: RecipeDb) {
  const db = requireDb(dbOverride ?? await getDb());
  const [row] = await db.select().from(articles).where(eq(articles.slug, slug)).limit(1);
  return row ?? null;
}

export async function listPublishedArticles(dbOverride?: RecipeDb) {
  const db = requireDb(dbOverride ?? await getDb());
  return db.select().from(articles)
    .where(and(eq(articles.status, "published"), isNotNull(articles.publishedAt)))
    .orderBy(desc(articles.publishedAt));
}

export async function insertArticle(input: {
  slug: string; type: string; title: string; excerpt: string; bodyMd: string;
  tipTopic?: string | null; subcategorySlug?: string | null; coverImageUrl: string;
  coverImageAlt: string; payload: Record<string, unknown>; status: "draft" | "published";
  generationMeta: Record<string, unknown>;
}) {
  const db = requireDb(await getDb());
  const now = new Date();
  const [row] = await db.insert(articles).values({
    ...input,
    tipTopic: input.tipTopic ?? null,
    subcategorySlug: input.subcategorySlug ?? null,
    publishedAt: input.status === "published" ? now : null,
    createdAt: now,
    updatedAt: now,
  }).returning();
  return row;
}

export async function publishArticle(slug: string) {
  const db = requireDb(await getDb());
  const [row] = await db.update(articles).set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
    .where(eq(articles.slug, slug)).returning();
  return row ?? null;
}

export type StoredArticle = Article;
