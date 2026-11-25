import { and, count, desc, eq, gte, ilike, isNotNull, or, sql } from "drizzle-orm";
import { articleImages, articleTags, articles, authors, categories, images, tags, tipTopics, type ArticleRecord } from "../drizzle/schema";
import type { ArticleInput } from "../shared/articles";
import { getDb } from "./db";
import type { ProcessedCover } from "./agentImages";

type ArticleDb = NonNullable<Awaited<ReturnType<typeof getDb>>>;
function requireDb(db: ArticleDb | null | undefined): ArticleDb { if (!db) throw new Error("A base de dados não está configurada"); return db; }
function configuredAuthorId(): number { const id = Number(process.env.AGENT_AUTHOR_ID ?? ""); if (!Number.isInteger(id) || id <= 0) throw new Error("AGENT_AUTHOR_ID inválido"); return id; }

async function lookupId(tx: any, table: typeof categories | typeof tipTopics, slug: string, label: string) {
  const rows = await tx.select({ id: table.id }).from(table).where(eq(table.slug, slug)).limit(1);
  if (!rows[0]) throw new Error(`${label} não encontrada: ${slug}`);
  return rows[0].id;
}

export async function insertArticle(input: ArticleInput & { slug: string }, cover: ProcessedCover, agent: { topicSlug: string; idempotencyKey: string; requestHash: string }) {
  const db = requireDb(await getDb());
  const now = new Date();
  return db.transaction(async (tx) => {
    const authorId = configuredAuthorId();
    const author = await tx.select({ id: authors.id }).from(authors).where(and(eq(authors.id, authorId), eq(authors.active, true))).limit(1);
    if (!author[0]) throw new Error("Autor configurado não encontrado ou inativo");
    const topicId = input.tipTopic ? await lookupId(tx, tipTopics, input.tipTopic, "Tema") : null;
    if (input.categorySlug) await lookupId(tx, categories, input.categorySlug, "Categoria");
    const generationMeta = {
      ...input.generationMeta,
      sources: input.sources,
      related_topics: input.relatedTopics,
      ai_model: input.aiModel,
      category_slug: input.categorySlug ?? null,
      cover: { source: cover.source, variants: cover.variants, is_ai: cover.isAi },
      agent_topic_slug: agent.topicSlug,
      agent_idempotency_key: agent.idempotencyKey,
      agent_request_hash: agent.requestHash,
    };
    const [row] = await tx.insert(articles).values({
      slug: input.slug, title: input.title, excerpt: input.excerpt, content: input.bodyMd,
      contentType: input.type, topicId, authorId, coverImageUrl: cover.url, coverImageAlt: input.coverImageAlt,
      tags: input.tags, generationMeta, status: input.status ?? "draft", reviewStatus: input.status === "published" ? "approved" : "pending",
      publishedAt: input.status === "published" ? now : null, createdAt: now, updatedAt: now,
    }).returning();
    const [image] = await tx.insert(images).values({ fileUrl: cover.url, altText: input.coverImageAlt, imageType: "article-cover", sourceType: cover.isAi ? "generated" : "stock", generationMeta: { source: cover.source, variants: cover.variants }, active: true, createdAt: now, updatedAt: now }).returning();
    await tx.insert(articleImages).values({ articleId: row.id, imageId: image.id, imageUrl: cover.url, altText: input.coverImageAlt, imageRole: "cover", sortOrder: 0, createdAt: now });
    if (input.tags.length) {
      // Serializa a resolução/criação para evitar duplicatas entre requisições concorrentes.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(734921, 1)`);
      const resolvedTagIds: number[] = [];
      for (const rawTag of input.tags) {
        const name = rawTag.trim();
        const slug = name.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "")
          .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
        if (!slug) continue;
        const existing = await tx.select({ id: tags.id }).from(tags)
          .where(or(eq(tags.slug, slug), eq(tags.name, name))).orderBy(tags.id).limit(1);
        if (existing[0]) {
          resolvedTagIds.push(existing[0].id);
          continue;
        }
        const [created] = await tx.insert(tags).values({ name, slug }).returning({ id: tags.id });
        resolvedTagIds.push(created.id);
      }
      const uniqueTagIds = [...new Set(resolvedTagIds)];
      if (uniqueTagIds.length) {
        await tx.insert(articleTags).values(uniqueTagIds.map((tagId) => ({ articleId: row.id, tagId, createdAt: now })));
      }
    }
    return row;
  });
}

const generationValue = (key: string, value: string) => sql`${articles.generationMeta}->>${key} = ${value}`;

export async function listPublishedArticles(limit = 24) {
  const db = requireDb(await getDb());
  return db.select({ id: articles.id, type: articles.contentType, slug: articles.slug, title: articles.title, excerpt: articles.excerpt,
    tipTopic: tipTopics.slug, coverImageUrl: articles.coverImageUrl, coverImageAlt: articles.coverImageAlt,
    coverImageVariants: sql<Record<string, string>>`coalesce(${articles.generationMeta}->'cover'->'variants', '{}'::jsonb)`, status: articles.status,
    publishedAt: articles.publishedAt, updatedAt: articles.updatedAt }).from(articles)
    .leftJoin(tipTopics, eq(articles.topicId, tipTopics.id)).where(and(eq(articles.status, "published"), isNotNull(articles.publishedAt)))
    .orderBy(desc(articles.publishedAt), desc(articles.id)).limit(limit);
}
export async function getPublishedArticleSlugs() { const db = requireDb(await getDb()); return db.select({ slug: articles.slug, updatedAt: articles.updatedAt }).from(articles).where(and(eq(articles.status, "published"), isNotNull(articles.publishedAt))).orderBy(desc(articles.publishedAt)); }
export async function getPublishedArticleBySlug(slug: string): Promise<ArticleRecord | null> {
  const db = requireDb(await getDb());
  const rows = await db.select({ article: articles, tipTopic: tipTopics.slug }).from(articles)
    .leftJoin(tipTopics, eq(articles.topicId, tipTopics.id))
    .where(and(eq(articles.slug, slug), eq(articles.status, "published"))).limit(1);
  if (!rows[0]) return null;
  const meta = (rows[0].article.generationMeta ?? {}) as Record<string, any>;
  return { ...rows[0].article, type: rows[0].article.contentType, bodyMd: rows[0].article.content,
    excerpt: rows[0].article.excerpt ?? "", tipTopic: rows[0].tipTopic, structured: meta.structured ?? null,
    sources: meta.sources ?? [], relatedTopics: meta.related_topics ?? [], coverImageVariants: meta.cover?.variants ?? {},
    coverImageSource: meta.cover?.source ?? null, coverImageIsAi: Boolean(meta.cover?.is_ai) } as ArticleRecord;
}
export async function getAgentArticleBySlug(slug: string): Promise<ArticleRecord | null> {
  const db = requireDb(await getDb());
  const rows = await db.select().from(articles).where(eq(articles.slug, slug)).limit(1);
  return rows[0] ?? null;
}
export async function getAgentArticleByTitle(title: string): Promise<ArticleRecord | null> {
  const db = requireDb(await getDb());
  const rows = await db.select().from(articles).where(ilike(articles.title, title)).orderBy(desc(articles.createdAt)).limit(1);
  return rows[0] ?? null;
}
export async function getArticleByIdempotencyKey(key: string): Promise<ArticleRecord | null> { const db = requireDb(await getDb()); const rows = await db.select().from(articles).where(generationValue("agent_idempotency_key", key)).limit(1); return rows[0] ?? null; }
export async function getArticleByTopicSlug(topicSlug: string): Promise<ArticleRecord | null> { const db = requireDb(await getDb()); const rows = await db.select().from(articles).where(generationValue("agent_topic_slug", topicSlug)).limit(1); return rows[0] ?? null; }
export const getAgentArticleByTopicSlug = getArticleByTopicSlug;
export async function countPublishedTipsSince(since: Date): Promise<number> { const db = requireDb(await getDb()); const rows = await db.select({ value: count() }).from(articles).where(and(eq(articles.contentType, "tip"), eq(articles.status, "published"), gte(articles.publishedAt, since))); return Number(rows[0]?.value ?? 0); }
export async function countAgentArticlesSince(status: "draft" | "published", since: Date): Promise<number> { const db = requireDb(await getDb()); const rows = await db.select({ value: count() }).from(articles).where(and(eq(articles.status, status), gte(status === "draft" ? articles.createdAt : articles.publishedAt, since))); return Number(rows[0]?.value ?? 0); }
