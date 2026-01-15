import { describe, expect, it } from "vitest";
import { createSession, verifySession } from "./auth";
import bcrypt from "bcryptjs";

describe("Custom Auth System", () => {
  describe("Password Hashing with bcrypt", () => {
    it("should hash a password", async () => {
      const password = "testPassword123";
      const hash = await bcrypt.hash(password, 10);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should verify correct password", async () => {
      const password = "testPassword123";
      const hash = await bcrypt.hash(password, 10);
      
      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    it("should reject incorrect password", async () => {
      const password = "testPassword123";
      const wrongPassword = "wrongPassword";
      const hash = await bcrypt.hash(password, 10);
      
      const isValid = await bcrypt.compare(wrongPassword, hash);
      expect(isValid).toBe(false);
    });
  });

  describe("Session Management", () => {
    const mockUser = {
      id: 1,
      username: "testuser",
      passwordHash: "hash",
      name: "Test User",
      email: "test@example.com",
      role: "user" as const,
      isActive: "yes" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    it("should create a valid session token", async () => {
      const token = await createSession(mockUser);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });

    it("should verify a valid session token", async () => {
      const token = await createSession(mockUser);
      const payload = await verifySession(token);
      
      expect(payload).toBeDefined();
      expect(payload?.userId).toBe(mockUser.id);
      expect(payload?.username).toBe(mockUser.username);
    });

    it("should reject invalid session token", async () => {
      const payload = await verifySession("invalid-token");
      expect(payload).toBeNull();
    });
  });
});
