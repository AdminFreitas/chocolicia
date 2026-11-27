import { sql } from "drizzle-orm";
import {
  check,
  bigint,
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
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
  agentTopicSlug: varchar("agent_topic_slug", { length: 180 }),
  agentIdempotencyKey: varchar("agent_idempotency_key", { length: 128 }),
  agentRequestHash: varchar("agent_request_hash", { length: 64 }),
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

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  parentId: integer("parent_id"),
  sortOrder: integer("sort_order").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  riskLevel: varchar("risk_level", { length: 10 }),
  agentEnabled: boolean("agent_enabled").default(false).notNull(),
  description: text("description"),
  seoTitle: varchar("seo_title", { length: 180 }),
  seoDescription: varchar("seo_description", { length: 320 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("categories_slug_key").on(table.slug),
  index("idx_categories_parent_id").on(table.parentId),
  index("idx_categories_active").on(table.active),
  index("idx_categories_agent_enabled").on(table.agentEnabled),
  foreignKey({ name: "categories_parent_id_fkey", columns: [table.parentId], foreignColumns: [table.id] }),
  check("categories_risk_level_check", sql`${table.riskLevel} is null or ${table.riskLevel} in ('low', 'medium', 'high')`),
]);

export const contentRelations = pgTable("content_relations", {
  id: serial("id").primaryKey(),
  recipeId: uuid("recipe_id"),
  tipId: uuid("tip_id"),
  relationType: varchar("relation_type", { length: 40 }).default("related").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("content_relations_recipe_id_idx").on(table.recipeId),
  index("content_relations_tip_id_idx").on(table.tipId),
  foreignKey({ name: "content_relations_recipe_id_fkey", columns: [table.recipeId], foreignColumns: [recipes.id], onDelete: "cascade" }),
  foreignKey({ name: "content_relations_tip_id_fkey", columns: [table.tipId], foreignColumns: [tips.id], onDelete: "cascade" }),
  check("content_relations_source_check", sql`${table.recipeId} is not null or ${table.tipId} is not null`),
  check("content_relations_type_check", sql`${table.relationType} in ('related', 'complementary', 'recommended', 'tutorial')`),
]);

export const contentReports = pgTable("content_reports", {
  id: serial("id").primaryKey(),
  recipeId: uuid("recipe_id"),
  tipId: uuid("tip_id"),
  reportType: varchar("report_type", { length: 50 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 30 }).default("open").notNull(),
  resolution: text("resolution"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
}, (table) => [
  index("content_reports_status_idx").on(table.status),
  index("content_reports_recipe_id_idx").on(table.recipeId),
  index("content_reports_tip_id_idx").on(table.tipId),
  foreignKey({ name: "content_reports_recipe_id_fkey", columns: [table.recipeId], foreignColumns: [recipes.id], onDelete: "cascade" }),
  foreignKey({ name: "content_reports_tip_id_fkey", columns: [table.tipId], foreignColumns: [tips.id], onDelete: "cascade" }),
  check("content_reports_status_check", sql`${table.status} in ('open', 'in_review', 'resolved', 'dismissed')`),
  check("content_reports_target_check", sql`${table.recipeId} is not null or ${table.tipId} is not null`),
]);

export const ingredients = pgTable("ingredients", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull(),
  category: varchar("category", { length: 100 }),
  notes: text("notes"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("ingredients_slug_key").on(table.slug),
  uniqueIndex("ingredients_name_lower_uidx").on(sql`lower(${table.name})`),
]);

export const ingredientAliases = pgTable("ingredient_aliases", {
  id: serial("id").primaryKey(),
  ingredientId: integer("ingredient_id").notNull(),
  alias: varchar("alias", { length: 180 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("ingredient_aliases_ingredient_id_idx").on(table.ingredientId),
  uniqueIndex("ingredient_aliases_alias_lower_uidx").on(sql`lower(${table.alias})`),
  foreignKey({ name: "ingredient_aliases_ingredient_id_fkey", columns: [table.ingredientId], foreignColumns: [ingredients.id], onDelete: "cascade" }),
]);

export const recipeImages = pgTable("recipe_images", {
  id: serial("id").primaryKey(),
  recipeId: uuid("recipe_id").notNull(),
  imageId: uuid("image_id"),
  imageUrl: text("image_url"),
  altText: varchar("alt_text", { length: 300 }),
  caption: text("caption"),
  imageRole: varchar("image_role", { length: 40 }).default("step").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("recipe_images_recipe_id_idx").on(table.recipeId),
  index("recipe_images_image_id_idx").on(table.imageId),
  foreignKey({ name: "recipe_images_recipe_id_fkey", columns: [table.recipeId], foreignColumns: [recipes.id], onDelete: "cascade" }),
  foreignKey({ name: "recipe_images_image_id_fkey", columns: [table.imageId], foreignColumns: [images.id], onDelete: "set null" }),
]);

export const recipeIngredients = pgTable("recipe_ingredients", {
  id: serial("id").primaryKey(),
  recipeId: uuid("recipe_id").notNull(),
  ingredientId: integer("ingredient_id").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 3 }),
  quantityText: varchar("quantity_text", { length: 120 }),
  unit: varchar("unit", { length: 50 }),
  preparation: text("preparation"),
  groupName: varchar("group_name", { length: 120 }),
  isOptional: boolean("is_optional").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("recipe_ingredients_recipe_id_idx").on(table.recipeId),
  index("recipe_ingredients_ingredient_id_idx").on(table.ingredientId),
  index("recipe_ingredients_sort_order_idx").on(table.recipeId, table.sortOrder),
  foreignKey({ name: "recipe_ingredients_recipe_id_fkey", columns: [table.recipeId], foreignColumns: [recipes.id], onDelete: "cascade" }),
  foreignKey({ name: "recipe_ingredients_ingredient_id_fkey", columns: [table.ingredientId], foreignColumns: [ingredients.id] }),
]);

export const recipeTags = pgTable("recipe_tags", {
  recipeId: uuid("recipe_id").notNull(),
  tagId: integer("tag_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ name: "recipe_tags_pkey", columns: [table.recipeId, table.tagId] }),
  index("idx_recipe_tags_tag_id").on(table.tagId),
  foreignKey({ name: "recipe_tags_recipe_id_fkey", columns: [table.recipeId], foreignColumns: [recipes.id], onDelete: "cascade" }),
  foreignKey({ name: "recipe_tags_tag_id_fkey", columns: [table.tagId], foreignColumns: [tags.id], onDelete: "cascade" }),
]);

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;
export type ContentRelation = typeof contentRelations.$inferSelect;
export type InsertContentRelation = typeof contentRelations.$inferInsert;
export type ContentReport = typeof contentReports.$inferSelect;
export type InsertContentReport = typeof contentReports.$inferInsert;
export type Ingredient = typeof ingredients.$inferSelect;
export type InsertIngredient = typeof ingredients.$inferInsert;
export type IngredientAlias = typeof ingredientAliases.$inferSelect;
export type InsertIngredientAlias = typeof ingredientAliases.$inferInsert;
export type RecipeImage = typeof recipeImages.$inferSelect;
export type InsertRecipeImage = typeof recipeImages.$inferInsert;
export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type InsertRecipeIngredient = typeof recipeIngredients.$inferInsert;
export type RecipeTag = typeof recipeTags.$inferSelect;
export type InsertRecipeTag = typeof recipeTags.$inferInsert;
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
