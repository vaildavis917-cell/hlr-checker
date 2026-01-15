import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
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
    } as unknown as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user-123",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "password",
    role: "admin",
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
    } as unknown as TrpcContext["res"],
  };
}

describe("HLR Router", () => {
  it("should have getBalance procedure that returns restricted for non-admin", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.hlr.getBalance();

    // Non-admin should get restricted response
    expect(result).toHaveProperty("balance");
    expect(result).toHaveProperty("currency");
    expect(result).toHaveProperty("restricted");
    expect(result.restricted).toBe(true);
    expect(result.balance).toBe(null);
  });

  it("should have getBalance procedure that returns balance for admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.hlr.getBalance();

    // Admin should get actual balance
    expect(result).toHaveProperty("balance");
    expect(result).toHaveProperty("currency");
    expect(typeof result.currency).toBe("string");
  });

  it("should have listBatches procedure that returns array", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.hlr.listBatches();

    // Should return an array (may be empty for new user)
    expect(Array.isArray(result)).toBe(true);
  });

  it("should validate phone numbers input for startBatch", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Should reject empty array
    await expect(
      caller.hlr.startBatch({ phoneNumbers: [] })
    ).rejects.toThrow();
  });
});
