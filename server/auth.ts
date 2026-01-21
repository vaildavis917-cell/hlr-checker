import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../drizzle/schema";
import * as db from "./db";
import { ENV } from "./_core/env";
import { COOKIE_NAME } from "../shared/const";

export type SessionPayload = {
  userId: number;
  username: string;
};

const getJwtSecret = () => {
  const secret = ENV.jwtSecret;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
};

export async function createSession(user: User): Promise<string> {
  const payload: SessionPayload = {
    userId: user.id,
    username: user.username,
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());

  return token;
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader: string | undefined): Map<string, string> {
  if (!cookieHeader) return new Map();
  const parsed = parseCookieHeader(cookieHeader);
  return new Map(Object.entries(parsed));
}

export async function authenticateRequest(req: Request): Promise<User | null> {
  const cookies = parseCookies(req.headers.cookie);
  const sessionCookie = cookies.get(COOKIE_NAME);
  
  const session = await verifySession(sessionCookie);
  if (!session) return null;

  const user = await db.getUserById(session.userId);
  if (!user) return null;
  if (user.isActive !== "yes") return null;

  return user;
}

export async function login(username: string, password: string): Promise<{ user: User; token: string } | { locked: boolean; attemptsLeft: number } | null> {
  const result = await db.verifyPassword(username, password);
  
  if (result.locked) {
    return { locked: true, attemptsLeft: 0 };
  }
  
  if (!result.user) {
    return result.attemptsLeft < 5 ? { locked: false, attemptsLeft: result.attemptsLeft } : null;
  }

  const token = await createSession(result.user);
  return { user: result.user, token };
}
