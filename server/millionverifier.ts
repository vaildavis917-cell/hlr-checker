/**
 * MillionVerifier API Integration
 * API Documentation: https://developer.millionverifier.com/
 */

export interface EmailVerificationResult {
  email: string;
  quality: "good" | "bad" | "unknown";
  result: "ok" | "catch_all" | "unknown" | "invalid" | "disposable" | "error";
  resultcode: number;
  subresult: string;
  free: boolean;
  role: boolean;
  didyoumean: string;
  credits: number;
  executiontime: number;
  error: string;
  livemode: boolean;
}

/**
 * Result codes from MillionVerifier:
 * 1 - ok (valid email)
 * 2 - catch_all (accepts all emails, can't verify)
 * 3 - unknown (temporary error, try again)
 * 4 - error (syntax error)
 * 5 - disposable (temporary email)
 * 6 - invalid (doesn't exist)
 */
export const RESULT_DESCRIPTIONS: Record<string, string> = {
  ok: "Valid email address",
  catch_all: "Catch-all domain (accepts all emails)",
  unknown: "Could not verify (temporary error)",
  invalid: "Invalid email address",
  disposable: "Disposable/temporary email",
  error: "Syntax error in email",
};

export const SUBRESULT_DESCRIPTIONS: Record<string, string> = {
  ok: "Email is valid and deliverable",
  mailbox_full: "Mailbox is full",
  mailbox_not_found: "Mailbox does not exist",
  mailbox_disabled: "Mailbox is disabled",
  no_mx_record: "Domain has no MX record",
  dns_error: "DNS lookup failed",
  syntax_error: "Invalid email syntax",
  possible_typo: "Possible typo in email",
  spam_trap: "Known spam trap",
  role_account: "Role-based email (info@, support@)",
  disposable: "Disposable email service",
  timeout: "Verification timed out",
};

const API_BASE_URL = "https://api.millionverifier.com/api/v3/";

/**
 * Verify a single email address
 */
export async function verifyEmail(
  email: string,
  apiKey: string,
  timeout: number = 10
): Promise<EmailVerificationResult> {
  const url = `${API_BASE_URL}?api=${apiKey}&email=${encodeURIComponent(email)}&timeout=${timeout}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`MillionVerifier API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (data.error && data.error !== "") {
    throw new Error(`MillionVerifier error: ${data.error}`);
  }
  
  return data as EmailVerificationResult;
}

/**
 * Get remaining credits (balance)
 */
export async function getCredits(apiKey: string): Promise<number> {
  // Use a test email to get credits count
  const result = await verifyEmail("test@example.com", apiKey, 5);
  return result.credits;
}

/**
 * Verify multiple emails (batch)
 * Note: MillionVerifier doesn't have a native batch API for real-time,
 * so we process emails sequentially with a small delay
 */
export async function verifyEmailBatch(
  emails: string[],
  apiKey: string,
  onProgress?: (current: number, total: number, result: EmailVerificationResult) => void
): Promise<EmailVerificationResult[]> {
  const results: EmailVerificationResult[] = [];
  
  for (let i = 0; i < emails.length; i++) {
    const email = emails[i].trim();
    if (!email) continue;
    
    try {
      const result = await verifyEmail(email, apiKey);
      results.push(result);
      
      if (onProgress) {
        onProgress(i + 1, emails.length, result);
      }
      
      // Small delay to avoid rate limiting
      if (i < emails.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      // Create error result
      results.push({
        email,
        quality: "bad",
        result: "error",
        resultcode: 0,
        subresult: error instanceof Error ? error.message : "Unknown error",
        free: false,
        role: false,
        didyoumean: "",
        credits: 0,
        executiontime: 0,
        error: error instanceof Error ? error.message : "Unknown error",
        livemode: false,
      });
      
      if (onProgress) {
        onProgress(i + 1, emails.length, results[results.length - 1]);
      }
    }
  }
  
  return results;
}

/**
 * Map result to status for UI display
 */
export function getResultStatus(result: string): "valid" | "invalid" | "unknown" | "risky" {
  switch (result) {
    case "ok":
      return "valid";
    case "invalid":
    case "error":
      return "invalid";
    case "catch_all":
    case "disposable":
      return "risky";
    default:
      return "unknown";
  }
}
