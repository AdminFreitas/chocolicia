import { and, count, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { authors, categories, images, tags, tipImages, tipTags, tipTopics, tips, type Tip } from "../drizzle/schema";
import type { TipInput } from "../shared/tips";
import { getDb } from "./db";
import type { ProcessedCover } from "./agentImages";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
function dbOrThrow(db: Db | null | undefined): Db { if (!db) throw new Error("A base de dados não está configurada"); return db; }
async function authorId(tx: any, input: TipInput): Promise<number> {
  if (input.authorId) return input.authorId;
  if (!input.authorSlug) throw new Error("Autor não informado");
  const rows = await tx.select({ id: authors.id }).from(authors).where(and(eq(authors.slug, input.authorSlug), eq(authors.active, true))).limit(1);
  if (!rows[0]) throw new Error("Autor não encontrado ou inativo");
  return rows[0].id;
}

export async function insertTip(input: TipInput & { slug: string }, cover: ProcessedCover, agent: { topicSlug: string; idempotencyKey: string; requestHash: string }) {
  const db = dbOrThrow(await getDb()); const now = new Date();
  return db.transaction(async (tx) => {
    const resolvedAuthorId = await authorId(tx, input);
    const topic = await tx.select({ slug: tipTopics.slug }).from(tipTopics).where(and(eq(tipTopics.slug, input.tipTopic), eq(tipTopics.active, true))).limit(1);
    if (!topic[0]) throw new Error(`Tópico não encontrado: ${input.tipTopic}`);
    const generationMeta = { ...input.generationMeta, structured: input.structured ?? null, sources: input.sources, related_topics: input.relatedTopics, cover: { source: cover.source, variants: cover.variants, is_ai: cover.isAi }, agent_topic_slug: agent.topicSlug, agent_idempotency_key: agent.idempotencyKey, agent_request_hash: agent.requestHash };
    const [row] = await tx.insert(tips).values({ slug: input.slug, title: input.title, excerpt: input.excerpt, content: input.bodyMd, tipType: input.type, tipTopic: input.tipTopic, authorId: resolvedAuthorId, coverImageUrl: cover.url, coverImageAlt: input.coverImageAlt, metaTitle: input.metaTitle ?? input.title, metaDescription: input.metaDescription ?? input.excerpt, canonicalUrl: input.canonicalUrl ?? null, tags: input.tags, generationMeta, status: input.status, reviewStatus: input.status === "published" ? "approved" : "pending", publishedAt: input.status === "published" ? now : null, agentTopicSlug: agent.topicSlug, agentIdempotencyKey: agent.idempotencyKey, agentRequestHash: agent.requestHash, createdAt: now, updatedAt: now }).returning();
    const [image] = await tx.insert(images).values({ fileUrl: cover.url, altText: input.coverImageAlt, imageType: "tip-cover", sourceType: cover.isAi ? "generated" : "stock", generationMeta: { source: cover.source, variants: cover.variants }, active: true, createdAt: now, updatedAt: now }).returning();
    await tx.insert(tipImages).values({ tipId: row.id, imageId: image.id, imageUrl: cover.url, altText: input.coverImageAlt, imageRole: "cover", sortOrder: 0, createdAt: now });
    if (input.tags.length) { const rows = await tx.select({ id: tags.id }).from(tags).where(sql`${tags.slug} = ANY(${input.tags})`); if (rows.length !== input.tags.length) throw new Error("Uma ou mais tags não foram encontradas"); await tx.insert(tipTags).values(rows.map((tag) => ({ tipId: row.id, tagId: tag.id, createdAt: now }))); }
    return row;
  });
}
export async function getTipByIdempotencyKey(key: string): Promise<Tip | null> { const db = dbOrThrow(await getDb()); const rows = await db.select().from(tips).where(eq(tips.agentIdempotencyKey, key)).limit(1); return rows[0] ?? null; }
export async function getTipByTopicSlug(key: string): Promise<Tip | null> { const db = dbOrThrow(await getDb()); const rows = await db.select().from(tips).where(eq(tips.agentTopicSlug, key)).limit(1); return rows[0] ?? null; }
export async function getTipBySlug(slug: string): Promise<Tip | null> { const db = dbOrThrow(await getDb()); const rows = await db.select().from(tips).where(eq(tips.slug, slug)).limit(1); return rows[0] ?? null; }
export async function listPublishedTips(limit = 24) { const db = dbOrThrow(await getDb()); return db.select({ id: tips.id, type: tips.tipType, slug: tips.slug, title: tips.title, excerpt: tips.excerpt, tipTopic: tips.tipTopic, authorId: tips.authorId, authorName: authors.name, coverImageUrl: tips.coverImageUrl, coverImageAlt: tips.coverImageAlt, publishedAt: tips.publishedAt, updatedAt: tips.updatedAt }).from(tips).leftJoin(authors, eq(tips.authorId, authors.id)).where(and(eq(tips.status, "published"), isNotNull(tips.publishedAt))).orderBy(desc(tips.publishedAt), desc(tips.id)).limit(limit); }
export async function getPublishedTipBySlug(slug: string) { const db = dbOrThrow(await getDb()); const rows = await db.select({ tip: tips, authorName: authors.name }).from(tips).leftJoin(authors, eq(tips.authorId, authors.id)).where(and(eq(tips.slug, slug), eq(tips.status, "published"))).limit(1); if (!rows[0]) return null; const meta = (rows[0].tip.generationMeta ?? {}) as Record<string, any>; return { ...rows[0].tip, bodyMd: rows[0].tip.content, relatedTopics: meta.related_topics ?? [], sources: meta.sources ?? [], coverImageVariants: meta.cover?.variants ?? {}, coverImageSource: meta.cover?.source ?? null, coverImageIsAi: Boolean(meta.cover?.is_ai), authorName: rows[0].authorName }; }
export async function countTipsSince(status: "draft" | "published", since: Date) { const db = dbOrThrow(await getDb()); const rows = await db.select({ value: count() }).from(tips).where(and(eq(tips.status, status), gte(status === "draft" ? tips.createdAt : tips.publishedAt, since))); return Number(rows[0]?.value ?? 0); }
export async function getPublishedTipCountSince(since: Date) { const db = dbOrThrow(await getDb()); const rows = await db.select({ value: count() }).from(tips).where(and(eq(tips.tipType, "dica"), eq(tips.status, "published"), gte(tips.publishedAt, since))); return Number(rows[0]?.value ?? 0); }
