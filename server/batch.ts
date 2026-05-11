// Background batch-processing helpers shared by the HLR and email routers.
// All long-running work happens here — HTTP handlers fire-and-forget so the
// request returns before nginx's proxy timeout.

import {
  registerActiveBatch,
  updateBatchProgress,
  unregisterBatch,
  isShutdownInProgress,
} from "./_core/index";
import { broadcastBatchProgress } from "./_core/websocket";
import {
  createHlrResult,
  updateHlrBatch,
  getHlrBatchById,
  getAllIncompleteBatches,
  getCheckedPhoneNumbersInBatch,
  incrementUserChecks,
  logAction,
  completeEmailBatch,
  getEmailsFromCacheBulk,
  saveEmailResult,
  saveEmailToCache,
  updateEmailBatchProgress,
} from "./db";
import { InsertHlrResult } from "../drizzle/schema";
import { verifyEmail, getResultStatus } from "./millionverifier";

// Seven.io HLR API response type
export interface SevenIoHlrResponse {
  status: boolean;
  status_message: string;
  lookup_outcome: boolean;
  lookup_outcome_message: string;
  international_format_number: string;
  international_formatted: string;
  national_format_number: string;
  country_code: string;
  country_name: string;
  country_prefix: string;
  current_carrier: {
    network_code: string;
    name: string;
    country: string;
    network_type: string;
  };
  original_carrier: {
    network_code: string;
    name: string;
    country: string;
    network_type: string;
  };
  valid_number: string;
  reachable: string;
  ported: string;
  roaming: string;
  gsm_code: string | null;
  gsm_message: string | null;
}

const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function getRetryDelay(attempt: number): number {
  const delay = RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt - 1);
  const jitter = delay * 0.2 * (Math.random() - 0.5);
  return Math.min(delay + jitter, RETRY_CONFIG.maxDelayMs);
}

function isRetryableError(status: number): boolean {
  // 429 rate limit, 500-504 server errors
  return status === 429 || (status >= 500 && status <= 504);
}

// HLR lookup via Seven.io with exponential-backoff retry.
export async function performHlrLookup(
  phoneNumber: string,
  onRetry?: (attempt: number, error: string, delayMs: number) => void
): Promise<SevenIoHlrResponse | { error: string; retryAttempts?: number }> {
  const apiKey = process.env.SEVEN_IO_API_KEY;
  if (!apiKey) {
    return { error: "API key not configured" };
  }

  let lastError = "Unknown error";

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      const response = await fetch(
        `https://gateway.seven.io/api/lookup/hlr?number=${encodeURIComponent(phoneNumber)}`,
        {
          method: "GET",
          headers: {
            "X-Api-Key": apiKey,
            "Accept": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data as SevenIoHlrResponse;
      }

      if (!isRetryableError(response.status)) {
        return { error: `API error: ${response.status} ${response.statusText}` };
      }

      lastError = `API error: ${response.status} ${response.statusText}`;

      if (attempt < RETRY_CONFIG.maxAttempts) {
        const delayMs = getRetryDelay(attempt);
        onRetry?.(attempt, lastError, delayMs);
        await sleep(delayMs);
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown error";
      if (attempt < RETRY_CONFIG.maxAttempts) {
        const delayMs = getRetryDelay(attempt);
        onRetry?.(attempt, lastError, delayMs);
        await sleep(delayMs);
      }
    }
  }

  return {
    error: `${lastError} (after ${RETRY_CONFIG.maxAttempts} attempts)`,
    retryAttempts: RETRY_CONFIG.maxAttempts,
  };
}

export type ProcessRemainingOptions = {
  // If set, calls incrementUserChecks(debitUserId, apiCallsMade) at successful completion.
  debitUserId?: number;
  // If set, calls logAction at successful completion with this action name.
  completionAction?: string;
  // Override the default completion log message.
  completionDetails?: string;
};

// Process the remaining numbers in an HLR batch. Should be fired with .catch()
// from the HTTP handler so the request unblocks; progress streams via WebSocket.
export async function processRemainingNumbers(
  batchId: number,
  numbersToCheck: string[],
  batch: { totalNumbers: number | null; validNumbers: number | null; invalidNumbers: number | null; processedNumbers: number | null },
  options?: ProcessRemainingOptions
) {
  let validCount = batch.validNumbers || 0;
  let invalidCount = batch.invalidNumbers || 0;
  let processedCount = batch.processedNumbers || 0;
  const initialProcessed = processedCount;

  console.log(`[BatchProcess] Starting batch #${batchId}: ${numbersToCheck.length} numbers remaining`);

  for (let i = 0; i < numbersToCheck.length; i++) {
    if (isShutdownInProgress()) {
      console.log(`[BatchProcess] Shutdown detected, stopping batch #${batchId} at ${processedCount}/${batch.totalNumbers}`);
      await updateHlrBatch(batchId, {
        processedNumbers: processedCount,
        validNumbers: validCount,
        invalidNumbers: invalidCount,
      });
      unregisterBatch(batchId);
      return;
    }

    if (i % 10 === 0 && i > 0) {
      const currentBatch = await getHlrBatchById(batchId);
      if (currentBatch && currentBatch.status === "paused") {
        console.log(`[BatchProcess] Batch #${batchId} was paused by admin at ${processedCount}/${batch.totalNumbers}`);
        unregisterBatch(batchId);
        return;
      }
    }

    const phone = numbersToCheck[i];
    if (!phone) continue;

    if (i > 0) {
      await sleep(150);
    }

    const hlrResponse = await performHlrLookup(phone);
    processedCount++;

    let resultData: InsertHlrResult;

    if ("error" in hlrResponse) {
      resultData = {
        batchId,
        phoneNumber: phone,
        status: "error",
        errorMessage: hlrResponse.error,
      };
      invalidCount++;
    } else {
      const invalidGsmCodes = ["1", "5", "9", "12"];
      const gsmCode = hlrResponse.gsm_code?.toString();
      const isInvalidByGsm = gsmCode && invalidGsmCodes.includes(gsmCode);
      const finalValidNumber = isInvalidByGsm ? "invalid" : hlrResponse.valid_number;
      const isValid = finalValidNumber === "valid";
      if (isValid) validCount++;
      else invalidCount++;

      resultData = {
        batchId,
        phoneNumber: phone,
        internationalFormat: hlrResponse.international_format_number,
        nationalFormat: hlrResponse.national_format_number,
        countryCode: hlrResponse.country_code,
        countryName: hlrResponse.country_name,
        countryPrefix: hlrResponse.country_prefix,
        currentCarrierName: hlrResponse.current_carrier?.name,
        currentCarrierCode: hlrResponse.current_carrier?.network_code,
        currentCarrierCountry: hlrResponse.current_carrier?.country,
        currentNetworkType: hlrResponse.current_carrier?.network_type,
        originalCarrierName: hlrResponse.original_carrier?.name,
        originalCarrierCode: hlrResponse.original_carrier?.network_code,
        validNumber: finalValidNumber,
        reachable: hlrResponse.reachable,
        ported: hlrResponse.ported,
        roaming: hlrResponse.roaming,
        gsmCode: hlrResponse.gsm_code,
        gsmMessage: hlrResponse.gsm_message,
        status: "success",
        rawResponse: hlrResponse as unknown as Record<string, unknown>,
      };
    }

    await createHlrResult(resultData);

    if (processedCount % 10 === 0 || i === numbersToCheck.length - 1) {
      await updateHlrBatch(batchId, {
        processedNumbers: processedCount,
        validNumbers: validCount,
        invalidNumbers: invalidCount,
      });
      updateBatchProgress(batchId, processedCount);

      broadcastBatchProgress(batchId, {
        processed: processedCount,
        total: batch.totalNumbers || numbersToCheck.length,
        valid: validCount,
        invalid: invalidCount,
        status: "processing",
        currentItem: phone,
      });
    }
  }

  broadcastBatchProgress(batchId, {
    processed: processedCount,
    total: batch.totalNumbers || numbersToCheck.length,
    valid: validCount,
    invalid: invalidCount,
    status: "completed",
  });

  await updateHlrBatch(batchId, {
    status: "completed",
    processedNumbers: processedCount,
    validNumbers: validCount,
    invalidNumbers: invalidCount,
    completedAt: new Date(),
  });

  unregisterBatch(batchId);

  const apiCallsMade = processedCount - initialProcessed;
  if (options?.debitUserId && apiCallsMade > 0) {
    await incrementUserChecks(options.debitUserId, apiCallsMade).catch(err =>
      console.error(`[BatchProcess] Failed to increment user checks for batch #${batchId}:`, err)
    );
  }
  if (options?.debitUserId && options?.completionAction) {
    await logAction({
      userId: options.debitUserId,
      action: options.completionAction,
      details: options.completionDetails ?? `Batch #${batchId}: ${processedCount} processed, ${validCount} valid, ${invalidCount} invalid`,
    }).catch(err =>
      console.error(`[BatchProcess] Failed to log completion for batch #${batchId}:`, err)
    );
  }

  console.log(`[BatchProcess] Batch #${batchId} completed: ${processedCount} processed, ${validCount} valid, ${invalidCount} invalid`);
}

// Auto-resume interrupted batches on server startup.
export async function autoResumeInterruptedBatches() {
  try {
    const incompleteBatches = await getAllIncompleteBatches();
    if (incompleteBatches.length === 0) {
      console.log("[AutoResume] No interrupted batches found");
      return;
    }

    console.log(`[AutoResume] Found ${incompleteBatches.length} interrupted batch(es), starting auto-resume...`);

    for (const batch of incompleteBatches) {
      if (!batch.originalNumbers || batch.originalNumbers.length === 0) {
        console.log(`[AutoResume] Batch #${batch.id} has no saved originalNumbers, skipping`);
        continue;
      }

      const checkedNumbers = await getCheckedPhoneNumbersInBatch(batch.id);
      const numbersToCheck = batch.originalNumbers.filter(n => !checkedNumbers.has(n));

      if (numbersToCheck.length === 0) {
        console.log(`[AutoResume] Batch #${batch.id} - all numbers already checked, marking as completed`);
        await updateHlrBatch(batch.id, {
          status: "completed",
          completedAt: new Date(),
        });
        continue;
      }

      console.log(`[AutoResume] Resuming batch #${batch.id}: ${numbersToCheck.length} numbers remaining`);

      // Flip paused -> processing BEFORE handing to the worker. Otherwise the
      // worker's mid-loop "is this batch still paused?" check trips on iteration 10
      // and bails out immediately, leaving the batch looking frozen.
      if (batch.status === "paused") {
        await updateHlrBatch(batch.id, { status: "processing" });
      }

      registerActiveBatch(batch.id, batch.totalNumbers || numbersToCheck.length);

      processRemainingNumbers(batch.id, numbersToCheck, batch).catch(err => {
        console.error(`[AutoResume] Error processing batch #${batch.id}:`, err);
      });

      await sleep(2000);
    }
  } catch (error) {
    console.error("[AutoResume] Error during auto-resume:", error);
  }
}

// Process the remaining emails in a verification batch. Mirror of
// processRemainingNumbers for the email flow.
export async function processRemainingEmails(
  batchId: number,
  emailsToProcess: string[],
  batch: {
    totalEmails: number | null;
    processedEmails: number | null;
    validEmails: number | null;
    invalidEmails: number | null;
    riskyEmails: number | null;
    unknownEmails: number | null;
  },
  options?: ProcessRemainingOptions
) {
  const apiKey = process.env.MILLIONVERIFIER_API_KEY;
  if (!apiKey) {
    console.error(`[EmailBatch] API key not configured for batch #${batchId}`);
    return;
  }

  let processed = batch.processedEmails || 0;
  let valid = batch.validEmails || 0;
  let invalid = batch.invalidEmails || 0;
  let risky = batch.riskyEmails || 0;
  let unknown = batch.unknownEmails || 0;
  let apiCallsMade = 0;

  console.log(`[EmailBatch] Starting batch #${batchId}: ${emailsToProcess.length} emails remaining`);

  const cacheMap = await getEmailsFromCacheBulk(emailsToProcess);

  for (const email of emailsToProcess) {
    if (isShutdownInProgress()) {
      console.log(`[EmailBatch] Shutdown detected, stopping batch #${batchId} at ${processed}/${batch.totalEmails}`);
      await updateEmailBatchProgress(batchId, processed, valid, invalid, risky, unknown);
      return;
    }

    const cached = cacheMap.get(email);
    if (cached) {
      await saveEmailResult({
        batchId,
        email,
        quality: cached.quality || "unknown",
        result: cached.result || "unknown",
        resultCode: cached.resultCode || 0,
        subresult: cached.subresult || "",
        isFree: cached.isFree || false,
        isRole: cached.isRole || false,
        didYouMean: cached.didYouMean || "",
        executionTime: 0,
      });
      const status = getResultStatus(cached.result || "unknown");
      if (status === "valid") valid++;
      else if (status === "invalid") invalid++;
      else if (status === "risky") risky++;
      else unknown++;
    } else {
      try {
        const result = await verifyEmail(email, apiKey);
        await saveEmailResult({
          batchId,
          email: result.email,
          quality: result.quality,
          result: result.result,
          resultCode: result.resultcode,
          subresult: result.subresult,
          isFree: result.free,
          isRole: result.role,
          didYouMean: result.didyoumean,
          executionTime: result.executiontime,
        });
        await saveEmailToCache({
          email,
          quality: result.quality,
          result: result.result,
          resultCode: result.resultcode,
          subresult: result.subresult,
          isFree: result.free,
          isRole: result.role,
          didYouMean: result.didyoumean,
        });
        const status = getResultStatus(result.result);
        if (status === "valid") valid++;
        else if (status === "invalid") invalid++;
        else if (status === "risky") risky++;
        else unknown++;
      } catch (error) {
        await saveEmailResult({
          batchId,
          email,
          quality: "bad",
          result: "error",
          resultCode: 0,
          subresult: "",
          isFree: false,
          isRole: false,
          didYouMean: "",
          executionTime: 0,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        invalid++;
      }
      apiCallsMade++;
      await sleep(100);
    }

    processed++;
    await updateEmailBatchProgress(batchId, processed, valid, invalid, risky, unknown);

    broadcastBatchProgress(batchId, {
      processed,
      total: batch.totalEmails || emailsToProcess.length,
      valid,
      invalid,
      status: "processing",
      currentItem: email,
    });
  }

  broadcastBatchProgress(batchId, {
    processed,
    total: batch.totalEmails || emailsToProcess.length,
    valid,
    invalid,
    status: "completed",
  });

  await completeEmailBatch(batchId);

  if (options?.debitUserId && apiCallsMade > 0) {
    await incrementUserChecks(options.debitUserId, apiCallsMade, 'email').catch(err =>
      console.error(`[EmailBatch] Failed to increment user checks for batch #${batchId}:`, err)
    );
  }
  if (options?.debitUserId && options?.completionAction) {
    await logAction({
      userId: options.debitUserId,
      action: options.completionAction,
      details: options.completionDetails ?? `Email batch #${batchId}: ${processed} processed, ${valid} valid, ${invalid} invalid, ${risky} risky, ${unknown} unknown`,
    }).catch(err =>
      console.error(`[EmailBatch] Failed to log completion for batch #${batchId}:`, err)
    );
  }

  console.log(`[EmailBatch] Batch #${batchId} completed: ${processed} processed, ${valid} valid, ${invalid} invalid, ${risky} risky, ${unknown} unknown`);
}
