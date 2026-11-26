import { sql } from "drizzle-orm";
import { getDb } from "./db";
import type { PublishedArticleSummary } from "../shared/tipTopics";

const ARTICLE_TYPES = ["article", "tip", "technique", "news"] as const;
type ArticleType = (typeof ARTICLE_TYPES)[number];

export async function listPublishedArticles(limit = 24, contentType?: ArticleType): Promise<PublishedArticleSummary[]> {
  const db = await getDb();
  if (!db) throw new Error("A base de dados não está configurada");

  const typeFilter = contentType
    ? sql`AND a.content_type = ${contentType}`
    : sql``;
  const result = await db.execute(sql`
    SELECT
      a.id::text AS id,
      a.content_type AS type,
      a.status,
      a.slug,
      a.title,
      a.excerpt,
      t.slug AS "tipTopic",
      a.cover_image_url AS "coverImageUrl",
      a.cover_image_alt AS "coverImageAlt",
      COALESCE(a.generation_meta->'cover'->'variants', '{}'::jsonb) AS "coverImageVariants",
      a.published_at AS "publishedAt",
      a.updated_at AS "updatedAt"
    FROM articles AS a
    LEFT JOIN tip_topics AS t ON t.id = a.topic_id
    WHERE a.status = 'published'
      AND a.published_at IS NOT NULL
      ${typeFilter}
    ORDER BY a.published_at DESC, a.id DESC
    LIMIT ${limit}
  `);

  return Array.from(result as unknown as Iterable<PublishedArticleSummary>);
}

export function isArticleType(value: string): value is ArticleType {
  return ARTICLE_TYPES.includes(value as ArticleType);
}
