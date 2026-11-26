// client/src/config/site.ts
var SITE = {
  name: "Chocol\xEDcia \u2013 Arte dos Doces e Buffet",
  fullName: "Chocol\xEDcia \u2013 Arte dos Doces e Buffet",
  tagline: "Arte dos Doces e Buffet",
  description: "Doces artesanais, bolos personalizados e buffet para festas e eventos em Niter\xF3i e Regi\xE3o Metropolitana do Rio de Janeiro.",
  url: "https://www.chocolicia.site",
  email: "chocoliciaartedosdoces@gmail.com",
  /** Telefone/WhatsApp */
  whatsappNumber: "5521977359379",
  // formato para wa.me
  whatsappDisplay: "(21) 97735-9379",
  phoneLandline: "",
  /** Redes sociais */
  instagram: "https://www.instagram.com/janinegoncalves22/",
  facebook: "https://www.facebook.com/janine.goncalves.2025",
  tiktok: "https://www.tiktok.com/@janinegoncalves22",
  googleBusiness: "https://share.google/goyPUsqdHSK9p1cVc",
  /** Endereço detalhado, horários e preço só devem ser preenchidos após confirmação. */
  city: "Niter\xF3i",
  state: "RJ",
  country: "BR",
  streetAddress: "",
  postalCode: "",
  openingHours: [],
  /** Faixa de preço (schema.org: "$" a "$$$$") */
  priceRange: "",
  /** Imagem principal do negócio (OG e JSON-LD) */
  ogImage: "https://www.chocolicia.site/images/og-image.jpg",
  /** Áreas de atendimento */
  areaServed: ["Niter\xF3i", "S\xE3o Gon\xE7alo", "Maric\xE1", "Itabora\xED", "Estado do Rio de Janeiro"]
};
function waLink(message) {
  return `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
var WA_ORCAMENTO = waLink(
  "Ol\xE1, Chocol\xEDcia! Gostaria de solicitar um or\xE7amento."
);
var WA_SAUDACAO = waLink(
  "Ol\xE1, Chocol\xEDcia! Tudo bem? Gostaria de conhecer melhor o trabalho de voc\xEAs."
);

// server/recipeDb.ts
import { and, count, desc, eq as eq2, gt, gte, ilike, isNotNull, lt, or, sql } from "drizzle-orm";

// drizzle/schema.ts
import { bigint, boolean, foreignKey, index, integer, jsonb, pgEnum, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
var userRole = pgEnum("user_role", ["user", "admin"]);
var recipeStatus = pgEnum("recipe_status", ["draft", "published", "failed"]);
var tipType = pgEnum("tip_type", ["dica", "tecnica", "materia"]);
var users = pgTable("users", { id: serial("id").primaryKey(), openId: varchar("open_id", { length: 64 }).notNull().unique(), name: text("name"), email: varchar("email", { length: 320 }), loginMethod: varchar("login_method", { length: 64 }), role: userRole("role").default("user").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(), lastSignedIn: timestamp("last_signed_in", { withTimezone: true }).defaultNow().notNull() });
var s3Files = pgTable("s3_files", { id: serial("id").primaryKey(), objectKey: text("object_key").notNull().unique(), fileUrl: text("file_url").notNull(), alt: varchar("alt", { length: 180 }).notNull(), contentType: varchar("content_type", { length: 255 }), userId: varchar("user_id", { length: 128 }), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() });
var orders = pgTable("orders", { id: serial("id").primaryKey(), name: varchar("name", { length: 160 }).notNull(), eventType: varchar("event_type", { length: 120 }).notNull(), guests: varchar("guests", { length: 80 }).notNull(), desiredDate: varchar("desired_date", { length: 32 }), category: varchar("category", { length: 120 }).notNull(), details: text("details"), status: varchar("status", { length: 32 }).default("new").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() });
var authors = pgTable("authors", { id: integer("id").primaryKey(), name: varchar("name", { length: 180 }).notNull(), slug: varchar("slug", { length: 180 }).notNull().unique(), bio: text("bio"), avatarUrl: text("avatar_url"), role: varchar("role", { length: 80 }), active: boolean("active").default(true).notNull() });
var categories = pgTable("categories", { id: integer("id").primaryKey(), slug: varchar("slug", { length: 180 }).notNull().unique(), name: varchar("name", { length: 180 }).notNull(), parentId: integer("parent_id"), active: boolean("active").default(true).notNull(), riskLevel: varchar("risk_level", { length: 24 }), agentEnabled: boolean("agent_enabled").default(true).notNull() });
var tipTopics = pgTable("tip_topics", { id: integer("id").primaryKey(), name: varchar("name", { length: 180 }).notNull(), slug: varchar("slug", { length: 180 }).notNull().unique(), description: text("description"), active: boolean("active").default(true).notNull(), sortOrder: integer("sort_order").default(0).notNull() });
var tags = pgTable("tags", { id: integer("id").primaryKey(), name: varchar("name", { length: 120 }).notNull(), slug: varchar("slug", { length: 120 }).notNull().unique() });
var recipes = pgTable("recipes", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 180 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  excerpt: varchar("excerpt", { length: 160 }).notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  subcategory: varchar("subcategory", { length: 120 }),
  subcategorySlug: varchar("subcategory_slug", { length: 120 }),
  authorId: integer("author_id"),
  tags: text("tags").array().notNull().default([]),
  coverImageUrl: text("cover_image_url").notNull(),
  coverImageAlt: varchar("cover_image_alt", { length: 240 }).notNull(),
  imagePrompt: text("image_prompt").notNull().default(""),
  coverImageVariants: jsonb("cover_image_variants").$type().notNull().default({}),
  ingredients: jsonb("ingredients").$type().notNull().default([]),
  steps: jsonb("steps").$type().notNull().default([]),
  tips: jsonb("tips").$type().notNull().default([]),
  storageNotes: text("storage_notes").notNull().default(""),
  faq: jsonb("faq").$type().notNull().default([]),
  prepTimeMin: integer("prep_time_min").notNull(),
  cookTimeMin: integer("cook_time_min").notNull().default(0),
  servings: integer("servings").notNull(),
  difficulty: varchar("difficulty", { length: 24 }).notNull(),
  status: recipeStatus("status").notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  aiModel: varchar("ai_model", { length: 120 }),
  generationMeta: jsonb("generation_meta").$type().notNull().default({}),
  agentTopicSlug: varchar("agent_topic_slug", { length: 180 }),
  agentIdempotencyKey: varchar("agent_idempotency_key", { length: 128 }),
  agentRequestHash: varchar("agent_request_hash", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [foreignKey({ columns: [table.authorId], foreignColumns: [authors.id], name: "recipes_author_id_fkey" }), uniqueIndex("recipes_slug_uidx").on(table.slug), uniqueIndex("recipes_agent_topic_slug_uidx").on(table.agentTopicSlug), uniqueIndex("recipes_agent_idempotency_key_uidx").on(table.agentIdempotencyKey), index("recipes_status_published_at_idx").on(table.status, table.publishedAt.desc()), index("recipes_category_idx").on(table.category), index("recipes_subcategory_slug_idx").on(table.subcategorySlug)]);
var images = pgTable("images", { id: uuid("id").defaultRandom().primaryKey(), fileUrl: text("file_url").notNull(), storageKey: text("storage_key"), fileName: varchar("file_name", { length: 255 }), altText: varchar("alt_text", { length: 240 }), caption: text("caption"), contentType: varchar("content_type", { length: 120 }), fileSize: bigint("file_size", { mode: "number" }), width: integer("width"), height: integer("height"), imageType: varchar("image_type", { length: 40 }), sourceType: varchar("source_type", { length: 40 }), generationMeta: jsonb("generation_meta").$type(), active: boolean("active").default(true).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull() });
var tips = pgTable("tips", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 180 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  tipType: tipType("tip_type").notNull(),
  tipTopic: varchar("tip_topic", { length: 180 }),
  authorId: integer("author_id").notNull(),
  coverImageUrl: text("cover_image_url"),
  coverImageAlt: varchar("cover_image_alt", { length: 240 }),
  metaTitle: varchar("meta_title", { length: 180 }),
  metaDescription: varchar("meta_description", { length: 320 }),
  canonicalUrl: text("canonical_url"),
  tags: text("tags").array().notNull().default([]),
  generationMeta: jsonb("generation_meta").$type().notNull().default({}),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
  reviewStatus: varchar("review_status", { length: 32 }).notNull().default("pending"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  agentTopicSlug: varchar("agent_topic_slug", { length: 180 }),
  agentIdempotencyKey: varchar("agent_idempotency_key", { length: 128 }),
  agentRequestHash: varchar("agent_request_hash", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [foreignKey({ columns: [table.authorId], foreignColumns: [authors.id], name: "tips_author_id_fkey" }), foreignKey({ columns: [table.tipTopic], foreignColumns: [tipTopics.slug], name: "tips_tip_topic_fkey" }), uniqueIndex("tips_slug_uidx").on(table.slug), uniqueIndex("tips_agent_idempotency_key_uidx").on(table.agentIdempotencyKey), uniqueIndex("tips_agent_topic_slug_uidx").on(table.agentTopicSlug), index("tips_status_published_at_idx").on(table.status, table.publishedAt.desc()), index("tips_tip_type_idx").on(table.tipType), index("tips_tip_topic_idx").on(table.tipTopic)]);
var tipImages = pgTable("tip_images", { id: serial("id").primaryKey(), tipId: uuid("tip_id").notNull(), imageId: uuid("image_id"), imageUrl: text("image_url"), altText: varchar("alt_text", { length: 240 }), caption: text("caption"), imageRole: varchar("image_role", { length: 40 }).notNull().default("cover"), sortOrder: integer("sort_order").notNull().default(0), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() }, (table) => [foreignKey({ columns: [table.tipId], foreignColumns: [tips.id], name: "tip_images_tip_id_fkey" }), foreignKey({ columns: [table.imageId], foreignColumns: [images.id], name: "tip_images_image_id_fkey" })]);
var tipTags = pgTable("tip_tags", { id: serial("id").primaryKey(), tipId: uuid("tip_id").notNull(), tagId: integer("tag_id").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() }, (table) => [foreignKey({ columns: [table.tipId], foreignColumns: [tips.id], name: "tip_tags_tip_id_fkey" }), foreignKey({ columns: [table.tagId], foreignColumns: [tags.id], name: "tip_tags_tag_id_fkey" }), uniqueIndex("tip_tags_tip_tag_uidx").on(table.tipId, table.tagId)]);
var contentRelations = pgTable("content_relations", { id: serial("id").primaryKey(), recipeId: uuid("recipe_id"), tipId: uuid("tip_id"), relationType: varchar("relation_type", { length: 40 }).notNull().default("related"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() }, (table) => [foreignKey({ columns: [table.recipeId], foreignColumns: [recipes.id], name: "content_relations_recipe_id_fkey" }), foreignKey({ columns: [table.tipId], foreignColumns: [tips.id], name: "content_relations_tip_id_fkey" })]);
var contentReports = pgTable("content_reports", { id: serial("id").primaryKey(), recipeId: uuid("recipe_id"), tipId: uuid("tip_id"), reason: varchar("reason", { length: 40 }).notNull(), details: text("details"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() }, (table) => [foreignKey({ columns: [table.recipeId], foreignColumns: [recipes.id], name: "content_reports_recipe_id_fkey" }), foreignKey({ columns: [table.tipId], foreignColumns: [tips.id], name: "content_reports_tip_id_fkey" })]);

// server/db.ts
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// server/_core/env.ts
var ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  neonDatabaseUrl: process.env.NEON_DATABASE_URL ?? "",
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
  adminOpenId: process.env.ADMIN_OPEN_ID ?? "chocolicia-admin",
  isProduction: process.env.NODE_ENV === "production"
};

// server/db.ts
var _sql = null;
var _db = null;
function resolveDatabaseUrl() {
  return ENV.neonDatabaseUrl || ENV.databaseUrl || void 0;
}
function buildPostgresOptions(connectionString) {
  const isNeon = connectionString.includes("neon.tech");
  return {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 15,
    prepare: false,
    ssl: isNeon ? "require" : void 0
  };
}
async function getDb() {
  const connectionString = resolveDatabaseUrl();
  if (!_db && connectionString) {
    try {
      _sql = postgres(connectionString, buildPostgresOptions(connectionString));
      _db = drizzle(_sql);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _sql = null;
      _db = null;
    }
  }
  return _db;
}

// server/recipeDb.ts
var recipeSummarySelection = {
  id: recipes.id,
  slug: recipes.slug,
  title: recipes.title,
  excerpt: recipes.excerpt,
  category: recipes.category,
  subcategory: recipes.subcategory,
  subcategorySlug: recipes.subcategorySlug,
  tags: recipes.tags,
  coverImageUrl: recipes.coverImageUrl,
  coverImageAlt: recipes.coverImageAlt,
  coverImageVariants: recipes.coverImageVariants,
  prepTimeMin: recipes.prepTimeMin,
  cookTimeMin: recipes.cookTimeMin,
  servings: recipes.servings,
  difficulty: recipes.difficulty,
  publishedAt: recipes.publishedAt
};
function requireDb(db) {
  if (!db) throw new Error("A base de dados n\xE3o est\xE1 configurada");
  return db;
}
async function getPublishedRecipeSlugs(dbOverride) {
  const db = requireDb(dbOverride ?? await getDb());
  return db.select({ slug: recipes.slug, updatedAt: recipes.updatedAt }).from(recipes).where(and(eq2(recipes.status, "published"), isNotNull(recipes.publishedAt))).orderBy(desc(recipes.publishedAt));
}

// server/tipsDb.ts
import { and as and2, count as count2, desc as desc2, eq as eq3, gte as gte2, isNotNull as isNotNull2, sql as sql2 } from "drizzle-orm";
function dbOrThrow(db) {
  if (!db) throw new Error("A base de dados n\xE3o est\xE1 configurada");
  return db;
}
async function listPublishedTips(limit = 24) {
  const db = dbOrThrow(await getDb());
  return db.select({ id: tips.id, type: tips.tipType, slug: tips.slug, title: tips.title, excerpt: tips.excerpt, tipTopic: tips.tipTopic, authorId: tips.authorId, authorName: authors.name, coverImageUrl: tips.coverImageUrl, coverImageAlt: tips.coverImageAlt, publishedAt: tips.publishedAt, updatedAt: tips.updatedAt }).from(tips).leftJoin(authors, eq3(tips.authorId, authors.id)).where(and2(eq3(tips.status, "published"), isNotNull2(tips.publishedAt))).orderBy(desc2(tips.publishedAt), desc2(tips.id)).limit(limit);
}

// server/recipeSitemap.ts
function xmlEscape(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
async function generateRecipesSitemap() {
  const [recipes2, tips2] = await Promise.all([getPublishedRecipeSlugs(), listPublishedTips(5e3)]);
  const staticPaths = ["/", "/receitas", "/dicas", "/buffet-para-festas", "/bolos-personalizados", "/doces-para-festas", "/areas-atendidas"];
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const urls = [
    ...staticPaths.map((page) => `<url><loc>${xmlEscape(`${SITE.url}${page === "/" ? "/" : page}`)}</loc><lastmod>${today}</lastmod></url>`),
    ...recipes2.map((recipe) => `<url><loc>${xmlEscape(`${SITE.url}/receitas/${encodeURIComponent(recipe.slug)}`)}</loc><lastmod>${recipe.updatedAt.toISOString()}</lastmod></url>`),
    ...tips2.map((tip) => `<url><loc>${xmlEscape(`${SITE.url}/dicas/${encodeURIComponent(tip.slug)}`)}</loc><lastmod>${(tip.updatedAt ?? /* @__PURE__ */ new Date(0)).toISOString()}</lastmod></url>`)
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`;
}

// server/api/recipes-sitemap.ts
async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).end("Method not allowed");
    return;
  }
  try {
    const xml = await generateRecipesSitemap();
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).send(xml);
  } catch (error) {
    console.error("[RecipesSitemap] failed:", error);
    res.status(503).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
}
export {
  handler as default
};
