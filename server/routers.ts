import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  createHlrBatch,
  updateHlrBatch,
  getHlrBatchById,
  getHlrBatchesByUserId,
  createHlrResult,
  createHlrResults,
  getHlrResultsByBatchId,
  deleteHlrBatch,
  getAllUsers,
  deleteUser,
  updateUserRole,
  createUser,
  getUserByUsername,
  hasAnyAdmin,
  toggleUserActive,
  updateUserPassword,
  logAction,
  getActionLogs,
  checkUserLimits,
  incrementUserChecks,
  updateUserLimits,
  unlockUser,
  getBalanceAlert,
  upsertBalanceAlert,
  getStatistics,
  getHlrResultsByBatchIdPaginated,
  createExportTemplate,
  getExportTemplatesByUserId,
  getExportTemplateById,
  updateExportTemplate,
  deleteExportTemplate,
  getDefaultExportTemplate,
  calculateHealthScore,
  calculateBatchHealthScores,
  getAllBatches,
  getCachedResults,
  getCachedResult,
  getCheckedPhoneNumbersInBatch,
  getIncompleteBatches,
} from "./db";
import { login, createSession } from "./auth";
import { TRPCError } from "@trpc/server";
import { InsertHlrResult } from "../drizzle/schema";
import { analyzeBatch, normalizePhoneNumber } from "./phoneUtils";
import * as XLSX from "xlsx";

// Seven.io HLR API response type
interface SevenIoHlrResponse {
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

// Cost per HLR lookup in EUR (Seven.io pricing)
const HLR_COST_PER_LOOKUP = 0.01;

// Available export fields
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

// Function to perform HLR lookup via Seven.io API
async function performHlrLookup(phoneNumber: string): Promise<SevenIoHlrResponse | { error: string }> {
  const apiKey = process.env.SEVEN_IO_API_KEY;
  if (!apiKey) {
    return { error: "API key not configured" };
  }

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

    if (!response.ok) {
      return { error: `API error: ${response.status} ${response.statusText}` };
    }

    const data = await response.json();
    return data as SevenIoHlrResponse;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Detect duplicates in phone number list
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

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// Admin router for user management
const adminRouter = router({
  // Get all users
  listUsers: adminProcedure.query(async () => {
    return await getAllUsers();
  }),

  // Create a new user (admin only)
  createUser: adminProcedure
    .input(z.object({
      username: z.string().min(3).max(64),
      password: z.string().min(6).max(128),
      name: z.string().optional(),
      email: z.string().email().optional(),
      role: z.enum(["user", "admin"]).default("user"),
    }))
    .mutation(async ({ input }) => {
      // Check if username already exists
      const existing = await getUserByUsername(input.username);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Username already exists" });
      }

      const userId = await createUser({
        username: input.username,
        password: input.password,
        name: input.name,
        email: input.email,
        role: input.role,
      });

      return { userId, username: input.username };
    }),

  // Delete a user
  deleteUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete yourself" });
      }
      await deleteUser(input.userId);
      return { success: true };
    }),

  // Update user role
  updateUserRole: adminProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id && input.role !== "admin") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot demote yourself" });
      }
      await updateUserRole(input.userId, input.role);
      return { success: true };
    }),

  // Toggle user active status
  toggleUserActive: adminProcedure
    .input(z.object({ userId: z.number(), isActive: z.enum(["yes", "no"]) }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot deactivate yourself" });
      }
      await toggleUserActive(input.userId, input.isActive);
      return { success: true };
    }),

  // Reset user password (admin only)
  resetUserPassword: adminProcedure
    .input(z.object({ userId: z.number(), newPassword: z.string().min(6).max(128) }))
    .mutation(async ({ ctx, input }) => {
      await updateUserPassword(input.userId, input.newPassword);
      await logAction({ userId: ctx.user.id, action: "reset_password", details: `Reset password for user ${input.userId}` });
      return { success: true };
    }),

  // Unlock user account
  unlockUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await unlockUser(input.userId);
      await logAction({ userId: ctx.user.id, action: "unlock_user", details: `Unlocked user ${input.userId}` });
      return { success: true };
    }),

  // Update user limits
  updateUserLimits: adminProcedure
    .input(z.object({ 
      userId: z.number(), 
      dailyLimit: z.number().nullable(), 
      monthlyLimit: z.number().nullable() 
    }))
    .mutation(async ({ ctx, input }) => {
      await updateUserLimits(input.userId, input.dailyLimit, input.monthlyLimit);
      await logAction({ userId: ctx.user.id, action: "update_limits", details: `Updated limits for user ${input.userId}` });
      return { success: true };
    }),

  // Get action logs
  getActionLogs: adminProcedure
    .input(z.object({ userId: z.number().optional(), limit: z.number().default(100) }))
    .query(async ({ input }) => {
      return await getActionLogs(input.userId, input.limit);
    }),

  // Get all statistics
  getStatistics: adminProcedure.query(async () => {
    return await getStatistics();
  }),

  // Get all batches from all users (admin only)
  listAllBatches: adminProcedure.query(async () => {
    const batches = await getAllBatches();
    const users = await getAllUsers();
    const userMap = new Map(users.map(u => [u.id, u]));
    
    return batches.map(batch => ({
      ...batch,
      userName: userMap.get(batch.userId)?.name || userMap.get(batch.userId)?.username || `User #${batch.userId}`,
      userUsername: userMap.get(batch.userId)?.username || `user_${batch.userId}`,
    }));
  }),

  // Get results for any batch (admin only)
  getBatchResults: adminProcedure
    .input(z.object({ 
      batchId: z.number(),
      page: z.number().default(1),
      pageSize: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const batch = await getHlrBatchById(input.batchId);
      if (!batch) {
        return { results: [], total: 0, pages: 0, batch: null };
      }
      const paginatedResults = await getHlrResultsByBatchIdPaginated(input.batchId, input.page, input.pageSize);
      
      // Add health scores to results
      const resultsWithScores = paginatedResults.results.map(result => ({
        ...result,
        healthScore: calculateHealthScore(result),
      }));
      
      return {
        results: resultsWithScores,
        total: paginatedResults.total,
        pages: paginatedResults.pages,
        batch,
      };
    }),

  // Balance alert settings
  getBalanceAlert: adminProcedure.query(async () => {
    return await getBalanceAlert();
  }),

  updateBalanceAlert: adminProcedure
    .input(z.object({ threshold: z.number().min(1), isEnabled: z.enum(["yes", "no"]) }))
    .mutation(async ({ input }) => {
      await upsertBalanceAlert(input.threshold, input.isEnabled);
      return { success: true };
    }),
});

// Export templates router
const exportTemplatesRouter = router({
  // List user's export templates
  list: protectedProcedure.query(async ({ ctx }) => {
    return await getExportTemplatesByUserId(ctx.user.id);
  }),

  // Get available fields
  getAvailableFields: protectedProcedure.query(() => {
    return EXPORT_FIELDS;
  }),

  // Create new template
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(128),
      fields: z.array(z.string()).min(1),
      isDefault: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const templateId = await createExportTemplate({
        userId: ctx.user.id,
        name: input.name,
        fields: input.fields,
        isDefault: input.isDefault ? "yes" : "no",
      });
      return { templateId };
    }),

  // Update template
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(128).optional(),
      fields: z.array(z.string()).min(1).optional(),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const template = await getExportTemplateById(input.id);
      if (!template || template.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }
      
      await updateExportTemplate(input.id, {
        name: input.name,
        fields: input.fields,
        isDefault: input.isDefault !== undefined ? (input.isDefault ? "yes" : "no") : undefined,
      });
      return { success: true };
    }),

  // Delete template
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const template = await getExportTemplateById(input.id);
      if (!template || template.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }
      await deleteExportTemplate(input.id);
      return { success: true };
    }),

  // Get default template
  getDefault: protectedProcedure.query(async ({ ctx }) => {
    return await getDefaultExportTemplate(ctx.user.id);
  }),
});

export const appRouter = router({
  system: systemRouter,
  admin: adminRouter,
  exportTemplates: exportTemplatesRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    
    // Login with username/password
    login: publicProcedure
      .input(z.object({
        username: z.string(),
        password: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await login(input.username, input.password);
        
        if (!result) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid username or password" });
        }
        
        // Check if account is locked
        if ('locked' in result && result.locked) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Account is locked. Try again in 15 minutes." });
        }
        
        // Check if login failed with attempts info
        if ('attemptsLeft' in result && !('user' in result)) {
          throw new TRPCError({ 
            code: "UNAUTHORIZED", 
            message: `Invalid password. ${result.attemptsLeft} attempts remaining.` 
          });
        }
        
        // Successful login
        if (!('user' in result) || !('token' in result)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid username or password" });
        }

        // Set session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, result.token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { 
          success: true, 
          user: {
            id: result.user.id,
            username: result.user.username,
            name: result.user.name,
            email: result.user.email,
            role: result.user.role,
          }
        };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // Check if initial setup is needed (no admin exists)
    needsSetup: publicProcedure.query(async () => {
      const hasAdmin = await hasAnyAdmin();
      return { needsSetup: !hasAdmin };
    }),

    // Initial admin setup (only works if no admin exists)
    setupAdmin: publicProcedure
      .input(z.object({
        username: z.string().min(3).max(64),
        password: z.string().min(6).max(128),
        name: z.string().optional(),
        email: z.string().email().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const hasAdmin = await hasAnyAdmin();
        if (hasAdmin) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin already exists" });
        }

        const userId = await createUser({
          username: input.username,
          password: input.password,
          name: input.name,
          email: input.email,
          role: "admin",
        });

        // Auto-login after setup
        const result = await login(input.username, input.password);
        if (result && 'token' in result) {
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, result.token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        }

        return { userId, success: true };
      }),
  }),

  hlr: router({
    // Analyze phone numbers before checking (duplicates, cost estimate)
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

    // Single phone number check (quick check)
    checkSingle: protectedProcedure
      .input(z.object({ phoneNumber: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const normalizedPhone = input.phoneNumber.trim();
        
        // Check cache first (24 hours)
        const cachedResult = await getCachedResult(normalizedPhone, 24);
        if (cachedResult) {
          // Return cached result without API call
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
        
        // Check limits only if we need to call API
        const limitsCheck = await checkUserLimits(ctx.user.id, 1);
        if (!limitsCheck.allowed) {
          throw new TRPCError({ code: "FORBIDDEN", message: limitsCheck.reason || "Limit exceeded" });
        }

        const hlrResponse = await performHlrLookup(normalizedPhone);
        
        // Increment user checks
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

        // Calculate health score
        const mockResult = {
          validNumber: hlrResponse.valid_number,
          reachable: hlrResponse.reachable,
          ported: hlrResponse.ported,
          roaming: hlrResponse.roaming,
          currentNetworkType: hlrResponse.current_carrier?.network_type,
        };
        const healthScore = calculateHealthScore(mockResult as any);

        // Save result to database for caching and history
        // Create a single-check batch for tracking
        const batchId = await createHlrBatch({
          userId: ctx.user.id,
          name: `Single: ${normalizedPhone}`,
          totalNumbers: 1,
          processedNumbers: 1,
          validNumbers: hlrResponse.valid_number === "valid" ? 1 : 0,
          invalidNumbers: hlrResponse.valid_number === "valid" ? 0 : 1,
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
          validNumber: hlrResponse.valid_number,
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
          isValid: hlrResponse.valid_number === "valid",
          isRoaming: hlrResponse.roaming === "true",
          isPorted: hlrResponse.ported === "true",
          reachable: hlrResponse.reachable,
          healthScore,
          fromCache: false,
        };
      }),

    // Analyze batch before checking (normalization, validation, duplicates)
    analyzeBatchNumbers: protectedProcedure
      .input(z.object({
        phoneNumbers: z.array(z.string()).min(1),
      }))
      .mutation(async ({ input }) => {
        const analysis = analyzeBatch(input.phoneNumbers);
        return analysis;
      }),

    // Start a new HLR batch check
    startBatch: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        phoneNumbers: z.array(z.string()).min(1),
        removeDuplicates: z.boolean().default(true),
        skipInvalid: z.boolean().default(true), // Skip invalid format numbers
      }))
      .mutation(async ({ ctx, input }) => {
        let { phoneNumbers } = input;
        
        // Analyze and normalize numbers
        const analysis = analyzeBatch(phoneNumbers);
        
        // Get only valid normalized numbers if skipInvalid is true
        let numbersToCheck: string[];
        let skippedInvalid = 0;
        let skippedDuplicates = 0;
        
        if (input.skipInvalid) {
          numbersToCheck = analysis.valid.map(n => n.normalized);
          skippedInvalid = analysis.totalInvalid;
          skippedDuplicates = analysis.totalDuplicates;
        } else {
          // Still normalize but include all
          numbersToCheck = phoneNumbers.map(p => normalizePhoneNumber(p).normalized).filter(Boolean);
          if (input.removeDuplicates) {
            const { unique } = detectDuplicates(numbersToCheck);
            numbersToCheck = unique;
          }
        }
        
        if (numbersToCheck.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No valid numbers to check" });
        }
        
        // Check cache for recently checked numbers (24 hours)
        const cachedResults = await getCachedResults(numbersToCheck, 24);
        const numbersToActuallyCheck = numbersToCheck.filter(n => !cachedResults.has(n));
        const cachedCount = numbersToCheck.length - numbersToActuallyCheck.length;
        
        // Check limits only for numbers that need API calls
        const limitsCheck = await checkUserLimits(ctx.user.id, numbersToActuallyCheck.length);
        if (!limitsCheck.allowed) {
          throw new TRPCError({ code: "FORBIDDEN", message: limitsCheck.reason || "Limit exceeded" });
        }
        
        // Create batch record
        const batchId = await createHlrBatch({
          userId: ctx.user.id,
          name: input.name || `Check ${new Date().toLocaleString()}`,
          totalNumbers: numbersToCheck.length,
          processedNumbers: 0,
          validNumbers: 0,
          invalidNumbers: 0,
          status: "processing",
        });

        // Process numbers - save each result IMMEDIATELY to prevent data loss
        let validCount = 0;
        let invalidCount = 0;
        let processedCount = 0;
        let cachedUsed = 0;
        
        // First, save cached results
        const cachedEntries = Array.from(cachedResults.entries());
        for (const [phone, cachedResult] of cachedEntries) {
          const healthScore = calculateHealthScore(cachedResult);
          
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
          
          // Update batch progress
          if (processedCount % 50 === 0) {
            await updateHlrBatch(batchId, {
              processedNumbers: processedCount,
              validNumbers: validCount,
              invalidNumbers: invalidCount,
            });
          }
        }

        // Then check remaining numbers via API
        for (let i = 0; i < numbersToActuallyCheck.length; i++) {
          const phone = numbersToActuallyCheck[i];
          if (!phone) continue;

          const hlrResponse = await performHlrLookup(phone);
          processedCount++;

          // Prepare result object
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
            const isValid = hlrResponse.valid_number === "valid";
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
              validNumber: hlrResponse.valid_number,
              reachable: hlrResponse.reachable,
              ported: hlrResponse.ported,
              roaming: hlrResponse.roaming,
              gsmCode: hlrResponse.gsm_code,
              gsmMessage: hlrResponse.gsm_message,
              status: "success",
              rawResponse: hlrResponse as unknown as Record<string, unknown>,
            };
          }

          // CRITICAL: Save result IMMEDIATELY after each check
          await createHlrResult(resultData);

          // Update progress every 10 numbers or at the end
          if (processedCount % 10 === 0 || i === phoneNumbers.length - 1) {
            await updateHlrBatch(batchId, {
              processedNumbers: processedCount,
              validNumbers: validCount,
              invalidNumbers: invalidCount,
            });
          }
        }

        // Mark batch as completed
        await updateHlrBatch(batchId, {
          status: "completed",
          processedNumbers: numbersToCheck.length,
          validNumbers: validCount,
          invalidNumbers: invalidCount,
          completedAt: new Date(),
        });
        
        // Increment user checks and log action (only count API calls, not cached)
        await incrementUserChecks(ctx.user.id, numbersToActuallyCheck.length);
        await logAction({ userId: ctx.user.id, action: "batch_check", details: `Checked ${numbersToCheck.length} numbers (${cachedUsed} from cache, ${skippedInvalid} invalid skipped, ${skippedDuplicates} duplicates skipped)` });

        return { 
          batchId, 
          totalProcessed: numbersToCheck.length,
          fromCache: cachedUsed,
          apiCalls: numbersToActuallyCheck.length,
          skippedInvalid,
          skippedDuplicates,
          estimatedSavings: (skippedInvalid + skippedDuplicates + cachedUsed) * 0.01,
        };
      }),

    // Get batch status and progress
    getBatch: protectedProcedure
      .input(z.object({ batchId: z.number() }))
      .query(async ({ ctx, input }) => {
        const batch = await getHlrBatchById(input.batchId);
        if (!batch || batch.userId !== ctx.user.id) {
          return null;
        }
        return batch;
      }),

    // Get all batches for current user
    listBatches: protectedProcedure.query(async ({ ctx }) => {
      return await getHlrBatchesByUserId(ctx.user.id);
    }),

    // Get results for a specific batch (with pagination and health scores)
    getResults: protectedProcedure
      .input(z.object({ 
        batchId: z.number(),
        page: z.number().default(1),
        pageSize: z.number().default(50),
      }))
      .query(async ({ ctx, input }) => {
        const batch = await getHlrBatchById(input.batchId);
        if (!batch || batch.userId !== ctx.user.id) {
          return { results: [], total: 0, pages: 0 };
        }
        const paginatedResults = await getHlrResultsByBatchIdPaginated(input.batchId, input.page, input.pageSize);
        
        // Add health scores to results
        const resultsWithScores = paginatedResults.results.map(result => ({
          ...result,
          healthScore: calculateHealthScore(result),
        }));
        
        return {
          results: resultsWithScores,
          total: paginatedResults.total,
          pages: paginatedResults.pages,
        };
      }),

    // Export results to XLSX format
    exportXlsx: protectedProcedure
      .input(z.object({ 
        batchId: z.number(),
        fields: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const batch = await getHlrBatchById(input.batchId);
        if (!batch || batch.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
        }
        
        const results = await getHlrResultsByBatchId(input.batchId);
        
        // Prepare data for Excel
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
        
        // Create workbook and worksheet
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "HLR Results");
        
        // Generate buffer
        const buffer = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
        
        return {
          filename: `hlr-results-${batch.id}-${new Date().toISOString().split('T')[0]}.xlsx`,
          data: buffer,
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        };
      }),

    // Re-check numbers from a previous batch
    recheckBatch: protectedProcedure
      .input(z.object({ batchId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const batch = await getHlrBatchById(input.batchId);
        if (!batch || batch.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
        }
        
        // Get original results to extract phone numbers
        const originalResults = await getHlrResultsByBatchId(input.batchId);
        const phoneNumbers = originalResults.map(r => r.phoneNumber);
        
        if (phoneNumbers.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No phone numbers to recheck" });
        }
        
        // Check limits
        const limitsCheck = await checkUserLimits(ctx.user.id, phoneNumbers.length);
        if (!limitsCheck.allowed) {
          throw new TRPCError({ code: "FORBIDDEN", message: limitsCheck.reason || "Limit exceeded" });
        }
        
        // Create new batch
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

    // Get incomplete batches for resume functionality
    getIncompleteBatches: protectedProcedure.query(async ({ ctx }) => {
      return await getIncompleteBatches(ctx.user.id);
    }),

    // Resume an interrupted batch
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
        
        if (batch.status !== "processing") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Batch is not in processing state" });
        }
        
        // Get already checked phone numbers
        const checkedNumbers = await getCheckedPhoneNumbersInBatch(input.batchId);
        
        // Calculate how many numbers are remaining
        const totalNumbers = batch.totalNumbers || 0;
        const alreadyChecked = checkedNumbers.size;
        const remaining = totalNumbers - alreadyChecked;
        
        // If no remaining numbers, mark as completed
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
          };
        }
        
        // For resuming, we need to re-check numbers that weren't processed
        // Since we don't store the original input numbers, we'll mark the batch as completed
        // and inform the user that partial results are available
        // In a production system, you would store the original phone numbers list
        
        // Mark batch as completed with partial results
        await updateHlrBatch(input.batchId, {
          status: "completed",
          completedAt: new Date(),
        });
        
        return { 
          batchId: input.batchId, 
          resumed: true,
          alreadyChecked: alreadyChecked,
          newlyChecked: 0,
          totalProcessed: alreadyChecked,
          message: `Batch marked as completed. ${alreadyChecked} numbers were successfully checked. ${remaining} numbers were not processed due to interruption.`,
        };
      }),

    // Resume batch with phone numbers (for re-checking remaining numbers)
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
        
        if (batch.status !== "processing") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Batch is not in processing state" });
        }
        
        // Get already checked phone numbers
        const checkedNumbers = await getCheckedPhoneNumbersInBatch(input.batchId);
        
        // Filter out already checked numbers
        const numbersToCheck = input.phoneNumbers.filter(n => !checkedNumbers.has(n));
        
        if (numbersToCheck.length === 0) {
          // All numbers already checked, mark as completed
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
        
        // Check limits for remaining numbers
        const limitsCheck = await checkUserLimits(ctx.user.id, numbersToCheck.length);
        if (!limitsCheck.allowed) {
          throw new TRPCError({ code: "FORBIDDEN", message: limitsCheck.reason || "Limit exceeded" });
        }
        
        // Process remaining numbers
        let validCount = batch.validNumbers || 0;
        let invalidCount = batch.invalidNumbers || 0;
        let processedCount = batch.processedNumbers || 0;
        
        for (let i = 0; i < numbersToCheck.length; i++) {
          const phone = numbersToCheck[i];
          if (!phone) continue;

          const hlrResponse = await performHlrLookup(phone);
          processedCount++;

          let resultData: InsertHlrResult;

          if ("error" in hlrResponse) {
            resultData = {
              batchId: input.batchId,
              phoneNumber: phone,
              status: "error",
              errorMessage: hlrResponse.error,
            };
            invalidCount++;
          } else {
            const isValid = hlrResponse.valid_number === "valid";
            if (isValid) validCount++;
            else invalidCount++;

            resultData = {
              batchId: input.batchId,
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
              validNumber: hlrResponse.valid_number,
              reachable: hlrResponse.reachable,
              ported: hlrResponse.ported,
              roaming: hlrResponse.roaming,
              gsmCode: hlrResponse.gsm_code,
              gsmMessage: hlrResponse.gsm_message,
              status: "success",
              rawResponse: hlrResponse as unknown as Record<string, unknown>,
            };
          }

          // Save result immediately
          await createHlrResult(resultData);

          // Update progress every 10 numbers
          if (processedCount % 10 === 0 || i === numbersToCheck.length - 1) {
            await updateHlrBatch(input.batchId, {
              processedNumbers: processedCount,
              validNumbers: validCount,
              invalidNumbers: invalidCount,
            });
          }
        }

        // Mark batch as completed
        await updateHlrBatch(input.batchId, {
          status: "completed",
          processedNumbers: processedCount,
          validNumbers: validCount,
          invalidNumbers: invalidCount,
          completedAt: new Date(),
        });
        
        await incrementUserChecks(ctx.user.id, numbersToCheck.length);
        await logAction({ userId: ctx.user.id, action: "resume_batch", details: `Resumed batch ${input.batchId}, checked ${numbersToCheck.length} remaining numbers` });

        return { 
          batchId: input.batchId, 
          resumed: true,
          alreadyChecked: checkedNumbers.size,
          newlyChecked: numbersToCheck.length,
          totalProcessed: processedCount,
        };
      }),

    // Delete a batch and its results
    deleteBatch: protectedProcedure
      .input(z.object({ batchId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const batch = await getHlrBatchById(input.batchId);
        if (!batch || batch.userId !== ctx.user.id) {
          throw new Error("Batch not found or access denied");
        }
        await deleteHlrBatch(input.batchId);
        return { success: true };
      }),

    // Get user statistics
    getUserStats: protectedProcedure.query(async ({ ctx }) => {
      const stats = await getStatistics(ctx.user.id);
      const userLimits = await getAllUsers().then(users => users.find(u => u.id === ctx.user.id));
      return {
        totalBatches: stats.totalBatches,
        totalChecks: stats.totalChecks,
        validNumbers: stats.validChecks,
        invalidNumbers: stats.invalidChecks,
        checksToday: stats.todayChecks,
        checksThisMonth: stats.monthChecks,
        limits: {
          dailyLimit: userLimits?.dailyLimit || 0,
          monthlyLimit: userLimits?.monthlyLimit || 0,
        }
      };
    }),

    // Check API balance (admin only)
    getBalance: protectedProcedure.query(async ({ ctx }) => {
      // Only admins can see the balance
      if (ctx.user.role !== "admin") {
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

    // Get cost estimate
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
  }),
});

export type AppRouter = typeof appRouter;
