// server/createApp.ts
import "dotenv/config";
import express3 from "express";
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
var bucket = process.env.S3_BUCKET_NAME ?? "assets";
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
  const key = appendHashSuffix(normalizeKey(relKey));
  const client = getS3Client();
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: data, ContentType: contentType }));
  const url = await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 3600 });
  return { key, url };
}
async function storagePutPublic(relKey, data, contentType = "application/octet-stream") {
  const publicBaseUrl = process.env.RECIPES_PUBLIC_BASE_URL;
  if (!publicBaseUrl) throw new Error("RECIPES_PUBLIC_BASE_URL is required for public recipe images");
  const key = appendHashSuffix(normalizeKey(relKey));
  const client = getS3Client();
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: data,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable"
  }));
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  return { key, url: `${publicBaseUrl.replace(/\/$/, "")}/${encodedKey}` };
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
import { createHash, timingSafeEqual } from "node:crypto";
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
var recipeListQuerySchema = z3.object({
  limit: z3.coerce.number().int().min(1).max(24).default(9),
  cursor: z3.string().max(200).optional(),
  category: recipeCategorySchema.optional(),
  subcategory: z3.string().trim().min(2).max(120).optional(),
  subcategorySlug: z3.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  q: z3.string().trim().max(100).optional()
});

// server/recipeDb.ts
import { and, desc, eq as eq2, gt, ilike, isNotNull, lt, or, sql } from "drizzle-orm";
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
async function insertRecipe(input) {
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
    updatedAt: now
  }).returning();
  return row;
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
var textModel = process.env.RECIPES_TEXT_MODEL ?? "gpt-4.1-mini";
var imageModel = process.env.RECIPES_IMAGE_MODEL ?? "gpt-image-1";
function apiBase() {
  return (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
}
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
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY n\xE3o est\xE1 configurada");
  const prompt = `Crie uma receita original da Chocol\xEDcia. A voz \xE9 calorosa, artesanal e acolhedora, em portugu\xEAs do Brasil. As medidas devem ser em gramas, x\xEDcaras e colheres. A receita precisa ser realista e test\xE1vel numa cozinha dom\xE9stica, com dicas de ponto, conserva\xE7\xE3o e substitui\xE7\xF5es. Categoria desejada: ${category}. N\xE3o repita nem fa\xE7a varia\xE7\xF5es dos t\xEDtulos existentes: ${existingTitles.map((item) => item.title).join("; ") || "nenhum"}. N\xE3o copie textos de sites. N\xE3o fa\xE7a alega\xE7\xF5es ou recomenda\xE7\xF5es m\xE9dicas/de sa\xFAde. Devolva somente um objeto JSON v\xE1lido, sem Markdown, com: title, excerpt (at\xE9 160 caracteres), category (uma destas exatamente: ${RECIPE_CATEGORIES.join(" | ")}), tags, coverImageAlt, ingredients (array de grupos {name,items:[{quantity,unit,name,note?}]}), steps (array {title?,instruction}), tips (array), storageNotes, faq (array {question,answer}), prepTimeMin, cookTimeMin, servings e difficulty (F\xE1cil, M\xE9dia ou Dif\xEDcil). Inclua tempos plaus\xEDveis, no m\xEDnimo dois passos detalhados e quantidades completas.`;
  const response = await fetch(`${apiBase()}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: textModel,
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Voc\xEA \xE9 a redatora culin\xE1ria da Chocol\xEDcia. Gere conte\xFAdo original e seguro. Responda sempre apenas JSON v\xE1lido e nunca ofere\xE7a alega\xE7\xF5es m\xE9dicas." },
        { role: "user", content: prompt }
      ]
    }),
    signal: AbortSignal.timeout(35e3)
  });
  if (!response.ok) throw new Error(`Modelo de texto respondeu HTTP ${response.status}`);
  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("A resposta do modelo de texto veio vazia");
  const parsed = generatedContentSchema.parse(JSON.parse(content));
  const allText = JSON.stringify(parsed);
  if (blockedHealthClaims.test(allText)) throw new Error("Conte\xFAdo com alega\xE7\xE3o m\xE9dica/de sa\xFAde bloqueado");
  const detected = allergenMap.filter(([pattern]) => pattern.test(allText)).map(([, label]) => label);
  if (detected.length) {
    const warning = `Aten\xE7\xE3o a alerg\xEAnicos: esta receita cont\xE9m ${detected.join(", ")}. Verifique os r\xF3tulos dos ingredientes e evite contamina\xE7\xE3o cruzada.`;
    if (!parsed.tips.some((tip) => tip.toLowerCase().includes("alerg\xEAn"))) parsed.tips.push(warning);
  }
  return parsed;
}
async function generateImage(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY n\xE3o est\xE1 configurada");
  const response = await fetch(`${apiBase()}/images/generations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: imageModel, prompt, size: "1536x1024", quality: "medium", output_format: "png" }),
    signal: AbortSignal.timeout(45e3)
  });
  if (!response.ok) throw new Error(`Modelo de imagem respondeu HTTP ${response.status}`);
  const payload = await response.json();
  const encoded = payload.data?.[0]?.b64_json;
  if (!encoded) throw new Error("O modelo de imagem n\xE3o devolveu a imagem codificada");
  return Buffer.from(encoded, "base64");
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
  let aiModel = textModel;
  try {
    const content = await withRetry("gera\xE7\xE3o de texto", () => generateRecipeJson(allPublished, category));
    draftTitle = content.title;
    const slug = toSlug(content.title);
    if (!slug) throw new Error("N\xE3o foi poss\xEDvel gerar o slug da receita");
    const duplicate = allPublished.some((item) => item.title.toLowerCase() === content.title.toLowerCase() || item.slug === slug);
    if (duplicate) throw new Error("Receita repetida: t\xEDtulo/slug j\xE1 publicado");
    const imagePrompt = `Fotografia gastron\xF4mica artesanal, close-up editorial da receita ${content.title}. ${content.coverImageAlt}. Luz natural suave, tons quentes, lou\xE7a simples, fundo creme e marrom, textura apetitosa e realista, composi\xE7\xE3o acolhedora de confeitaria caseira, foco n\xEDtido no doce. Sem texto, sem logotipos, sem marcas, sem pessoas.`;
    const image = await withRetry("gera\xE7\xE3o de imagem", () => generateImage(imagePrompt), 2);
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
      generationMeta: { generatedAt: (/* @__PURE__ */ new Date()).toISOString(), textModel, imageModel, categoryChosen: category, source: "daily-cron" }
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

// server/recipesRoutes.ts
var PUBLIC_CACHE = "public, s-maxage=60, stale-while-revalidate=300";
function cachePublic(res) {
  res.setHeader("Cache-Control", PUBLIC_CACHE);
}
function timingSafeTokenEquals(received, expected) {
  const left = createHash("sha256").update(received).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right) && received.length > 0;
}
function readBearer(req) {
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
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeDeep(item)]));
  }
  return value;
}
function slugify(title) {
  return toSlug(title);
}
function publicRecipe(row) {
  return row;
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
    if (!timingSafeTokenEquals(readBearer(req), expected)) {
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
    const expected = process.env.RECIPES_AGENT_TOKEN;
    if (!expected) {
      res.status(503).json({ error: "A publica\xE7\xE3o por agente n\xE3o est\xE1 configurada." });
      return;
    }
    if (!timingSafeTokenEquals(readBearer(req), expected)) {
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

// server/articlesReadRoutes.ts
import express2 from "express";

// shared/tipTopics.ts
var TIP_TOPICS = [
  { slug: "montagem-e-apresentacao", name: "Montagem e apresenta\xE7\xE3o", riskLevel: "low", active: true, agentEnabled: true },
  { slug: "ornamentacao", name: "Ornamenta\xE7\xE3o", riskLevel: "low", active: true, agentEnabled: true },
  { slug: "preparo", name: "Preparo", riskLevel: "medium", active: true, agentEnabled: false },
  { slug: "equipamentos-uso", name: "Uso de equipamentos", riskLevel: "medium", active: true, agentEnabled: false },
  { slug: "equipamentos-compra", name: "Escolha de equipamentos", riskLevel: "medium", active: true, agentEnabled: false },
  { slug: "negocios", name: "Neg\xF3cios na culin\xE1ria", riskLevel: "medium", active: true, agentEnabled: false }
];

// server/articlesReadDb.ts
import { sql as sql2 } from "drizzle-orm";
var ARTICLE_TYPES = ["article", "tip", "technique", "news"];
async function listPublishedArticles(limit = 24, contentType) {
  const db = await getDb();
  if (!db) throw new Error("A base de dados n\xE3o est\xE1 configurada");
  const typeFilter = contentType ? sql2`AND a.content_type = ${contentType}` : sql2``;
  const result = await db.execute(sql2`
    SELECT
      a.id::text AS id,
      a.content_type AS type,
      a.status,
      a.slug,
      a.title,
      a.excerpt,
      t.slug AS "tipTopic",
      a.cover_image_url AS "coverImageUrl",
      a.cover_image_alt AS "coverImageAlt",
      COALESCE(a.generation_meta->'cover'->'variants', '{}'::jsonb) AS "coverImageVariants",
      a.published_at AS "publishedAt",
      a.updated_at AS "updatedAt"
    FROM articles AS a
    LEFT JOIN tip_topics AS t ON t.id = a.topic_id
    WHERE a.status = 'published'
      AND a.published_at IS NOT NULL
      ${typeFilter}
    ORDER BY a.published_at DESC, a.id DESC
    LIMIT ${limit}
  `);
  return Array.from(result);
}
function isArticleType(value) {
  return ARTICLE_TYPES.includes(value);
}

// server/articlesReadRoutes.ts
function parseLimit(value) {
  if (value === void 0) return 24;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const limit = Number(value);
  return Number.isInteger(limit) && limit >= 1 && limit <= 24 ? limit : null;
}
function createArticlesReadRouter(options = {}) {
  const router2 = express2.Router();
  const loadArticles = options.listArticles ?? listPublishedArticles;
  router2.get("/topics", (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json({ items: TIP_TOPICS });
  });
  router2.get("/", async (req, res) => {
    const limit = parseLimit(req.query.limit);
    const typeValue = req.query.type;
    if (limit === null || typeValue !== void 0 && (typeof typeValue !== "string" || !isArticleType(typeValue))) {
      res.status(400).json({ error: { code: "invalid_query", message: "Par\xE2metros de consulta inv\xE1lidos." } });
      return;
    }
    const type = typeof typeValue === "string" ? typeValue : void 0;
    try {
      const items = await loadArticles(limit, type);
      res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
      res.json({ items });
    } catch (error) {
      console.error("[Articles] list failed:", error instanceof Error ? error.name : "UnknownError");
      res.status(503).json({ error: { code: "server_error", message: "N\xE3o foi poss\xEDvel carregar as dicas." } });
    }
  });
  return router2;
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
  const app = express3();
  app.set("trust proxy", 1);
  app.use(express3.json({ limit: "50mb" }));
  app.use(express3.urlencoded({ limit: "50mb", extended: true }));
  registerAuthRoutes(app);
  app.get("/api/recipe-page", (req, res, next) => serveRecipePage(String(req.query.slug ?? ""), res, next));
  app.get("/api/recipes-sitemap", (_req, res) => serveSitemap(res));
  app.get("/sitemap.xml", (_req, res) => serveSitemap(res));
  app.get("/receitas/:slug", (req, res, next) => serveRecipePage(String(req.params.slug), res, next));
  app.use("/api/articles", createArticlesReadRouter());
  app.use("/api/recipes", createRecipesRouter());
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
