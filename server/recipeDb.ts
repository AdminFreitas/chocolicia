import { and, desc, eq, gt, ilike, isNotNull, lt, or, sql } from "drizzle-orm";
import type { RecipeInput } from "../shared/recipes";
import { recipes, type Recipe } from "../drizzle/schema";
import { getDb } from "./db";

export type RecipeDb = NonNullable<Awaited<ReturnType<typeof getDb>>>;

const recipeSummarySelection = {
  id: recipes.id,
  slug: recipes.slug,
  title: recipes.title,
  excerpt: recipes.excerpt,
  category: recipes.category,
  tags: recipes.tags,
  coverImageUrl: recipes.coverImageUrl,
  coverImageAlt: recipes.coverImageAlt,
  coverImageVariants: recipes.coverImageVariants,
  prepTimeMin: recipes.prepTimeMin,
  cookTimeMin: recipes.cookTimeMin,
  servings: recipes.servings,
  difficulty: recipes.difficulty,
  publishedAt: recipes.publishedAt,
};

function requireDb(db: RecipeDb | null | undefined): RecipeDb {
  if (!db) throw new Error("A base de dados não está configurada");
  return db;
}

export async function listFeaturedRecipes(dbOverride?: RecipeDb) {
  const db = requireDb(dbOverride ?? await getDb());
  return db.select(recipeSummarySelection).from(recipes)
    .where(and(eq(recipes.status, "published"), isNotNull(recipes.publishedAt)))
    .orderBy(desc(recipes.publishedAt), desc(recipes.id)).limit(4);
}

export function encodeRecipeCursor(recipe: Pick<Recipe, "id" | "publishedAt">) {
  if (!recipe.publishedAt) return null;
  return Buffer.from(JSON.stringify({ at: recipe.publishedAt.toISOString(), id: recipe.id }), "utf8").toString("base64url");
}

function decodeRecipeCursor(cursor: string): { at: Date; id: string } {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as { at?: unknown; id?: unknown };
    const at = new Date(String(parsed.at));
    if (!Number.isFinite(at.getTime()) || typeof parsed.id !== "string" || parsed.id.length > 64) throw new Error("Invalid cursor");
    return { at, id: parsed.id };
  } catch {
    throw new Error("Cursor inválido");
  }
}

export async function listRecipes(options: { limit: number; cursor?: string; category?: string; q?: string }, dbOverride?: RecipeDb) {
  const db = requireDb(dbOverride ?? await getDb());
  const conditions = [eq(recipes.status, "published"), isNotNull(recipes.publishedAt)];
  if (options.category) conditions.push(eq(recipes.category, options.category));
  if (options.q) {
    const pattern = `%${options.q.replace(/[\\%_]/g, "\\$&")}%`;
    conditions.push(or(
      ilike(recipes.title, pattern),
      ilike(recipes.excerpt, pattern),
      sql`${recipes.ingredients}::text ILIKE ${pattern}`,
    )!);
  }
  if (options.cursor) {
    const cursor = decodeRecipeCursor(options.cursor);
    conditions.push(or(
      lt(recipes.publishedAt, cursor.at),
      and(eq(recipes.publishedAt, cursor.at), lt(recipes.id, cursor.id)),
    )!);
  }
  const rows = await db.select(recipeSummarySelection).from(recipes)
    .where(and(...conditions))
    .orderBy(desc(recipes.publishedAt), desc(recipes.id))
    .limit(options.limit + 1);
  const hasNext = rows.length > options.limit;
  const items = hasNext ? rows.slice(0, options.limit) : rows;
  const last = items.at(-1);
  return { items, nextCursor: hasNext && last ? encodeRecipeCursor(last) : null };
}

export async function getPublishedRecipeBySlug(slug: string, dbOverride?: RecipeDb) {
  const db = requireDb(dbOverride ?? await getDb());
  const result = await db.select().from(recipes)
    .where(and(eq(recipes.slug, slug), eq(recipes.status, "published")))
    .limit(1);
  return result[0] ?? null;
}

export async function getRecipeBySlug(slug: string, dbOverride?: RecipeDb) {
  const db = requireDb(dbOverride ?? await getDb());
  const result = await db.select().from(recipes).where(eq(recipes.slug, slug)).limit(1);
  return result[0] ?? null;
}

export async function getPublishedRecipeSlugs(dbOverride?: RecipeDb) {
  const db = requireDb(dbOverride ?? await getDb());
  return db.select({ slug: recipes.slug, updatedAt: recipes.updatedAt })
    .from(recipes)
    .where(and(eq(recipes.status, "published"), isNotNull(recipes.publishedAt)))
    .orderBy(desc(recipes.publishedAt));
}

export async function getPublishedRecipeTitlesSince(since: Date, dbOverride?: RecipeDb) {
  const db = requireDb(dbOverride ?? await getDb());
  return db.select({ title: recipes.title, category: recipes.category, slug: recipes.slug })
    .from(recipes)
    .where(and(eq(recipes.status, "published"), gt(recipes.publishedAt, since)))
    .orderBy(desc(recipes.publishedAt));
}

export async function getAllPublishedRecipeTitles(dbOverride?: RecipeDb) {
  const db = requireDb(dbOverride ?? await getDb());
  return db.select({ title: recipes.title, category: recipes.category, slug: recipes.slug })
    .from(recipes)
    .where(and(eq(recipes.status, "published"), isNotNull(recipes.publishedAt)))
    .orderBy(desc(recipes.publishedAt));
}

export async function insertRecipe(input: RecipeInput & { slug: string }) {
  const db = requireDb(await getDb());
  const now = new Date();
  const publishedAt = input.status === "published" ? (input.publishedAt ?? now) : null;
  const [row] = await db.insert(recipes).values({
    slug: input.slug,
    title: input.title,
    excerpt: input.excerpt,
    category: input.category,
    tags: input.tags,
    coverImageUrl: input.coverImageUrl,
    coverImageAlt: input.coverImageAlt,
    imagePrompt: input.imagePrompt,
    coverImageVariants: input.coverImageVariants,
    ingredients: input.ingredients,
    steps: input.steps,
    tips: input.tips,
    storageNotes: input.storageNotes,
    faq: input.faq,
    prepTimeMin: input.prepTimeMin,
    cookTimeMin: input.cookTimeMin,
    servings: input.servings,
    difficulty: input.difficulty,
    status: input.status,
    publishedAt,
    aiModel: input.aiModel ?? null,
    generationMeta: input.generationMeta,
    updatedAt: now,
  }).returning();
  return row;
}

export async function insertFailedRecipe(details: { slug: string; title: string; error: string; aiModel?: string }) {
  const db = requireDb(await getDb());
  const [row] = await db.insert(recipes).values({
    slug: details.slug,
    title: details.title.slice(0, 180),
    excerpt: "Esta tentativa de receita não foi publicada.",
    category: "Sobremesas",
    tags: [],
    coverImageUrl: "https://placehold.co/1200x800/f3e5d0/5a3428?text=Receita+em+preparo",
    coverImageAlt: "Imagem temporária de uma receita em preparo",
    imagePrompt: "",
    coverImageVariants: {},
    ingredients: [],
    steps: [],
    tips: [],
    storageNotes: "",
    faq: [],
    prepTimeMin: 1,
    cookTimeMin: 0,
    servings: 1,
    difficulty: "Fácil",
    status: "failed",
    publishedAt: null,
    aiModel: details.aiModel ?? null,
    generationMeta: { error: details.error.slice(0, 2000), failedAt: new Date().toISOString() },
    updatedAt: new Date(),
  }).returning();
  return row;
}

export function toSlug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 180).replace(/-+$/g, "");
}
