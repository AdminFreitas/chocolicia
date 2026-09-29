import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Options } from "postgres";
import { InsertOrder, InsertUser, Order, orders, s3Files, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _sql: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function resolveDatabaseUrl(): string | undefined {
  return ENV.neonDatabaseUrl || ENV.databaseUrl || undefined;
}

function buildPostgresOptions(connectionString: string): Options<Record<string, never>> {
  const isNeon = connectionString.includes("neon.tech");

  return {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 15,
    prepare: false,
    ssl: isNeon ? "require" : undefined,
  };
}

export async function getDb() {
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

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = {
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    lastSignedIn: user.lastSignedIn ?? new Date(),
    role: user.role ?? (user.openId === ENV.adminOpenId ? "admin" : "user"),
  };

  await db.insert(users).values(values).onConflictDoUpdate({
    target: users.openId,
    set: {
      name: values.name,
      email: values.email,
      loginMethod: values.loginMethod,
      lastSignedIn: values.lastSignedIn,
      role: values.role,
      updatedAt: new Date(),
    },
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function createOrder(order: InsertOrder): Promise<Order> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(orders).values(order).returning();
  return result[0];
}

export async function createS3File(file: typeof s3Files.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(s3Files).values(file).returning();
  return result[0];
}

export async function listS3Files() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(s3Files).orderBy(s3Files.createdAt);
}
