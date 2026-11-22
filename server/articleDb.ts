import { eq } from "drizzle-orm";
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

function requireDb(db: ArticleDb | null | undefined): ArticleDb {
  if (!db) throw new Error("A base de dados não está configurada.");
  return db;
}

export async function createArticle(
  input: ArticleInput,
  dbOverride?: ArticleDb
) {
  const db = requireDb(dbOverride ?? (await getDb()));

  return db.transaction(async tx => {
    const [existing] = await tx
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.slug, input.slug))
      .limit(1);
    if (existing) throw new ArticleSlugConflictError();

    let categoryId = input.categoryId ?? null;
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

    const topicId = input.topicId ?? null;
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

    const tags = input.tags.map(tag => tag.trim());
    if (tags.length > 0) {
      await tx
        .insert(articleTags)
        .values(tags.map(tag => ({ articleId: article.id, tag })));
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
