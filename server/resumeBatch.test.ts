import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database functions
vi.mock("./db", () => ({
  getHlrBatchById: vi.fn(),
  getCheckedPhoneNumbersInBatch: vi.fn(),
  getIncompleteBatches: vi.fn(),
  updateHlrBatch: vi.fn(),
  createHlrResult: vi.fn(),
  checkUserLimits: vi.fn(),
  incrementUserChecks: vi.fn(),
  logAction: vi.fn(),
}));

import {
  getHlrBatchById,
  getCheckedPhoneNumbersInBatch,
  getIncompleteBatches,
  updateHlrBatch,
  createHlrResult,
  checkUserLimits,
  incrementUserChecks,
  logAction,
} from "./db";

describe("Resume Batch Functionality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getIncompleteBatches", () => {
    it("should return empty array when no incomplete batches exist", async () => {
      vi.mocked(getIncompleteBatches).mockResolvedValue([]);
      
      const result = await getIncompleteBatches(1);
      
      expect(result).toEqual([]);
      expect(getIncompleteBatches).toHaveBeenCalledWith(1);
    });

    it("should return incomplete batches for user", async () => {
      const mockBatches = [
        {
          id: 1,
          userId: 1,
          name: "Test Batch",
          totalNumbers: 100,
          processedNumbers: 50,
          validNumbers: 40,
          invalidNumbers: 10,
          status: "processing" as const,
          createdAt: new Date(),
          completedAt: null,
        },
      ];
      
      vi.mocked(getIncompleteBatches).mockResolvedValue(mockBatches);
      
      const result = await getIncompleteBatches(1);
      
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("processing");
      expect(result[0].processedNumbers).toBe(50);
    });
  });

  describe("getCheckedPhoneNumbersInBatch", () => {
    it("should return set of already checked phone numbers", async () => {
      const checkedNumbers = new Set(["+1234567890", "+0987654321"]);
      vi.mocked(getCheckedPhoneNumbersInBatch).mockResolvedValue(checkedNumbers);
      
      const result = await getCheckedPhoneNumbersInBatch(1);
      
      expect(result.size).toBe(2);
      expect(result.has("+1234567890")).toBe(true);
      expect(result.has("+0987654321")).toBe(true);
    });

    it("should return empty set for batch with no results", async () => {
      vi.mocked(getCheckedPhoneNumbersInBatch).mockResolvedValue(new Set());
      
      const result = await getCheckedPhoneNumbersInBatch(999);
      
      expect(result.size).toBe(0);
    });
  });

  describe("Incremental Saving Logic", () => {
    it("should save each result immediately", async () => {
      vi.mocked(createHlrResult).mockResolvedValue(1);
      
      // Simulate saving 3 results
      await createHlrResult({
        batchId: 1,
        phoneNumber: "+1111111111",
        status: "success",
      });
      await createHlrResult({
        batchId: 1,
        phoneNumber: "+2222222222",
        status: "success",
      });
      await createHlrResult({
        batchId: 1,
        phoneNumber: "+3333333333",
        status: "error",
        errorMessage: "Invalid number",
      });
      
      expect(createHlrResult).toHaveBeenCalledTimes(3);
    });

    it("should update batch progress periodically", async () => {
      vi.mocked(updateHlrBatch).mockResolvedValue(undefined);
      
      // Simulate progress updates every 10 numbers
      await updateHlrBatch(1, {
        processedNumbers: 10,
        validNumbers: 8,
        invalidNumbers: 2,
      });
      await updateHlrBatch(1, {
        processedNumbers: 20,
        validNumbers: 16,
        invalidNumbers: 4,
      });
      
      expect(updateHlrBatch).toHaveBeenCalledTimes(2);
      expect(updateHlrBatch).toHaveBeenLastCalledWith(1, {
        processedNumbers: 20,
        validNumbers: 16,
        invalidNumbers: 4,
      });
    });
  });

  describe("Resume Logic", () => {
    it("should filter out already checked numbers", async () => {
      const allNumbers = ["+1111111111", "+2222222222", "+3333333333"];
      const checkedNumbers = new Set(["+1111111111"]);
      
      vi.mocked(getCheckedPhoneNumbersInBatch).mockResolvedValue(checkedNumbers);
      
      const result = await getCheckedPhoneNumbersInBatch(1);
      const numbersToCheck = allNumbers.filter(n => !result.has(n));
      
      expect(numbersToCheck).toHaveLength(2);
      expect(numbersToCheck).toContain("+2222222222");
      expect(numbersToCheck).toContain("+3333333333");
      expect(numbersToCheck).not.toContain("+1111111111");
    });

    it("should check user limits for remaining numbers only", async () => {
      vi.mocked(checkUserLimits).mockResolvedValue({ allowed: true });
      
      // Only check limits for 50 remaining numbers, not all 100
      const result = await checkUserLimits(1, 50);
      
      expect(result.allowed).toBe(true);
      expect(checkUserLimits).toHaveBeenCalledWith(1, 50);
    });

    it("should deny if limits exceeded", async () => {
      vi.mocked(checkUserLimits).mockResolvedValue({ 
        allowed: false, 
        reason: "Daily limit exceeded. Used: 100/100" 
      });
      
      const result = await checkUserLimits(1, 50);
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Daily limit exceeded");
    });
  });

  describe("Batch Completion", () => {
    it("should mark batch as completed after all numbers processed", async () => {
      vi.mocked(updateHlrBatch).mockResolvedValue(undefined);
      
      await updateHlrBatch(1, {
        status: "completed",
        processedNumbers: 100,
        validNumbers: 85,
        invalidNumbers: 15,
        completedAt: new Date(),
      });
      
      expect(updateHlrBatch).toHaveBeenCalledWith(1, expect.objectContaining({
        status: "completed",
        processedNumbers: 100,
      }));
    });

    it("should increment user checks after completion", async () => {
      vi.mocked(incrementUserChecks).mockResolvedValue(undefined);
      
      await incrementUserChecks(1, 50);
      
      expect(incrementUserChecks).toHaveBeenCalledWith(1, 50);
    });

    it("should log resume action", async () => {
      vi.mocked(logAction).mockResolvedValue(undefined);
      
      await logAction({
        userId: 1,
        action: "resume_batch",
        details: "Resumed batch 1, checked 50 remaining numbers",
      });
      
      expect(logAction).toHaveBeenCalledWith(expect.objectContaining({
        action: "resume_batch",
      }));
    });
  });
});
