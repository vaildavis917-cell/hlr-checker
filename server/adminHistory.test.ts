import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "admin"): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-admin",
    email: "admin@example.com",
    name: "Test Admin",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

describe("Admin History", () => {
  it("should allow admin to list all batches", async () => {
    const { ctx } = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    const batches = await caller.admin.listAllBatches();
    
    expect(Array.isArray(batches)).toBe(true);
    // Each batch should have userName and userUsername fields
    if (batches.length > 0) {
      expect(batches[0]).toHaveProperty("userName");
      expect(batches[0]).toHaveProperty("userUsername");
    }
  });

  it("should deny non-admin access to listAllBatches", async () => {
    const { ctx } = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.listAllBatches()).rejects.toThrow("Admin access required");
  });

  it("should allow admin to get batch results", async () => {
    const { ctx } = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    // Get results for a non-existent batch should return empty
    const results = await caller.admin.getBatchResults({ batchId: 999999, page: 1, pageSize: 50 });
    
    expect(results).toHaveProperty("results");
    expect(results).toHaveProperty("total");
    expect(results).toHaveProperty("pages");
    expect(Array.isArray(results.results)).toBe(true);
  });

  it("should deny non-admin access to getBatchResults", async () => {
    const { ctx } = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.getBatchResults({ batchId: 1, page: 1, pageSize: 50 })).rejects.toThrow("Admin access required");
  });
});
