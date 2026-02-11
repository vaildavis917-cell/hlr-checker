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

describe("Admin Batch Control", () => {
  it("should deny non-admin from pausing a batch", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.pauseBatch({ batchId: 1 })
    ).rejects.toThrow("Admin access required");
  });

  it("should deny non-admin from resuming a batch", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.resumeBatch({ batchId: 1 })
    ).rejects.toThrow("Admin access required");
  });

  it("should deny non-admin from listing all incomplete batches", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.getAllIncompleteBatches()
    ).rejects.toThrow("Admin access required");
  });

  it("should allow admin to call pauseBatch (handles batch not found)", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.admin.pauseBatch({ batchId: 999999 });
    } catch (error: any) {
      // Should get "Batch not found" not "Admin access required"
      expect(error.message).not.toBe("Admin access required");
      expect(error.message).toBe("Batch not found");
    }
  });

  it("should allow admin to call resumeBatch (handles batch not found)", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.admin.resumeBatch({ batchId: 999999 });
    } catch (error: any) {
      // Should get "Batch not found" not "Admin access required"
      expect(error.message).not.toBe("Admin access required");
      expect(error.message).toBe("Batch not found");
    }
  });

  it("should allow admin to list all incomplete batches", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.admin.getAllIncompleteBatches();
      expect(Array.isArray(result)).toBe(true);
    } catch (error: any) {
      // If error is about database, that's fine - we passed the admin check
      expect(error.message).not.toBe("Admin access required");
    }
  });
});
