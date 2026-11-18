// server/api/recipe-page.ts
import fs from "node:fs/promises";
import path from "node:path";

// server/recipeDb.ts
import { and, desc, eq as eq2, gt, ilike, isNotNull, lt, or, sql } from "drizzle-orm";

// drizzle/schema.ts
import { index, integer, jsonb, pgEnum, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  uniqueIndex("recipes_slug_uidx").on(table.slug),
  index("recipes_status_published_at_idx").on(table.status, table.publishedAt.desc()),
  index("recipes_category_idx").on(table.category),
  index("recipes_subcategory_slug_idx").on(table.subcategorySlug)
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
async function getPublishedRecipeBySlug(slug, dbOverride) {
  const db = requireDb(dbOverride ?? await getDb());
  const result = await db.select().from(recipes).where(and(eq2(recipes.slug, slug), eq2(recipes.status, "published"))).limit(1);
  return result[0] ?? null;
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

// server/recipePage.ts
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}
function minutes(value) {
  return `PT${Math.max(0, value)}M`;
}
function recipeJsonLd(recipe) {
  const ingredientList = recipe.ingredients.flatMap((section) => section.items.map(
    (item) => [item.quantity, item.unit, item.name, item.note].filter(Boolean).join(" ").trim()
  ));
  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.excerpt,
    image: [recipe.coverImageUrl],
    author: { "@type": "Organization", name: "Chocol\xEDcia" },
    datePublished: recipe.publishedAt?.toISOString(),
    recipeCategory: recipe.category,
    keywords: recipe.tags.join(", "),
    prepTime: minutes(recipe.prepTimeMin),
    cookTime: minutes(recipe.cookTimeMin),
    totalTime: minutes(recipe.prepTimeMin + recipe.cookTimeMin),
    recipeYield: `${recipe.servings} por\xE7\xF5es`,
    recipeIngredient: ingredientList,
    recipeInstructions: recipe.steps.map((step, index2) => ({
      "@type": "HowToStep",
      position: index2 + 1,
      name: step.title || `Passo ${index2 + 1}`,
      text: step.instruction
    }))
  };
}
function recipeBody(recipe) {
  const ingredientSections = recipe.ingredients.map((section) => `
    <section><h2>${escapeHtml(section.name)}</h2><ul>${section.items.map((item) => `<li>${escapeHtml([item.quantity, item.unit, item.name, item.note].filter(Boolean).join(" "))}</li>`).join("")}</ul></section>`).join("");
  const steps = recipe.steps.map((step, index2) => `<li><strong>Passo ${index2 + 1}${step.title ? ` \u2014 ${escapeHtml(step.title)}` : ""}:</strong> ${escapeHtml(step.instruction)}</li>`).join("");
  return `<main id="recipe-prerender" class="recipe-prerender" lang="pt-BR">
    <article><p>${escapeHtml(recipe.category)}</p><h1>${escapeHtml(recipe.title)}</h1><p>${escapeHtml(recipe.excerpt)}</p>
    <img src="${escapeHtml(recipe.coverImageUrl)}" alt="${escapeHtml(recipe.coverImageAlt)}" width="1200" height="800" fetchpriority="high" />
    <p>Preparo: ${recipe.prepTimeMin} min \xB7 Total: ${recipe.prepTimeMin + recipe.cookTimeMin} min \xB7 Rende ${recipe.servings} por\xE7\xF5es \xB7 ${escapeHtml(recipe.difficulty)}</p>
    <p>Publicado em ${recipe.publishedAt?.toLocaleDateString("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" }) ?? ""}</p>
    <h2>Ingredientes</h2>${ingredientSections}<h2>Modo de preparo</h2><ol>${steps}</ol>
    ${recipe.tips.length ? `<section><h2>Dicas da Chocol\xEDcia</h2><ul>${recipe.tips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join("")}</ul></section>` : ""}
    ${recipe.storageNotes ? `<section><h2>Como conservar</h2><p>${escapeHtml(recipe.storageNotes)}</p></section>` : ""}
    ${recipe.faq.length ? `<section><h2>Perguntas frequentes</h2>${recipe.faq.map((item) => `<h3>${escapeHtml(item.question)}</h3><p>${escapeHtml(item.answer)}</p>`).join("")}</section>` : ""}
    <p><a href="/receitas">Ver todas as receitas da Chocol\xEDcia</a></p></article></main>`;
}
function renderRecipePageHtml(template, recipe) {
  if (!recipe) {
    const body = '<main id="recipe-prerender" lang="pt-BR"><h1>Receita n\xE3o encontrada</h1><p>Esta receita n\xE3o est\xE1 dispon\xEDvel.</p><a href="/receitas">Voltar \xE0s receitas</a></main>';
    return template.replace(/<title>[\s\S]*?<\/title>/, "<title>Receita n\xE3o encontrada | Chocol\xEDcia</title>").replace("<head>", '<head><meta name="robots" content="noindex,follow" />').replace('<div id="root"></div>', `<div id="root" data-recipe-prerendered="true">${body}</div>`);
  }
  const canonical = `${SITE.url}/receitas/${encodeURIComponent(recipe.slug)}`;
  const description = escapeHtml(recipe.excerpt);
  const title = escapeHtml(`${recipe.title} | Receitas Chocol\xEDcia`);
  const image = escapeHtml(recipe.coverImageUrl);
  const jsonLd = JSON.stringify(recipeJsonLd(recipe)).replace(/</g, "\\u003c");
  const head = `
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${escapeHtml(canonical)}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${escapeHtml(canonical)}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
    <script type="application/ld+json">${jsonLd}</script>`;
  let html = template.replace(/<title>[\s\S]*?<\/title>/, "").replace(/<link rel="canonical"[^>]*\/?\s*>/g, "").replace(/<meta property="og:[^>]*\/?\s*>/g, "").replace(/<meta name="twitter:[^>]*\/?\s*>/g, "").replace(/<meta name="description"[^>]*\/?\s*>/g, "").replace("<head>", `<head>${head}`);
  html = html.replace('<div id="root"></div>', `<div id="root" data-recipe-prerendered="true">${recipeBody(recipe)}</div>`);
  return html;
}

// server/api/recipe-page.ts
async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).end("Method not allowed");
    return;
  }
  const slug = String(req.query.slug ?? "");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    res.setHeader("X-Robots-Tag", "noindex,follow");
    res.status(404).send('<!doctype html><html lang="pt-BR"><head><title>Receita n\xE3o encontrada | Chocol\xEDcia</title><meta name="robots" content="noindex,follow"></head><body><h1>Receita n\xE3o encontrada</h1></body></html>');
    return;
  }
  try {
    const recipe = await getPublishedRecipeBySlug(slug);
    const templatePath = path.resolve(process.cwd(), "dist/recipe-shell.html");
    const template = await fs.readFile(templatePath, "utf8");
    const html = renderRecipePageHtml(template, recipe);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", recipe ? "public, s-maxage=60, stale-while-revalidate=300" : "no-store");
    res.status(recipe ? 200 : 404).send(html);
  } catch (error) {
    console.error("[RecipePage] render failed:", error);
    res.status(503).send('<!doctype html><html lang="pt-BR"><title>Receitas | Chocol\xEDcia</title><h1>N\xE3o foi poss\xEDvel carregar esta receita.</h1></html>');
  }
}
export {
  handler as default
};
