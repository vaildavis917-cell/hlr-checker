import { describe, expect, it } from "vitest";

describe("Seven.io API Key Validation", () => {
  it("should have SEVEN_IO_API_KEY environment variable set", () => {
    const apiKey = process.env.SEVEN_IO_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe("");
    expect(apiKey!.length).toBeGreaterThan(10);
  });

  it("should successfully validate API key with Seven.io balance endpoint", async () => {
    const apiKey = process.env.SEVEN_IO_API_KEY;
    if (!apiKey) {
      throw new Error("SEVEN_IO_API_KEY is not set");
    }

    const response = await fetch("https://gateway.seven.io/api/balance", {
      method: "GET",
      headers: {
        "X-Api-Key": apiKey,
        "Accept": "application/json",
      },
    });

    // Check that request was successful (not 401/403)
    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
    
    const responseText = await response.text();
    console.log("Balance response:", responseText);
    
    // API should return something (balance or JSON)
    expect(responseText.length).toBeGreaterThan(0);
  }, 15000);
});
