import { describe, expect, it } from "vitest";
import { appRouter, EXPORT_FIELDS } from "./routers";
import { calculateHealthScore, calculateBatchHealthScores } from "./db";
import type { TrpcContext } from "./_core/context";
import type { HlrResult } from "../drizzle/schema";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "user"): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
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

describe("Health Score Calculation", () => {
  it("should return 100 for perfect valid number", () => {
    const result = {
      validNumber: "valid",
      reachable: "reachable",
      ported: "not_ported",
      roaming: "not_roaming",
      currentNetworkType: "mobile",
    } as HlrResult;

    const score = calculateHealthScore(result);
    expect(score).toBe(100);
  });

  it("should return 0 for invalid number with no data", () => {
    const result = {
      validNumber: "invalid",
      reachable: "unreachable",
      ported: null,
      roaming: null,
      currentNetworkType: null,
    } as HlrResult;

    const score = calculateHealthScore(result);
    expect(score).toBe(0);
  });

  it("should return partial score for mixed status", () => {
    const result = {
      validNumber: "valid",
      reachable: "unknown",
      ported: "ported",
      roaming: "roaming",
      currentNetworkType: "mobile",
    } as HlrResult;

    const score = calculateHealthScore(result);
    // 40 (valid) + 10 (unknown reachable) + 10 (ported) + 5 (roaming) + 10 (mobile) = 75
    expect(score).toBe(75);
  });

  it("should handle batch health score calculation", () => {
    const results = [
      { validNumber: "valid", reachable: "reachable", ported: "not_ported", roaming: "not_roaming", currentNetworkType: "mobile" },
      { validNumber: "invalid", reachable: "unreachable", ported: null, roaming: null, currentNetworkType: null },
    ] as HlrResult[];

    const batchScores = calculateBatchHealthScores(results);
    expect(batchScores).toHaveLength(2);
    expect(batchScores[0].healthScore).toBe(100);
    expect(batchScores[0].result).toBe(results[0]);
    expect(batchScores[1].healthScore).toBe(0);
  });
});

describe("Duplicate Detection", () => {
  it("should detect duplicates in phone numbers via analyzeNumbers", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.hlr.analyzeNumbers({
      phoneNumbers: ["+49123456789", "+49123456789", "+44789012345", "+49123456789"],
    });

    expect(result.totalInput).toBe(4);
    expect(result.uniqueCount).toBe(2);
    expect(result.duplicateCount).toBe(2);
    expect(result.duplicates).toHaveLength(1);
    expect(result.duplicates[0].number).toBe("+49123456789");
    expect(result.duplicates[0].count).toBe(3);
  });

  it("should return correct cost estimate", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.hlr.analyzeNumbers({
      phoneNumbers: ["+49123456789", "+44789012345", "+33612345678"],
    });

    expect(result.estimatedCost).toBe(0.03); // 3 * 0.01
    expect(result.currency).toBe("EUR");
  });

  it("should handle empty duplicates", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.hlr.analyzeNumbers({
      phoneNumbers: ["+49123456789", "+44789012345"],
    });

    expect(result.duplicates).toHaveLength(0);
    expect(result.uniqueCount).toBe(2);
    expect(result.duplicateCount).toBe(0);
  });
});

describe("Cost Calculator", () => {
  it("should calculate cost for given number count", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.hlr.getCostEstimate({ count: 100 });

    expect(result.count).toBe(100);
    expect(result.costPerLookup).toBe(0.01);
    expect(result.totalCost).toBe(1.0);
    expect(result.currency).toBe("EUR");
  });

  it("should calculate cost for single number", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.hlr.getCostEstimate({ count: 1 });

    expect(result.totalCost).toBe(0.01);
  });
});

describe("Export Templates", () => {
  it("should return available export fields", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const fields = await caller.exportTemplates.getAvailableFields();

    expect(fields).toEqual(EXPORT_FIELDS);
    expect(fields.length).toBeGreaterThan(10);
    expect(fields.some(f => f.key === "phoneNumber")).toBe(true);
    expect(fields.some(f => f.key === "healthScore")).toBe(true);
    expect(fields.some(f => f.key === "validNumber")).toBe(true);
  });

  it("should have correct field structure", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const fields = await caller.exportTemplates.getAvailableFields();

    fields.forEach(field => {
      expect(field).toHaveProperty("key");
      expect(field).toHaveProperty("label");
      expect(typeof field.key).toBe("string");
      expect(typeof field.label).toBe("string");
    });
  });
});
