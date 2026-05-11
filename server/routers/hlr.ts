import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as XLSX from "xlsx";
import { registerActiveBatch, updateBatchProgress, isShutdownInProgress } from "../_core/index";
import { broadcastBatchProgress } from "../_core/websocket";
import { performHlrLookup, processRemainingNumbers } from "../batch";
import {
  createHlrBatch,
  updateHlrBatch,
  getHlrBatchById,
  getHlrBatchesByUserId,
  createHlrResult,
  getHlrResultsByBatchId,
  getHlrResultsByBatchIdPaginated,
  deleteHlrBatch,
  getAllUsers,
  getUserById,
  logAction,
  checkUserLimits,
  incrementUserChecks,
  getStatistics,
  getCachedResults,
  getCachedResult,
  getCheckedPhoneNumbersInBatch,
  getIncompleteBatches,
  calculateHealthScore,
  classifyQualityByHealthScore,
  userHasPermission,
} from "../db";
import { analyzeBatch, normalizePhoneNumber } from "../phoneUtils";

const HLR_COST_PER_LOOKUP = 0.01;

// Fields exposed to clients that build custom XLSX exports.
export const EXPORT_FIELDS = [
  { key: "phoneNumber", label: "Phone Number" },
  { key: "internationalFormat", label: "International Format" },
  { key: "nationalFormat", label: "National Format" },
  { key: "validNumber", label: "Valid" },
  { key: "reachable", label: "Reachable" },
  { key: "countryName", label: "Country" },
  { key: "countryCode", label: "Country Code" },
  { key: "countryPrefix", label: "Country Prefix" },
  { key: "currentCarrierName", label: "Current Operator" },
  { key: "currentNetworkType", label: "Network Type" },
  { key: "originalCarrierName", label: "Original Operator" },
  { key: "ported", label: "Ported" },
  { key: "roaming", label: "Roaming" },
  { key: "healthScore", label: "Health Score" },
  { key: "status", label: "Status" },
  { key: "errorMessage", label: "Error Message" },
] as const;

function detectDuplicates(phoneNumbers: string[]): { unique: string[]; duplicates: { number: string; count: number }[] } {
  const countMap = new Map<string, number>();

  phoneNumbers.forEach(num => {
    const normalized = num.trim();
    if (normalized) {
      countMap.set(normalized, (countMap.get(normalized) || 0) + 1);
    }
  });

  const unique: string[] = [];
  const duplicates: { number: string; count: number }[] = [];

  countMap.forEach((count, number) => {
    unique.push(number);
    if (count > 1) {
      duplicates.push({ number, count });
    }
  });

  return { unique, duplicates };
}

export const hlrRouter = router({
  analyzeNumbers: protectedProcedure
    .input(z.object({ phoneNumbers: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      const { unique, duplicates } = detectDuplicates(input.phoneNumbers);
      const estimatedCost = unique.length * HLR_COST_PER_LOOKUP;

      return {
        totalInput: input.phoneNumbers.length,
        uniqueCount: unique.length,
        duplicateCount: input.phoneNumbers.length - unique.length,
        duplicates,
        estimatedCost,
        currency: "EUR",
      };
    }),

  checkSingle: protectedProcedure
    .input(z.object({ phoneNumber: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const hasPermission = await userHasPermission(ctx.user.id, 'hlr.single');
      if (!hasPermission) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to perform HLR checks" });
      }

      const normalizedPhone = input.phoneNumber.trim();

      const cachedResult = await getCachedResult(normalizedPhone, 24);
      if (cachedResult) {
        const healthScore = calculateHealthScore(cachedResult);
        await logAction({ userId: ctx.user.id, action: "single_check_cached", details: normalizedPhone });

        return {
          success: true,
          phoneNumber: normalizedPhone,
          internationalFormat: cachedResult.internationalFormat,
          nationalFormat: cachedResult.nationalFormat,
          countryCode: cachedResult.countryCode,
          countryName: cachedResult.countryName,
          currentCarrier: cachedResult.currentCarrierName,
          networkType: cachedResult.currentNetworkType,
          isValid: cachedResult.validNumber === "valid",
          isRoaming: cachedResult.roaming === "true",
          isPorted: cachedResult.ported === "true",
          reachable: cachedResult.reachable,
          healthScore,
          fromCache: true,
        };
      }

      const limitsCheck = await checkUserLimits(ctx.user.id, 1);
      if (!limitsCheck.allowed) {
        throw new TRPCError({ code: "FORBIDDEN", message: limitsCheck.reason || "Limit exceeded" });
      }

      const hlrResponse = await performHlrLookup(normalizedPhone);

      await incrementUserChecks(ctx.user.id, 1);
      await logAction({ userId: ctx.user.id, action: "single_check", details: input.phoneNumber });

      if ("error" in hlrResponse) {
        return {
          success: false,
          phoneNumber: input.phoneNumber,
          error: hlrResponse.error,
          healthScore: 0,
        };
      }

      const invalidGsmCodes = ["1", "5", "9", "12"];
      const gsmCode = hlrResponse.gsm_code?.toString();
      const isInvalidByGsm = gsmCode && invalidGsmCodes.includes(gsmCode);
      const finalValidNumber = isInvalidByGsm ? "invalid" : hlrResponse.valid_number;
      const isValid = finalValidNumber === "valid";

      const mockResult = {
        validNumber: finalValidNumber,
        reachable: hlrResponse.reachable,
        ported: hlrResponse.ported,
        roaming: hlrResponse.roaming,
        currentNetworkType: hlrResponse.current_carrier?.network_type,
      };
      const healthScore = calculateHealthScore(mockResult as any);

      const batchId = await createHlrBatch({
        userId: ctx.user.id,
        name: `Single: ${normalizedPhone}`,
        totalNumbers: 1,
        processedNumbers: 1,
        validNumbers: isValid ? 1 : 0,
        invalidNumbers: isValid ? 0 : 1,
        status: "completed",
      });

      await createHlrResult({
        batchId,
        phoneNumber: normalizedPhone,
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
        rawResponse: hlrResponse,
      });

      return {
        success: true,
        phoneNumber: normalizedPhone,
        internationalFormat: hlrResponse.international_format_number,
        nationalFormat: hlrResponse.national_format_number,
        countryCode: hlrResponse.country_code,
        countryName: hlrResponse.country_name,
        currentCarrier: hlrResponse.current_carrier?.name,
        networkType: hlrResponse.current_carrier?.network_type,
        isValid: isValid,
        isRoaming: hlrResponse.roaming === "true",
        isPorted: hlrResponse.ported === "true",
        reachable: hlrResponse.reachable,
        healthScore,
        fromCache: false,
      };
    }),

  analyzeBatchNumbers: protectedProcedure
    .input(z.object({
      phoneNumbers: z.array(z.string()).min(1),
    }))
    .mutation(async ({ input }) => {
      const analysis = analyzeBatch(input.phoneNumbers);
      return analysis;
    }),

  startBatch: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
      phoneNumbers: z.array(z.string()).min(1),
      removeDuplicates: z.boolean().default(true),
      skipInvalid: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const hasPermission = await userHasPermission(ctx.user.id, 'hlr.batch');
      if (!hasPermission) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to perform batch HLR checks" });
      }

      const { phoneNumbers } = input;
      const analysis = analyzeBatch(phoneNumbers);

      let numbersToCheck: string[];
      let skippedInvalid = 0;
      let skippedDuplicates = 0;

      if (input.skipInvalid) {
        numbersToCheck = analysis.valid.map(n => n.normalized);
        skippedInvalid = analysis.totalInvalid;
        skippedDuplicates = analysis.totalDuplicates;
      } else {
        numbersToCheck = phoneNumbers.map(p => normalizePhoneNumber(p).normalized).filter(Boolean);
        if (input.removeDuplicates) {
          const { unique } = detectDuplicates(numbersToCheck);
          numbersToCheck = unique;
        }
      }

      if (numbersToCheck.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No valid numbers to check" });
      }

      const cachedResults = await getCachedResults(numbersToCheck, 24);
      const numbersToActuallyCheck = numbersToCheck.filter(n => !cachedResults.has(n));

      const limitsCheck = await checkUserLimits(ctx.user.id, numbersToActuallyCheck.length);
      if (!limitsCheck.allowed) {
        throw new TRPCError({ code: "FORBIDDEN", message: limitsCheck.reason || "Limit exceeded" });
      }

      if (isShutdownInProgress()) {
        throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Server is shutting down. Please try again later." });
      }

      const batchId = await createHlrBatch({
        userId: ctx.user.id,
        name: input.name || `Check ${new Date().toLocaleString()}`,
        totalNumbers: numbersToCheck.length,
        processedNumbers: 0,
        validNumbers: 0,
        invalidNumbers: 0,
        status: "processing",
        originalNumbers: numbersToCheck,
      });

      registerActiveBatch(batchId, numbersToCheck.length);

      let validCount = 0;
      let invalidCount = 0;
      let processedCount = 0;
      let cachedUsed = 0;

      // Save cached results synchronously - fast, no API calls.
      const cachedEntries = Array.from(cachedResults.entries());
      for (const [phone, cachedResult] of cachedEntries) {
        await createHlrResult({
          batchId,
          phoneNumber: phone,
          internationalFormat: cachedResult.internationalFormat,
          nationalFormat: cachedResult.nationalFormat,
          countryCode: cachedResult.countryCode,
          countryName: cachedResult.countryName,
          countryPrefix: cachedResult.countryPrefix,
          currentCarrierName: cachedResult.currentCarrierName,
          currentCarrierCode: cachedResult.currentCarrierCode,
          currentCarrierCountry: cachedResult.currentCarrierCountry,
          currentNetworkType: cachedResult.currentNetworkType,
          originalCarrierName: cachedResult.originalCarrierName,
          originalCarrierCode: cachedResult.originalCarrierCode,
          validNumber: cachedResult.validNumber,
          reachable: cachedResult.reachable,
          ported: cachedResult.ported,
          roaming: cachedResult.roaming,
          gsmCode: cachedResult.gsmCode,
          gsmMessage: cachedResult.gsmMessage,
          status: "success",
          rawResponse: { cached: true, originalId: cachedResult.id },
        });

        processedCount++;
        cachedUsed++;
        if (cachedResult.validNumber === "valid") validCount++;
        else invalidCount++;

        if (processedCount % 50 === 0) {
          await updateHlrBatch(batchId, {
            processedNumbers: processedCount,
            validNumbers: validCount,
            invalidNumbers: invalidCount,
          });
        }
      }

      // Flush cache-derived progress before kicking off async work.
      if (cachedUsed > 0) {
        await updateHlrBatch(batchId, {
          processedNumbers: processedCount,
          validNumbers: validCount,
          invalidNumbers: invalidCount,
        });
        updateBatchProgress(batchId, processedCount);
        broadcastBatchProgress(batchId, {
          processed: processedCount,
          total: numbersToCheck.length,
          valid: validCount,
          invalid: invalidCount,
          status: "processing",
        });
      }

      // Hand the API-bound numbers to the background worker.
      processRemainingNumbers(
        batchId,
        numbersToActuallyCheck,
        {
          totalNumbers: numbersToCheck.length,
          validNumbers: validCount,
          invalidNumbers: invalidCount,
          processedNumbers: processedCount,
        },
        {
          debitUserId: ctx.user.id,
          completionAction: "batch_check",
          completionDetails: `Checked ${numbersToCheck.length} numbers (${cachedUsed} from cache, ${skippedInvalid} invalid skipped, ${skippedDuplicates} duplicates skipped)`,
        }
      ).catch(err => {
        console.error(`[StartBatch] Background processing failed for batch #${batchId}:`, err);
      });

      return {
        batchId,
        totalProcessed: processedCount,
        totalNumbers: numbersToCheck.length,
        started: true,
        fromCache: cachedUsed,
        apiCalls: numbersToActuallyCheck.length,
        skippedInvalid,
        skippedDuplicates,
        estimatedSavings: (skippedInvalid + skippedDuplicates + cachedUsed) * HLR_COST_PER_LOOKUP,
      };
    }),

  getBatch: protectedProcedure
    .input(z.object({ batchId: z.number() }))
    .query(async ({ ctx, input }) => {
      const batch = await getHlrBatchById(input.batchId);
      if (!batch) {
        return null;
      }
      if (batch.userId !== ctx.user.id && ctx.user.role !== "admin") {
        return null;
      }

      let batchOwner = null;
      if (ctx.user.role === "admin" && batch.userId !== ctx.user.id) {
        const owner = await getUserById(batch.userId);
        if (owner) {
          batchOwner = { id: owner.id, name: owner.name, username: owner.username };
        }
      }

      return { ...batch, batchOwner };
    }),

  listBatches: protectedProcedure.query(async ({ ctx }) => {
    const hasPermission = await userHasPermission(ctx.user.id, 'hlr.history');
    if (!hasPermission) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to view check history" });
    }
    return await getHlrBatchesByUserId(ctx.user.id);
  }),

  getResults: protectedProcedure
    .input(z.object({
      batchId: z.number(),
      page: z.number().default(1),
      pageSize: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const batch = await getHlrBatchById(input.batchId);
      const isAdmin = ctx.user.role === 'admin';
      if (!batch || (!isAdmin && batch.userId !== ctx.user.id)) {
        return { results: [], total: 0, pages: 0 };
      }
      const paginatedResults = await getHlrResultsByBatchIdPaginated(input.batchId, input.page, input.pageSize);

      const resultsWithScores = paginatedResults.results.map(result => {
        const healthScore = calculateHealthScore(result);
        return {
          ...result,
          healthScore,
          qualityStatus: classifyQualityByHealthScore(healthScore),
        };
      });

      return {
        results: resultsWithScores,
        total: paginatedResults.total,
        pages: paginatedResults.pages,
      };
    }),

  exportXlsx: protectedProcedure
    .input(z.object({
      batchId: z.number(),
      fields: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const hasExportPermission = await userHasPermission(ctx.user.id, 'hlr.export');
      if (!hasExportPermission) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to export results" });
      }

      const batch = await getHlrBatchById(input.batchId);
      if (!batch || batch.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
      }

      const results = await getHlrResultsByBatchId(input.batchId);

      const data = results.map(r => {
        const healthScore = calculateHealthScore(r);
        return {
          "Номер": r.phoneNumber,
          "Международный формат": r.internationalFormat || "",
          "Страна": r.countryName || "",
          "Код страны": r.countryCode || "",
          "Оператор": r.currentCarrierName || "",
          "Тип сети": r.currentNetworkType || "",
          "Оригинальный оператор": r.originalCarrierName || "",
          "Валидность": r.validNumber || "",
          "Достижимость": r.reachable || "",
          "Портирован": r.ported || "",
          "Роуминг": r.roaming || "",
          "Health Score": healthScore,
          "GSM код": r.gsmCode || "",
          "GSM сообщение": r.gsmMessage || "",
          "Дата проверки": r.createdAt ? new Date(r.createdAt).toLocaleString() : "",
        };
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "HLR Results");

      const buffer = XLSX.write(wb, { type: "base64", bookType: "xlsx" });

      return {
        filename: `hlr-results-${batch.id}-${new Date().toISOString().split('T')[0]}.xlsx`,
        data: buffer,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    }),

  recheckBatch: protectedProcedure
    .input(z.object({ batchId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const batch = await getHlrBatchById(input.batchId);
      if (!batch || batch.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
      }

      const originalResults = await getHlrResultsByBatchId(input.batchId);
      const phoneNumbers = originalResults.map(r => r.phoneNumber);

      if (phoneNumbers.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No phone numbers to recheck" });
      }

      const limitsCheck = await checkUserLimits(ctx.user.id, phoneNumbers.length);
      if (!limitsCheck.allowed) {
        throw new TRPCError({ code: "FORBIDDEN", message: limitsCheck.reason || "Limit exceeded" });
      }

      const newBatchId = await createHlrBatch({
        userId: ctx.user.id,
        name: `Recheck: ${batch.name}`,
        totalNumbers: phoneNumbers.length,
        processedNumbers: 0,
        validNumbers: 0,
        invalidNumbers: 0,
        status: "processing",
      });

      await logAction({ userId: ctx.user.id, action: "recheck_batch", details: `Rechecking batch ${input.batchId}` });

      return { newBatchId, phoneNumbers };
    }),

  getIncompleteBatches: protectedProcedure.query(async ({ ctx }) => {
    return await getIncompleteBatches(ctx.user.id);
  }),

  resumeBatch: protectedProcedure
    .input(z.object({
      batchId: z.number(),
      phoneNumbers: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const batch = await getHlrBatchById(input.batchId);
      if (!batch || batch.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
      }

      if (batch.status !== "processing" && batch.status !== "paused") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Batch is not in processing or paused state" });
      }

      if (batch.status === "paused") {
        await updateHlrBatch(input.batchId, { status: "processing" });
      }

      const checkedNumbers = await getCheckedPhoneNumbersInBatch(input.batchId);
      const totalNumbers = batch.totalNumbers || 0;
      const alreadyChecked = checkedNumbers.size;
      const remaining = totalNumbers - alreadyChecked;

      if (remaining <= 0) {
        await updateHlrBatch(input.batchId, {
          status: "completed",
          completedAt: new Date(),
        });
        return {
          batchId: input.batchId,
          resumed: false,
          message: "All numbers already checked",
          alreadyChecked: alreadyChecked,
          remaining: 0,
          needsPhoneNumbers: false,
        };
      }

      if (input.phoneNumbers && input.phoneNumbers.length > 0) {
        const numbersToCheck = input.phoneNumbers.filter(n => !checkedNumbers.has(n));

        if (numbersToCheck.length === 0) {
          await updateHlrBatch(input.batchId, {
            status: "completed",
            completedAt: new Date(),
          });
          return {
            batchId: input.batchId,
            resumed: false,
            message: "All provided numbers already checked",
            alreadyChecked: alreadyChecked,
            remaining: 0,
            needsPhoneNumbers: false,
          };
        }

        const limitsCheck = await checkUserLimits(ctx.user.id, numbersToCheck.length);
        if (!limitsCheck.allowed) {
          throw new TRPCError({ code: "FORBIDDEN", message: limitsCheck.reason || "Limit exceeded" });
        }

        registerActiveBatch(input.batchId, batch.totalNumbers || numbersToCheck.length);

        processRemainingNumbers(input.batchId, numbersToCheck, batch, {
          debitUserId: ctx.user.id,
          completionAction: "resume_batch",
          completionDetails: `Resumed batch ${input.batchId}, checked ${numbersToCheck.length} remaining numbers`,
        }).catch(err => {
          console.error(`[ResumeBatch] Background processing failed for batch #${input.batchId}:`, err);
        });

        return {
          batchId: input.batchId,
          resumed: true,
          started: true,
          alreadyChecked,
          newlyChecked: numbersToCheck.length,
          totalProcessed: batch.processedNumbers || 0,
          needsPhoneNumbers: false,
        };
      }

      if (batch.originalNumbers && batch.originalNumbers.length > 0) {
        const numbersToCheck = batch.originalNumbers.filter(n => !checkedNumbers.has(n));

        if (numbersToCheck.length === 0) {
          await updateHlrBatch(input.batchId, {
            status: "completed",
            completedAt: new Date(),
          });
          return {
            batchId: input.batchId,
            resumed: false,
            message: "All numbers already checked",
            alreadyChecked: alreadyChecked,
            remaining: 0,
            needsPhoneNumbers: false,
          };
        }

        const limitsCheck = await checkUserLimits(ctx.user.id, numbersToCheck.length);
        if (!limitsCheck.allowed) {
          throw new TRPCError({ code: "FORBIDDEN", message: limitsCheck.reason || "Limit exceeded" });
        }

        registerActiveBatch(input.batchId, batch.totalNumbers || numbersToCheck.length);

        processRemainingNumbers(input.batchId, numbersToCheck, batch, {
          debitUserId: ctx.user.id,
          completionAction: "auto_resume_batch",
          completionDetails: `Auto-resumed batch ${input.batchId} using saved numbers, checked ${numbersToCheck.length} remaining numbers`,
        }).catch(err => {
          console.error(`[ResumeBatch] Background processing failed for batch #${input.batchId}:`, err);
        });

        return {
          batchId: input.batchId,
          resumed: true,
          started: true,
          alreadyChecked,
          newlyChecked: numbersToCheck.length,
          totalProcessed: batch.processedNumbers || 0,
          needsPhoneNumbers: false,
          autoResumed: true,
        };
      }

      return {
        batchId: input.batchId,
        resumed: false,
        alreadyChecked: alreadyChecked,
        newlyChecked: 0,
        totalProcessed: alreadyChecked,
        remaining: remaining,
        needsPhoneNumbers: true,
        message: `Batch has ${remaining} unchecked numbers. Please provide the original phone numbers list to resume.`,
      };
    }),

  resumeBatchWithNumbers: protectedProcedure
    .input(z.object({
      batchId: z.number(),
      phoneNumbers: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const batch = await getHlrBatchById(input.batchId);
      if (!batch || batch.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
      }

      if (batch.status !== "processing" && batch.status !== "paused") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Batch is not in processing or paused state" });
      }

      if (batch.status === "paused") {
        await updateHlrBatch(input.batchId, { status: "processing" });
      }

      const checkedNumbers = await getCheckedPhoneNumbersInBatch(input.batchId);
      const numbersToCheck = input.phoneNumbers.filter(n => !checkedNumbers.has(n));

      if (numbersToCheck.length === 0) {
        await updateHlrBatch(input.batchId, {
          status: "completed",
          completedAt: new Date(),
        });
        return {
          batchId: input.batchId,
          resumed: false,
          message: "All numbers already checked",
          alreadyChecked: checkedNumbers.size,
          remaining: 0,
        };
      }

      const limitsCheck = await checkUserLimits(ctx.user.id, numbersToCheck.length);
      if (!limitsCheck.allowed) {
        throw new TRPCError({ code: "FORBIDDEN", message: limitsCheck.reason || "Limit exceeded" });
      }

      registerActiveBatch(input.batchId, batch.totalNumbers || numbersToCheck.length);

      processRemainingNumbers(input.batchId, numbersToCheck, batch, {
        debitUserId: ctx.user.id,
        completionAction: "resume_batch",
        completionDetails: `Resumed batch ${input.batchId}, checked ${numbersToCheck.length} remaining numbers`,
      }).catch(err => {
        console.error(`[ResumeBatchWithNumbers] Background processing failed for batch #${input.batchId}:`, err);
      });

      return {
        batchId: input.batchId,
        resumed: true,
        started: true,
        alreadyChecked: checkedNumbers.size,
        newlyChecked: numbersToCheck.length,
        totalProcessed: batch.processedNumbers || 0,
      };
    }),

  deleteBatch: protectedProcedure
    .input(z.object({ batchId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const hasDeletePermission = await userHasPermission(ctx.user.id, 'hlr.delete');
      if (!hasDeletePermission) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to delete batches" });
      }

      const batch = await getHlrBatchById(input.batchId);
      if (!batch || batch.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found or access denied" });
      }
      await deleteHlrBatch(input.batchId);
      await logAction({ userId: ctx.user.id, action: "delete_batch", details: `Deleted batch ${input.batchId}` });
      return { success: true };
    }),

  getUserStats: protectedProcedure.query(async ({ ctx }) => {
    const stats = await getStatistics(ctx.user.id);
    const userLimits = await getAllUsers().then(users => users.find(u => u.id === ctx.user.id));
    return {
      totalBatches: stats.totalBatches,
      totalChecks: stats.totalChecks,
      validNumbers: stats.validChecks,
      invalidNumbers: stats.invalidChecks,
      checksToday: stats.todayChecks,
      checksThisWeek: userLimits?.checksThisWeek || 0,
      checksThisMonth: stats.monthChecks,
      limits: {
        dailyLimit: userLimits?.dailyLimit || null,
        weeklyLimit: userLimits?.weeklyLimit || null,
        monthlyLimit: userLimits?.monthlyLimit || null,
        batchLimit: userLimits?.batchLimit || null,
      },
    };
  }),

  getBalance: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
      return { balance: null, currency: "EUR", restricted: true };
    }
    const apiKey = process.env.SEVEN_IO_API_KEY;
    if (!apiKey) {
      return { balance: 0, currency: "EUR", error: "API key not configured" };
    }

    try {
      const response = await fetch("https://gateway.seven.io/api/balance", {
        method: "GET",
        headers: {
          "X-Api-Key": apiKey,
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        return { balance: 0, currency: "EUR", error: "Failed to fetch balance" };
      }

      const data = await response.json();
      return { balance: data.amount, currency: data.currency };
    } catch (error) {
      return { balance: 0, currency: "EUR", error: "Network error" };
    }
  }),

  getCostEstimate: protectedProcedure
    .input(z.object({ count: z.number().min(1) }))
    .query(({ input }) => {
      return {
        count: input.count,
        costPerLookup: HLR_COST_PER_LOOKUP,
        totalCost: input.count * HLR_COST_PER_LOOKUP,
        currency: "EUR",
      };
    }),
});
