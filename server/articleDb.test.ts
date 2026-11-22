import { describe, expect, it, vi } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import * as schema from "../drizzle/schema";
import {
  articleImages,
  articleTags,
  articles,
  categories,
  tipTopics,
} from "../drizzle/schema";
import { articleInputSchema } from "../shared/articles";
import { createArticle, type ArticleDb } from "./articleDb";

const categoryId = "00000000-0000-4000-8000-000000000001";
const parentId = "00000000-0000-4000-8000-000000000002";
const rootId = "00000000-0000-4000-8000-000000000003";
const topicId = "00000000-0000-4000-8000-000000000004";
const articleId = "00000000-0000-4000-8000-000000000005";

function input(overrides: Record<string, unknown> = {}) {
  return articleInputSchema.parse({
    title: "Artigo de teste",
    slug: "artigo-de-teste",
    content: "Conteúdo em Markdown.",
    articleType: "dica",
    ...overrides,
  });
}

function fakeDb(selectResults: unknown[][] = []) {
  const pendingSelects = [...selectResults];
  const inserts: Array<{ table: unknown; values: unknown }> = [];
  let transactionCalls = 0;
  const db: any = {};
  db.select = () => ({
    from: () => ({
      where: () => ({
        limit: async () => pendingSelects.shift() ?? [],
      }),
    }),
  });
  db.insert = (table: unknown) => ({
    values: (values: unknown) => {
      inserts.push({ table, values });
      return {
        returning: async () => [{ ...(values as object), id: articleId }],
      };
    },
  });
  db.transaction = async (callback: (tx: unknown) => Promise<unknown>) => {
    transactionCalls += 1;
    return callback(db);
  };
  return {
    db: db as ArticleDb,
    inserts,
    transactionCalls: () => transactionCalls,
  };
}

describe("editorial Drizzle schema", () => {
  it("corresponds to the five editorial tables confirmed in Neon, without inventing images", () => {
    expect(
      getTableConfig(categories).columns.map(column => column.name)
    ).toEqual([
      "id",
      "name",
      "slug",
      "parent_id",
      "active",
      "sort_order",
      "created_at",
      "updated_at",
    ]);
    expect(
      getTableConfig(tipTopics).columns.map(column => column.name)
    ).toEqual([
      "id",
      "name",
      "slug",
      "description",
      "active",
      "sort_order",
      "created_at",
      "updated_at",
    ]);
    expect(getTableConfig(articles).columns.map(column => column.name)).toEqual(
      [
        "id",
        "title",
        "slug",
        "excerpt",
        "content",
        "article_type",
        "status",
        "category_id",
        "topic_id",
        "cover_image_url",
        "cover_image_alt",
        "seo_title",
        "seo_description",
        "author",
        "ai_model",
        "generation_meta",
        "published_at",
        "created_at",
        "updated_at",
      ]
    );
    expect(
      getTableConfig(articleImages).columns.map(column => column.name)
    ).toEqual([
      "id",
      "article_id",
      "image_url",
      "alt_text",
      "caption",
      "position",
      "created_at",
    ]);
    expect(
      getTableConfig(articleTags).columns.map(column => column.name)
    ).toEqual(["id", "article_id", "tag", "created_at"]);
    expect(
      getTableConfig(articles)
        .checks.map(item => item.name)
        .sort()
    ).toEqual(["articles_status_check", "articles_type_check"]);
    expect(getTableConfig(articles).foreignKeys).toHaveLength(2);
    expect(getTableConfig(articleImages).foreignKeys).toHaveLength(1);
    expect(getTableConfig(articleTags).foreignKeys).toHaveLength(1);
    const articleConfig = getTableConfig(articles);
    const articleColumns = new Map(
      articleConfig.columns.map(column => [column.name, column])
    );
    expect(articleColumns.get("id")?.getSQLType()).toBe("uuid");
    expect(articleColumns.get("id")?.hasDefault).toBe(true);
    expect(articleColumns.get("article_type")?.getSQLType()).toBe("varchar");
    expect(articleColumns.get("status")?.getSQLType()).toBe("varchar");
    expect(articleColumns.get("published_at")?.notNull).toBe(false);
    expect(articleConfig.uniqueConstraints.map(item => item.name)).toEqual([
      "articles_slug_key",
    ]);
    expect(articleConfig.indexes.map(item => item.config.name)).toEqual([
      "articles_status_published_idx",
      "articles_type_status_idx",
      "articles_category_id_idx",
      "articles_topic_id_idx",
      "articles_created_at_idx",
    ]);
    expect(
      getTableConfig(articleTags).uniqueConstraints.map(item => item.name)
    ).toEqual(["article_tags_unique"]);
    expect(getTableConfig(categories).foreignKeys[0]?.onDelete).toBe(
      "restrict"
    );
    expect(articleConfig.foreignKeys.map(item => item.onDelete).sort()).toEqual(
      ["set null", "set null"]
    );
    expect(getTableConfig(articleImages).foreignKeys[0]?.onDelete).toBe(
      "cascade"
    );
    expect(getTableConfig(articleTags).foreignKeys[0]?.onDelete).toBe(
      "cascade"
    );
    expect("images" in schema).toBe(false);
  });
});

describe("createArticle transaction", () => {
  it("persists a draft and leaves published_at null in one transaction", async () => {
    const fake = fakeDb([[]]);
    const result = await createArticle(input({ status: "draft" }), fake.db);

    expect(fake.transactionCalls()).toBe(1);
    expect(result.status).toBe("draft");
    expect(result.publishedAt).toBeNull();
    expect(fake.inserts.map(item => item.table)).toEqual([articles]);
  });

  it("sets published_at for published articles and persists category, topic, tags and images transactionally", async () => {
    const fake = fakeDb([
      [],
      [{ id: categoryId, parentId: null }],
      [{ id: topicId }],
    ]);
    const result = await createArticle(
      input({
        status: "published",
        articleType: "tecnica",
        categoryId,
        topicId,
        tags: ["chocolate", "técnica"],
        images: [
          {
            imageUrl: "https://example.com/tecnica.jpg",
            altText: "Chocolate temperado",
            caption: "Exemplo",
            position: 2,
          },
        ],
      }),
      fake.db
    );

    expect(fake.transactionCalls()).toBe(1);
    expect(result.publishedAt).toBeInstanceOf(Date);
    expect(result.categoryId).toBe(categoryId);
    expect(result.topicId).toBe(topicId);
    expect(fake.inserts.map(item => item.table)).toEqual([
      articles,
      articleTags,
      articleImages,
    ]);
    expect(fake.inserts[1]?.values).toEqual([
      { articleId, tag: "chocolate" },
      { articleId, tag: "técnica" },
    ]);
    expect(fake.inserts[2]?.values).toEqual([
      {
        articleId,
        imageUrl: "https://example.com/tecnica.jpg",
        altText: "Chocolate temperado",
        caption: "Exemplo",
        position: 2,
      },
    ]);
  });

  it("rejects a duplicate slug before inserting any row", async () => {
    const fake = fakeDb([[{ id: articleId }]]);
    await expect(createArticle(input(), fake.db)).rejects.toMatchObject({
      name: "ArticleSlugConflictError",
    });
    expect(fake.transactionCalls()).toBe(1);
    expect(fake.inserts).toHaveLength(0);
  });

  it("rejects missing categories and topics", async () => {
    const missingCategory = fakeDb([[], []]);
    await expect(
      createArticle(input({ categoryId }), missingCategory.db)
    ).rejects.toMatchObject({ code: "category_not_found" });

    const missingTopic = fakeDb([[], [{ id: categoryId, parentId: null }], []]);
    await expect(
      createArticle(input({ categoryId, topicId }), missingTopic.db)
    ).rejects.toMatchObject({ code: "topic_not_found" });
  });

  it("rejects a category whose parent is itself a subcategory", async () => {
    const fake = fakeDb([
      [],
      [{ id: categoryId, parentId }],
      [{ id: parentId, parentId: rootId }],
    ]);
    await expect(
      createArticle(input({ categoryId }), fake.db)
    ).rejects.toMatchObject({ code: "category_depth_exceeded" });
    expect(fake.inserts).toHaveLength(0);
  });

  it("accepts one subcategory level under a top-level category", async () => {
    const fake = fakeDb([
      [],
      [{ id: categoryId, parentId }],
      [{ id: parentId, parentId: null }],
    ]);
    const result = await createArticle(input({ categoryId }), fake.db);
    expect(result.categoryId).toBe(categoryId);
    expect(fake.inserts).toHaveLength(1);
  });

  it("does not access a database for the API contract's three allowed article types", () => {
    for (const articleType of ["dica", "tecnica", "materia"] as const) {
      expect(input({ articleType }).articleType).toBe(articleType);
    }
  });
});
