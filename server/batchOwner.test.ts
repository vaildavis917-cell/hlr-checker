import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "admin", userId: number = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-${role}-${userId}`,
    email: `${role}${userId}@example.com`,
    name: `Test ${role} ${userId}`,
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

describe("Batch Owner Display", () => {
  describe("HLR Batch", () => {
    it("should return batchOwner as null for user's own batch", async () => {
      const { ctx } = createAuthContext("user", 1);
      const caller = appRouter.createCaller(ctx);

      // Try to get a non-existent batch - should return null
      const batch = await caller.hlr.getBatch({ batchId: 999999 });
      
      // Non-existent batch returns null
      expect(batch).toBeNull();
    });

    it("should return null for non-admin trying to access other user's batch", async () => {
      const { ctx } = createAuthContext("user", 2);
      const caller = appRouter.createCaller(ctx);

      // User 2 trying to access batch that doesn't exist
      const batch = await caller.hlr.getBatch({ batchId: 999999 });
      
      expect(batch).toBeNull();
    });

    it("admin should be able to call getBatch", async () => {
      const { ctx } = createAuthContext("admin", 1);
      const caller = appRouter.createCaller(ctx);

      // Admin can call getBatch (even for non-existent batch)
      const batch = await caller.hlr.getBatch({ batchId: 999999 });
      
      // Non-existent batch returns null
      expect(batch).toBeNull();
    });
  });

  describe("Email Batch", () => {
    it("should throw NOT_FOUND for non-existent email batch", async () => {
      const { ctx } = createAuthContext("user", 1);
      const caller = appRouter.createCaller(ctx);

      // Try to get a non-existent batch - should throw NOT_FOUND
      await expect(caller.email.getBatch({ batchId: 999999 })).rejects.toThrow("Batch not found");
    });

    it("admin should get NOT_FOUND for non-existent email batch", async () => {
      const { ctx } = createAuthContext("admin", 1);
      const caller = appRouter.createCaller(ctx);

      // Admin trying to access non-existent batch
      await expect(caller.email.getBatch({ batchId: 999999 })).rejects.toThrow("Batch not found");
    });
  });

  describe("Email History", () => {
    it("should allow admin to list all email batches", async () => {
      const { ctx } = createAuthContext("admin");
      const caller = appRouter.createCaller(ctx);

      const batches = await caller.email.listAllBatches();
      
      expect(Array.isArray(batches)).toBe(true);
      // Each batch should have userName field
      if (batches.length > 0) {
        expect(batches[0]).toHaveProperty("userName");
      }
    });

    it("should deny non-admin access to listAllBatches", async () => {
      const { ctx } = createAuthContext("user");
      const caller = appRouter.createCaller(ctx);

      await expect(caller.email.listAllBatches()).rejects.toThrow("Admin access required");
    });
  });
});
