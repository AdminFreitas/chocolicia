import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
import type { Request } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/types";
import { getUserByOpenId, upsertUser } from "../db";
import { ENV } from "./env";
import type { User } from "../../drizzle/schema";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

function getSessionSecret() {
  if (!ENV.cookieSecret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function createSessionToken(
  openId: string,
  options: { name?: string; expiresInMs?: number } = {},
) {
  const issuedAt = Date.now();
  const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
  const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
  return new SignJWT({
    openId,
    name: options.name || "",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(getSessionSecret());
}

async function verifySession(cookieValue?: string | null) {
  if (!cookieValue) return null;
  try {
    const { payload } = await jwtVerify(cookieValue, getSessionSecret(), {
      algorithms: ["HS256"],
    });
    const { openId, name } = payload as Record<string, unknown>;
    if (!isNonEmptyString(openId)) return null;
    return {
      openId,
      name: isNonEmptyString(name) ? name : "",
    };
  } catch {
    return null;
  }
}

function getSessionTokenFromRequest(req: Request): string | undefined {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  const fromCookie = cookies[COOKIE_NAME];
  if (fromCookie) return fromCookie;
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return undefined;
}

export async function authenticateRequest(req: Request): Promise<User> {
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
      lastSignedIn: new Date(),
    });
    user = await getUserByOpenId(session.openId);
  }
  if (!user) {
    throw ForbiddenError("User not found");
  }
  await upsertUser({
    openId: user.openId,
    lastSignedIn: new Date(),
  });
  return user;
}
