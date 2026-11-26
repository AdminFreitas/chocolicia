// server/createApp.ts
import "dotenv/config";
import express4 from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure
  };
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  }))
});

// server/routers.ts
import { z as z2 } from "zod";

// server/db.ts
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

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
async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  const values = {
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    lastSignedIn: user.lastSignedIn ?? /* @__PURE__ */ new Date(),
    role: user.role ?? (user.openId === ENV.adminOpenId ? "admin" : "user")
  };
  await db.insert(users).values(values).onConflictDoUpdate({
    target: users.openId,
    set: {
      name: values.name,
      email: values.email,
      loginMethod: values.loginMethod,
      lastSignedIn: values.lastSignedIn,
      role: values.role,
      updatedAt: /* @__PURE__ */ new Date()
    }
  });
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}
async function createOrder(order) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(orders).values(order).returning();
  return result[0];
}
async function createS3File(file) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(s3Files).values(file).returning();
  return result[0];
}
async function listS3Files() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(s3Files).orderBy(s3Files.createdAt);
}

// server/storage.ts
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { put } from "@vercel/blob";
var bucket = process.env.S3_BUCKET_NAME ?? "assets";
function toBlobBody(data) {
  if (typeof data === "string") return data;
  return Buffer.isBuffer(data) ? data : Buffer.from(data);
}
var endpoint = process.env.AWS_ENDPOINT_URL_S3;
var region = process.env.AWS_REGION ?? "us-east-2";
function getS3Client() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("Neon Object Storage is not configured");
  }
  return new S3Client({ endpoint, region, forcePathStyle: true, credentials: { accessKeyId, secretAccessKey } });
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function appendHashSuffix(relKey) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  return lastDot === -1 ? `${relKey}_${hash}` : `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const key2 = appendHashSuffix(normalizeKey(relKey));
  const client = getS3Client();
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key2, Body: data, ContentType: contentType }));
  const url = await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key2 }), { expiresIn: 3600 });
  return { key: key2, url };
}
async function storagePutPublic(relKey, data, contentType = "application/octet-stream") {
  const key2 = appendHashSuffix(normalizeKey(relKey));
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(key2, toBlobBody(data), {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
      contentType,
      cacheControlMaxAge: 31536e3
    });
    return { key: blob.pathname, url: blob.url };
  }
  const publicBaseUrl = process.env.RECIPES_PUBLIC_BASE_URL;
  if (!publicBaseUrl) throw new Error("BLOB_READ_WRITE_TOKEN is required for public recipe images");
  const client = getS3Client();
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key2,
    Body: data,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable"
  }));
  const encodedKey = key2.split("/").map(encodeURIComponent).join("/");
  return { key: key2, url: `${publicBaseUrl.replace(/\/$/, "")}/${encodedKey}` };
}
async function storageGetSignedUrl(relKey, expiresIn = 3600) {
  const client = getS3Client();
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: normalizeKey(relKey) }), { expiresIn });
}

// server/routers.ts
var appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  }),
  orders: router({
    create: publicProcedure.input(z2.object({
      name: z2.string().trim().min(2).max(160),
      eventType: z2.string().trim().min(2).max(120),
      guests: z2.string().trim().min(1).max(80),
      desiredDate: z2.string().max(32).optional(),
      category: z2.string().trim().min(2).max(120),
      details: z2.string().max(4e3).optional()
    })).mutation(({ input }) => createOrder({ ...input, desiredDate: input.desiredDate || null, details: input.details || null }))
  }),
  catalog: router({
    list: publicProcedure.query(async () => {
      const files = await listS3Files();
      return Promise.all(files.map(async (file) => ({ ...file, url: await storageGetSignedUrl(file.objectKey) })));
    }),
    upload: adminProcedure.input(z2.object({
      fileName: z2.string().trim().min(1).max(180),
      contentType: z2.string().regex(/^image\/(jpeg|png|webp|gif)$/),
      dataBase64: z2.string().min(1).max(8e6),
      alt: z2.string().trim().min(2).max(180)
    })).mutation(async ({ input, ctx }) => {
      const data = Buffer.from(input.dataBase64, "base64");
      if (data.byteLength > 6 * 1024 * 1024) throw new Error("Image must be 6MB or smaller");
      const stored = await storagePut(`catalog/${input.fileName}`, data, input.contentType);
      return createS3File({ objectKey: stored.key, fileUrl: stored.url, alt: input.alt, contentType: input.contentType, userId: ctx.user.openId });
    })
  })
  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

// server/_core/session.ts
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";

// shared/_core/errors.ts
var HttpError = class extends Error {
  statusCode;
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/session.ts
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
function getSessionSecret() {
  if (!ENV.cookieSecret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return new TextEncoder().encode(ENV.cookieSecret);
}
async function createSessionToken(openId, options = {}) {
  const issuedAt = Date.now();
  const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
  const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
  return new SignJWT({
    openId,
    name: options.name || ""
  }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(getSessionSecret());
}
async function verifySession(cookieValue) {
  if (!cookieValue) return null;
  try {
    const { payload } = await jwtVerify(cookieValue, getSessionSecret(), {
      algorithms: ["HS256"]
    });
    const { openId, name } = payload;
    if (!isNonEmptyString(openId)) return null;
    return {
      openId,
      name: isNonEmptyString(name) ? name : ""
    };
  } catch {
    return null;
  }
}
function getSessionTokenFromRequest(req) {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  const fromCookie = cookies[COOKIE_NAME];
  if (fromCookie) return fromCookie;
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return void 0;
}
async function authenticateRequest(req) {
  const sessionToken = getSessionTokenFromRequest(req);
  const session = await verifySession(sessionToken);
  if (!session) {
    throw ForbiddenError("Invalid session cookie");
  }
  let user = await getUserByOpenId(session.openId);
  if (!user) {
    await upsertUser({
      openId: session.openId,
      name: session.name || null,
      lastSignedIn: /* @__PURE__ */ new Date()
    });
    user = await getUserByOpenId(session.openId);
  }
  if (!user) {
    throw ForbiddenError("User not found");
  }
  await upsertUser({
    openId: user.openId,
    lastSignedIn: /* @__PURE__ */ new Date()
  });
  return user;
}

// server/_core/authRoutes.ts
function registerAuthRoutes(app) {
  app.post("/api/auth/login", async (req, res) => {
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!ENV.adminPassword) {
      res.status(503).json({ error: "Admin login is not configured on the server." });
      return;
    }
    if (!password || password !== ENV.adminPassword) {
      res.status(401).json({ error: "Invalid password" });
      return;
    }
    const openId = ENV.adminOpenId;
    await upsertUser({
      openId,
      name: "Chocol\xEDcia Admin",
      loginMethod: "password",
      role: "admin",
      lastSignedIn: /* @__PURE__ */ new Date()
    });
    const sessionToken = await createSessionToken(openId, {
      name: "Chocol\xEDcia Admin",
      expiresInMs: ONE_YEAR_MS
    });
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
    res.json({ success: true });
  });
}

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await authenticateRequest(opts.req);
  } catch {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/recipesRoutes.ts
import { createHash as createHash2, timingSafeEqual as timingSafeEqual2 } from "node:crypto";
import express from "express";

// shared/recipes.ts
import { z as z3 } from "zod";
var RECIPE_CATEGORIES = [
  "Bolos",
  "Brigadeiros e docinhos",
  "Tortas",
  "Sobremesas",
  "Chocolates",
  "Festas e buffet",
  "Datas especiais"
];
var RECIPE_TAXONOMY = {
  Bolos: [
    { name: "Bolos de chocolate", slug: "bolos-de-chocolate" },
    { name: "Bolos de anivers\xE1rio", slug: "bolos-de-aniversario" },
    { name: "Bolos caseiros", slug: "bolos-caseiros" },
    { name: "Bolos recheados", slug: "bolos-recheados" },
    { name: "Bolos especiais", slug: "bolos-especiais" }
  ],
  "Brigadeiros e docinhos": [
    { name: "Brigadeiros", slug: "brigadeiros" },
    { name: "Docinhos", slug: "docinhos" }
  ],
  Tortas: [
    { name: "Tortas doces", slug: "tortas-doces" }
  ],
  Sobremesas: [
    { name: "Mousses", slug: "mousses" }
  ],
  Chocolates: [
    { name: "Trufas e bombons", slug: "trufas-e-bombons" }
  ],
  "Festas e buffet": [
    { name: "Docinhos para festa", slug: "docinhos-para-festa" }
  ],
  "Datas especiais": [
    { name: "Celebra\xE7\xF5es", slug: "celebracoes" }
  ]
};
var recipeCategorySchema = z3.enum(RECIPE_CATEGORIES);
var ingredientSchema = z3.object({
  quantity: z3.string().max(80).default(""),
  unit: z3.string().max(40).default(""),
  name: z3.string().trim().min(1).max(180),
  note: z3.string().max(180).optional()
});
var ingredientSectionSchema = z3.object({
  name: z3.string().trim().min(1).max(100),
  items: z3.array(ingredientSchema).min(1).max(80)
});
var recipeStepSchema = z3.object({
  title: z3.string().max(120).optional(),
  instruction: z3.string().trim().min(1).max(1200)
});
var recipeFaqSchema = z3.object({
  question: z3.string().trim().min(1).max(240),
  answer: z3.string().trim().min(1).max(1200)
});
var recipeInputSchema = z3.object({
  slug: z3.string().trim().min(3).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  title: z3.string().trim().min(5).max(180),
  excerpt: z3.string().trim().min(20).max(160),
  category: recipeCategorySchema,
  subcategory: z3.string().trim().min(2).max(120).optional(),
  subcategorySlug: z3.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  tags: z3.array(z3.string().trim().min(1).max(40)).max(12).default([]),
  coverImageUrl: z3.string().url().max(2048),
  coverImageAlt: z3.string().trim().min(8).max(240),
  imagePrompt: z3.string().max(2e3).default(""),
  coverImageVariants: z3.object({
    w480: z3.string().url().optional(),
    w800: z3.string().url().optional(),
    w1280: z3.string().url().optional(),
    avif480: z3.string().url().optional(),
    avif800: z3.string().url().optional(),
    avif1280: z3.string().url().optional()
  }).default({}),
  ingredients: z3.array(ingredientSectionSchema).min(1).max(20),
  steps: z3.array(recipeStepSchema).min(2).max(30),
  tips: z3.array(z3.string().trim().min(1).max(1e3)).max(12).default([]),
  storageNotes: z3.string().max(3e3).default(""),
  faq: z3.array(recipeFaqSchema).max(12).default([]),
  prepTimeMin: z3.number().int().min(1).max(1440),
  cookTimeMin: z3.number().int().min(0).max(1440).default(0),
  servings: z3.number().int().min(1).max(500),
  difficulty: z3.enum(["F\xE1cil", "M\xE9dia", "Dif\xEDcil"]),
  status: z3.enum(["draft", "published"]).default("published"),
  publishedAt: z3.coerce.date().optional(),
  aiModel: z3.string().max(120).optional(),
  generationMeta: z3.record(z3.string(), z3.unknown()).default({})
});
var agentCoverSchema = z3.discriminatedUnion("mode", [
  z3.object({
    mode: z3.literal("stock"),
    provider: z3.string().trim().min(1).max(40),
    sourceImageUrl: z3.string().url().max(2048).refine((value) => value.startsWith("https://")),
    sourcePageUrl: z3.string().url().max(2048).refine((value) => value.startsWith("https://")),
    author: z3.string().max(200),
    license: z3.string().trim().min(1).max(120),
    attributionText: z3.string().max(400)
  }),
  z3.object({
    mode: z3.literal("generate"),
    imagePrompt: z3.string().trim().min(1).max(2e3)
  })
]);
var recipeInputSchemaV1 = z3.object({
  title: z3.string().trim().min(5).max(180),
  slug: z3.string().trim().min(3).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  excerpt: z3.string().trim().min(20).max(160),
  intro: z3.string().max(2e3).optional(),
  subcategorySlug: z3.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  authorId: z3.number().int().positive().optional(),
  authorSlug: z3.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  secondarySubcategorySlugs: z3.array(z3.string().trim().min(1).max(120)).max(2).default([]),
  prepTimeMin: z3.number().int().min(1).max(1440),
  cookTimeMin: z3.number().int().min(0).max(1440).default(0),
  restTimeMin: z3.number().int().min(0).max(10080).default(0),
  servings: z3.number().int().min(1).max(500),
  yieldLabel: z3.string().max(80).optional(),
  difficulty: z3.enum(["F\xE1cil", "M\xE9dia", "Dif\xEDcil"]),
  ingredients: z3.array(z3.object({
    name: z3.string().trim().min(1).max(100),
    items: z3.array(z3.object({
      name: z3.string().trim().min(1).max(180),
      quantity: z3.string().trim().min(1).max(80),
      unit: z3.string().trim().min(1).max(40),
      note: z3.string().max(180).optional(),
      ingredientSlug: z3.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).nullable().optional()
    })).min(1).max(80)
  })).min(1).max(20),
  steps: z3.array(recipeStepSchema).min(4).max(20),
  tips: z3.array(z3.string().trim().min(1).max(1e3)).max(5).default([]),
  storageNotes: z3.string().max(3e3).default(""),
  faq: z3.array(recipeFaqSchema).max(12).default([]),
  tags: z3.array(z3.string().trim().min(1).max(40)).max(12).default([]),
  occasions: z3.array(z3.string().trim().min(1).max(40)).max(12).default([]),
  collections: z3.array(z3.string().trim().min(1).max(40)).max(12).default([]),
  diet: z3.array(z3.enum(["vegetariana", "vegana"])).max(2).default([]),
  cover: agentCoverSchema,
  coverImageAlt: z3.string().trim().min(8).max(240),
  status: z3.enum(["draft", "published"]).default("draft"),
  aiModel: z3.string().trim().min(1).max(120),
  generationMeta: z3.record(z3.string(), z3.unknown())
});
var recipeListQuerySchema = z3.object({
  limit: z3.coerce.number().int().min(1).max(24).default(9),
  cursor: z3.string().max(200).optional(),
  category: recipeCategorySchema.optional(),
  subcategory: z3.string().trim().min(2).max(120).optional(),
  subcategorySlug: z3.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  q: z3.string().trim().max(100).optional()
});

// server/recipeDb.ts
import { and, count, desc, eq as eq2, gt, gte, ilike, isNotNull, lt, or, sql } from "drizzle-orm";
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
async function listFeaturedRecipes(dbOverride) {
  const db = requireDb(dbOverride ?? await getDb());
  return db.select(recipeSummarySelection).from(recipes).where(and(eq2(recipes.status, "published"), isNotNull(recipes.publishedAt))).orderBy(desc(recipes.publishedAt), desc(recipes.id)).limit(4);
}
function encodeRecipeCursor(recipe) {
  if (!recipe.publishedAt) return null;
  return Buffer.from(JSON.stringify({ at: recipe.publishedAt.toISOString(), id: recipe.id }), "utf8").toString("base64url");
}
function decodeRecipeCursor(cursor) {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    const at = new Date(String(parsed.at));
    if (!Number.isFinite(at.getTime()) || typeof parsed.id !== "string" || parsed.id.length > 64) throw new Error("Invalid cursor");
    return { at, id: parsed.id };
  } catch {
    throw new Error("Cursor inv\xE1lido");
  }
}
async function listRecipes(options, dbOverride) {
  const db = requireDb(dbOverride ?? await getDb());
  const conditions = [eq2(recipes.status, "published"), isNotNull(recipes.publishedAt)];
  if (options.category) conditions.push(eq2(recipes.category, options.category));
  if (options.subcategory) conditions.push(eq2(recipes.subcategory, options.subcategory));
  if (options.subcategorySlug) conditions.push(eq2(recipes.subcategorySlug, options.subcategorySlug));
  if (options.q) {
    const pattern = `%${options.q.replace(/[\\%_]/g, "\\$&")}%`;
    conditions.push(or(
      ilike(recipes.title, pattern),
      ilike(recipes.excerpt, pattern),
      sql`${recipes.ingredients}::text ILIKE ${pattern}`
    ));
  }
  if (options.cursor) {
    const cursor = decodeRecipeCursor(options.cursor);
    conditions.push(or(
      lt(recipes.publishedAt, cursor.at),
      and(eq2(recipes.publishedAt, cursor.at), lt(recipes.id, cursor.id))
    ));
  }
  const rows = await db.select(recipeSummarySelection).from(recipes).where(and(...conditions)).orderBy(desc(recipes.publishedAt), desc(recipes.id)).limit(options.limit + 1);
  const hasNext = rows.length > options.limit;
  const items = hasNext ? rows.slice(0, options.limit) : rows;
  const last = items.at(-1);
  return { items, nextCursor: hasNext && last ? encodeRecipeCursor(last) : null };
}
async function getPublishedRecipeBySlug(slug, dbOverride) {
  const db = requireDb(dbOverride ?? await getDb());
  const result = await db.select().from(recipes).where(and(eq2(recipes.slug, slug), eq2(recipes.status, "published"))).limit(1);
  return result[0] ?? null;
}
async function getPublishedRecipeSlugs(dbOverride) {
  const db = requireDb(dbOverride ?? await getDb());
  return db.select({ slug: recipes.slug, updatedAt: recipes.updatedAt }).from(recipes).where(and(eq2(recipes.status, "published"), isNotNull(recipes.publishedAt))).orderBy(desc(recipes.publishedAt));
}
async function getPublishedRecipeTitlesSince(since, dbOverride) {
  const db = requireDb(dbOverride ?? await getDb());
  return db.select({ title: recipes.title, category: recipes.category, slug: recipes.slug }).from(recipes).where(and(eq2(recipes.status, "published"), gt(recipes.publishedAt, since))).orderBy(desc(recipes.publishedAt));
}
async function getAllPublishedRecipeTitles(dbOverride) {
  const db = requireDb(dbOverride ?? await getDb());
  return db.select({ title: recipes.title, category: recipes.category, slug: recipes.slug }).from(recipes).where(and(eq2(recipes.status, "published"), isNotNull(recipes.publishedAt))).orderBy(desc(recipes.publishedAt));
}
async function insertRecipe(input, agent) {
  const db = requireDb(await getDb());
  const now = /* @__PURE__ */ new Date();
  const publishedAt = input.status === "published" ? input.publishedAt ?? now : null;
  const [row] = await db.insert(recipes).values({
    slug: input.slug,
    title: input.title,
    excerpt: input.excerpt,
    category: input.category,
    subcategory: input.subcategory ?? null,
    subcategorySlug: input.subcategorySlug ?? null,
    authorId: input.authorId ?? null,
    tags: input.tags,
    coverImageUrl: input.coverImageUrl,
    coverImageAlt: input.coverImageAlt,
    imagePrompt: input.imagePrompt,
    coverImageVariants: input.coverImageVariants,
    ingredients: input.ingredients,
    steps: input.steps,
    tips: input.tips,
    storageNotes: input.storageNotes,
    faq: input.faq,
    prepTimeMin: input.prepTimeMin,
    cookTimeMin: input.cookTimeMin,
    servings: input.servings,
    difficulty: input.difficulty,
    status: input.status,
    publishedAt,
    aiModel: input.aiModel ?? null,
    generationMeta: input.generationMeta,
    agentTopicSlug: agent?.topicSlug ?? null,
    agentIdempotencyKey: agent?.idempotencyKey ?? null,
    agentRequestHash: agent?.requestHash ?? null,
    updatedAt: now
  }).returning();
  return row;
}
async function resolveAuthorId(id, slug) {
  const db = requireDb(await getDb());
  const rows = id ? await db.select({ id: authors.id }).from(authors).where(and(eq2(authors.id, id), eq2(authors.active, true))).limit(1) : slug ? await db.select({ id: authors.id }).from(authors).where(and(eq2(authors.slug, slug), eq2(authors.active, true))).limit(1) : [];
  if (!rows[0]) throw new Error("Autor da receita n\xE3o encontrado ou n\xE3o informado");
  return rows[0].id;
}
async function getAgentRecipeByIdempotencyKey(key2) {
  const db = requireDb(await getDb());
  const result = await db.select().from(recipes).where(eq2(recipes.agentIdempotencyKey, key2)).limit(1);
  return result[0] ?? null;
}
async function getAgentRecipeByTopicSlug(topicSlug) {
  const db = requireDb(await getDb());
  const result = await db.select().from(recipes).where(eq2(recipes.agentTopicSlug, topicSlug)).limit(1);
  return result[0] ?? null;
}
async function getAgentRecipeBySlug(slug) {
  const db = requireDb(await getDb());
  const result = await db.select().from(recipes).where(eq2(recipes.slug, slug)).limit(1);
  return result[0] ?? null;
}
async function countAgentRecipesSince(status, since) {
  const db = requireDb(await getDb());
  const timestamp2 = status === "draft" ? recipes.createdAt : recipes.publishedAt;
  const rows = await db.select({ value: count() }).from(recipes).where(and(eq2(recipes.status, status), gte(timestamp2, since)));
  return Number(rows[0]?.value ?? 0);
}
async function insertFailedRecipe(details) {
  const db = requireDb(await getDb());
  const [row] = await db.insert(recipes).values({
    slug: details.slug,
    title: details.title.slice(0, 180),
    excerpt: "Esta tentativa de receita n\xE3o foi publicada.",
    category: "Sobremesas",
    tags: [],
    coverImageUrl: "https://placehold.co/1200x800/f3e5d0/5a3428?text=Receita+em+preparo",
    coverImageAlt: "Imagem tempor\xE1ria de uma receita em preparo",
    imagePrompt: "",
    coverImageVariants: {},
    ingredients: [],
    steps: [],
    tips: [],
    storageNotes: "",
    faq: [],
    prepTimeMin: 1,
    cookTimeMin: 0,
    servings: 1,
    difficulty: "F\xE1cil",
    status: "failed",
    publishedAt: null,
    aiModel: details.aiModel ?? null,
    generationMeta: { error: details.error.slice(0, 2e3), failedAt: (/* @__PURE__ */ new Date()).toISOString() },
    updatedAt: /* @__PURE__ */ new Date()
  }).returning();
  return row;
}
function toSlug(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 180).replace(/-+$/g, "");
}

// server/recipeAgent.ts
import { z as z4 } from "zod";

// server/aiProviders.ts
import { Buffer as Buffer2 } from "node:buffer";
var textDefaults = ["gemini", "groq", "openrouter", "openai"];
var imageDefaults = ["gemini", "openai"];
function providers(name, defaults) {
  const value = process.env[name]?.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  return value?.length ? value : defaults;
}
function key(provider) {
  return { gemini: process.env.GEMINI_API_KEY, groq: process.env.GROQ_API_KEY, openrouter: process.env.OPENROUTER_API_KEY, openai: process.env.OPENAI_API_KEY }[provider];
}
function textModel(provider) {
  return { gemini: process.env.GEMINI_TEXT_MODEL ?? "gemini-2.5-flash", groq: process.env.GROQ_TEXT_MODEL ?? "llama-3.3-70b-versatile", openrouter: process.env.OPENROUTER_TEXT_MODEL ?? "openai/gpt-4o-mini", openai: process.env.RECIPES_TEXT_MODEL ?? "gpt-4.1-mini" }[provider];
}
function imageModel(provider) {
  return { gemini: process.env.GEMINI_IMAGE_MODEL ?? "imagen-4.0-generate-001", openai: process.env.RECIPES_IMAGE_MODEL ?? "gpt-image-1" }[provider];
}
function base(provider) {
  return { groq: "https://api.groq.com/openai/v1", openrouter: "https://openrouter.ai/api/v1", openai: (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "") }[provider];
}
async function textGemini(messages) {
  const token = key("gemini");
  if (!token) throw new Error("GEMINI_API_KEY n\xE3o est\xE1 configurada");
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${textModel("gemini")}:generateContent?key=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: messages.find((item) => item.role === "system")?.content ?? "" }] }, contents: [{ role: "user", parts: [{ text: messages.find((item) => item.role === "user")?.content ?? "" }] }], generationConfig: { temperature: 0.8, responseMimeType: "application/json" } }),
    signal: AbortSignal.timeout(35e3)
  });
  if (!response.ok) throw new Error(`Gemini respondeu HTTP ${response.status}`);
  const payload = await response.json();
  const content = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  if (!content) throw new Error("Gemini devolveu uma resposta vazia");
  return content;
}
async function textCompatible(provider, messages) {
  const token = key(provider);
  if (!token || !base(provider)) throw new Error(`credencial/base ausente para ${provider}`);
  const response = await fetch(`${base(provider)}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...provider === "openrouter" ? { "HTTP-Referer": process.env.SITE_PUBLIC_URL ?? "https://www.chocolicia.site", "X-Title": "Chocol\xEDcia" } : {} },
    body: JSON.stringify({ model: textModel(provider), temperature: 0.8, response_format: { type: "json_object" }, messages }),
    signal: AbortSignal.timeout(35e3)
  });
  if (!response.ok) throw new Error(`${provider} respondeu HTTP ${response.status}`);
  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error(`${provider} devolveu uma resposta vazia`);
  return content;
}
async function generateRecipeText(messages) {
  const failures = [];
  for (const provider of providers("RECIPES_TEXT_PROVIDERS", textDefaults)) {
    if (!key(provider)) {
      failures.push(`${provider}: credencial ausente`);
      continue;
    }
    try {
      return { provider, model: textModel(provider), content: provider === "gemini" ? await textGemini(messages) : await textCompatible(provider, messages) };
    } catch (error) {
      failures.push(`${provider}: ${error instanceof Error ? error.message : "falha"}`);
    }
  }
  throw new Error(`nenhum provedor de texto dispon\xEDvel (${failures.join("; ")})`);
}
async function imageGemini(prompt) {
  const token = key("gemini");
  if (!token) throw new Error("GEMINI_API_KEY n\xE3o est\xE1 configurada");
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${imageModel("gemini")}:predict?key=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio: "16:9" } }),
    signal: AbortSignal.timeout(6e4)
  });
  if (!response.ok) throw new Error(`Imagen respondeu HTTP ${response.status}`);
  const payload = await response.json();
  const encoded = payload.predictions?.[0]?.bytesBase64Encoded;
  if (!encoded) throw new Error("Imagen n\xE3o devolveu uma imagem codificada");
  return Buffer2.from(encoded, "base64");
}
async function imageOpenai(prompt) {
  const token = key("openai");
  if (!token) throw new Error("OPENAI_API_KEY n\xE3o est\xE1 configurada para imagens");
  const response = await fetch(`${base("openai")}/images/generations`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: imageModel("openai"), prompt, size: "1536x1024", quality: "medium", output_format: "png" }), signal: AbortSignal.timeout(6e4) });
  if (!response.ok) throw new Error(`OpenAI respondeu HTTP ${response.status}`);
  const payload = await response.json();
  const encoded = payload.data?.[0]?.b64_json;
  if (!encoded) throw new Error("OpenAI n\xE3o devolveu uma imagem codificada");
  return Buffer2.from(encoded, "base64");
}
async function generateRecipeImage(prompt) {
  const failures = [];
  for (const provider of providers("RECIPES_IMAGE_PROVIDERS", imageDefaults)) {
    if (!key(provider)) {
      failures.push(`${provider}: credencial ausente`);
      continue;
    }
    try {
      return { provider, model: imageModel(provider), image: provider === "gemini" ? await imageGemini(prompt) : await imageOpenai(prompt) };
    } catch (error) {
      failures.push(`${provider}: ${error instanceof Error ? error.message : "falha"}`);
    }
  }
  throw new Error(`nenhum provedor de imagem dispon\xEDvel (${failures.join("; ")})`);
}

// server/recipeAgent.ts
var generatedContentSchema = z4.object({
  title: z4.string().trim().min(5).max(180),
  excerpt: z4.string().trim().min(20).max(160),
  category: z4.enum(RECIPE_CATEGORIES),
  tags: z4.array(z4.string().trim().min(1).max(40)).max(12).default([]),
  coverImageAlt: z4.string().trim().min(8).max(240),
  ingredients: z4.array(ingredientSectionSchema).min(1).max(20),
  steps: z4.array(recipeStepSchema).min(2).max(30),
  tips: z4.array(z4.string().trim().min(1).max(1e3)).max(12).default([]),
  storageNotes: z4.string().max(3e3).default(""),
  faq: z4.array(recipeFaqSchema).max(12).default([]),
  prepTimeMin: z4.number().int().min(1).max(1440),
  cookTimeMin: z4.number().int().min(0).max(1440).default(0),
  servings: z4.number().int().min(1).max(500),
  difficulty: z4.enum(["F\xE1cil", "M\xE9dia", "Dif\xEDcil"])
});
var allergenMap = [
  [/\b(?:leite|manteiga|creme de leite|leite condensado|queijo|iogurte)\b/i, "leite"],
  [/\b(?:ovo|ovos|gema|gemas|clara|claras)\b/i, "ovos"],
  [/\b(?:farinha de trigo|trigo|glúten|biscoito|bolacha)\b/i, "gl\xFAten"],
  [/\b(?:castanha|noz|amêndoa|avelã|pistache|macadâmia)\b/i, "castanhas"],
  [/\b(?:amendoim|paçoca)\b/i, "amendoim"]
];
var blockedHealthClaims = /cura\w*|trat\w+ (?:a|o|do|da)|emagrec\w+|anti-?inflamatório|detox|controla (?:a|o) (?:glicemia|diabetes|pressão)/i;
async function withRetry(name, action, attempts = 3) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
  throw new Error(`${name}: ${lastError instanceof Error ? lastError.message : "falha externa"}`);
}
function chooseCategory(existing) {
  const weekCounts = /* @__PURE__ */ new Map();
  for (const item of existing) weekCounts.set(item.category, (weekCounts.get(item.category) ?? 0) + 1);
  return [...RECIPE_CATEGORIES].sort((left, right) => (weekCounts.get(left) ?? 0) - (weekCounts.get(right) ?? 0))[0];
}
async function generateRecipeJson(existingTitles, category) {
  const prompt = `Crie uma receita original da Chocol\xEDcia. A voz \xE9 calorosa, artesanal e acolhedora, em portugu\xEAs do Brasil. As medidas devem ser em gramas, x\xEDcaras e colheres. A receita precisa ser realista e test\xE1vel numa cozinha dom\xE9stica, com dicas de ponto, conserva\xE7\xE3o e substitui\xE7\xF5es. Categoria desejada: ${category}. N\xE3o repita nem fa\xE7a varia\xE7\xF5es dos t\xEDtulos existentes: ${existingTitles.map((item) => item.title).join("; ") || "nenhum"}. N\xE3o copie textos de sites. N\xE3o fa\xE7a alega\xE7\xF5es ou recomenda\xE7\xF5es m\xE9dicas/de sa\xFAde. Devolva somente um objeto JSON v\xE1lido, sem Markdown, com: title, excerpt (at\xE9 160 caracteres), category (uma destas exatamente: ${RECIPE_CATEGORIES.join(" | ")}), tags, coverImageAlt, ingredients (array de grupos {name,items:[{quantity,unit,name,note?}]}), steps (array {title?,instruction}), tips (array), storageNotes, faq (array {question,answer}), prepTimeMin, cookTimeMin, servings e difficulty (F\xE1cil, M\xE9dia ou Dif\xEDcil). Inclua tempos plaus\xEDveis, no m\xEDnimo dois passos detalhados e quantidades completas.`;
  const generated = await generateRecipeText([
    { role: "system", content: "Voc\xEA \xE9 a redatora culin\xE1ria da Chocol\xEDcia. Gere conte\xFAdo original e seguro. Responda sempre apenas JSON v\xE1lido e nunca ofere\xE7a alega\xE7\xF5es m\xE9dicas." },
    { role: "user", content: prompt }
  ]);
  const content = generated.content;
  const parsed = generatedContentSchema.parse(JSON.parse(content));
  const allText = JSON.stringify(parsed);
  if (blockedHealthClaims.test(allText)) throw new Error("Conte\xFAdo com alega\xE7\xE3o m\xE9dica/de sa\xFAde bloqueado");
  const detected = allergenMap.filter(([pattern]) => pattern.test(allText)).map(([, label]) => label);
  if (detected.length) {
    const warning = `Aten\xE7\xE3o a alerg\xEAnicos: esta receita cont\xE9m ${detected.join(", ")}. Verifique os r\xF3tulos dos ingredientes e evite contamina\xE7\xE3o cruzada.`;
    if (!parsed.tips.some((tip) => tip.toLowerCase().includes("alerg\xEAn"))) parsed.tips.push(warning);
  }
  return { content: parsed, provider: generated.provider, model: generated.model };
}
async function getSharp() {
  const mod = await import("sharp");
  return mod.default ?? mod;
}
async function storeVariants(title, image) {
  const sharp = await getSharp();
  const slug = toSlug(title) || `receita-${Date.now()}`;
  const sizes = [480, 800, 1280];
  const variants = {};
  for (const width of sizes) {
    const resized = sharp(image).resize({ width, withoutEnlargement: true });
    const [webp, avif] = await Promise.all([
      resized.clone().webp({ quality: 82 }).toBuffer(),
      resized.clone().avif({ quality: 55, effort: 4 }).toBuffer()
    ]);
    const [webpObject, avifObject] = await Promise.all([
      storagePutPublic(`recipes/${slug}-${width}.webp`, webp, "image/webp"),
      storagePutPublic(`recipes/${slug}-${width}.avif`, avif, "image/avif")
    ]);
    variants[`w${width}`] = webpObject.url;
    variants[`avif${width}`] = avifObject.url;
  }
  return variants;
}
async function runDailyRecipeGeneration() {
  const publishedSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3);
  const [allPublished, recent] = await Promise.all([
    getAllPublishedRecipeTitles(),
    getPublishedRecipeTitlesSince(publishedSince)
  ]);
  const category = chooseCategory(recent);
  let draftTitle = `Receita Chocol\xEDcia ${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}`;
  let aiModel;
  try {
    const generated = await withRetry("gera\xE7\xE3o de texto", () => generateRecipeJson(allPublished, category));
    const content = generated.content;
    aiModel = `${generated.provider}:${generated.model}`;
    draftTitle = content.title;
    const slug = toSlug(content.title);
    if (!slug) throw new Error("N\xE3o foi poss\xEDvel gerar o slug da receita");
    const duplicate = allPublished.some((item) => item.title.toLowerCase() === content.title.toLowerCase() || item.slug === slug);
    if (duplicate) throw new Error("Receita repetida: t\xEDtulo/slug j\xE1 publicado");
    const imagePrompt = `Fotografia gastron\xF4mica artesanal, close-up editorial da receita ${content.title}. ${content.coverImageAlt}. Luz natural suave, tons quentes, lou\xE7a simples, fundo creme e marrom, textura apetitosa e realista, composi\xE7\xE3o acolhedora de confeitaria caseira, foco n\xEDtido no doce. Sem texto, sem logotipos, sem marcas, sem pessoas.`;
    const generatedImage = await withRetry("gera\xE7\xE3o de imagem", () => generateRecipeImage(imagePrompt), 2);
    const image = generatedImage.image;
    aiModel = `${generated.provider}:${generated.model}; imagem=${generatedImage.provider}:${generatedImage.model}`;
    const variants = await storeVariants(content.title, image);
    const coverImageUrl = variants.w1280 ?? variants.w800 ?? variants.w480;
    if (!coverImageUrl) throw new Error("N\xE3o foi poss\xEDvel armazenar a imagem gerada");
    const status = process.env.AUTO_PUBLISH?.toLowerCase() === "false" ? "draft" : "published";
    const recipe = await insertRecipe({
      ...content,
      slug,
      coverImageUrl,
      coverImageVariants: variants,
      imagePrompt,
      status,
      publishedAt: status === "published" ? /* @__PURE__ */ new Date() : void 0,
      aiModel,
      generationMeta: { generatedAt: (/* @__PURE__ */ new Date()).toISOString(), textProvider: generated.provider, textModel: generated.model, imageProvider: generatedImage.provider, imageModel: generatedImage.model, categoryChosen: category, source: "daily-cron" }
    });
    return { status: recipe.status, slug: recipe.slug, title: recipe.title, publishedAt: recipe.publishedAt };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Falha desconhecida";
    console.error("[RecipeAgent] failed:", detail);
    try {
      const failedSlug = `${(toSlug(draftTitle) || "receita").slice(0, 150)}-falha-${Date.now()}`.slice(0, 180);
      await insertFailedRecipe({ slug: failedSlug, title: draftTitle, error: detail, aiModel });
    } catch (auditError) {
      console.error("[RecipeAgent] failed to audit error:", auditError);
    }
    return { status: "failed", title: draftTitle, error: detail };
  }
}

// server/agentAuth.ts
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
function tokenEquals(received, expected) {
  const left = createHash("sha256").update(received).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right) && received.length > 0;
}
function readBearer(req) {
  const value = req.header("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}
function resolveAgentScope(req) {
  const received = readBearer(req);
  if (!received) return null;
  const draft = process.env.RECIPES_AGENT_TOKEN_DRAFT ?? "";
  const publish = process.env.RECIPES_AGENT_TOKEN_PUBLISH ?? "";
  const legacy = process.env.RECIPES_AGENT_TOKEN ?? "";
  const matchesDraft = Boolean(draft && tokenEquals(received, draft));
  const matchesPublish = Boolean(publish && tokenEquals(received, publish));
  if (matchesDraft && matchesPublish) return null;
  if (matchesPublish) return "publish";
  if (matchesDraft) return "draft";
  if (legacy && tokenEquals(received, legacy)) {
    console.warn("[AgentAuth] Token legado usado com escopo draft.");
    return "draft";
  }
  return null;
}
function agentTokensConfigured() {
  return Boolean(
    process.env.RECIPES_AGENT_TOKEN_DRAFT || process.env.RECIPES_AGENT_TOKEN_PUBLISH || process.env.RECIPES_AGENT_TOKEN
  );
}
function requestId(req, res) {
  const received = req.header("x-request-id")?.trim();
  const id = received && /^[A-Za-z0-9._:-]{1,128}$/.test(received) ? received : randomUUID();
  res.setHeader("X-Request-Id", id);
  return id;
}
function agentError(res, status, code, message, details = []) {
  return res.status(status).json({ error: { code, message, details } });
}
function publishingAllowed(scope, status, res) {
  if (status === "draft") return true;
  if (scope !== "publish") {
    agentError(res, 403, "scope_insufficient", "O token n\xE3o permite publicar conte\xFAdo.");
    return false;
  }
  if ((process.env.AGENT_PUBLISHING_ENABLED ?? "false").toLowerCase() !== "true") {
    agentError(res, 403, "publishing_disabled", "A publica\xE7\xE3o autom\xE1tica est\xE1 desabilitada.");
    return false;
  }
  const phase = Number(process.env.AGENT_PHASE ?? "0");
  if (!Number.isInteger(phase) || phase < 1 || phase > 3) {
    agentError(res, 403, "phase_not_allowed", "A fase atual n\xE3o permite publica\xE7\xE3o.");
    return false;
  }
  return true;
}
function requireV1(req, res) {
  const version = req.header("x-contract-version");
  if (version === "1") return true;
  if (version !== void 0) {
    agentError(res, 400, "unsupported_contract_version", "Vers\xE3o de contrato n\xE3o suportada.");
  } else {
    agentError(res, 400, "contract_version_required", "O cabe\xE7alho X-Contract-Version \xE9 obrigat\xF3rio.");
  }
  return false;
}
function hashRequest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

// server/agentImages.ts
var IMAGE_HOSTS = {
  pexels: ["images.pexels.com"],
  pixabay: ["cdn.pixabay.com"],
  wikimedia: ["upload.wikimedia.org"],
  openverse: ["upload.wikimedia.org", "images.unsplash.com", "images.pexels.com", "cdn.pixabay.com"]
};
var MAX_IMAGE_BYTES = 10 * 1024 * 1024;
var WIDTHS = [480, 800, 1280];
function allowedImageUrl(value, provider) {
  const url = new URL(value);
  const hosts = IMAGE_HOSTS[provider.toLowerCase()];
  if (url.protocol !== "https:" || !hosts?.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)) || url.username || url.password || url.port && url.port !== "443") {
    throw new Error("A origem da imagem n\xE3o est\xE1 autorizada.");
  }
  return url;
}
async function downloadStockImage(cover) {
  let url = allowedImageUrl(cover.sourceImageUrl, cover.provider);
  for (let redirects = 0; redirects <= 2; redirects++) {
    const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(15e3) });
    if (response.status >= 300 && response.status < 400) {
      if (redirects === 2) throw new Error("A imagem excedeu o limite de redirecionamentos.");
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirecionamento da imagem sem destino.");
      url = allowedImageUrl(new URL(location, url).toString(), cover.provider);
      continue;
    }
    if (!response.ok) throw new Error(`O provedor de imagem respondeu HTTP ${response.status}.`);
    const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
    if (!["image/jpeg", "image/png", "image/webp"].includes(contentType ?? "")) {
      throw new Error("O provedor n\xE3o retornou uma imagem JPEG, PNG ou WebP.");
    }
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_IMAGE_BYTES) throw new Error("A imagem excede o limite de 10 MB.");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error("A imagem excede o limite de 10 MB.");
    return bytes;
  }
  throw new Error("N\xE3o foi poss\xEDvel obter a imagem.");
}
async function generateImage(prompt) {
  if ((process.env.AGENT_IMAGE_GENERATION_ENABLED ?? "false").toLowerCase() !== "true") {
    throw new Error("A gera\xE7\xE3o de imagens por IA est\xE1 desabilitada.");
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("O provedor de imagens n\xE3o est\xE1 configurado.");
  const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.RECIPES_IMAGE_MODEL ?? "gpt-image-1",
      prompt,
      size: "1536x1024",
      quality: "medium",
      output_format: "png"
    }),
    signal: AbortSignal.timeout(45e3)
  });
  if (!response.ok) throw new Error(`O provedor de imagens respondeu HTTP ${response.status}.`);
  const payload = await response.json();
  const encoded = payload.data?.[0]?.b64_json;
  if (!encoded) throw new Error("O provedor de imagens n\xE3o retornou conte\xFAdo.");
  return Buffer.from(encoded, "base64");
}
async function processAgentCover(cover, slug) {
  const sharpModule = await import("sharp");
  const sharp = sharpModule.default ?? sharpModule;
  const sourceBytes = cover.mode === "stock" ? await downloadStockImage(cover) : await generateImage(cover.imagePrompt);
  const metadata = await sharp(sourceBytes).metadata();
  if (!["jpeg", "png", "webp"].includes(metadata.format ?? "") || !metadata.width || metadata.width < 1280 || !metadata.height) {
    throw new Error("A imagem n\xE3o corresponde ao formato ou \xE0 resolu\xE7\xE3o m\xEDnima exigida.");
  }
  const variants = {};
  for (const width of WIDTHS) {
    const resized = sharp(sourceBytes).rotate().resize({ width, withoutEnlargement: true });
    const [webp, avif] = await Promise.all([
      resized.clone().webp({ quality: 82 }).toBuffer(),
      resized.clone().avif({ quality: 55, effort: 4 }).toBuffer()
    ]);
    const [webpObject, avifObject] = await Promise.all([
      storagePutPublic(`tips/${slug}-${width}.webp`, webp, "image/webp"),
      storagePutPublic(`tips/${slug}-${width}.avif`, avif, "image/avif")
    ]);
    variants[`w${width}`] = webpObject.url;
    variants[`avif${width}`] = avifObject.url;
  }
  const url = variants.w1280;
  if (!url) throw new Error("A imagem processada n\xE3o tem variante de capa.");
  return {
    url,
    variants,
    isAi: cover.mode === "generate",
    source: cover.mode === "stock" ? {
      mode: "stock",
      provider: cover.provider,
      sourceImageUrl: cover.sourceImageUrl,
      sourcePageUrl: cover.sourcePageUrl,
      author: cover.author,
      license: cover.license,
      attributionText: cover.attributionText
    } : { mode: "generate", imagePrompt: cover.imagePrompt, model: process.env.RECIPES_IMAGE_MODEL ?? "gpt-image-1" }
  };
}

// server/recipesRoutes.ts
var PUBLIC_CACHE = "public, s-maxage=60, stale-while-revalidate=300";
function cachePublic(res) {
  res.setHeader("Cache-Control", PUBLIC_CACHE);
}
function timingSafeTokenEquals(received, expected) {
  const left = createHash2("sha256").update(received).digest();
  const right = createHash2("sha256").update(expected).digest();
  return timingSafeEqual2(left, right) && received.length > 0;
}
function readBearer2(req) {
  const value = req.header("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}
function sanitizeString(value) {
  return value.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "").replace(/<[^>]*>/g, " ").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim();
}
function sanitizeDeep(value) {
  if (typeof value === "string") return sanitizeString(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeDeep(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key2, item]) => [key2, sanitizeDeep(item)]));
  }
  return value;
}
function slugify(title) {
  return toSlug(title);
}
function publicRecipe(row) {
  return row;
}
var V1_RECIPE_CATEGORIES = {
  "bolos-simples": { category: "Bolos", subcategory: "Bolos simples" },
  "brigadeiros-e-docinhos": { category: "Brigadeiros e docinhos", subcategory: "Brigadeiros e docinhos" },
  "trufas-e-bombons": { category: "Chocolates", subcategory: "Trufas e bombons" },
  "doces-de-colher": { category: "Sobremesas", subcategory: "Doces de colher" }
};
function saoPauloDayStart() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(/* @__PURE__ */ new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), 3));
}
function configuredCap(name, fallback) {
  const raw = process.env[name];
  if (raw === void 0 || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : null;
}
async function createV1Recipe(req, res) {
  requestId(req, res);
  if (!requireV1(req, res)) return;
  if (!agentTokensConfigured()) {
    agentError(res, 503, "agent_auth_not_configured", "A autentica\xE7\xE3o do agente n\xE3o est\xE1 configurada.");
    return;
  }
  const scope = resolveAgentScope(req);
  if (!scope) {
    agentError(res, 401, "unauthorized", "N\xE3o autorizado.");
    return;
  }
  const idempotencyKey = req.header("idempotency-key")?.trim() ?? "";
  if (!/^[a-f0-9]{64}$/i.test(idempotencyKey)) {
    agentError(res, 400, "idempotency_key_required", "Idempotency-Key deve conter um SHA-256 hexadecimal.");
    return;
  }
  const contentLength = Number(req.header("content-length") ?? 0);
  if (Math.max(contentLength, Buffer.byteLength(JSON.stringify(req.body ?? {}), "utf8")) > 1e6) {
    agentError(res, 413, "payload_too_large", "O conte\xFAdo excede o limite permitido.");
    return;
  }
  const parsed = recipeInputSchemaV1.safeParse(req.body);
  if (!parsed.success) {
    agentError(res, 400, "validation_failed", "Receita inv\xE1lida.", parsed.error.issues.map((issue) => ({
      field: issue.path.join("."),
      issue: issue.message
    })));
    return;
  }
  const clean = sanitizeDeep(parsed.data);
  const requestHash = hashRequest(clean);
  try {
    const prior = await getAgentRecipeByIdempotencyKey(idempotencyKey);
    if (prior) {
      if (prior.agentRequestHash !== requestHash) {
        agentError(res, 422, "idempotency_key_reuse", "A mesma chave foi usada com outro conte\xFAdo.");
        return;
      }
      res.setHeader("Idempotent-Replay", "true");
      res.status(201).json({
        id: prior.id,
        slug: prior.slug,
        status: prior.status,
        url: `${req.protocol}://${req.get("host")}/receitas/${encodeURIComponent(prior.slug)}`
      });
      return;
    }
    const topicSlug = String(clean.generationMeta.topic_slug ?? "");
    const runId = String(clean.generationMeta.run_id ?? "");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(topicSlug) || !runId) {
      agentError(res, 400, "validation_failed", "generationMeta precisa conter run_id e topic_slug v\xE1lidos.");
      return;
    }
    const taxonomy = V1_RECIPE_CATEGORIES[clean.subcategorySlug];
    if (!taxonomy) {
      agentError(res, 422, "subcategory_not_enabled", "A subcategoria n\xE3o est\xE1 habilitada para recebimento.");
      return;
    }
    if (!publishingAllowed(scope, clean.status, res)) return;
    const dayStart2 = saoPauloDayStart();
    const cap = clean.status === "published" ? configuredCap("AGENT_DAILY_CAP_RECIPES", 1) : configuredCap("AGENT_DAILY_CAP_DRAFTS", 3);
    if (cap === null) {
      agentError(res, 503, "invalid_configuration", "O limite di\xE1rio de conte\xFAdo est\xE1 inv\xE1lido.");
      return;
    }
    const count3 = await countAgentRecipesSince(clean.status, dayStart2);
    if (count3 >= cap) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((dayStart2.getTime() + 864e5 - Date.now()) / 1e3))));
      agentError(res, 429, "daily_cap_reached", "O limite di\xE1rio de receitas foi atingido.");
      return;
    }
    const existing = await getAgentRecipeByTopicSlug(topicSlug);
    if (existing) {
      agentError(res, 409, "topic_exists", "J\xE1 existe conte\xFAdo para esta pauta.");
      return;
    }
    const slug = clean.slug ?? toSlug(clean.title);
    if (!slug) {
      agentError(res, 400, "validation_failed", "N\xE3o foi poss\xEDvel gerar o slug da receita.");
      return;
    }
    let image;
    try {
      image = await processAgentCover(clean.cover, slug);
    } catch (error) {
      console.error("[Recipes] v1 image processing failed:", typeName(error), res.getHeader("X-Request-Id"));
      agentError(res, 422, "image_processing_failed", "A imagem n\xE3o p\xF4de ser validada e armazenada.");
      return;
    }
    const generationMeta = {
      ...clean.generationMeta,
      contractV1: {
        intro: clean.intro ?? null,
        restTimeMin: clean.restTimeMin,
        yieldLabel: clean.yieldLabel ?? null,
        diet: clean.diet,
        occasions: clean.occasions,
        collections: clean.collections,
        cover: image.source
      }
    };
    if (!clean.authorId && !clean.authorSlug) {
      agentError(res, 422, "author_required", "A receita precisa de um autor resolvido pela regra editorial.");
      return;
    }
    const recipe = await insertRecipe({
      slug,
      title: clean.title,
      excerpt: clean.excerpt,
      category: taxonomy.category,
      subcategory: taxonomy.subcategory,
      subcategorySlug: clean.subcategorySlug,
      authorId: await resolveAuthorId(clean.authorId, clean.authorSlug),
      tags: clean.tags,
      coverImageUrl: image.url,
      coverImageAlt: clean.coverImageAlt,
      imagePrompt: clean.cover.mode === "generate" ? clean.cover.imagePrompt : "",
      coverImageVariants: image.variants,
      ingredients: clean.ingredients.map((section) => ({
        name: section.name,
        items: section.items.map(({ ingredientSlug: _ingredientSlug, ...item }) => item)
      })),
      steps: clean.steps,
      tips: clean.tips,
      storageNotes: clean.storageNotes,
      faq: clean.faq,
      prepTimeMin: clean.prepTimeMin,
      cookTimeMin: clean.cookTimeMin,
      servings: clean.servings,
      difficulty: clean.difficulty,
      status: clean.status,
      aiModel: clean.aiModel,
      generationMeta
    }, { topicSlug, idempotencyKey, requestHash });
    res.status(201).json({
      id: recipe.id,
      slug: recipe.slug,
      status: recipe.status,
      url: `${req.protocol}://${req.get("host")}/receitas/${encodeURIComponent(recipe.slug)}`
    });
  } catch (error) {
    const dbError = error;
    if (dbError.code === "23505") {
      agentError(res, 409, "topic_exists", "J\xE1 existe conte\xFAdo com esta pauta ou chave idempotente.");
      return;
    }
    console.error("[Recipes] v1 create failed:", typeName(error), res.getHeader("X-Request-Id"));
    agentError(res, 503, "server_error", "N\xE3o foi poss\xEDvel guardar a receita.");
  }
}
function typeName(error) {
  return error instanceof Error ? error.name : "UnknownError";
}
function createRecipesRouter() {
  const router2 = express.Router();
  router2.get("/featured", async (_req, res) => {
    try {
      const rows = await listFeaturedRecipes();
      cachePublic(res);
      res.json(rows.map(publicRecipe));
    } catch (error) {
      console.error("[Recipes] featured:", error);
      res.status(503).json({ error: "As receitas est\xE3o temporariamente indispon\xEDveis." });
    }
  });
  router2.get("/", async (req, res) => {
    const parsed = recipeListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Par\xE2metros de pesquisa inv\xE1lidos." });
      return;
    }
    try {
      const { items, nextCursor } = await listRecipes(parsed.data);
      cachePublic(res);
      res.json({ items: items.map(publicRecipe), nextCursor });
    } catch (error) {
      if (error instanceof Error && error.message === "Cursor inv\xE1lido") {
        res.status(400).json({ error: error.message });
        return;
      }
      console.error("[Recipes] list:", error);
      res.status(503).json({ error: "N\xE3o foi poss\xEDvel carregar as receitas." });
    }
  });
  const dailyHandler = async (req, res) => {
    const expected = process.env.CRON_SECRET;
    if (!expected) {
      res.status(503).json({ error: "O cron di\xE1rio n\xE3o est\xE1 configurado." });
      return;
    }
    if (!timingSafeTokenEquals(readBearer2(req), expected)) {
      res.status(401).json({ error: "N\xE3o autorizado." });
      return;
    }
    try {
      const result = await runDailyRecipeGeneration();
      res.status(result.status === "failed" ? 500 : 201).json(result);
    } catch (error) {
      console.error("[Recipes] daily generation:", error);
      res.status(500).json({ error: "A gera\xE7\xE3o di\xE1ria falhou." });
    }
  };
  router2.get("/generate-daily", dailyHandler);
  router2.post("/generate-daily", dailyHandler);
  router2.post("/", async (req, res) => {
    if (req.header("x-contract-version") !== void 0) {
      await createV1Recipe(req, res);
      return;
    }
    const expected = process.env.RECIPES_AGENT_TOKEN;
    if (!expected) {
      res.status(503).json({ error: "A publica\xE7\xE3o por agente n\xE3o est\xE1 configurada." });
      return;
    }
    if (!timingSafeTokenEquals(readBearer2(req), expected)) {
      res.status(401).json({ error: "N\xE3o autorizado." });
      return;
    }
    const contentLength = Number(req.header("content-length") ?? 0);
    const parsedLength = Buffer.byteLength(JSON.stringify(req.body ?? {}), "utf8");
    if (Math.max(contentLength, parsedLength) > 1e6) {
      res.status(413).json({ error: "O conte\xFAdo excede o limite permitido." });
      return;
    }
    const parsed = recipeInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Receita inv\xE1lida.", details: parsed.error.flatten() });
      return;
    }
    const clean = sanitizeDeep(parsed.data);
    if (clean.subcategorySlug) {
      const subcategories = RECIPE_TAXONOMY[clean.category] ?? [];
      const subcategory = subcategories.find((item) => item.slug === clean.subcategorySlug);
      if (!subcategory) {
        res.status(422).json({ error: "A subcategoria n\xE3o pertence \xE0 categoria informada.", code: "invalid_subcategory" });
        return;
      }
      clean.subcategory = subcategory.name;
    }
    const imageUrl = new URL(clean.coverImageUrl);
    if (imageUrl.protocol !== "https:" && imageUrl.protocol !== "http:") {
      res.status(400).json({ error: "A imagem precisa de um URL HTTP ou HTTPS." });
      return;
    }
    const slug = clean.slug ?? slugify(clean.title);
    if (!slug) {
      res.status(400).json({ error: "N\xE3o foi poss\xEDvel gerar o slug da receita." });
      return;
    }
    try {
      const recipe = await insertRecipe({ ...clean, slug });
      res.status(201).json(recipe);
    } catch (error) {
      const dbError = error;
      if (dbError.code === "23505") {
        res.status(409).json({ error: "J\xE1 existe uma receita com este slug." });
        return;
      }
      console.error("[Recipes] create:", error);
      res.status(503).json({ error: "N\xE3o foi poss\xEDvel guardar a receita." });
    }
  });
  router2.get("/:slug", async (req, res) => {
    const slug = String(req.params.slug);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      res.status(404).json({ error: "Receita n\xE3o encontrada." });
      return;
    }
    try {
      const recipe = await getPublishedRecipeBySlug(slug);
      if (!recipe) {
        res.status(404).json({ error: "Receita n\xE3o encontrada." });
        return;
      }
      cachePublic(res);
      res.json(recipe);
    } catch (error) {
      console.error("[Recipes] detail:", error);
      res.status(503).json({ error: "N\xE3o foi poss\xEDvel carregar esta receita." });
    }
  });
  return router2;
}

// server/tipsRoutes.ts
import express2 from "express";

// shared/tips.ts
import { z as z5 } from "zod";
var TIP_TYPES = ["dica", "tecnica", "materia"];
var TIP_TOPICS = [
  { slug: "montagem-e-apresentacao", name: "Montagem e apresenta\xE7\xE3o", description: "Acabamento, embalagem e apresenta\xE7\xE3o de doces.", sortOrder: 1 },
  { slug: "ornamentacao", name: "Ornamenta\xE7\xE3o", description: "Decora\xE7\xE3o, coberturas e acabamento.", sortOrder: 2 },
  { slug: "preparo", name: "Preparo", description: "T\xE9cnicas, ponto e corre\xE7\xE3o de preparo.", sortOrder: 3 },
  { slug: "equipamentos-uso", name: "Uso de equipamentos", description: "Uso, limpeza e manuten\xE7\xE3o.", sortOrder: 4 },
  { slug: "equipamentos-compra", name: "Escolha de equipamentos", description: "Crit\xE9rios para escolher equipamentos.", sortOrder: 5 },
  { slug: "negocios", name: "Neg\xF3cios na culin\xE1ria", description: "Organiza\xE7\xE3o e opera\xE7\xE3o de neg\xF3cios de doces.", sortOrder: 6 }
];
var coverStock = z5.object({ mode: z5.literal("stock"), provider: z5.string().trim().min(1).max(40), sourceImageUrl: z5.string().url().refine((v) => v.startsWith("https://")), sourcePageUrl: z5.string().url().refine((v) => v.startsWith("https://")), author: z5.string().max(200), license: z5.string().trim().min(1).max(120), attributionText: z5.string().max(400) });
var coverGenerate = z5.object({ mode: z5.literal("generate"), imagePrompt: z5.string().trim().min(1).max(2e3) });
var tipInputSchema = z5.object({
  type: z5.enum(TIP_TYPES),
  title: z5.string().trim().min(5).max(180),
  slug: z5.string().trim().min(3).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  excerpt: z5.string().trim().min(20).max(160),
  bodyMd: z5.string().trim().min(1).max(3e4),
  tipTopic: z5.string().trim().min(1).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  authorId: z5.number().int().positive().optional(),
  authorSlug: z5.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  structured: z5.record(z5.string(), z5.unknown()).optional(),
  sources: z5.array(z5.object({ name: z5.string().min(1).max(200), title: z5.string().min(1).max(300), url: z5.string().url() })).max(20).default([]),
  cover: z5.discriminatedUnion("mode", [coverStock, coverGenerate]),
  coverImageAlt: z5.string().trim().min(8).max(240),
  tags: z5.array(z5.string().trim().min(1).max(40)).max(12).default([]),
  relatedTopics: z5.array(z5.string().trim().min(1).max(120)).max(6).default([]),
  metaTitle: z5.string().trim().max(180).optional(),
  metaDescription: z5.string().trim().max(320).optional(),
  canonicalUrl: z5.string().url().optional(),
  status: z5.enum(["draft", "published"]).default("draft"),
  aiModel: z5.string().trim().min(1).max(120),
  generationMeta: z5.record(z5.string(), z5.unknown())
}).superRefine((value, ctx) => {
  if (value.type === "dica" && !value.tipTopic) ctx.addIssue({ code: "custom", path: ["tipTopic"], message: "Dica exige t\xF3pico." });
  if (new Set(value.tags).size !== value.tags.length) ctx.addIssue({ code: "custom", path: ["tags"], message: "Tags repetidas." });
});

// server/tipsDb.ts
import { and as and2, count as count2, desc as desc2, eq as eq3, gte as gte2, isNotNull as isNotNull2, sql as sql2 } from "drizzle-orm";
function dbOrThrow(db) {
  if (!db) throw new Error("A base de dados n\xE3o est\xE1 configurada");
  return db;
}
async function authorId(tx, input) {
  if (input.authorId) return input.authorId;
  if (!input.authorSlug) throw new Error("Autor n\xE3o informado");
  const rows = await tx.select({ id: authors.id }).from(authors).where(and2(eq3(authors.slug, input.authorSlug), eq3(authors.active, true))).limit(1);
  if (!rows[0]) throw new Error("Autor n\xE3o encontrado ou inativo");
  return rows[0].id;
}
async function insertTip(input, cover, agent) {
  const db = dbOrThrow(await getDb());
  const now = /* @__PURE__ */ new Date();
  return db.transaction(async (tx) => {
    const resolvedAuthorId = await authorId(tx, input);
    const topic = await tx.select({ slug: tipTopics.slug }).from(tipTopics).where(and2(eq3(tipTopics.slug, input.tipTopic), eq3(tipTopics.active, true))).limit(1);
    if (!topic[0]) throw new Error(`T\xF3pico n\xE3o encontrado: ${input.tipTopic}`);
    const generationMeta = { ...input.generationMeta, structured: input.structured ?? null, sources: input.sources, related_topics: input.relatedTopics, cover: { source: cover.source, variants: cover.variants, is_ai: cover.isAi }, agent_topic_slug: agent.topicSlug, agent_idempotency_key: agent.idempotencyKey, agent_request_hash: agent.requestHash };
    const [row] = await tx.insert(tips).values({ slug: input.slug, title: input.title, excerpt: input.excerpt, content: input.bodyMd, tipType: input.type, tipTopic: input.tipTopic, authorId: resolvedAuthorId, coverImageUrl: cover.url, coverImageAlt: input.coverImageAlt, metaTitle: input.metaTitle ?? input.title, metaDescription: input.metaDescription ?? input.excerpt, canonicalUrl: input.canonicalUrl ?? null, tags: input.tags, generationMeta, status: input.status, reviewStatus: input.status === "published" ? "approved" : "pending", publishedAt: input.status === "published" ? now : null, agentTopicSlug: agent.topicSlug, agentIdempotencyKey: agent.idempotencyKey, agentRequestHash: agent.requestHash, createdAt: now, updatedAt: now }).returning();
    const [image] = await tx.insert(images).values({ fileUrl: cover.url, altText: input.coverImageAlt, imageType: "tip-cover", sourceType: cover.isAi ? "generated" : "stock", generationMeta: { source: cover.source, variants: cover.variants }, active: true, createdAt: now, updatedAt: now }).returning();
    await tx.insert(tipImages).values({ tipId: row.id, imageId: image.id, imageUrl: cover.url, altText: input.coverImageAlt, imageRole: "cover", sortOrder: 0, createdAt: now });
    if (input.tags.length) {
      const rows = await tx.select({ id: tags.id }).from(tags).where(sql2`${tags.slug} = ANY(${input.tags})`);
      if (rows.length !== input.tags.length) throw new Error("Uma ou mais tags n\xE3o foram encontradas");
      await tx.insert(tipTags).values(rows.map((tag) => ({ tipId: row.id, tagId: tag.id, createdAt: now })));
    }
    return row;
  });
}
async function getTipByIdempotencyKey(key2) {
  const db = dbOrThrow(await getDb());
  const rows = await db.select().from(tips).where(eq3(tips.agentIdempotencyKey, key2)).limit(1);
  return rows[0] ?? null;
}
async function getTipByTopicSlug(key2) {
  const db = dbOrThrow(await getDb());
  const rows = await db.select().from(tips).where(eq3(tips.agentTopicSlug, key2)).limit(1);
  return rows[0] ?? null;
}
async function getTipBySlug(slug) {
  const db = dbOrThrow(await getDb());
  const rows = await db.select().from(tips).where(eq3(tips.slug, slug)).limit(1);
  return rows[0] ?? null;
}
async function listPublishedTips(limit = 24) {
  const db = dbOrThrow(await getDb());
  return db.select({ id: tips.id, type: tips.tipType, slug: tips.slug, title: tips.title, excerpt: tips.excerpt, tipTopic: tips.tipTopic, authorId: tips.authorId, authorName: authors.name, coverImageUrl: tips.coverImageUrl, coverImageAlt: tips.coverImageAlt, publishedAt: tips.publishedAt, updatedAt: tips.updatedAt }).from(tips).leftJoin(authors, eq3(tips.authorId, authors.id)).where(and2(eq3(tips.status, "published"), isNotNull2(tips.publishedAt))).orderBy(desc2(tips.publishedAt), desc2(tips.id)).limit(limit);
}
async function getPublishedTipBySlug(slug) {
  const db = dbOrThrow(await getDb());
  const rows = await db.select({ tip: tips, authorName: authors.name }).from(tips).leftJoin(authors, eq3(tips.authorId, authors.id)).where(and2(eq3(tips.slug, slug), eq3(tips.status, "published"))).limit(1);
  if (!rows[0]) return null;
  const meta = rows[0].tip.generationMeta ?? {};
  return { ...rows[0].tip, bodyMd: rows[0].tip.content, relatedTopics: meta.related_topics ?? [], sources: meta.sources ?? [], coverImageVariants: meta.cover?.variants ?? {}, coverImageSource: meta.cover?.source ?? null, coverImageIsAi: Boolean(meta.cover?.is_ai), authorName: rows[0].authorName };
}
async function countTipsSince(status, since) {
  const db = dbOrThrow(await getDb());
  const rows = await db.select({ value: count2() }).from(tips).where(and2(eq3(tips.status, status), gte2(status === "draft" ? tips.createdAt : tips.publishedAt, since)));
  return Number(rows[0]?.value ?? 0);
}

// server/tipsRoutes.ts
var PUBLIC_CACHE2 = "public, s-maxage=60, stale-while-revalidate=300";
function cachePublic2(res) {
  res.setHeader("Cache-Control", PUBLIC_CACHE2);
}
function sanitize(value) {
  if (typeof value === "string") return value.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "").replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitize(v)]));
  return value;
}
function dayStart() {
  const d = /* @__PURE__ */ new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
async function createTip(req, res) {
  requestId(req, res);
  if (!requireV1(req, res) || !agentTokensConfigured()) return;
  const scope = resolveAgentScope(req);
  if (!scope) {
    agentError(res, 401, "unauthorized", "N\xE3o autorizado.");
    return;
  }
  const key2 = req.header("idempotency-key")?.trim() ?? "";
  if (!/^[a-f0-9]{64}$/i.test(key2)) {
    agentError(res, 400, "idempotency_key_required", "Idempotency-Key deve conter um SHA-256 hexadecimal.");
    return;
  }
  const parsed = tipInputSchema.safeParse(sanitize(req.body));
  if (!parsed.success) {
    agentError(res, 400, "validation_failed", "Conte\xFAdo educativo inv\xE1lido.", parsed.error.issues.map((i) => ({ field: i.path.join("."), issue: i.message })));
    return;
  }
  const input = parsed.data;
  if ((input.type === "tecnica" || input.type === "materia") && input.status === "published") {
    agentError(res, 422, "review_required", "T\xE9cnicas e mat\xE9rias devem entrar como rascunho para revis\xE3o.");
    return;
  }
  if (input.status === "published" && input.type !== "dica") {
    agentError(res, 422, "review_required", "Este tipo de conte\xFAdo exige revis\xE3o editorial.");
    return;
  }
  if (!publishingAllowed(scope, input.status, res)) return;
  const requestHash = hashRequest(input);
  try {
    const prior = await getTipByIdempotencyKey(key2);
    if (prior) {
      if (prior.agentRequestHash !== requestHash) {
        agentError(res, 422, "idempotency_key_reuse", "A mesma chave foi usada com outro conte\xFAdo.");
        return;
      }
      res.setHeader("Idempotent-Replay", "true");
      res.status(201).json({ id: prior.id, slug: prior.slug, status: prior.status, url: `${req.protocol}://${req.get("host")}/dicas/${encodeURIComponent(prior.slug)}` });
      return;
    }
    const topicSlug = String(input.generationMeta.topic_slug ?? input.tipTopic);
    const runId = String(input.generationMeta.run_id ?? "");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(topicSlug) || !runId) {
      agentError(res, 400, "validation_failed", "generationMeta precisa conter run_id e topic_slug v\xE1lidos.");
      return;
    }
    if (!TIP_TOPICS.some((topic) => topic.slug === input.tipTopic)) {
      agentError(res, 422, "topic_not_enabled", "O t\xF3pico n\xE3o est\xE1 habilitado para recebimento.");
      return;
    }
    const existing = await getTipByTopicSlug(topicSlug);
    if (existing) {
      agentError(res, 409, "topic_exists", "J\xE1 existe conte\xFAdo para esta pauta.");
      return;
    }
    const slug = input.slug ?? toSlug(input.title);
    const dailyCap = input.status === "published" ? Number(process.env.AGENT_DAILY_CAP_TIPS ?? 1) : Number(process.env.AGENT_DAILY_CAP_DRAFTS ?? 3);
    if (!Number.isInteger(dailyCap) || dailyCap < 0) {
      agentError(res, 503, "invalid_configuration", "O limite di\xE1rio est\xE1 inv\xE1lido.");
      return;
    }
    if (await countTipsSince(input.status, dayStart()) >= dailyCap) {
      agentError(res, 429, "daily_cap_reached", "O limite di\xE1rio de conte\xFAdos foi atingido.");
      return;
    }
    const cover = await processAgentCover(input.cover, slug);
    const row = await insertTip({ ...input, slug }, cover, { topicSlug, idempotencyKey: key2, requestHash });
    res.status(201).json({ id: row.id, slug: row.slug, status: row.status, url: `${req.protocol}://${req.get("host")}/dicas/${encodeURIComponent(row.slug)}` });
  } catch (error) {
    if (error.code === "23505") {
      agentError(res, 409, "duplicate_content", "J\xE1 existe conte\xFAdo com esta chave, pauta ou slug.");
      return;
    }
    console.error("[Tips] create failed:", error instanceof Error ? error.name : "UnknownError", res.getHeader("X-Request-Id"));
    agentError(res, 503, "server_error", "N\xE3o foi poss\xEDvel guardar o conte\xFAdo educativo.");
  }
}
function createTipsRouter() {
  const router2 = express2.Router();
  router2.get("/topics", (_req, res) => {
    cachePublic2(res);
    res.json(TIP_TOPICS);
  });
  router2.get("/", async (req, res) => {
    try {
      const limit = Math.min(48, Math.max(1, Number(req.query.limit ?? 24)));
      cachePublic2(res);
      res.json({ items: await listPublishedTips(limit) });
    } catch {
      res.status(503).json({ error: "N\xE3o foi poss\xEDvel carregar as dicas." });
    }
  });
  router2.post("/", createTip);
  router2.get("/:slug", async (req, res) => {
    try {
      const tip = await getPublishedTipBySlug(String(req.params.slug));
      if (!tip) {
        res.status(404).json({ error: "Conte\xFAdo n\xE3o encontrado." });
        return;
      }
      cachePublic2(res);
      res.json(tip);
    } catch {
      res.status(503).json({ error: "N\xE3o foi poss\xEDvel carregar o conte\xFAdo." });
    }
  });
  return router2;
}

// server/agentReadRoutes.ts
import express3 from "express";
var RECIPE_AGENT_TAXONOMY = {
  categories: [{
    slug: "doces-e-sobremesas",
    name: "Doces e sobremesas",
    subcategories: [
      { slug: "bolos-simples", name: "Bolos simples", riskLevel: "low", agentEnabled: true, active: true },
      { slug: "brigadeiros-e-docinhos", name: "Brigadeiros e docinhos", riskLevel: "low", agentEnabled: true, active: true },
      { slug: "trufas-e-bombons", name: "Trufas e bombons", riskLevel: "low", agentEnabled: true, active: true },
      { slug: "doces-de-colher", name: "Doces de colher", riskLevel: "low", agentEnabled: true, active: true }
    ]
  }],
  tipTopics: TIP_TOPICS.map((item) => ({
    slug: item.slug,
    name: item.name,
    riskLevel: "low",
    active: true,
    agentEnabled: true
  }))
};
function isAuthorized(req, res) {
  if (!agentTokensConfigured()) {
    agentError(res, 503, "agent_auth_not_configured", "A autentica\xE7\xE3o do agente n\xE3o est\xE1 configurada.");
    return false;
  }
  if (!resolveAgentScope(req)) {
    agentError(res, 401, "unauthorized", "N\xE3o autorizado.");
    return false;
  }
  res.setHeader("Cache-Control", "no-store");
  return true;
}
function createAgentReadRouter() {
  const router2 = express3.Router();
  router2.get("/taxonomy", (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json(RECIPE_AGENT_TAXONOMY);
  });
  router2.get("/catalog/ingredients", (req, res) => {
    if (!isAuthorized(req, res)) return;
    res.json({ items: [] });
  });
  router2.get("/coverage", async (req, res) => {
    if (!isAuthorized(req, res)) return;
    try {
      const recent = await getPublishedRecipeTitlesSince(new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3));
      res.json({
        bySubcategory: {},
        recentPublishedRecipes: recent.length,
        ingredientCatalogReady: false
      });
    } catch (error) {
      console.error("[AgentRead] coverage failed:", error instanceof Error ? error.name : "UnknownError");
      agentError(res, 503, "server_error", "N\xE3o foi poss\xEDvel consultar a cobertura.");
    }
  });
  router2.get("/content/lookup", async (req, res) => {
    if (!isAuthorized(req, res)) return;
    const topicSlug = typeof req.query.topic_slug === "string" ? req.query.topic_slug : "";
    const slug = typeof req.query.slug === "string" ? req.query.slug : "";
    const title = typeof req.query.title === "string" ? req.query.title : "";
    if (![topicSlug, slug, title].some(Boolean)) {
      agentError(res, 400, "validation_failed", "Informe topic_slug, slug ou title.");
      return;
    }
    try {
      const found = [];
      if (topicSlug) {
        const [recipe, article] = await Promise.all([
          getAgentRecipeByTopicSlug(topicSlug),
          getTipByTopicSlug(topicSlug)
        ]);
        if (recipe) found.push({
          content_kind: "recipe",
          id: recipe.id,
          slug: recipe.slug,
          title: recipe.title,
          status: recipe.status,
          generation_meta: recipe.generationMeta
        });
        if (article) found.push({
          content_kind: "tip",
          id: article.id,
          slug: article.slug,
          title: article.title,
          status: article.status,
          generation_meta: article.generationMeta
        });
      } else if (slug) {
        const [recipe, tip] = await Promise.all([getAgentRecipeBySlug(slug), getTipBySlug(slug)]);
        if (recipe) found.push({
          content_kind: "recipe",
          id: recipe.id,
          slug: recipe.slug,
          title: recipe.title,
          status: recipe.status,
          generation_meta: recipe.generationMeta
        });
        if (tip) found.push({ content_kind: "tip", id: tip.id, slug: tip.slug, title: tip.title, status: tip.status, generation_meta: tip.generationMeta });
      }
      res.json({ exists: found.length > 0, items: found });
    } catch (error) {
      console.error("[AgentRead] content lookup failed:", error instanceof Error ? error.name : "UnknownError");
      agentError(res, 503, "server_error", "N\xE3o foi poss\xEDvel consultar o conte\xFAdo.");
    }
  });
  router2.get("/recipes/:slug/status", async (req, res) => {
    if (!isAuthorized(req, res)) return;
    const slug = String(req.params.slug);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      agentError(res, 404, "not_found", "Receita n\xE3o encontrada.");
      return;
    }
    try {
      const recipe = await getAgentRecipeBySlug(slug);
      if (!recipe) {
        agentError(res, 404, "not_found", "Receita n\xE3o encontrada.");
        return;
      }
      res.json({ id: recipe.id, slug: recipe.slug, status: recipe.status, generationMeta: recipe.generationMeta });
    } catch (error) {
      console.error("[AgentRead] recipe status failed:", error instanceof Error ? error.name : "UnknownError");
      agentError(res, 503, "server_error", "N\xE3o foi poss\xEDvel consultar o estado da receita.");
    }
  });
  return router2;
}

// server/tipPage.ts
function renderTipPageHtml(template, tip) {
  if (!tip) return template.replace("<title>Chocol\xEDcia</title>", "<title>Conte\xFAdo n\xE3o encontrado | Chocol\xEDcia</title>");
  const title = escapeHtml(tip.title);
  const description = escapeHtml(tip.metaDescription ?? tip.excerpt);
  const canonical = escapeHtml(tip.canonicalUrl ?? `/dicas/${tip.slug}`);
  return template.replace("<title>Chocol\xEDcia</title>", `<title>${title} | Chocol\xEDcia</title>`).replace("</head>", `<meta name="description" content="${description}"><link rel="canonical" href="${canonical}"></head>`).replace("<body", `<body data-tip-prerendered="true" data-tip-slug="${escapeHtml(tip.slug)}"`);
}
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
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
function escapeHtml2(value) {
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
    <section><h2>${escapeHtml2(section.name)}</h2><ul>${section.items.map((item) => `<li>${escapeHtml2([item.quantity, item.unit, item.name, item.note].filter(Boolean).join(" "))}</li>`).join("")}</ul></section>`).join("");
  const steps = recipe.steps.map((step, index2) => `<li><strong>Passo ${index2 + 1}${step.title ? ` \u2014 ${escapeHtml2(step.title)}` : ""}:</strong> ${escapeHtml2(step.instruction)}</li>`).join("");
  return `<main id="recipe-prerender" class="recipe-prerender" lang="pt-BR">
    <article><p>${escapeHtml2(recipe.category)}</p><h1>${escapeHtml2(recipe.title)}</h1><p>${escapeHtml2(recipe.excerpt)}</p>
    <img src="${escapeHtml2(recipe.coverImageUrl)}" alt="${escapeHtml2(recipe.coverImageAlt)}" width="1200" height="800" fetchpriority="high" />
    <p>Preparo: ${recipe.prepTimeMin} min \xB7 Total: ${recipe.prepTimeMin + recipe.cookTimeMin} min \xB7 Rende ${recipe.servings} por\xE7\xF5es \xB7 ${escapeHtml2(recipe.difficulty)}</p>
    <p>Publicado em ${recipe.publishedAt?.toLocaleDateString("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" }) ?? ""}</p>
    <h2>Ingredientes</h2>${ingredientSections}<h2>Modo de preparo</h2><ol>${steps}</ol>
    ${recipe.tips.length ? `<section><h2>Dicas da Chocol\xEDcia</h2><ul>${recipe.tips.map((tip) => `<li>${escapeHtml2(tip)}</li>`).join("")}</ul></section>` : ""}
    ${recipe.storageNotes ? `<section><h2>Como conservar</h2><p>${escapeHtml2(recipe.storageNotes)}</p></section>` : ""}
    ${recipe.faq.length ? `<section><h2>Perguntas frequentes</h2>${recipe.faq.map((item) => `<h3>${escapeHtml2(item.question)}</h3><p>${escapeHtml2(item.answer)}</p>`).join("")}</section>` : ""}
    <p><a href="/receitas">Ver todas as receitas da Chocol\xEDcia</a></p></article></main>`;
}
function renderRecipePageHtml(template, recipe) {
  if (!recipe) {
    const body = '<main id="recipe-prerender" lang="pt-BR"><h1>Receita n\xE3o encontrada</h1><p>Esta receita n\xE3o est\xE1 dispon\xEDvel.</p><a href="/receitas">Voltar \xE0s receitas</a></main>';
    return template.replace(/<title>[\s\S]*?<\/title>/, "<title>Receita n\xE3o encontrada | Chocol\xEDcia</title>").replace("<head>", '<head><meta name="robots" content="noindex,follow" />').replace('<div id="root"></div>', `<div id="root" data-recipe-prerendered="true">${body}</div>`);
  }
  const canonical = `${SITE.url}/receitas/${encodeURIComponent(recipe.slug)}`;
  const description = escapeHtml2(recipe.excerpt);
  const title = escapeHtml2(`${recipe.title} | Receitas Chocol\xEDcia`);
  const image = escapeHtml2(recipe.coverImageUrl);
  const jsonLd = JSON.stringify(recipeJsonLd(recipe)).replace(/</g, "\\u003c");
  const head = `
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${escapeHtml2(canonical)}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${escapeHtml2(canonical)}" />
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

// server/createApp.ts
import fs from "node:fs/promises";
import path from "node:path";
async function serveRecipePage(slug, res, next) {
  try {
    const recipe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? await getPublishedRecipeBySlug(slug) : null;
    const templatePath = process.env.NODE_ENV === "development" ? path.resolve(process.cwd(), "client/index.html") : path.resolve(process.cwd(), "dist/recipe-shell.html");
    const template = await fs.readFile(templatePath, "utf8");
    res.status(recipe ? 200 : 404).type("html").setHeader("Cache-Control", recipe ? "public, s-maxage=60, stale-while-revalidate=300" : "no-store").send(renderRecipePageHtml(template, recipe));
  } catch (error) {
    next(error);
  }
}
async function serveTipPage(slug, res, next) {
  try {
    const tip = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? await getPublishedTipBySlug(slug) : null;
    const templatePath = process.env.NODE_ENV === "development" ? path.resolve(process.cwd(), "client/index.html") : path.resolve(process.cwd(), "dist/tip-shell.html");
    const template = await fs.readFile(templatePath, "utf8");
    res.status(tip ? 200 : 404).type("html").setHeader("Cache-Control", tip ? "public, s-maxage=60, stale-while-revalidate=300" : "no-store").send(renderTipPageHtml(template, tip));
  } catch (error) {
    next(error);
  }
}
async function serveSitemap(res) {
  try {
    res.type("application/xml").setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    res.send(await generateRecipesSitemap());
  } catch (error) {
    console.error("[RecipeSitemap] generation failed:", error);
    res.status(503).type("application/xml").send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
}
async function createApp() {
  const app = express4();
  app.set("trust proxy", 1);
  app.use(express4.json({ limit: "50mb" }));
  app.use(express4.urlencoded({ limit: "50mb", extended: true }));
  registerAuthRoutes(app);
  app.get("/api/recipe-page", (req, res, next) => serveRecipePage(String(req.query.slug ?? ""), res, next));
  app.get("/api/recipes-sitemap", (_req, res) => serveSitemap(res));
  app.get("/sitemap.xml", (_req, res) => serveSitemap(res));
  app.get("/receitas/:slug", (req, res, next) => serveRecipePage(String(req.params.slug), res, next));
  app.get("/dicas/:slug", (req, res, next) => serveTipPage(String(req.params.slug), res, next));
  app.use("/api/recipes", createRecipesRouter());
  app.use("/api/tips", createTipsRouter());
  app.use("/api", createAgentReadRouter());
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  return app;
}

// server/api/index.ts
var appPromise = null;
async function getApp() {
  if (!appPromise) {
    appPromise = createApp();
  }
  return appPromise;
}
async function handler(req, res) {
  const app = await getApp();
  return app(req, res);
}
export {
  handler as default
};
