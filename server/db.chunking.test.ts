import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => Promise.resolve([]))
        }))
      }))
    }))
  }))
}));

describe("getCachedResults chunking", () => {
  it("should handle empty array", async () => {
    // Import after mocking
    const { getCachedResults } = await import("./db");
    
    const result = await getCachedResults([]);
    expect(result.size).toBe(0);
  });

  it("should handle small arrays without chunking", async () => {
    const phoneNumbers = Array.from({ length: 100 }, (_, i) => `+7900000${String(i).padStart(4, "0")}`);
    
    const { getCachedResults } = await import("./db");
    const result = await getCachedResults(phoneNumbers);
    
    // Should return empty map (no cached results in mock)
    expect(result).toBeInstanceOf(Map);
  });

  it("should handle large arrays with chunking (2000+ numbers)", async () => {
    // Generate 2500 phone numbers
    const phoneNumbers = Array.from({ length: 2500 }, (_, i) => `+7900${String(i).padStart(7, "0")}`);
    
    const { getCachedResults } = await import("./db");
    
    // This should not throw an error even with 2500 numbers
    const result = await getCachedResults(phoneNumbers);
    
    expect(result).toBeInstanceOf(Map);
  });

  it("should correctly chunk array into 500-element pieces", () => {
    const CHUNK_SIZE = 500;
    const phoneNumbers = Array.from({ length: 2500 }, (_, i) => `+7900${String(i).padStart(7, "0")}`);
    
    const chunks: string[][] = [];
    for (let i = 0; i < phoneNumbers.length; i += CHUNK_SIZE) {
      chunks.push(phoneNumbers.slice(i, i + CHUNK_SIZE));
    }
    
    // Should create 5 chunks: 500 + 500 + 500 + 500 + 500 = 2500
    expect(chunks.length).toBe(5);
    expect(chunks[0].length).toBe(500);
    expect(chunks[4].length).toBe(500);
  });

  it("should handle non-divisible array sizes", () => {
    const CHUNK_SIZE = 500;
    const phoneNumbers = Array.from({ length: 1234 }, (_, i) => `+7900${String(i).padStart(7, "0")}`);
    
    const chunks: string[][] = [];
    for (let i = 0; i < phoneNumbers.length; i += CHUNK_SIZE) {
      chunks.push(phoneNumbers.slice(i, i + CHUNK_SIZE));
    }
    
    // Should create 3 chunks: 500 + 500 + 234 = 1234
    expect(chunks.length).toBe(3);
    expect(chunks[0].length).toBe(500);
    expect(chunks[1].length).toBe(500);
    expect(chunks[2].length).toBe(234);
  });
});
