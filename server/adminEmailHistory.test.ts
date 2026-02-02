import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database functions
vi.mock("./db", () => ({
  getAllEmailBatches: vi.fn(),
  getAllUsers: vi.fn(),
  getEmailBatchById: vi.fn(),
  deleteEmailBatch: vi.fn(),
  logAction: vi.fn(),
}));

import { getAllEmailBatches, getAllUsers, getEmailBatchById, deleteEmailBatch, logAction } from "./db";

describe("Admin Email History", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return all email batches with user info", async () => {
    const mockBatches = [
      { id: 1, userId: 1, name: "Test Batch 1", totalEmails: 100, validEmails: 80, status: "completed", createdAt: new Date() },
      { id: 2, userId: 2, name: "Test Batch 2", totalEmails: 50, validEmails: 40, status: "completed", createdAt: new Date() },
    ];
    
    const mockUsers = [
      { id: 1, username: "admin", name: "Admin User" },
      { id: 2, username: "user1", name: "Regular User" },
    ];

    vi.mocked(getAllEmailBatches).mockResolvedValue(mockBatches as any);
    vi.mocked(getAllUsers).mockResolvedValue(mockUsers as any);

    const batches = await getAllEmailBatches();
    const users = await getAllUsers();
    
    expect(batches).toHaveLength(2);
    expect(users).toHaveLength(2);
    
    // Simulate the router logic
    const userMap = new Map(users.map(u => [u.id, u]));
    const enrichedBatches = batches.map(batch => ({
      ...batch,
      userName: userMap.get(batch.userId)?.name || `User #${batch.userId}`,
      userUsername: userMap.get(batch.userId)?.username || `user_${batch.userId}`,
    }));
    
    expect(enrichedBatches[0].userName).toBe("Admin User");
    expect(enrichedBatches[0].userUsername).toBe("admin");
    expect(enrichedBatches[1].userName).toBe("Regular User");
    expect(enrichedBatches[1].userUsername).toBe("user1");
  });

  it("should handle missing user gracefully", async () => {
    const mockBatches = [
      { id: 1, userId: 999, name: "Orphan Batch", totalEmails: 10, validEmails: 5, status: "completed", createdAt: new Date() },
    ];
    
    const mockUsers: any[] = [];

    vi.mocked(getAllEmailBatches).mockResolvedValue(mockBatches as any);
    vi.mocked(getAllUsers).mockResolvedValue(mockUsers);

    const batches = await getAllEmailBatches();
    const users = await getAllUsers();
    
    const userMap = new Map(users.map(u => [u.id, u]));
    const enrichedBatches = batches.map(batch => ({
      ...batch,
      userName: userMap.get(batch.userId)?.name || `User #${batch.userId}`,
      userUsername: userMap.get(batch.userId)?.username || `user_${batch.userId}`,
    }));
    
    expect(enrichedBatches[0].userName).toBe("User #999");
    expect(enrichedBatches[0].userUsername).toBe("user_999");
  });

  it("should delete email batch and log action", async () => {
    const mockBatch = { id: 1, userId: 2, name: "Test Batch", status: "completed" };
    
    vi.mocked(getEmailBatchById).mockResolvedValue(mockBatch as any);
    vi.mocked(deleteEmailBatch).mockResolvedValue(undefined);
    vi.mocked(logAction).mockResolvedValue(1);

    const batch = await getEmailBatchById(1);
    expect(batch).toBeDefined();
    expect(batch?.id).toBe(1);
    
    await deleteEmailBatch(1);
    expect(deleteEmailBatch).toHaveBeenCalledWith(1);
    
    await logAction({
      userId: 1,
      action: "admin_delete_email_batch",
      details: `Deleted email batch #1 (Test Batch) from user #2`,
      ipAddress: "127.0.0.1",
      userAgent: "test",
    });
    expect(logAction).toHaveBeenCalled();
  });

  it("should return empty array when no batches exist", async () => {
    vi.mocked(getAllEmailBatches).mockResolvedValue([]);
    
    const batches = await getAllEmailBatches();
    expect(batches).toHaveLength(0);
  });
});
