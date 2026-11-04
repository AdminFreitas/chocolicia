import { index, integer, jsonb, pgEnum, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
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

export const recipes = pgTable("recipes", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 180 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  excerpt: varchar("excerpt", { length: 160 }).notNull(),
  category: varchar("category", { length: 80 }).notNull(),
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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("recipes_slug_uidx").on(table.slug),
  index("recipes_status_published_at_idx").on(table.status, table.publishedAt.desc()),
  index("recipes_category_idx").on(table.category),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type S3File = typeof s3Files.$inferSelect;
export type InsertS3File = typeof s3Files.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
export type Recipe = typeof recipes.$inferSelect;
export type InsertRecipe = typeof recipes.$inferInsert;
