import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { RecipeInput } from "../shared/recipes";

export const userRole = pgEnum("user_role", ["user", "admin"]);
export const recipeStatus = pgEnum("recipe_status", [
  "draft",
  "published",
  "failed",
]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: userRole("role").default("user").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  lastSignedIn: timestamp("last_signed_in", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const s3Files = pgTable("s3_files", {
  id: serial("id").primaryKey(),
  objectKey: text("object_key").notNull().unique(),
  fileUrl: text("file_url").notNull(),
  alt: varchar("alt", { length: 180 }).notNull(),
  contentType: varchar("content_type", { length: 255 }),
  userId: varchar("user_id", { length: 128 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  eventType: varchar("event_type", { length: 120 }).notNull(),
  guests: varchar("guests", { length: 80 }).notNull(),
  desiredDate: varchar("desired_date", { length: 32 }),
  category: varchar("category", { length: 120 }).notNull(),
  details: text("details"),
  status: varchar("status", { length: 32 }).default("new").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const recipes = pgTable(
  "recipes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 180 }).notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    excerpt: varchar("excerpt", { length: 160 }).notNull(),
    category: varchar("category", { length: 80 }).notNull(),
    subcategory: varchar("subcategory", { length: 120 }),
    subcategorySlug: varchar("subcategory_slug", { length: 120 }),
    tags: text("tags").array().notNull().default([]),
    coverImageUrl: text("cover_image_url").notNull(),
    coverImageAlt: varchar("cover_image_alt", { length: 240 }).notNull(),
    imagePrompt: text("image_prompt").notNull().default(""),
    coverImageVariants: jsonb("cover_image_variants")
      .$type<RecipeInput["coverImageVariants"]>()
      .notNull()
      .default({}),
    ingredients: jsonb("ingredients")
      .$type<RecipeInput["ingredients"]>()
      .notNull()
      .default([]),
    steps: jsonb("steps").$type<RecipeInput["steps"]>().notNull().default([]),
    tips: jsonb("tips").$type<string[]>().notNull().default([]),
    storageNotes: text("storage_notes").notNull().default(""),
    faq: jsonb("faq").$type<RecipeInput["faq"]>().notNull().default([]),
    prepTimeMin: integer("prep_time_min").notNull(),
    cookTimeMin: integer("cook_time_min").notNull().default(0),
    servings: integer("servings").notNull(),
    difficulty: varchar("difficulty", { length: 24 }).notNull(),
    status: recipeStatus("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    aiModel: varchar("ai_model", { length: 120 }),
    generationMeta: jsonb("generation_meta")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  table => [
    uniqueIndex("recipes_slug_uidx").on(table.slug),
    index("recipes_status_published_at_idx").on(
      table.status,
      table.publishedAt.desc()
    ),
    index("recipes_category_idx").on(table.category),
    index("recipes_subcategory_slug_idx").on(table.subcategorySlug),
  ]
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name").notNull(),
    slug: varchar("slug").notNull(),
    parentId: uuid("parent_id"),
    active: boolean("active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  table => [
    foreignKey({
      name: "categories_parent_id_fkey",
      columns: [table.parentId],
      foreignColumns: [table.id],
    }).onDelete("restrict"),
    check(
      "categories_not_own_parent",
      sql`(${table.parentId} is null or ${table.parentId} <> ${table.id})`
    ),
    unique("categories_slug_key").on(table.slug),
    index("categories_parent_id_idx").on(table.parentId),
    index("categories_active_sort_idx").on(table.active, table.sortOrder),
  ]
);

export const tipTopics = pgTable(
  "tip_topics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name").notNull(),
    slug: varchar("slug").notNull(),
    description: text("description"),
    active: boolean("active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  table => [
    unique("tip_topics_slug_key").on(table.slug),
    index("tip_topics_active_sort_idx").on(table.active, table.sortOrder),
  ]
);

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title").notNull(),
    slug: varchar("slug").notNull(),
    excerpt: text("excerpt"),
    content: text("content").default("").notNull(),
    articleType: varchar("article_type").default("materia").notNull(),
    status: varchar("status").default("draft").notNull(),
    categoryId: uuid("category_id"),
    topicId: uuid("topic_id"),
    coverImageUrl: text("cover_image_url"),
    coverImageAlt: varchar("cover_image_alt"),
    seoTitle: varchar("seo_title"),
    seoDescription: varchar("seo_description"),
    author: varchar("author"),
    aiModel: varchar("ai_model"),
    generationMeta: jsonb("generation_meta")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  table => [
    foreignKey({
      name: "articles_category_id_fkey",
      columns: [table.categoryId],
      foreignColumns: [categories.id],
    }).onDelete("set null"),
    foreignKey({
      name: "articles_topic_id_fkey",
      columns: [table.topicId],
      foreignColumns: [tipTopics.id],
    }).onDelete("set null"),
    unique("articles_slug_key").on(table.slug),
    check(
      "articles_type_check",
      sql`${table.articleType} in ('dica', 'tecnica', 'materia')`
    ),
    check(
      "articles_status_check",
      sql`${table.status} in ('draft', 'published', 'archived')`
    ),
    index("articles_status_published_idx").on(
      table.status,
      table.publishedAt.desc()
    ),
    index("articles_type_status_idx").on(table.articleType, table.status),
    index("articles_category_id_idx").on(table.categoryId),
    index("articles_topic_id_idx").on(table.topicId),
    index("articles_created_at_idx").on(table.createdAt.desc()),
  ]
);

export const articleImages = pgTable(
  "article_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    articleId: uuid("article_id").notNull(),
    imageUrl: text("image_url").notNull(),
    altText: varchar("alt_text"),
    caption: text("caption"),
    position: integer("position").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  table => [
    foreignKey({
      name: "article_images_article_id_fkey",
      columns: [table.articleId],
      foreignColumns: [articles.id],
    }).onDelete("cascade"),
    index("article_images_article_position_idx").on(
      table.articleId,
      table.position
    ),
  ]
);

export const articleTags = pgTable(
  "article_tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    articleId: uuid("article_id").notNull(),
    tag: varchar("tag").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  table => [
    foreignKey({
      name: "article_tags_article_id_fkey",
      columns: [table.articleId],
      foreignColumns: [articles.id],
    }).onDelete("cascade"),
    unique("article_tags_unique").on(table.articleId, table.tag),
    index("article_tags_article_id_idx").on(table.articleId),
    index("article_tags_tag_idx").on(table.tag),
  ]
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type S3File = typeof s3Files.$inferSelect;
export type InsertS3File = typeof s3Files.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
export type Recipe = typeof recipes.$inferSelect;
export type InsertRecipe = typeof recipes.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;
export type TipTopic = typeof tipTopics.$inferSelect;
export type InsertTipTopic = typeof tipTopics.$inferInsert;
export type Article = typeof articles.$inferSelect;
export type InsertArticle = typeof articles.$inferInsert;
export type ArticleImage = typeof articleImages.$inferSelect;
export type InsertArticleImage = typeof articleImages.$inferInsert;
export type ArticleTag = typeof articleTags.$inferSelect;
export type InsertArticleTag = typeof articleTags.$inferInsert;
