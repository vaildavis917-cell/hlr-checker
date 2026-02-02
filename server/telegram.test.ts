import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock db functions
vi.mock("./db", () => ({
  getSetting: vi.fn(),
}));

import { getSetting } from "./db";
import { testTelegramConnection, notifyNewAccessRequest } from "./telegram";

describe("Telegram Notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("testTelegramConnection", () => {
    it("should send test message successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, result: { message_id: 123 } }),
      });

      const result = await testTelegramConnection("test_token", "123456");
      
      expect(result.success).toBe(true);
      expect(result.message).toContain("успешно");
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: false, description: "Bot token invalid" }),
      });

      const result = await testTelegramConnection("invalid_token", "123456");
      
      expect(result.success).toBe(false);
      expect(result.message).toContain("Bot token invalid");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await testTelegramConnection("test_token", "123456");
      
      expect(result.success).toBe(false);
      expect(result.message).toContain("Network error");
    });
  });

  describe("notifyNewAccessRequest", () => {
    it("should not send notification if settings not configured", async () => {
      vi.mocked(getSetting).mockResolvedValue(null);

      const result = await notifyNewAccessRequest("Test User", "@testuser");
      
      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should send notification when settings are configured", async () => {
      vi.mocked(getSetting)
        .mockResolvedValueOnce("test_bot_token")
        .mockResolvedValueOnce("123456789");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, result: { message_id: 123 } }),
      });

      const result = await notifyNewAccessRequest("Test User", "@testuser");
      
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
    });

    it("should include telegram contact in message", async () => {
      vi.mocked(getSetting)
        .mockResolvedValueOnce("test_bot_token")
        .mockResolvedValueOnce("123456789");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, result: { message_id: 123 } }),
      });

      await notifyNewAccessRequest("Test User", "@testuser");
      
      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.text).toContain("Test User");
      expect(body.text).toContain("@testuser");
    });

    it("should handle missing telegram contact", async () => {
      vi.mocked(getSetting)
        .mockResolvedValueOnce("test_bot_token")
        .mockResolvedValueOnce("123456789");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, result: { message_id: 123 } }),
      });

      await notifyNewAccessRequest("Test User", null);
      
      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.text).toContain("Test User");
      expect(body.text).toContain("не указан");
    });
  });
});
