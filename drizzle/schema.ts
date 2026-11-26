import {
  bigint,
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { RecipeInput } from "../shared/recipes";

export const userRole = pgEnum("user_role", ["user", "admin"]);
export const recipeStatus = pgEnum("recipe_status", ["draft", "published", "failed"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: userRole("role").default("user").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in", { withTimezone: true }).defaultNow().notNull(),
});

export const s3Files = pgTable("s3_files", {
  id: serial("id").primaryKey(),
  objectKey: text("object_key").notNull().unique(),
  fileUrl: text("file_url").notNull(),
  alt: varchar("alt", { length: 180 }).notNull(),
  contentType: varchar("content_type", { length: 255 }),
  userId: varchar("user_id", { length: 128 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const authors = pgTable("authors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  slug: varchar("slug", { length: 180 }).notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  role: varchar("role", { length: 80 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("authors_slug_key").on(table.slug),
]);

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("tags_slug_key").on(table.slug),
]);

export const tipTopics = pgTable("tip_topics", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  slug: varchar("slug", { length: 180 }).notNull(),
  description: text("description"),
  active: boolean("active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("tip_topics_slug_key").on(table.slug),
]);

export const images = pgTable("images", {
  id: uuid("id").defaultRandom().primaryKey(),
  fileUrl: text("file_url").notNull(),
  storageKey: text("storage_key"),
  fileName: varchar("file_name", { length: 255 }),
  altText: varchar("alt_text", { length: 240 }),
  caption: text("caption"),
  contentType: varchar("content_type", { length: 120 }),
  fileSize: bigint("file_size", { mode: "number" }),
  width: integer("width"),
  height: integer("height"),
  imageType: varchar("image_type", { length: 40 }).default("general").notNull(),
  sourceType: varchar("source_type", { length: 40 }).default("uploaded").notNull(),
  generationMeta: jsonb("generation_meta").$type<Record<string, unknown>>(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("images_storage_key_key").on(table.storageKey),
  index("images_active_idx").on(table.active),
  index("images_image_type_idx").on(table.imageType),
]);

export const recipes = pgTable("recipes", {
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
  coverImageVariants: jsonb("cover_image_variants").$type<RecipeInput["coverImageVariants"]>().notNull().default({}),
  ingredients: jsonb("ingredients").$type<RecipeInput["ingredients"]>().notNull().default([]),
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
  generationMeta: jsonb("generation_meta").$type<Record<string, unknown>>().notNull().default({}),
  authorId: integer("author_id"),
  metaTitle: varchar("meta_title", { length: 180 }),
  metaDescription: varchar("meta_description", { length: 320 }),
  canonicalUrl: text("canonical_url"),
  sourceType: varchar("source_type", { length: 40 }),
  sourceReference: text("source_reference"),
  reviewStatus: varchar("review_status", { length: 32 }).default("pending").notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: integer("reviewed_by"),
  nutrition: jsonb("nutrition").$type<Record<string, unknown>>(),
  allergenInfo: jsonb("allergen_info").$type<Record<string, unknown>>(),
  updatedBy: integer("updated_by"),
  agentTopicSlug: varchar("agent_topic_slug"),
  agentIdempotencyKey: varchar("agent_idempotency_key"),
  agentRequestHash: varchar("agent_request_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("recipes_slug_uidx").on(table.slug),
  uniqueIndex("recipes_agent_idempotency_key_uidx").on(table.agentIdempotencyKey),
  index("recipes_author_id_idx").on(table.authorId),
  index("recipes_category_idx").on(table.category),
  index("recipes_review_status_idx").on(table.reviewStatus),
  index("recipes_status_published_at_idx").on(table.status, table.publishedAt.desc()),
  index("recipes_subcategory_slug_idx").on(table.subcategorySlug),
  foreignKey({ name: "recipes_author_id_fkey", columns: [table.authorId], foreignColumns: [authors.id] }),
  foreignKey({ name: "recipes_reviewed_by_fkey", columns: [table.reviewedBy], foreignColumns: [users.id] }),
  foreignKey({ name: "recipes_updated_by_fkey", columns: [table.updatedBy], foreignColumns: [users.id] }),
]);

export const tips = pgTable("tips", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 180 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  tipType: varchar("tip_type", { length: 32 }).default("dica").notNull(),
  topicId: integer("topic_id"),
  authorId: integer("author_id"),
  coverImageUrl: text("cover_image_url"),
  coverImageAlt: varchar("cover_image_alt", { length: 240 }),
  metaTitle: varchar("meta_title", { length: 180 }),
  metaDescription: varchar("meta_description", { length: 320 }),
  canonicalUrl: text("canonical_url"),
  tags: text("tags").array().default([]),
  generationMeta: jsonb("generation_meta").$type<Record<string, unknown>>(),
  status: varchar("status", { length: 32 }).default("draft").notNull(),
  reviewStatus: varchar("review_status", { length: 32 }).default("pending").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  agentIdempotencyKey: varchar("agent_idempotency_key", { length: 128 }),
  agentTopicSlug: varchar("agent_topic_slug", { length: 180 }),
  agentRequestHash: varchar("agent_request_hash", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("tips_slug_key").on(table.slug),
  uniqueIndex("tips_agent_idempotency_key_uidx").on(table.agentIdempotencyKey),
  index("tips_author_id_idx").on(table.authorId),
  index("tips_review_status_idx").on(table.reviewStatus),
  index("tips_status_published_at_idx").on(table.status, table.publishedAt.desc()),
  index("tips_tip_type_idx").on(table.tipType),
  index("tips_topic_id_idx").on(table.topicId),
  foreignKey({ name: "tips_author_id_fkey", columns: [table.authorId], foreignColumns: [authors.id] }),
  foreignKey({ name: "tips_topic_id_fkey", columns: [table.topicId], foreignColumns: [tipTopics.id] }),
]);

export const tipImages = pgTable("tip_images", {
  id: serial("id").primaryKey(),
  tipId: uuid("tip_id").notNull(),
  imageId: uuid("image_id"),
  imageUrl: text("image_url"),
  altText: varchar("alt_text", { length: 240 }),
  caption: text("caption"),
  imageRole: varchar("image_role", { length: 40 }).default("inline").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("tip_images_image_id_idx").on(table.imageId),
  index("tip_images_tip_id_idx").on(table.tipId),
  foreignKey({ name: "tip_images_tip_id_fkey", columns: [table.tipId], foreignColumns: [tips.id] }),
  foreignKey({ name: "tip_images_image_id_fkey", columns: [table.imageId], foreignColumns: [images.id] }),
]);

export const tipTags = pgTable("tip_tags", {
  tipId: uuid("tip_id").notNull(),
  tagId: integer("tag_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ name: "tip_tags_pkey", columns: [table.tipId, table.tagId] }),
  index("tip_tags_tag_id_idx").on(table.tagId),
  foreignKey({ name: "tip_tags_tip_id_fkey", columns: [table.tipId], foreignColumns: [tips.id] }),
  foreignKey({ name: "tip_tags_tag_id_fkey", columns: [table.tagId], foreignColumns: [tags.id] }),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type S3File = typeof s3Files.$inferSelect;
export type InsertS3File = typeof s3Files.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
export type Author = typeof authors.$inferSelect;
export type InsertAuthor = typeof authors.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;
export type TipTopic = typeof tipTopics.$inferSelect;
export type InsertTipTopic = typeof tipTopics.$inferInsert;
export type Image = typeof images.$inferSelect;
export type InsertImage = typeof images.$inferInsert;
export type Recipe = typeof recipes.$inferSelect;
export type InsertRecipe = typeof recipes.$inferInsert;
export type Tip = typeof tips.$inferSelect;
export type InsertTip = typeof tips.$inferInsert;
export type TipImage = typeof tipImages.$inferSelect;
export type InsertTipImage = typeof tipImages.$inferInsert;
export type TipTag = typeof tipTags.$inferSelect;
export type InsertTipTag = typeof tipTags.$inferInsert;
