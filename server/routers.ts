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
} from "./db";
import { login, createSession } from "./auth";
import { TRPCError } from "@trpc/server";
import { InsertHlrResult } from "../drizzle/schema";

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

export const appRouter = router({
  system: systemRouter,
  admin: adminRouter,
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
    // Single phone number check (quick check)
    checkSingle: protectedProcedure
      .input(z.object({ phoneNumber: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        // Check limits
        const limitsCheck = await checkUserLimits(ctx.user.id, 1);
        if (!limitsCheck.allowed) {
          throw new TRPCError({ code: "FORBIDDEN", message: limitsCheck.reason || "Limit exceeded" });
        }

        const hlrResponse = await performHlrLookup(input.phoneNumber.trim());
        
        // Increment user checks
        await incrementUserChecks(ctx.user.id, 1);
        await logAction({ userId: ctx.user.id, action: "single_check", details: input.phoneNumber });

        if ("error" in hlrResponse) {
          return {
            success: false,
            phoneNumber: input.phoneNumber,
            error: hlrResponse.error,
          };
        }

        return {
          success: true,
          phoneNumber: input.phoneNumber,
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
        };
      }),

    // Start a new HLR batch check
    startBatch: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        phoneNumbers: z.array(z.string()).min(1).max(1000),
      }))
      .mutation(async ({ ctx, input }) => {
        const { name, phoneNumbers } = input;
        
        // Check limits before starting
        const limitsCheck = await checkUserLimits(ctx.user.id, phoneNumbers.length);
        if (!limitsCheck.allowed) {
          throw new TRPCError({ code: "FORBIDDEN", message: limitsCheck.reason || "Limit exceeded" });
        }
        
        // Create batch record
        const batchId = await createHlrBatch({
          userId: ctx.user.id,
          name: name || `Check ${new Date().toLocaleString()}`,
          totalNumbers: phoneNumbers.length,
          processedNumbers: 0,
          validNumbers: 0,
          invalidNumbers: 0,
          status: "processing",
        });

        // Process numbers in background (we'll return immediately and update progress)
        const results: InsertHlrResult[] = [];
        let validCount = 0;
        let invalidCount = 0;

        for (let i = 0; i < phoneNumbers.length; i++) {
          const phone = phoneNumbers[i].trim();
          if (!phone) continue;

          const hlrResponse = await performHlrLookup(phone);

          if ("error" in hlrResponse) {
            results.push({
              batchId,
              phoneNumber: phone,
              status: "error",
              errorMessage: hlrResponse.error,
            });
            invalidCount++;
          } else {
            const isValid = hlrResponse.valid_number === "valid";
            if (isValid) validCount++;
            else invalidCount++;

            results.push({
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
            });
          }

          // Update progress every 10 numbers or at the end
          if ((i + 1) % 10 === 0 || i === phoneNumbers.length - 1) {
            await updateHlrBatch(batchId, {
              processedNumbers: i + 1,
              validNumbers: validCount,
              invalidNumbers: invalidCount,
            });
          }
        }

        // Save all results
        await createHlrResults(results);

        // Mark batch as completed
        await updateHlrBatch(batchId, {
          status: "completed",
          processedNumbers: phoneNumbers.length,
          validNumbers: validCount,
          invalidNumbers: invalidCount,
          completedAt: new Date(),
        });
        
        // Increment user checks and log action
        await incrementUserChecks(ctx.user.id, phoneNumbers.length);
        await logAction({ userId: ctx.user.id, action: "batch_check", details: `Checked ${phoneNumbers.length} numbers` });

        return { batchId, totalProcessed: phoneNumbers.length };
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

    // Get results for a specific batch (with pagination)
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
        return await getHlrResultsByBatchIdPaginated(input.batchId, input.page, input.pageSize);
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
  }),
});

export type AppRouter = typeof appRouter;
