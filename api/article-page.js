// server/api/article-page.ts
import fs from "node:fs/promises";
import path from "node:path";

// server/articlesDb.ts
import { and, count, desc, eq as eq2, gte, isNotNull, or, sql } from "drizzle-orm";

// drizzle/schema.ts
import { bigint, boolean, foreignKey, index, integer, jsonb, pgEnum, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
var userRole = pgEnum("user_role", ["user", "admin"]);
var recipeStatus = pgEnum("recipe_status", ["draft", "published", "failed"]);
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
var recipes = pgTable("recipes", {
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
  agentTopicSlug: varchar("agent_topic_slug", { length: 180 }),
  agentIdempotencyKey: varchar("agent_idempotency_key", { length: 128 }),
  agentRequestHash: varchar("agent_request_hash", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  uniqueIndex("recipes_slug_uidx").on(table.slug),
  uniqueIndex("recipes_agent_topic_slug_uidx").on(table.agentTopicSlug),
  uniqueIndex("recipes_agent_idempotency_key_uidx").on(table.agentIdempotencyKey),
  index("recipes_status_published_at_idx").on(table.status, table.publishedAt.desc()),
  index("recipes_category_idx").on(table.category),
  index("recipes_subcategory_slug_idx").on(table.subcategorySlug)
]);
var authors = pgTable("authors", {
  id: integer("id").primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  slug: varchar("slug", { length: 180 }).notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  role: varchar("role", { length: 80 }),
  active: boolean("active")
});
var categories = pgTable("categories", {
  id: integer("id").primaryKey(),
  slug: varchar("slug", { length: 180 }).notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  parentId: integer("parent_id"),
  active: boolean("active"),
  riskLevel: varchar("risk_level", { length: 24 }),
  agentEnabled: boolean("agent_enabled")
});
var tipTopics = pgTable("tip_topics", {
  id: integer("id").primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  slug: varchar("slug", { length: 180 }).notNull(),
  description: text("description"),
  active: boolean("active"),
  sortOrder: integer("sort_order")
});
var tags = pgTable("tags", {
  id: integer("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull()
});
var images = pgTable("images", {
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
  imageType: varchar("image_type", { length: 40 }),
  sourceType: varchar("source_type", { length: 40 }),
  generationMeta: jsonb("generation_meta").$type(),
  active: boolean("active"),
  createdAt: timestamp("created_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
});
var articles = pgTable("articles", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 180 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  contentType: varchar("content_type", { length: 32 }).notNull().default("article"),
  topicId: integer("topic_id"),
  authorId: integer("author_id"),
  coverImageUrl: text("cover_image_url"),
  coverImageAlt: varchar("cover_image_alt", { length: 240 }),
  metaTitle: varchar("meta_title", { length: 180 }),
  metaDescription: varchar("meta_description", { length: 320 }),
  canonicalUrl: text("canonical_url"),
  tags: text("tags").array().notNull().default([]),
  generationMeta: jsonb("generation_meta").$type(),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
  reviewStatus: varchar("review_status", { length: 32 }).notNull().default("pending"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
}, (table) => [
  foreignKey({ columns: [table.authorId], foreignColumns: [authors.id], name: "articles_author_id_fkey" }),
  foreignKey({ columns: [table.topicId], foreignColumns: [tipTopics.id], name: "articles_topic_id_fkey" })
]);
var articleTags = pgTable("article_tags", {
  id: serial("id").primaryKey(),
  articleId: uuid("article_id").notNull(),
  tagId: integer("tag_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
}, (table) => [
  foreignKey({ columns: [table.articleId], foreignColumns: [articles.id], name: "article_tags_article_id_fkey" }),
  foreignKey({ columns: [table.tagId], foreignColumns: [tags.id], name: "article_tags_tag_id_fkey" })
]);
var articleImages = pgTable("article_images", {
  id: serial("id").primaryKey(),
  articleId: uuid("article_id").notNull(),
  imageId: uuid("image_id"),
  imageUrl: text("image_url"),
  altText: varchar("alt_text", { length: 240 }),
  caption: text("caption"),
  imageRole: varchar("image_role", { length: 40 }).notNull().default("inline"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
}, (table) => [
  foreignKey({ columns: [table.articleId], foreignColumns: [articles.id], name: "article_images_article_id_fkey" }),
  foreignKey({ columns: [table.imageId], foreignColumns: [images.id], name: "article_images_image_id_fkey" })
]);

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

// server/articlesDb.ts
function requireDb(db) {
  if (!db) throw new Error("A base de dados n\xE3o est\xE1 configurada");
  return db;
}
async function getPublishedArticleBySlug(slug) {
  const db = requireDb(await getDb());
  const rows = await db.select({ article: articles, tipTopic: tipTopics.slug }).from(articles).leftJoin(tipTopics, eq2(articles.topicId, tipTopics.id)).where(and(eq2(articles.slug, slug), eq2(articles.status, "published"))).limit(1);
  if (!rows[0]) return null;
  const meta = rows[0].article.generationMeta ?? {};
  return {
    ...rows[0].article,
    type: rows[0].article.contentType,
    bodyMd: rows[0].article.content,
    excerpt: rows[0].article.excerpt ?? "",
    tipTopic: rows[0].tipTopic,
    structured: meta.structured ?? null,
    sources: meta.sources ?? [],
    relatedTopics: meta.related_topics ?? [],
    coverImageVariants: meta.cover?.variants ?? {},
    coverImageSource: meta.cover?.source ?? null,
    coverImageIsAi: Boolean(meta.cover?.is_ai)
  };
}

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

// server/articlePage.ts
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}
function articleBody(article) {
  const paragraphs = article.content.split(/\r?\n/).map((line) => {
    const text2 = line.replace(/^#{1,6}\s+/, "").replace(/^\s*[-*]\s+/, "").replace(/^\s*\d+[.)]\s+/, "").trim();
    if (!text2) return "";
    if (/^#{1,6}\s+/.test(line)) return `<h2>${escapeHtml(text2)}</h2>`;
    return `<p>${escapeHtml(text2)}</p>`;
  }).join("");
  return `<main id="article-prerender" lang="pt-BR"><article><p>Dica da Chocol\xEDcia</p><h1>${escapeHtml(article.title)}</h1><p>${escapeHtml(article.excerpt ?? "")}</p>${article.coverImageUrl ? `<img src="${escapeHtml(article.coverImageUrl)}" alt="${escapeHtml(article.coverImageAlt ?? article.title)}" width="1280" height="853" />` : ""}<p>Imagem ilustrativa</p>${paragraphs}<p>Conte\xFAdo elaborado pela Equipe Chocol\xEDcia com apoio de intelig\xEAncia artificial.</p><a href="/dicas">Voltar \xE0s dicas</a></article></main>`;
}
function renderArticlePageHtml(template, article) {
  if (!article) {
    const body = '<main id="article-prerender" lang="pt-BR"><h1>Dica n\xE3o encontrada</h1><p>Este conte\xFAdo n\xE3o est\xE1 dispon\xEDvel.</p><a href="/dicas">Voltar \xE0s dicas</a></main>';
    return template.replace(/<title>[\s\S]*?<\/title>/, "<title>Dica n\xE3o encontrada | Chocol\xEDcia</title>").replace("<head>", '<head><meta name="robots" content="noindex,follow" />').replace('<div id="root"></div>', `<div id="root" data-article-prerendered="true">${body}</div>`);
  }
  const canonical = `${SITE.url}/dicas/${encodeURIComponent(article.slug)}`;
  const title = escapeHtml(`${article.title} | Dicas Chocol\xEDcia`);
  const description = escapeHtml(article.excerpt ?? "");
  const image = article.coverImageUrl ? escapeHtml(article.coverImageUrl) : "";
  const modifiedAt = article.updatedAt ?? /* @__PURE__ */ new Date(0);
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt ?? "",
    image: article.coverImageUrl ? [article.coverImageUrl] : [],
    author: { "@type": "Organization", name: "Equipe Chocol\xEDcia" },
    publisher: { "@type": "Organization", name: SITE.fullName, url: SITE.url },
    datePublished: article.publishedAt?.toISOString(),
    dateModified: modifiedAt.toISOString()
  }).replace(/</g, "\\u003c");
  const head = `<title>${title}</title><meta name="description" content="${description}" /><link rel="canonical" href="${escapeHtml(canonical)}" /><meta property="og:type" content="article" /><meta property="og:url" content="${escapeHtml(canonical)}" /><meta property="og:title" content="${title}" /><meta property="og:description" content="${description}" /><meta property="og:image" content="${image}" /><meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="${title}" /><meta name="twitter:description" content="${description}" /><meta name="twitter:image" content="${image}" /><script type="application/ld+json">${jsonLd}</script>`;
  const html = template.replace(/<title>[\s\S]*?<\/title>/, "").replace(/<link rel="canonical"[^>]*\/?\s*>/g, "").replace(/<meta property="og:[^>]*\/?\s*>/g, "").replace(/<meta name="twitter:[^>]*\/?\s*>/g, "").replace(/<meta name="description"[^>]*\/?\s*>/g, "").replace("<head>", `<head>${head}`);
  return html.replace('<div id="root"></div>', `<div id="root" data-article-prerendered="true">${articleBody(article)}</div>`);
}

// server/api/article-page.ts
async function handler(req, res) {
  const slug = String(req.query.slug ?? "");
  const article = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? await getPublishedArticleBySlug(slug) : null;
  const template = await fs.readFile(path.resolve(process.cwd(), "dist/article-shell.html"), "utf8");
  res.status(article ? 200 : 404).setHeader("Cache-Control", article ? "public, s-maxage=60, stale-while-revalidate=300" : "no-store").setHeader("Content-Type", "text/html; charset=utf-8").send(renderArticlePageHtml(template, article));
}
export {
  handler as default
};
