import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../drizzle/schema";
import * as db from "./db";
import { ENV } from "./_core/env";
import { COOKIE_NAME } from "../shared/const";
import { UAParser } from "ua-parser-js";

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

  // Update session activity
  if (sessionCookie) {
    await db.updateSessionActivity(sessionCookie).catch(() => {});
  }

  return user;
}

// Parse user agent to extract browser and OS info
function parseUserAgent(userAgent?: string): { browser: string; os: string; deviceInfo: string } {
  if (!userAgent) {
    return { browser: "Unknown", os: "Unknown", deviceInfo: "Unknown device" };
  }
  
  const result = UAParser(userAgent);
  
  const browser = result.browser.name 
    ? `${result.browser.name} ${result.browser.version || ""}`.trim()
    : "Unknown";
  
  const os = result.os.name 
    ? `${result.os.name} ${result.os.version || ""}`.trim()
    : "Unknown";
  
  const device = result.device.type 
    ? `${result.device.vendor || ""} ${result.device.model || result.device.type}`.trim()
    : "Desktop";
  
  return { browser, os, deviceInfo: device };
}

export async function login(
  username: string, 
  password: string,
  req?: Request
): Promise<{ user: User; token: string } | { locked: boolean; attemptsLeft: number } | null> {
  const result = await db.verifyPassword(username, password);
  
  if (result.locked) {
    return { locked: true, attemptsLeft: 0 };
  }
  
  if (!result.user) {
    return result.attemptsLeft < 5 ? { locked: false, attemptsLeft: result.attemptsLeft } : null;
  }

  const token = await createSession(result.user);
  
  // Create session record in database
  if (req) {
    const userAgentInfo = parseUserAgent(req.headers["user-agent"]);
    const ipAddress = req.ip || req.headers["x-forwarded-for"]?.toString() || "Unknown";
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    
    try {
      await db.createSession({
        userId: result.user.id,
        token,
        browser: userAgentInfo.browser,
        os: userAgentInfo.os,
        deviceInfo: userAgentInfo.deviceInfo,
        ipAddress,
        expiresAt,
      });
    } catch (error) {
      console.error("[Auth] Failed to create session record:", error);
    }
  }
  
  return { user: result.user, token };
}

export async function logout(token?: string): Promise<void> {
  if (token) {
    await db.deleteSessionByToken(token).catch(() => {});
  }
}
