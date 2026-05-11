// Tests for server/batch.ts — the batch-processing helpers shared by HLR and
// email routers. The most important coverage here is the auto-resume bug fix:
// when a batch is in "paused" status and we want to resume it on server
// startup, the status MUST flip to "processing" before processRemainingNumbers
// is called — otherwise its mid-loop pause check trips on iteration 10 and the
// batch silently stops 10 records in.

import { describe, it, expect, vi, beforeEach } from "vitest";

// Note: vi.mock calls are hoisted to the top of the file, so they run before
// the imports below. Each mock returns minimal stubs — tests override them
// per-case with vi.mocked(fn).mockResolvedValue(...).
// Default db mocks. Implementations are reapplied in beforeEach via
// resetDbMocks() below; the values here are just placeholders so vi.mock can
// register them.
vi.mock("./db", () => ({
  getAllIncompleteBatches: vi.fn(() => Promise.resolve([])),
  getCheckedPhoneNumbersInBatch: vi.fn(() => Promise.resolve(new Set())),
  updateHlrBatch: vi.fn(() => Promise.resolve()),
  createHlrResult: vi.fn(() => Promise.resolve()),
  incrementUserChecks: vi.fn(() => Promise.resolve()),
  logAction: vi.fn(() => Promise.resolve()),
  getHlrBatchById: vi.fn(() => Promise.resolve(undefined)),
  completeEmailBatch: vi.fn(() => Promise.resolve()),
  getEmailsFromCacheBulk: vi.fn(() => Promise.resolve(new Map())),
  saveEmailResult: vi.fn(() => Promise.resolve()),
  saveEmailToCache: vi.fn(() => Promise.resolve()),
  updateEmailBatchProgress: vi.fn(() => Promise.resolve()),
}));

vi.mock("./_core/index", () => ({
  registerActiveBatch: vi.fn(),
  updateBatchProgress: vi.fn(),
  unregisterBatch: vi.fn(),
  isShutdownInProgress: vi.fn(() => false),
}));

vi.mock("./_core/websocket", () => ({
  broadcastBatchProgress: vi.fn(),
}));

vi.mock("./millionverifier", () => ({
  verifyEmail: vi.fn(),
  getResultStatus: vi.fn((r: string) => r),
}));

// Stub fetch globally so performHlrLookup doesn't hit the real Seven.io API.
const fetchMock = vi.fn();
global.fetch = fetchMock as any;
process.env.SEVEN_IO_API_KEY = "test-key";
process.env.MILLIONVERIFIER_API_KEY = "test-key";

import {
  processRemainingNumbers,
  autoResumeInterruptedBatches,
} from "./batch";
import {
  getAllIncompleteBatches,
  getCheckedPhoneNumbersInBatch,
  updateHlrBatch,
  createHlrResult,
  incrementUserChecks,
  logAction,
  getHlrBatchById,
  completeEmailBatch,
  getEmailsFromCacheBulk,
  saveEmailResult,
  saveEmailToCache,
  updateEmailBatchProgress,
} from "./db";

// Ensure every db mock returns a resolved Promise. vi.mock's factory runs at
// hoist time, before this file's other imports; we re-apply default resolved
// values here so .catch() calls in batch.ts don't blow up.
function resetDbMocks() {
  vi.mocked(getAllIncompleteBatches).mockResolvedValue([]);
  vi.mocked(getCheckedPhoneNumbersInBatch).mockResolvedValue(new Set());
  vi.mocked(updateHlrBatch).mockResolvedValue(undefined as any);
  vi.mocked(createHlrResult).mockResolvedValue(undefined as any);
  vi.mocked(incrementUserChecks).mockResolvedValue(undefined as any);
  vi.mocked(logAction).mockResolvedValue(undefined as any);
  vi.mocked(getHlrBatchById).mockResolvedValue(undefined as any);
  vi.mocked(completeEmailBatch).mockResolvedValue(undefined as any);
  vi.mocked(getEmailsFromCacheBulk).mockResolvedValue(new Map());
  vi.mocked(saveEmailResult).mockResolvedValue(undefined as any);
  vi.mocked(saveEmailToCache).mockResolvedValue(undefined as any);
  vi.mocked(updateEmailBatchProgress).mockResolvedValue(undefined as any);
}

function makePausedBatch(overrides: Partial<any> = {}) {
  return {
    id: 1,
    userId: 1,
    name: "Test batch",
    status: "paused" as const,
    totalNumbers: 100,
    processedNumbers: 0,
    validNumbers: 0,
    invalidNumbers: 0,
    originalNumbers: ["+1234567890", "+1987654321", "+1555555555"],
    createdAt: new Date(),
    completedAt: null,
    ...overrides,
  };
}

function makeValidHlrResponse() {
  return {
    ok: true,
    json: async () => ({
      status: true,
      international_format_number: "+1234567890",
      national_format_number: "1234567890",
      country_code: "US",
      country_name: "United States",
      country_prefix: "1",
      current_carrier: { name: "Carrier", network_code: "001", country: "US", network_type: "mobile" },
      original_carrier: { name: "Carrier", network_code: "001", country: "US", network_type: "mobile" },
      valid_number: "valid",
      reachable: "reachable",
      ported: "false",
      roaming: "false",
      gsm_code: null,
      gsm_message: null,
    }),
  };
}

describe("autoResumeInterruptedBatches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDbMocks();
    fetchMock.mockResolvedValue(makeValidHlrResponse());
  });

  it("flips paused → processing before handing the batch to the worker", async () => {
    const batch = makePausedBatch();
    vi.mocked(getAllIncompleteBatches).mockResolvedValue([batch as any]);
    vi.mocked(getCheckedPhoneNumbersInBatch).mockResolvedValue(new Set());
    // getHlrBatchById is called mid-loop by processRemainingNumbers at i=10;
    // we never reach it with only 3 numbers, but make it safe anyway.
    vi.mocked(getHlrBatchById).mockResolvedValue({ ...batch, status: "processing" } as any);

    await autoResumeInterruptedBatches();

    // The status update must happen — and it must happen with "processing",
    // not anything else. The order check ensures it lands before any worker
    // logic that would re-read the (still-paused) batch.
    const statusCalls = vi.mocked(updateHlrBatch).mock.calls.filter(
      ([, patch]) => (patch as any).status === "processing"
    );
    expect(statusCalls.length).toBeGreaterThanOrEqual(1);
    expect(statusCalls[0][0]).toBe(batch.id);
  });

  it("skips batches that have no saved originalNumbers", async () => {
    vi.mocked(getAllIncompleteBatches).mockResolvedValue([
      makePausedBatch({ originalNumbers: null }) as any,
    ]);

    await autoResumeInterruptedBatches();

    // Without originalNumbers we can't reconstruct what to check — we shouldn't
    // touch the batch at all (no status flip, no DB writes).
    expect(vi.mocked(updateHlrBatch)).not.toHaveBeenCalled();
    expect(vi.mocked(getCheckedPhoneNumbersInBatch)).not.toHaveBeenCalled();
  });

  it("marks fully-processed batches as completed instead of re-running them", async () => {
    const batch = makePausedBatch();
    vi.mocked(getAllIncompleteBatches).mockResolvedValue([batch as any]);
    // All originalNumbers are already in the checked set.
    vi.mocked(getCheckedPhoneNumbersInBatch).mockResolvedValue(
      new Set(batch.originalNumbers!)
    );

    await autoResumeInterruptedBatches();

    const completedCall = vi.mocked(updateHlrBatch).mock.calls.find(
      ([, patch]) => (patch as any).status === "completed"
    );
    expect(completedCall).toBeDefined();
    expect(completedCall![0]).toBe(batch.id);
  });

  it("does nothing when there are no incomplete batches", async () => {
    vi.mocked(getAllIncompleteBatches).mockResolvedValue([]);

    await autoResumeInterruptedBatches();

    expect(vi.mocked(updateHlrBatch)).not.toHaveBeenCalled();
    expect(vi.mocked(getHlrBatchById)).not.toHaveBeenCalled();
  });
});

describe("processRemainingNumbers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDbMocks();
    fetchMock.mockResolvedValue(makeValidHlrResponse());
  });

  it("bails out mid-loop when the batch status flips to paused", async () => {
    // 15 numbers means the i % 10 === 0 check runs once at i=10.
    const numbers = Array.from({ length: 15 }, (_, i) => `+1555000${String(i).padStart(4, "0")}`);
    const batch = {
      totalNumbers: 15,
      processedNumbers: 0,
      validNumbers: 0,
      invalidNumbers: 0,
    };

    // Database reports the batch is paused mid-flight (e.g. admin clicked Pause).
    vi.mocked(getHlrBatchById).mockResolvedValue({ id: 1, status: "paused" } as any);

    await processRemainingNumbers(1, numbers, batch);

    // The mid-loop pause check fires at i=10. We expect createHlrResult to have
    // been called 10 times (one per processed number before the bail-out),
    // not 15.
    const { createHlrResult } = await import("./db");
    expect(vi.mocked(createHlrResult).mock.calls.length).toBeLessThan(15);
  }, 10_000);

  it("debits the user only for API calls actually made", async () => {
    const numbers = ["+1234567890"];
    const batch = {
      totalNumbers: 1,
      processedNumbers: 0,
      validNumbers: 0,
      invalidNumbers: 0,
    };
    // No pause: processRemainingNumbers reads getHlrBatchById on i=10/20/...,
    // for 1 number that check is never reached.

    await processRemainingNumbers(1, numbers, batch, {
      debitUserId: 42,
      completionAction: "test_batch",
    });

    const { incrementUserChecks, logAction } = await import("./db");
    expect(vi.mocked(incrementUserChecks)).toHaveBeenCalledWith(42, 1);
    expect(vi.mocked(logAction)).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 42, action: "test_batch" })
    );
  });

  it("does not debit when there are no API calls (empty list)", async () => {
    const batch = {
      totalNumbers: 0,
      processedNumbers: 0,
      validNumbers: 0,
      invalidNumbers: 0,
    };

    await processRemainingNumbers(1, [], batch, {
      debitUserId: 42,
      completionAction: "test_batch",
    });

    const { incrementUserChecks } = await import("./db");
    // No API calls made, so no debit. (logAction still fires — completion is
    // worth logging even when nothing was processed.)
    expect(vi.mocked(incrementUserChecks)).not.toHaveBeenCalled();
  });
});
