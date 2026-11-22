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
import { and, desc, eq as eq2, gt, ilike, isNotNull, lt, or, sql as sql2 } from "drizzle-orm";

// drizzle/schema.ts
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
  varchar
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
var userRole = pgEnum("user_role", ["user", "admin"]);
var recipeStatus = pgEnum("recipe_status", [
  "draft",
  "published",
  "failed"
]);
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: userRole("role").default("user").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in", { withTimezone: true }).defaultNow().notNull()
});
var s3Files = pgTable("s3_files", {
  id: serial("id").primaryKey(),
  objectKey: text("object_key").notNull().unique(),
  fileUrl: text("file_url").notNull(),
  alt: varchar("alt", { length: 180 }).notNull(),
  contentType: varchar("content_type", { length: 255 }),
  userId: varchar("user_id", { length: 128 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
var orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  eventType: varchar("event_type", { length: 120 }).notNull(),
  guests: varchar("guests", { length: 80 }).notNull(),
  desiredDate: varchar("desired_date", { length: 32 }),
  category: varchar("category", { length: 120 }).notNull(),
  details: text("details"),
  status: varchar("status", { length: 32 }).default("new").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
var recipes = pgTable(
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
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("recipes_slug_uidx").on(table.slug),
    index("recipes_status_published_at_idx").on(
      table.status,
      table.publishedAt.desc()
    ),
    index("recipes_category_idx").on(table.category),
    index("recipes_subcategory_slug_idx").on(table.subcategorySlug)
  ]
);
var categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name").notNull(),
    slug: varchar("slug").notNull(),
    parentId: uuid("parent_id"),
    active: boolean("active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    foreignKey({
      name: "categories_parent_id_fkey",
      columns: [table.parentId],
      foreignColumns: [table.id]
    }).onDelete("restrict"),
    check(
      "categories_not_own_parent",
      sql`(${table.parentId} is null or ${table.parentId} <> ${table.id})`
    ),
    unique("categories_slug_key").on(table.slug),
    index("categories_parent_id_idx").on(table.parentId),
    index("categories_active_sort_idx").on(table.active, table.sortOrder)
  ]
);
var tipTopics = pgTable(
  "tip_topics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name").notNull(),
    slug: varchar("slug").notNull(),
    description: text("description"),
    active: boolean("active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    unique("tip_topics_slug_key").on(table.slug),
    index("tip_topics_active_sort_idx").on(table.active, table.sortOrder)
  ]
);
var articles = pgTable(
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
    generationMeta: jsonb("generation_meta").$type().default({}).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    foreignKey({
      name: "articles_category_id_fkey",
      columns: [table.categoryId],
      foreignColumns: [categories.id]
    }).onDelete("set null"),
    foreignKey({
      name: "articles_topic_id_fkey",
      columns: [table.topicId],
      foreignColumns: [tipTopics.id]
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
    index("articles_created_at_idx").on(table.createdAt.desc())
  ]
);
var articleImages = pgTable(
  "article_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    articleId: uuid("article_id").notNull(),
    imageUrl: text("image_url").notNull(),
    altText: varchar("alt_text"),
    caption: text("caption"),
    position: integer("position").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    foreignKey({
      name: "article_images_article_id_fkey",
      columns: [table.articleId],
      foreignColumns: [articles.id]
    }).onDelete("cascade"),
    index("article_images_article_position_idx").on(
      table.articleId,
      table.position
    )
  ]
);
var articleTags = pgTable(
  "article_tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    articleId: uuid("article_id").notNull(),
    tag: varchar("tag").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    foreignKey({
      name: "article_tags_article_id_fkey",
      columns: [table.articleId],
      foreignColumns: [articles.id]
    }).onDelete("cascade"),
    unique("article_tags_unique").on(table.articleId, table.tag),
    index("article_tags_article_id_idx").on(table.articleId),
    index("article_tags_tag_idx").on(table.tag)
  ]
);

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

// server/recipeSitemap.ts
function xmlEscape(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
async function generateRecipesSitemap() {
  const recipes2 = await getPublishedRecipeSlugs();
  const staticPaths = ["/", "/receitas", "/buffet-para-festas", "/bolos-personalizados", "/doces-para-festas", "/areas-atendidas"];
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const urls = [
    ...staticPaths.map((page) => `<url><loc>${xmlEscape(`${SITE.url}${page === "/" ? "/" : page}`)}</loc><lastmod>${today}</lastmod></url>`),
    ...recipes2.map((recipe) => `<url><loc>${xmlEscape(`${SITE.url}/receitas/${encodeURIComponent(recipe.slug)}`)}</loc><lastmod>${recipe.updatedAt.toISOString()}</lastmod></url>`)
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
