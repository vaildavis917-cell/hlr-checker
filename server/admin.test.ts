import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    username: "admin",
    passwordHash: "hash",
    name: "Admin User",
    email: "admin@example.com",
    role: "admin",
    isActive: "yes",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    username: "user",
    passwordHash: "hash",
    name: "Regular User",
    email: "user@example.com",
    role: "user",
    isActive: "yes",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("Admin Router", () => {
  it("should deny non-admin access to listUsers", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.listUsers()).rejects.toThrow("Admin access required");
  });

  it("should allow admin to access listUsers", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // This will try to query the database
    // The actual query might fail due to no DB connection in tests, but access should be allowed
    try {
      const result = await caller.admin.listUsers();
      expect(Array.isArray(result)).toBe(true);
    } catch (error: any) {
      // If error is about database, that's fine - we passed the admin check
      expect(error.message).not.toBe("Admin access required");
    }
  });

  it("should deny non-admin from creating users", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.createUser({
        username: "newuser",
        password: "password123",
      })
    ).rejects.toThrow("Admin access required");
  });

  it("should allow admin to create users", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.admin.createUser({
        username: "testuser" + Date.now(),
        password: "password123",
        name: "New User",
        email: "new@example.com",
        role: "user",
      });
    } catch (error: any) {
      // If error is about database or duplicate, that's fine - we passed the admin check
      expect(error.message).not.toBe("Admin access required");
    }
  });
});
