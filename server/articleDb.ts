import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  lt,
  or,
  type SQL,
} from "drizzle-orm";
import {
  articleImages,
  articleTags,
  articles,
  categories,
  tipTopics,
} from "../drizzle/schema";
import type { ArticleInput } from "../shared/articles";
import { getDb } from "./db";

export type ArticleDb = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export type TipTopicSummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  articleCount: number;
};

export type TipArticleSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  articleType: "dica" | "tecnica";
  topic: { slug: string; name: string };
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  publishedAt: Date;
  updatedAt: Date;
};

export type TipArticleImage = {
  imageUrl: string;
  altText: string | null;
  caption: string | null;
  position: number;
};

export type TipArticleSource = {
  name: string;
  title: string;
  url: string;
};

export type TipArticleDetail = TipArticleSummary & {
  content: string;
  author: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  tags: string[];
  images: TipArticleImage[];
  sources: TipArticleSource[];
};

export type TipListParams = {
  limit: number;
  topic?: string;
  cursor?: string;
};

export type TipListResult = {
  items: TipArticleSummary[];
  nextCursor: string | null;
};

export class ArticleSlugConflictError extends Error {
  constructor() {
    super("Já existe um artigo com este slug.");
    this.name = "ArticleSlugConflictError";
  }
}

export class ArticleReferenceError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "ArticleReferenceError";
    this.code = code;
  }
}

export class InvalidTipCursorError extends Error {
  constructor() {
    super("Cursor de dicas inválido.");
    this.name = "InvalidTipCursorError";
  }
}

function requireDb(db: ArticleDb | null | undefined): ArticleDb {
  if (!db) throw new Error("A base de dados não está configurada.");
  return db;
}

const TIP_TYPES = ["dica", "tecnica"] as const;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type TipCursor = { publishedAt: Date; id: string };

function decodeTipCursor(value: string): TipCursor {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8")
    ) as { publishedAt?: unknown; id?: unknown };
    if (
      typeof parsed.publishedAt !== "string" ||
      typeof parsed.id !== "string" ||
      !UUID_PATTERN.test(parsed.id)
    ) {
      throw new InvalidTipCursorError();
    }
    const publishedAt = new Date(parsed.publishedAt);
    if (Number.isNaN(publishedAt.getTime())) {
      throw new InvalidTipCursorError();
    }
    return { publishedAt, id: parsed.id };
  } catch (error) {
    if (error instanceof InvalidTipCursorError) throw error;
    throw new InvalidTipCursorError();
  }
}

function encodeTipCursor(article: { publishedAt: Date; id: string }): string {
  return Buffer.from(
    JSON.stringify({
      publishedAt: article.publishedAt.toISOString(),
      id: article.id,
    }),
    "utf8"
  ).toString("base64url");
}

function publishedTipFilters(): SQL[] {
  return [
    eq(tipTopics.active, true),
    inArray(articles.articleType, [...TIP_TYPES]),
    eq(articles.status, "published"),
    isNotNull(articles.publishedAt),
  ];
}

export async function listActiveTipTopics(
  dbOverride?: ArticleDb
): Promise<TipTopicSummary[]> {
  const db = requireDb(dbOverride ?? (await getDb()));
  const rows = await db
    .select({
      id: tipTopics.id,
      slug: tipTopics.slug,
      name: tipTopics.name,
      description: tipTopics.description,
      articleCount: count(articles.id),
    })
    .from(tipTopics)
    .leftJoin(
      articles,
      and(
        eq(articles.topicId, tipTopics.id),
        inArray(articles.articleType, [...TIP_TYPES]),
        eq(articles.status, "published"),
        isNotNull(articles.publishedAt)
      )
    )
    .where(eq(tipTopics.active, true))
    .groupBy(
      tipTopics.id,
      tipTopics.slug,
      tipTopics.name,
      tipTopics.description,
      tipTopics.sortOrder
    )
    .orderBy(asc(tipTopics.sortOrder), asc(tipTopics.name));

  return rows.map((row) => ({
    ...row,
    articleCount: Number(row.articleCount),
  }));
}

export async function listPublishedTips(
  params: TipListParams,
  dbOverride?: ArticleDb
): Promise<TipListResult> {
  const db = requireDb(dbOverride ?? (await getDb()));
  const filters = publishedTipFilters();

  if (params.topic) {
    filters.push(eq(tipTopics.slug, params.topic));
  }

  if (params.cursor) {
    const cursor = decodeTipCursor(params.cursor);
    filters.push(
      or(
        lt(articles.publishedAt, cursor.publishedAt),
        and(
          eq(articles.publishedAt, cursor.publishedAt),
          lt(articles.id, cursor.id)
        )
      )!
    );
  }

  const rows = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      articleType: articles.articleType,
      topicSlug: tipTopics.slug,
      topicName: tipTopics.name,
      coverImageUrl: articles.coverImageUrl,
      coverImageAlt: articles.coverImageAlt,
      publishedAt: articles.publishedAt,
      updatedAt: articles.updatedAt,
    })
    .from(articles)
    .innerJoin(tipTopics, eq(articles.topicId, tipTopics.id))
    .where(and(...filters))
    .orderBy(desc(articles.publishedAt), desc(articles.id))
    .limit(params.limit + 1);

  const hasMore = rows.length > params.limit;
  const visibleRows = rows.slice(0, params.limit);
  const articlesMissingCover = visibleRows
    .filter((row) => !row.coverImageUrl)
    .map((row) => row.id);
  const fallbackImages = new Map<
    string,
    { imageUrl: string; altText: string | null }
  >();

  if (articlesMissingCover.length > 0) {
    const imageRows = await db
      .select({
        articleId: articleImages.articleId,
        imageUrl: articleImages.imageUrl,
        altText: articleImages.altText,
      })
      .from(articleImages)
      .where(inArray(articleImages.articleId, articlesMissingCover))
      .orderBy(asc(articleImages.position), asc(articleImages.createdAt));

    for (const image of imageRows) {
      if (!fallbackImages.has(image.articleId)) {
        fallbackImages.set(image.articleId, {
          imageUrl: image.imageUrl,
          altText: image.altText,
        });
      }
    }
  }

  const items: TipArticleSummary[] = visibleRows.map((row) => {
    const fallback = fallbackImages.get(row.id);
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      articleType: row.articleType as "dica" | "tecnica",
      topic: { slug: row.topicSlug, name: row.topicName },
      coverImageUrl: row.coverImageUrl ?? fallback?.imageUrl ?? null,
      coverImageAlt: row.coverImageAlt ?? fallback?.altText ?? null,
      publishedAt: row.publishedAt as Date,
      updatedAt: row.updatedAt,
    };
  });

  const last = visibleRows[visibleRows.length - 1];
  return {
    items,
    nextCursor:
      hasMore && last?.publishedAt
        ? encodeTipCursor({ id: last.id, publishedAt: last.publishedAt })
        : null,
  };
}

function readSources(metadata: Record<string, unknown>): TipArticleSource[] {
  const value = metadata.sources;
  if (!Array.isArray(value)) return [];

  return value.flatMap((item): TipArticleSource[] => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const source = item as Record<string, unknown>;
    const name = typeof source.name === "string" ? source.name.trim() : "";
    const title = typeof source.title === "string" ? source.title.trim() : "";
    const url = typeof source.url === "string" ? source.url.trim() : "";

    if (!name || !title || !url) return [];
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return [];
    } catch {
      return [];
    }
    return [{ name, title, url }];
  });
}

export async function getPublishedTipBySlug(
  slug: string,
  dbOverride?: ArticleDb
): Promise<TipArticleDetail | null> {
  const db = requireDb(dbOverride ?? (await getDb()));
  const rows = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      articleType: articles.articleType,
      content: articles.content,
      topicSlug: tipTopics.slug,
      topicName: tipTopics.name,
      coverImageUrl: articles.coverImageUrl,
      coverImageAlt: articles.coverImageAlt,
      publishedAt: articles.publishedAt,
      updatedAt: articles.updatedAt,
      author: articles.author,
      seoTitle: articles.seoTitle,
      seoDescription: articles.seoDescription,
      generationMeta: articles.generationMeta,
    })
    .from(articles)
    .innerJoin(tipTopics, eq(articles.topicId, tipTopics.id))
    .where(
      and(
        eq(articles.slug, slug),
        eq(tipTopics.active, true),
        inArray(articles.articleType, [...TIP_TYPES]),
        eq(articles.status, "published"),
        isNotNull(articles.publishedAt)
      )
    )
    .limit(1);

  const row = rows[0];
  if (!row || !row.publishedAt) return null;

  const [imageRows, tagRows] = await Promise.all([
    db
      .select({
        imageUrl: articleImages.imageUrl,
        altText: articleImages.altText,
        caption: articleImages.caption,
        position: articleImages.position,
      })
      .from(articleImages)
      .where(eq(articleImages.articleId, row.id))
      .orderBy(asc(articleImages.position)),
    db
      .select({ tag: articleTags.tag })
      .from(articleTags)
      .where(eq(articleTags.articleId, row.id))
      .orderBy(asc(articleTags.tag)),
  ]);

  const images = imageRows.map((image) => ({
    imageUrl: image.imageUrl,
    altText: image.altText,
    caption: image.caption,
    position: image.position,
  }));
  const metadata =
    row.generationMeta && typeof row.generationMeta === "object"
      ? row.generationMeta
      : {};

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    articleType: row.articleType as "dica" | "tecnica",
    topic: { slug: row.topicSlug, name: row.topicName },
    coverImageUrl: row.coverImageUrl ?? images[0]?.imageUrl ?? null,
    coverImageAlt: row.coverImageAlt ?? images[0]?.altText ?? null,
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
    content: row.content,
    author: row.author,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    tags: tagRows.map((item) => item.tag),
    images,
    sources: readSources(metadata),
  };
}

export async function createArticle(
  input: ArticleInput,
  dbOverride?: ArticleDb
) {
  const db = requireDb(dbOverride ?? (await getDb()));

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.slug, input.slug))
      .limit(1);
    if (existing) throw new ArticleSlugConflictError();

    let categoryId = input.categoryId ?? null;
    if (!categoryId && input.categorySlug) {
      const [bySlug] = await tx
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, input.categorySlug))
        .limit(1);
      if (!bySlug) {
        throw new ArticleReferenceError(
          "A categoria indicada não existe.",
          "category_not_found"
        );
      }
      categoryId = bySlug.id;
    }
    if (categoryId) {
      const [category] = await tx
        .select({ id: categories.id, parentId: categories.parentId })
        .from(categories)
        .where(eq(categories.id, categoryId))
        .limit(1);
      if (!category) {
        throw new ArticleReferenceError(
          "A categoria indicada não existe.",
          "category_not_found"
        );
      }

      if (category.parentId) {
        const [parent] = await tx
          .select({ id: categories.id, parentId: categories.parentId })
          .from(categories)
          .where(eq(categories.id, category.parentId))
          .limit(1);
        if (!parent) {
          throw new ArticleReferenceError(
            "A categoria-pai indicada não existe.",
            "category_parent_not_found"
          );
        }
        if (parent.parentId) {
          throw new ArticleReferenceError(
            "A categoria ultrapassa o limite de dois níveis.",
            "category_depth_exceeded"
          );
        }
      }
    }

    let topicId = input.topicId ?? null;
    if (!topicId && input.topicSlug) {
      const [bySlug] = await tx
        .select({ id: tipTopics.id })
        .from(tipTopics)
        .where(eq(tipTopics.slug, input.topicSlug))
        .limit(1);
      if (!bySlug) {
        throw new ArticleReferenceError(
          "O tópico indicado não existe.",
          "topic_not_found"
        );
      }
      topicId = bySlug.id;
    }
    if (topicId) {
      const [topic] = await tx
        .select({ id: tipTopics.id })
        .from(tipTopics)
        .where(eq(tipTopics.id, topicId))
        .limit(1);
      if (!topic) {
        throw new ArticleReferenceError(
          "O tópico indicado não existe.",
          "topic_not_found"
        );
      }
    }

    const now = new Date();
    const publishedAt = input.status === "published" ? now : null;
    const [article] = await tx
      .insert(articles)
      .values({
        title: input.title,
        slug: input.slug,
        excerpt: input.excerpt ?? null,
        content: input.content,
        articleType: input.articleType,
        status: input.status,
        categoryId,
        topicId,
        coverImageUrl: input.coverImageUrl ?? null,
        coverImageAlt: input.coverImageAlt ?? null,
        seoTitle: input.seoTitle ?? null,
        seoDescription: input.seoDescription ?? null,
        author: input.author ?? null,
        aiModel: input.aiModel ?? null,
        generationMeta: input.generationMeta,
        publishedAt,
        updatedAt: now,
      })
      .returning();

    if (!article)
      throw new Error("A inserção do artigo não devolveu um registo.");

    const tags = input.tags.map((tag) => tag.trim());
    if (tags.length > 0) {
      await tx
        .insert(articleTags)
        .values(tags.map((tag) => ({ articleId: article.id, tag })));
    }

    const images = input.images.map((image, position) => ({
      articleId: article.id,
      imageUrl: image.imageUrl,
      altText: image.altText ?? null,
      caption: image.caption ?? null,
      position: image.position ?? position,
    }));
    if (images.length > 0) {
      await tx.insert(articleImages).values(images);
    }

    return { ...article, tags, images };
  });
}
