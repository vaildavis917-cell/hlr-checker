import { describe, it, expect } from "vitest";

describe("MillionVerifier API Key Validation", () => {
  it("should successfully validate API key with MillionVerifier", async () => {
    const apiKey = process.env.MILLIONVERIFIER_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe("");

    // Test with a known bad email to verify API works
    const testEmail = "test@invalid-domain-12345.com";
    const response = await fetch(
      `https://api.millionverifier.com/api/v3/?api=${apiKey}&email=${encodeURIComponent(testEmail)}&timeout=10`
    );

    expect(response.ok).toBe(true);

    const data = await response.json();
    console.log("MillionVerifier response:", JSON.stringify(data));

    // API should return these fields
    expect(data).toHaveProperty("email");
    expect(data).toHaveProperty("result");
    expect(data).toHaveProperty("credits");
    
    // Credits should be a number (remaining credits)
    expect(typeof data.credits).toBe("number");
    console.log(`Remaining credits: ${data.credits}`);
  }, 15000);
});
