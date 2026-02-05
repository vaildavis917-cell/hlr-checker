import { COOKIE_NAME, TWELVE_HOURS_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { registerActiveBatch, updateBatchProgress, unregisterBatch, isShutdownInProgress } from "./_core/index";
import { broadcastBatchProgress } from "./_core/websocket";
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
  countActionLogs,
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
  classifyQualityByHealthScore,
  getAllBatches,
  getCachedResults,
  getCachedResult,
  getCheckedPhoneNumbersInBatch,
  getIncompleteBatches,
  createSession as createDbSession,
  getSessionsByUserId,
  deleteSession,
  deleteAllUserSessions,
  getSessionByToken,
  updateSessionActivity,
  getRolePermissions,
  getAllRolePermissions,
  setRolePermissions,
  getUserEffectivePermissions,
  setUserCustomPermissions,
  userHasPermission,
  createAccessRequest,
  getAccessRequestById,
  getAccessRequestByEmail,
  getAllAccessRequests,
  getPendingAccessRequestsCount,
  approveAccessRequest,
  rejectAccessRequest,
  deleteAccessRequest,
  getSetting,
  setSetting,
  getAllSettings,
  createEmailBatch,
  updateEmailBatchProgress,
  completeEmailBatch,
  getEmailBatchesByUser,
  getEmailBatchById,
  deleteEmailBatch,
  saveEmailResult,
  getEmailResultsByBatch,
  getEmailFromCache,
  saveEmailToCache,
  getEmailsFromCacheBulk,
  getAllEmailBatches,
  getUserById,
  createCustomRole,
  getAllCustomRoles,
  getCustomRoleById,
  getCustomRoleByName,
  updateCustomRole,
  deleteCustomRole,
  initializeSystemRoles,
  getIncompleteEmailBatches,
  getProcessedEmailsForBatch,
  getEmailBatchCountByUser,
} from "./db";
import { sendTelegramMessage, notifyNewAccessRequest, testTelegramConnection } from "./telegram";
import { login, createSession } from "./auth";
import { TRPCError } from "@trpc/server";
import { InsertHlrResult, PERMISSIONS, PERMISSION_DESCRIPTIONS, DEFAULT_PERMISSIONS, Permission } from "../drizzle/schema";
import { analyzeBatch, normalizePhoneNumber } from "./phoneUtils";
import { verifyEmail, getCredits, getResultStatus, RESULT_DESCRIPTIONS, SUBRESULT_DESCRIPTIONS } from "./millionverifier";
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

// Retry configuration
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1000, // 1 second
  maxDelayMs: 10000, // 10 seconds
};

// Sleep helper
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Calculate exponential backoff delay
function getRetryDelay(attempt: number): number {
  const delay = RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt - 1);
  // Add jitter (±20%)
  const jitter = delay * 0.2 * (Math.random() - 0.5);
  return Math.min(delay + jitter, RETRY_CONFIG.maxDelayMs);
}

// Check if error is retryable
function isRetryableError(status: number): boolean {
  // Retry on: 429 (rate limit), 500, 502, 503, 504 (server errors)
  return status === 429 || (status >= 500 && status <= 504);
}

// Function to perform HLR lookup via Seven.io API with retry logic
async function performHlrLookup(
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

      // Success
      if (response.ok) {
        const data = await response.json();
        return data as SevenIoHlrResponse;
      }

      // Non-retryable error
      if (!isRetryableError(response.status)) {
        return { error: `API error: ${response.status} ${response.statusText}` };
      }

      // Retryable error - prepare for retry
      lastError = `API error: ${response.status} ${response.statusText}`;
      
      if (attempt < RETRY_CONFIG.maxAttempts) {
        const delayMs = getRetryDelay(attempt);
        onRetry?.(attempt, lastError, delayMs);
        await sleep(delayMs);
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown error";
      
      // Network errors are retryable
      if (attempt < RETRY_CONFIG.maxAttempts) {
        const delayMs = getRetryDelay(attempt);
        onRetry?.(attempt, lastError, delayMs);
        await sleep(delayMs);
      }
    }
  }

  // All retries exhausted
  return { 
    error: `${lastError} (after ${RETRY_CONFIG.maxAttempts} attempts)`,
    retryAttempts: RETRY_CONFIG.maxAttempts
  };
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

// Admin-only procedure (admin and manager roles)
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
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
      role: z.enum(["user", "admin", "manager", "viewer"]).default("user"),
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
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin", "manager", "viewer"]) }))
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

  // Update user limits (supports separate HLR and Email limits)
  updateUserLimits: adminProcedure
    .input(z.object({ 
      userId: z.number(),
      // HLR limits
      hlrDailyLimit: z.number().nullable().optional(),
      hlrWeeklyLimit: z.number().nullable().optional(),
      hlrMonthlyLimit: z.number().nullable().optional(),
      hlrBatchLimit: z.number().nullable().optional(),
      // Email limits
      emailDailyLimit: z.number().nullable().optional(),
      emailWeeklyLimit: z.number().nullable().optional(),
      emailMonthlyLimit: z.number().nullable().optional(),
      emailBatchLimit: z.number().nullable().optional(),
      // Legacy fields (for backward compatibility)
      dailyLimit: z.number().nullable().optional(), 
      monthlyLimit: z.number().nullable().optional(),
      weeklyLimit: z.number().nullable().optional(),
      batchLimit: z.number().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const limits: any = {};
      
      // HLR limits
      if (input.hlrDailyLimit !== undefined) limits.hlrDailyLimit = input.hlrDailyLimit;
      if (input.hlrWeeklyLimit !== undefined) limits.hlrWeeklyLimit = input.hlrWeeklyLimit;
      if (input.hlrMonthlyLimit !== undefined) limits.hlrMonthlyLimit = input.hlrMonthlyLimit;
      if (input.hlrBatchLimit !== undefined) limits.hlrBatchLimit = input.hlrBatchLimit;
      
      // Email limits
      if (input.emailDailyLimit !== undefined) limits.emailDailyLimit = input.emailDailyLimit;
      if (input.emailWeeklyLimit !== undefined) limits.emailWeeklyLimit = input.emailWeeklyLimit;
      if (input.emailMonthlyLimit !== undefined) limits.emailMonthlyLimit = input.emailMonthlyLimit;
      if (input.emailBatchLimit !== undefined) limits.emailBatchLimit = input.emailBatchLimit;
      
      // Legacy fields (also update for backward compatibility)
      if (input.dailyLimit !== undefined) {
        limits.dailyLimit = input.dailyLimit;
        limits.hlrDailyLimit = input.dailyLimit;
      }
      if (input.weeklyLimit !== undefined) {
        limits.weeklyLimit = input.weeklyLimit;
        limits.hlrWeeklyLimit = input.weeklyLimit;
      }
      if (input.monthlyLimit !== undefined) {
        limits.monthlyLimit = input.monthlyLimit;
        limits.hlrMonthlyLimit = input.monthlyLimit;
      }
      if (input.batchLimit !== undefined) {
        limits.batchLimit = input.batchLimit;
        limits.hlrBatchLimit = input.batchLimit;
      }
      
      await updateUserLimits(input.userId, limits);
      await logAction({ userId: ctx.user.id, action: "update_limits", details: `Updated limits for user ${input.userId}` });
      return { success: true };
    }),

  // Get action logs
  getActionLogs: adminProcedure
    .input(z.object({ userId: z.number().optional(), limit: z.number().default(100) }))
    .query(async ({ input }) => {
      return await getActionLogs({ userId: input.userId, limit: input.limit });
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
      
      // Add health scores and status classification to results
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

  // Delete batch (admin only)
  deleteBatch: adminProcedure
    .input(z.object({ batchId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const batch = await getHlrBatchById(input.batchId);
      if (!batch) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
      }
      await deleteHlrBatch(input.batchId);
      await logAction({ 
        userId: ctx.user.id, 
        action: "delete_batch", 
        details: `Deleted batch #${input.batchId} (${batch.totalNumbers} numbers) from user #${batch.userId}` 
      });
      return { success: true };
    }),

  // =====================
  // Permissions Management
  // =====================

  // Get all available permissions
  getAvailablePermissions: adminProcedure.query(() => {
    return {
      permissions: PERMISSIONS,
      descriptions: PERMISSION_DESCRIPTIONS,
      defaults: DEFAULT_PERMISSIONS,
    };
  }),

  // Get all role permissions (custom + defaults)
  getAllRolePermissions: adminProcedure.query(async () => {
    const customPermissions = await getAllRolePermissions();
    const roles = ['viewer', 'user', 'manager', 'admin'];
    
    return roles.map(role => {
      const custom = customPermissions.find(p => p.role === role);
      return {
        role,
        permissions: custom?.permissions || DEFAULT_PERMISSIONS[role] || [],
        description: custom?.description || null,
        isCustom: !!custom,
      };
    });
  }),

  // Get permissions for a specific role
  getRolePermissions: adminProcedure
    .input(z.object({ role: z.string() }))
    .query(async ({ input }) => {
      const permissions = await getRolePermissions(input.role);
      return { role: input.role, permissions };
    }),

  // Update permissions for a role
  setRolePermissions: adminProcedure
    .input(z.object({
      role: z.string(),
      permissions: z.array(z.string()),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate permissions
      const validPermissions = input.permissions.filter(p => 
        PERMISSIONS.includes(p as Permission)
      ) as Permission[];
      
      await setRolePermissions(input.role, validPermissions, input.description);
      await logAction({
        userId: ctx.user.id,
        action: "update_role_permissions",
        details: `Updated permissions for role '${input.role}': ${validPermissions.join(', ')}`,
      });
      return { success: true };
    }),

  // Reset role permissions to defaults
  resetRolePermissions: adminProcedure
    .input(z.object({ role: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { deleteRolePermissions } = await import("./db");
      await deleteRolePermissions(input.role);
      await logAction({
        userId: ctx.user.id,
        action: "reset_role_permissions",
        details: `Reset permissions for role '${input.role}' to defaults`,
      });
      return { success: true, defaults: DEFAULT_PERMISSIONS[input.role] || [] };
    }),

  // Get user's effective permissions
  getUserPermissions: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const permissions = await getUserEffectivePermissions(input.userId);
      return { userId: input.userId, permissions };
    }),

  // Set custom permissions for a user (overrides role)
  setUserCustomPermissions: adminProcedure
    .input(z.object({
      userId: z.number(),
      permissions: z.array(z.string()).nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.permissions) {
        const validPermissions = input.permissions.filter(p => 
          PERMISSIONS.includes(p as Permission)
        ) as Permission[];
        await setUserCustomPermissions(input.userId, validPermissions);
        await logAction({
          userId: ctx.user.id,
          action: "set_user_permissions",
          details: `Set custom permissions for user #${input.userId}: ${validPermissions.join(', ')}`,
        });
      } else {
        await setUserCustomPermissions(input.userId, null);
        await logAction({
          userId: ctx.user.id,
          action: "clear_user_permissions",
          details: `Cleared custom permissions for user #${input.userId}, now using role defaults`,
        });
      }
      return { success: true };
    }),

  // Access Requests Management
  getAccessRequests: adminProcedure
    .input(z.object({ status: z.enum(["pending", "approved", "rejected"]).optional() }))
    .query(async ({ input }) => {
      return await getAllAccessRequests(input.status);
    }),

  getPendingRequestsCount: adminProcedure.query(async () => {
    return await getPendingAccessRequestsCount();
  }),

  approveAccessRequest: adminProcedure
    .input(z.object({
      requestId: z.number(),
      username: z.string().min(3).max(64),
      password: z.string().min(6).max(128),
      role: z.enum(["user", "admin", "manager", "viewer"]).default("user"),
      comment: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const request = await getAccessRequestById(input.requestId);
      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });
      }
      if (request.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Request already processed" });
      }
      
      // Check if username already exists
      const existingUser = await getUserByUsername(input.username);
      if (existingUser) {
        throw new TRPCError({ code: "CONFLICT", message: "Username already exists" });
      }
      
      // Create user
      const userId = await createUser({
        username: input.username,
        password: input.password,
        name: request.name,
        email: request.email || undefined,
        role: input.role,
      });
      
      // Approve request
      await approveAccessRequest(input.requestId, ctx.user.id, userId, input.comment);
      
      await logAction({
        userId: ctx.user.id,
        action: "approve_access_request",
        details: `Approved access request #${input.requestId}, created user #${userId} (${input.username})`,
      });
      
      return { success: true, userId };
    }),

  rejectAccessRequest: adminProcedure
    .input(z.object({
      requestId: z.number(),
      comment: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const request = await getAccessRequestById(input.requestId);
      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });
      }
      if (request.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Request already processed" });
      }
      
      await rejectAccessRequest(input.requestId, ctx.user.id, input.comment);
      
      await logAction({
        userId: ctx.user.id,
        action: "reject_access_request",
        details: `Rejected access request #${input.requestId} (${request.email})`,
      });
      
      return { success: true };
    }),

  deleteAccessRequest: adminProcedure
    .input(z.object({ requestId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteAccessRequest(input.requestId);
      await logAction({
        userId: ctx.user.id,
        action: "delete_access_request",
        details: `Deleted access request #${input.requestId}`,
      });
      return { success: true };
    }),

  // Get all sessions for a specific user (admin only)
  getUserSessions: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const sessions = await getSessionsByUserId(input.userId);
      return sessions.map(s => ({
        id: s.id,
        deviceInfo: s.deviceInfo,
        browser: s.browser,
        os: s.os,
        ipAddress: s.ipAddress,
        location: s.location,
        lastActivity: s.lastActivity,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        isExpired: new Date(s.expiresAt) < new Date(),
      }));
    }),

  // Terminate a specific session for any user (admin only)
  terminateUserSession: adminProcedure
    .input(z.object({ sessionId: z.number(), userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const sessions = await getSessionsByUserId(input.userId);
      const session = sessions.find(s => s.id === input.sessionId);
      
      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }
      
      await deleteSession(input.sessionId);
      
      await logAction({
        userId: ctx.user.id,
        action: "admin_terminate_session",
        details: `Admin terminated session ${input.sessionId} for user ${input.userId}`,
        ipAddress: ctx.req.ip || ctx.req.headers["x-forwarded-for"]?.toString(),
        userAgent: ctx.req.headers["user-agent"],
      });
      
      return { success: true };
    }),

  // Terminate all sessions for a specific user (admin only)
  terminateAllUserSessions: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const count = await deleteAllUserSessions(input.userId);
      
      await logAction({
        userId: ctx.user.id,
        action: "admin_terminate_all_sessions",
        details: `Admin terminated ${count} sessions for user ${input.userId}`,
        ipAddress: ctx.req.ip || ctx.req.headers["x-forwarded-for"]?.toString(),
        userAgent: ctx.req.headers["user-agent"],
      });
      
      return { success: true, count };
    }),

  // Get Telegram settings
  getTelegramSettings: adminProcedure.query(async () => {
    const botToken = await getSetting("telegram_bot_token");
    const chatId = await getSetting("telegram_chat_id");
    return {
      botToken: botToken ? "***" + botToken.slice(-4) : null, // Mask token for security
      chatId,
      isConfigured: !!(botToken && chatId),
    };
  }),

  // Save Telegram settings
  saveTelegramSettings: adminProcedure
    .input(z.object({
      botToken: z.string().min(1),
      chatId: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      await setSetting("telegram_bot_token", input.botToken, "Telegram Bot API Token");
      await setSetting("telegram_chat_id", input.chatId, "Telegram Chat ID for notifications");
      
      await logAction({
        userId: ctx.user.id,
        action: "admin_update_telegram_settings",
        details: "Updated Telegram notification settings",
        ipAddress: ctx.req.ip || ctx.req.headers["x-forwarded-for"]?.toString(),
        userAgent: ctx.req.headers["user-agent"],
      });
      
      return { success: true };
    }),

  // Test Telegram connection
  testTelegramConnection: adminProcedure
    .input(z.object({
      botToken: z.string().min(1),
      chatId: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const result = await testTelegramConnection(input.botToken, input.chatId);
      return result;
    }),

  // Clear Telegram settings
  clearTelegramSettings: adminProcedure.mutation(async ({ ctx }) => {
    await setSetting("telegram_bot_token", "", "Telegram Bot API Token");
    await setSetting("telegram_chat_id", "", "Telegram Chat ID for notifications");
    
    await logAction({
      userId: ctx.user.id,
      action: "admin_clear_telegram_settings",
      details: "Cleared Telegram notification settings",
      ipAddress: ctx.req.ip || ctx.req.headers["x-forwarded-for"]?.toString(),
      userAgent: ctx.req.headers["user-agent"],
    });
    
    return { success: true };
  }),

  // =====================
  // Custom Roles Management
  // =====================

  // List all custom roles
  listRoles: adminProcedure.query(async () => {
    await initializeSystemRoles();
    const roles = await getAllCustomRoles();
    return roles.map(role => ({
      ...role,
      permissions: JSON.parse(role.permissions) as string[],
    }));
  }),

  // Create a new custom role
  createRole: adminProcedure
    .input(z.object({
      name: z.string().min(2).max(64),
      description: z.string().max(256).optional(),
      permissions: z.array(z.string()),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if role name already exists
      const existing = await getCustomRoleByName(input.name);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Role with this name already exists" });
      }
      
      const roleId = await createCustomRole({
        name: input.name,
        description: input.description,
        permissions: input.permissions,
        color: input.color,
      });
      
      await logAction({
        userId: ctx.user.id,
        action: "create_custom_role",
        details: `Created custom role: ${input.name}`,
        ipAddress: ctx.req.ip || ctx.req.headers["x-forwarded-for"]?.toString(),
        userAgent: ctx.req.headers["user-agent"],
      });
      
      return { roleId };
    }),

  // Update a custom role
  updateRole: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(2).max(64).optional(),
      description: z.string().max(256).optional(),
      permissions: z.array(z.string()).optional(),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const role = await getCustomRoleById(input.id);
      if (!role) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Role not found" });
      }
      
      if (role.isSystem) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot modify system roles" });
      }
      
      // Check if new name conflicts with existing role
      if (input.name && input.name !== role.name) {
        const existing = await getCustomRoleByName(input.name);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Role with this name already exists" });
        }
      }
      
      await updateCustomRole(input.id, {
        name: input.name,
        description: input.description,
        permissions: input.permissions,
        color: input.color,
      });
      
      await logAction({
        userId: ctx.user.id,
        action: "update_custom_role",
        details: `Updated custom role: ${role.name}`,
        ipAddress: ctx.req.ip || ctx.req.headers["x-forwarded-for"]?.toString(),
        userAgent: ctx.req.headers["user-agent"],
      });
      
      return { success: true };
    }),

  // Delete a custom role
  deleteRole: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const role = await getCustomRoleById(input.id);
      if (!role) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Role not found" });
      }
      
      if (role.isSystem) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete system roles" });
      }
      
      await deleteCustomRole(input.id);
      
      await logAction({
        userId: ctx.user.id,
        action: "delete_custom_role",
        details: `Deleted custom role: ${role.name}`,
        ipAddress: ctx.req.ip || ctx.req.headers["x-forwarded-for"]?.toString(),
        userAgent: ctx.req.headers["user-agent"],
      });
      
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

// Email validation router
const emailRouter = router({
  // Get MillionVerifier balance (credits)
  getBalance: protectedProcedure.query(async () => {
    const apiKey = process.env.MILLIONVERIFIER_API_KEY;
    if (!apiKey) {
      return { credits: 0, error: "API key not configured" };
    }
    try {
      const credits = await getCredits(apiKey);
      return { credits };
    } catch (error) {
      return { credits: 0, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }),

  // Verify single email
  checkSingle: protectedProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      // Check permission
      const hasPermission = await userHasPermission(ctx.user.id, "email.single");
      if (!hasPermission) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No permission for email check" });
      }

      const apiKey = process.env.MILLIONVERIFIER_API_KEY;
      if (!apiKey) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "API key not configured" });
      }

      // Check cache first
      const cached = await getEmailFromCache(input.email);
      if (cached) {
        return {
          email: input.email,
          quality: cached.quality || "unknown",
          result: cached.result || "unknown",
          resultCode: cached.resultCode || 0,
          subresult: cached.subresult || "",
          isFree: cached.isFree || false,
          isRole: cached.isRole || false,
          didYouMean: cached.didYouMean || "",
          status: getResultStatus(cached.result || "unknown"),
          fromCache: true,
        };
      }

      // Check email limits
      const limitsCheck = await checkUserLimits(ctx.user.id, 1, 'email');
      if (!limitsCheck.allowed) {
        throw new TRPCError({ code: "FORBIDDEN", message: limitsCheck.reason || "Email limit exceeded" });
      }

      // Verify email
      const result = await verifyEmail(input.email, apiKey);
      
      // Increment email checks counter
      await incrementUserChecks(ctx.user.id, 1, 'email');

      // Log action
      await logAction({
        userId: ctx.user.id,
        action: "email_single",
        details: `Email: ${input.email}, Result: ${result.result}`,
        ipAddress: ctx.req.ip || ctx.req.headers["x-forwarded-for"]?.toString() || "unknown",
        userAgent: ctx.req.headers["user-agent"] || "unknown",
      });

      // Save to cache
      await saveEmailToCache({
        email: input.email,
        quality: result.quality,
        result: result.result,
        resultCode: result.resultcode,
        subresult: result.subresult,
        isFree: result.free,
        isRole: result.role,
        didYouMean: result.didyoumean,
      });

      return {
        email: result.email,
        quality: result.quality,
        result: result.result,
        resultCode: result.resultcode,
        subresult: result.subresult,
        isFree: result.free,
        isRole: result.role,
        didYouMean: result.didyoumean,
        credits: result.credits,
        status: getResultStatus(result.result),
        fromCache: false,
      };
    }),

  // Start batch email verification
  startBatch: protectedProcedure
    .input(z.object({
      name: z.string().optional().default(""),
      emails: z.array(z.string()).min(1).max(10000),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check permission
      const hasPermission = await userHasPermission(ctx.user.id, "email.batch");
      if (!hasPermission) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No permission for batch email check" });
      }

      const apiKey = process.env.MILLIONVERIFIER_API_KEY;
      if (!apiKey) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "API key not configured" });
      }

      // Filter valid emails - more permissive regex that accepts most valid email formats
      // Allows: letters, numbers, dots, hyphens, underscores, plus signs before @
      // Requires: @ symbol, domain with at least one dot
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i;
      const validEmails = input.emails
        .map(e => e.trim().toLowerCase())
        .filter(e => e.length > 0 && emailRegex.test(e));
      if (validEmails.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No valid emails provided" });
      }

      // Check email limits
      const limitsCheck = await checkUserLimits(ctx.user.id, validEmails.length, 'email');
      if (!limitsCheck.allowed) {
        throw new TRPCError({ code: "FORBIDDEN", message: limitsCheck.reason || "Email limit exceeded" });
      }

      // Auto-generate batch name if not provided
      let batchName = input.name?.trim() || "";
      if (!batchName) {
        const batchCount = await getEmailBatchCountByUser(ctx.user.id);
        batchName = `Проверка ${batchCount + 1}`;
      }

      // Create batch
      const batchId = await createEmailBatch({
        userId: ctx.user.id,
        name: batchName,
        totalEmails: validEmails.length,
        originalEmails: validEmails, // Save for auto-resume
      });

      // Log batch start
      await logAction({
        userId: ctx.user.id,
        action: "email_batch_start",
        details: `Batch: ${input.name}, Emails: ${validEmails.length}`,
        ipAddress: ctx.req.ip || ctx.req.headers["x-forwarded-for"]?.toString() || "unknown",
        userAgent: ctx.req.headers["user-agent"] || "unknown",
      });

      // Check cache for existing results
      const cacheMap = await getEmailsFromCacheBulk(validEmails);

      // Process emails
      let processed = 0;
      let valid = 0;
      let invalid = 0;
      let risky = 0;
      let unknown = 0;

      for (const email of validEmails) {
        const trimmedEmail = email.trim().toLowerCase();
        
        // Check if cached
        const cached = cacheMap.get(trimmedEmail);
        if (cached) {
          // Use cached result
          await saveEmailResult({
            batchId,
            email: trimmedEmail,
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
          // Verify via API
          try {
            const result = await verifyEmail(trimmedEmail, apiKey);

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

            // Save to cache
            await saveEmailToCache({
              email: trimmedEmail,
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
            // Save error result
            await saveEmailResult({
              batchId,
              email: trimmedEmail,
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

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        processed++;
        await updateEmailBatchProgress(batchId, processed, valid, invalid, risky, unknown);
        
        // Broadcast progress via WebSocket
        broadcastBatchProgress(batchId, {
          processed,
          total: validEmails.length,
          valid,
          invalid,
          status: "processing",
          currentItem: email,
        });
      }

      // Broadcast completion via WebSocket
      broadcastBatchProgress(batchId, {
        processed: validEmails.length,
        total: validEmails.length,
        valid,
        invalid,
        status: "completed",
      });

      await completeEmailBatch(batchId);
      
      // Increment email checks counter (only for non-cached emails)
      const apiCallCount = validEmails.length - Array.from(cacheMap.keys()).length;
      if (apiCallCount > 0) {
        await incrementUserChecks(ctx.user.id, apiCallCount, 'email');
      }

      // Log batch complete
      await logAction({
        userId: ctx.user.id,
        action: "email_batch_complete",
        details: `Batch: ${input.name}, Valid: ${valid}, Invalid: ${invalid}, Risky: ${risky}`,
        ipAddress: ctx.req.ip || ctx.req.headers["x-forwarded-for"]?.toString() || "unknown",
        userAgent: ctx.req.headers["user-agent"] || "unknown",
      });

      return {
        batchId,
        totalEmails: validEmails.length,
        processed,
        valid,
        invalid,
        risky,
        unknown,
      };
    }),

  // Get user's email batches
  listBatches: protectedProcedure.query(async ({ ctx }) => {
    const hasPermission = await userHasPermission(ctx.user.id, "email.history");
    if (!hasPermission) {
      throw new TRPCError({ code: "FORBIDDEN", message: "No permission to view email history" });
    }
    return await getEmailBatchesByUser(ctx.user.id);
  }),

  // Get batch details with results
  getBatch: protectedProcedure
    .input(z.object({ batchId: z.number() }))
    .query(async ({ ctx, input }) => {
      const batch = await getEmailBatchById(input.batchId);
      if (!batch) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
      }
      if (batch.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      const results = await getEmailResultsByBatch(input.batchId);
      
      // Get batch owner info for admin viewing other users' batches
      let batchOwner = null;
      if (ctx.user.role === "admin" && batch.userId !== ctx.user.id) {
        const owner = await getUserById(batch.userId);
        if (owner) {
          batchOwner = { id: owner.id, name: owner.name, username: owner.username };
        }
      }
      
      return { batch, results, batchOwner };
    }),

  // Delete batch
  deleteBatch: protectedProcedure
    .input(z.object({ batchId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const hasPermission = await userHasPermission(ctx.user.id, "email.delete");
      if (!hasPermission) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No permission to delete email batches" });
      }
      const batch = await getEmailBatchById(input.batchId);
      if (!batch) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
      }
      if (batch.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      await deleteEmailBatch(input.batchId);
      return { success: true };
    }),

  // Export batch to Excel
  exportXlsx: protectedProcedure
    .input(z.object({ batchId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const hasPermission = await userHasPermission(ctx.user.id, "email.export");
      if (!hasPermission) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No permission to export email results" });
      }
      const batch = await getEmailBatchById(input.batchId);
      if (!batch) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
      }
      if (batch.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const results = await getEmailResultsByBatch(input.batchId);

      const data = results.map(r => ({
        Email: r.email,
        Quality: r.quality,
        Result: r.result,
        Subresult: r.subresult,
        "Free Provider": r.isFree ? "Yes" : "No",
        "Role Email": r.isRole ? "Yes" : "No",
        "Did You Mean": r.didYouMean || "",
        Error: r.error || "",
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Email Results");
      const buffer = XLSX.write(wb, { type: "base64", bookType: "xlsx" });

      return {
        filename: `email_results_${batch.name}_${new Date().toISOString().split("T")[0]}.xlsx`,
        data: buffer,
      };
    }),

  // Get available export fields for email results
  getExportFields: protectedProcedure.query(() => {
    return [
      { key: "email", label: { ru: "Email", uk: "Email", en: "Email" } },
      { key: "quality", label: { ru: "Качество", uk: "Якість", en: "Quality" } },
      { key: "result", label: { ru: "Результат", uk: "Результат", en: "Result" } },
      { key: "subresult", label: { ru: "Подрезультат", uk: "Підрезультат", en: "Subresult" } },
      { key: "isFree", label: { ru: "Бесплатный провайдер", uk: "Безкоштовний провайдер", en: "Free Provider" } },
      { key: "isRole", label: { ru: "Ролевой email", uk: "Рольовий email", en: "Role Email" } },
      { key: "didYouMean", label: { ru: "Возможно вы имели в виду", uk: "Можливо ви мали на увазі", en: "Did You Mean" } },
      { key: "error", label: { ru: "Ошибка", uk: "Помилка", en: "Error" } },
    ];
  }),

  // Export batch with custom fields
  exportWithFields: protectedProcedure
    .input(z.object({ 
      batchId: z.number(),
      fields: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const hasPermission = await userHasPermission(ctx.user.id, "email.export");
      if (!hasPermission) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No permission to export email results" });
      }
      const batch = await getEmailBatchById(input.batchId);
      if (!batch) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
      }
      if (batch.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const results = await getEmailResultsByBatch(input.batchId);

      const fieldMapping: Record<string, (r: any) => any> = {
        email: (r) => r.email,
        quality: (r) => r.quality,
        result: (r) => r.result,
        subresult: (r) => r.subresult || "",
        isFree: (r) => r.isFree ? "Yes" : "No",
        isRole: (r) => r.isRole ? "Yes" : "No",
        didYouMean: (r) => r.didYouMean || "",
        error: (r) => r.error || "",
      };

      const headerMapping: Record<string, string> = {
        email: "Email",
        quality: "Quality",
        result: "Result",
        subresult: "Subresult",
        isFree: "Free Provider",
        isRole: "Role Email",
        didYouMean: "Did You Mean",
        error: "Error",
      };

      const data = results.map(r => {
        const row: Record<string, any> = {};
        for (const field of input.fields) {
          if (fieldMapping[field]) {
            row[headerMapping[field] || field] = fieldMapping[field](r);
          }
        }
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Email Results");
      const buffer = XLSX.write(wb, { type: "base64", bookType: "xlsx" });

      return {
        filename: `email_results_${batch.name}_${new Date().toISOString().split("T")[0]}.xlsx`,
        data: buffer,
      };
    }),

  // Get result descriptions for UI
  getDescriptions: publicProcedure.query(() => ({
    results: RESULT_DESCRIPTIONS,
    subresults: SUBRESULT_DESCRIPTIONS,
  })),

  // Get email stats for dashboard
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const batches = await getEmailBatchesByUser(ctx.user.id);
    const totalChecks = batches.reduce((sum, b) => sum + (b.totalEmails || 0), 0);
    const validEmails = batches.reduce((sum, b) => sum + (b.validEmails || 0), 0);
    const invalidEmails = batches.reduce((sum, b) => sum + (b.invalidEmails || 0), 0);
    
    return {
      totalChecks,
      validEmails,
      invalidEmails,
      batchCount: batches.length,
    };
  }),

  // Get all email batches from all users (admin only)
  listAllBatches: adminProcedure.query(async () => {
    const batches = await getAllEmailBatches();
    const users = await getAllUsers();
    const userMap = new Map(users.map(u => [u.id, u]));
    
    return batches.map(batch => ({
      ...batch,
      userName: userMap.get(batch.userId)?.name || userMap.get(batch.userId)?.username || `User #${batch.userId}`,
      userUsername: userMap.get(batch.userId)?.username || `user_${batch.userId}`,
    }));
  }),

  // Delete any email batch (admin only)
  adminDeleteBatch: adminProcedure
    .input(z.object({ batchId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const batch = await getEmailBatchById(input.batchId);
      if (!batch) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
      }
      
      await deleteEmailBatch(input.batchId);
      
      // Log action
      await logAction({
        userId: ctx.user.id,
        action: "admin_delete_email_batch",
        details: `Deleted email batch #${input.batchId} (${batch.name}) from user #${batch.userId}`,
        ipAddress: ctx.req.ip || ctx.req.headers["x-forwarded-for"]?.toString() || "unknown",
        userAgent: ctx.req.headers["user-agent"] || "unknown",
      });
      
      return { success: true };
    }),

  // Get incomplete batches for resume
  getIncompleteBatches: protectedProcedure.query(async ({ ctx }) => {
    return await getIncompleteEmailBatches(ctx.user.id);
  }),

  // Resume an incomplete batch
  resumeBatch: protectedProcedure
    .input(z.object({
      batchId: z.number(),
      emails: z.array(z.string()).optional(), // Now optional - will use saved originalEmails if not provided
    }))
    .mutation(async ({ ctx, input }) => {
      const hasPermission = await userHasPermission(ctx.user.id, "email.batch");
      if (!hasPermission) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No permission for batch email check" });
      }

      const apiKey = process.env.MILLIONVERIFIER_API_KEY;
      if (!apiKey) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "API key not configured" });
      }

      const batch = await getEmailBatchById(input.batchId);
      if (!batch) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
      }
      if (batch.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      if (batch.status === "completed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Batch already completed" });
      }

      // Get already processed emails
      const processedEmails = await getProcessedEmailsForBatch(input.batchId);
      const processedSet = new Set(processedEmails.map(e => e.toLowerCase()));

      // Use provided emails or saved originalEmails
      const emailsToUse = input.emails && input.emails.length > 0 
        ? input.emails 
        : (batch.originalEmails || []);
      
      if (emailsToUse.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No emails to process. Please provide email list." });
      }

      // Filter out already processed emails - more permissive regex
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i;
      const remainingEmails = emailsToUse
        .map(e => e.trim().toLowerCase())
        .filter(e => e.length > 0 && emailRegex.test(e))
        .filter(e => !processedSet.has(e));

      if (remainingEmails.length === 0) {
        await completeEmailBatch(input.batchId);
        return {
          batchId: input.batchId,
          totalEmails: batch.totalEmails,
          processed: batch.processedEmails,
          valid: batch.validEmails,
          invalid: batch.invalidEmails,
          risky: batch.riskyEmails,
          unknown: batch.unknownEmails,
          resumed: 0,
        };
      }

      // Check email limits
      const limitsCheck = await checkUserLimits(ctx.user.id, remainingEmails.length, 'email');
      if (!limitsCheck.allowed) {
        throw new TRPCError({ code: "FORBIDDEN", message: limitsCheck.reason || "Email limit exceeded" });
      }

      // Log resume start
      await logAction({
        userId: ctx.user.id,
        action: "email_batch_resume",
        details: `Resuming batch: ${batch.name}, Remaining: ${remainingEmails.length}`,
        ipAddress: ctx.req.ip || ctx.req.headers["x-forwarded-for"]?.toString() || "unknown",
        userAgent: ctx.req.headers["user-agent"] || "unknown",
      });

      // Check cache for existing results
      const cacheMap = await getEmailsFromCacheBulk(remainingEmails);

      // Process remaining emails
      let processed = batch.processedEmails || 0;
      let valid = batch.validEmails || 0;
      let invalid = batch.invalidEmails || 0;
      let risky = batch.riskyEmails || 0;
      let unknown = batch.unknownEmails || 0;

      for (const email of remainingEmails) {
        const cached = cacheMap.get(email);
        if (cached) {
          await saveEmailResult({
            batchId: input.batchId,
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
              batchId: input.batchId,
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
              batchId: input.batchId,
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

          await new Promise(resolve => setTimeout(resolve, 100));
        }

        processed++;
        await updateEmailBatchProgress(input.batchId, processed, valid, invalid, risky, unknown);
        
        // Broadcast progress via WebSocket
        broadcastBatchProgress(input.batchId, {
          processed,
          total: remainingEmails.length,
          valid,
          invalid,
          status: "processing",
          currentItem: email,
        });
      }

      // Broadcast completion via WebSocket
      broadcastBatchProgress(input.batchId, {
        processed: remainingEmails.length,
        total: remainingEmails.length,
        valid,
        invalid,
        status: "completed",
      });

      await completeEmailBatch(input.batchId);

      // Increment email checks counter
      const apiCallCount = remainingEmails.length - Array.from(cacheMap.keys()).length;
      if (apiCallCount > 0) {
        await incrementUserChecks(ctx.user.id, apiCallCount, 'email');
      }

      await logAction({
        userId: ctx.user.id,
        action: "email_batch_resume_complete",
        details: `Resumed batch: ${batch.name}, Processed: ${remainingEmails.length}`,
        ipAddress: ctx.req.ip || ctx.req.headers["x-forwarded-for"]?.toString() || "unknown",
        userAgent: ctx.req.headers["user-agent"] || "unknown",
      });

      return {
        batchId: input.batchId,
        totalEmails: batch.totalEmails,
        processed,
        valid,
        invalid,
        risky,
        unknown,
        resumed: remainingEmails.length,
      };
    }),
});

export const appRouter = router({
  system: systemRouter,
  admin: adminRouter,
  exportTemplates: exportTemplatesRouter,
  email: emailRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    
    // Login with username/password
    login: publicProcedure
      .input(z.object({
        username: z.string(),
        password: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await login(input.username, input.password, ctx.req);
        
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
        ctx.res.cookie(COOKIE_NAME, result.token, { ...cookieOptions, maxAge: TWELVE_HOURS_MS });

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
        const result = await login(input.username, input.password, ctx.req);
        if (result && 'token' in result) {
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, result.token, { ...cookieOptions, maxAge: TWELVE_HOURS_MS });
        }

        return { userId, success: true };
      }),

    // Submit access request (public)
    submitAccessRequest: publicProcedure
      .input(z.object({
        name: z.string().min(2).max(128),
        telegram: z.string().max(128).optional(),
      }))
      .mutation(async ({ input }) => {
        const requestId = await createAccessRequest({
          name: input.name,
          telegram: input.telegram,
        });
        
        // Send Telegram notification to admin
        await notifyNewAccessRequest(input.name, input.telegram || null);
        
        return { success: true, requestId };
      }),

    // Get all sessions for current user
    getSessions: protectedProcedure.query(async ({ ctx }) => {
      const sessions = await getSessionsByUserId(ctx.user.id);
      
      // Get current session token from cookie
      const currentToken = ctx.req.cookies?.[COOKIE_NAME];
      const currentSession = currentToken ? await getSessionByToken(currentToken) : null;
      
      return sessions.map(s => ({
        id: s.id,
        deviceInfo: s.deviceInfo,
        browser: s.browser,
        os: s.os,
        ipAddress: s.ipAddress,
        location: s.location,
        lastActivity: s.lastActivity,
        createdAt: s.createdAt,
        isCurrent: currentSession?.id === s.id,
        isExpired: new Date(s.expiresAt) < new Date(),
      }));
    }),

    // Terminate a specific session
    terminateSession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const sessions = await getSessionsByUserId(ctx.user.id);
        const session = sessions.find(s => s.id === input.sessionId);
        
        if (!session) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
        }
        
        await deleteSession(input.sessionId);
        
        await logAction({
          userId: ctx.user.id,
          action: "terminate_session",
          details: `Terminated session ${input.sessionId}`,
          ipAddress: ctx.req.ip || ctx.req.headers["x-forwarded-for"]?.toString(),
          userAgent: ctx.req.headers["user-agent"],
        });
        
        return { success: true };
      }),

    // Terminate all sessions except current
    terminateAllSessions: protectedProcedure.mutation(async ({ ctx }) => {
      const currentToken = ctx.req.cookies?.[COOKIE_NAME];
      const currentSession = currentToken ? await getSessionByToken(currentToken) : null;
      
      const count = await deleteAllUserSessions(ctx.user.id, currentSession?.id);
      
      await logAction({
        userId: ctx.user.id,
        action: "terminate_all_sessions",
        details: `Terminated ${count} sessions`,
        ipAddress: ctx.req.ip || ctx.req.headers["x-forwarded-for"]?.toString(),
        userAgent: ctx.req.headers["user-agent"],
      });
      
      return { success: true, terminatedCount: count };
    }),

    // Get login history for current user
    getLoginHistory: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(500).default(50),
        actionFilter: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const authActions = ["login", "logout", "login_failed", "password_change", "terminate_session", "terminate_all_sessions"];
        
        const logs = await getActionLogs({
          userId: ctx.user.id,
          actions: input.actionFilter ? [input.actionFilter] : authActions,
          limit: input.limit,
        });
        
        const total = await countActionLogs({
          userId: ctx.user.id,
          actions: input.actionFilter ? [input.actionFilter] : authActions,
        });
        
        return { logs, total };
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
        // Check permission
        const hasPermission = await userHasPermission(ctx.user.id, 'hlr.single');
        if (!hasPermission) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to perform HLR checks" });
        }
        
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

        // GSM codes 1, 5, 9, 12 indicate invalid numbers (Bad Number, Blocked)
        const invalidGsmCodes = ["1", "5", "9", "12"];
        const gsmCode = hlrResponse.gsm_code?.toString();
        const isInvalidByGsm = gsmCode && invalidGsmCodes.includes(gsmCode);
        const finalValidNumber = isInvalidByGsm ? "invalid" : hlrResponse.valid_number;
        const isValid = finalValidNumber === "valid";

        // Calculate health score
        const mockResult = {
          validNumber: finalValidNumber,
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

    // Analyze batch before checking (normalization, validation, duplicates)
    analyzeBatchNumbers: protectedProcedure
      .input(z.object({
        phoneNumbers: z.array(z.string()).min(1),
      }))
      .mutation(async ({ input }) => {
        const analysis = analyzeBatch(input.phoneNumbers);
        return analysis;
      }),

    // Start batch HLR check
    startBatch: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        phoneNumbers: z.array(z.string()).min(1),
        removeDuplicates: z.boolean().default(true),
        skipInvalid: z.boolean().default(true), // Skip invalid format numbers
      }))
      .mutation(async ({ ctx, input }) => {
        // Check permission
        const hasPermission = await userHasPermission(ctx.user.id, 'hlr.batch');
        if (!hasPermission) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to perform batch HLR checks" });
        }
        
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
        
        // Check if server is shutting down
        if (isShutdownInProgress()) {
          throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Server is shutting down. Please try again later." });
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
          originalNumbers: numbersToCheck, // Save for auto-resume
        });
        
        // Register batch for graceful shutdown tracking
        registerActiveBatch(batchId, numbersToCheck.length);

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
          // Check for graceful shutdown - stop processing but keep batch resumable
          if (isShutdownInProgress()) {
            console.log(`[Batch ${batchId}] Shutdown detected, stopping at ${processedCount}/${numbersToCheck.length}`);
            await updateHlrBatch(batchId, {
              processedNumbers: processedCount,
              validNumbers: validCount,
              invalidNumbers: invalidCount,
              // Keep status as "processing" so it can be resumed
            });
            unregisterBatch(batchId);
            return {
              batchId,
              totalProcessed: processedCount,
              fromCache: cachedUsed,
              apiCalls: i,
              interrupted: true,
              message: "Batch interrupted due to server shutdown. You can resume it later.",
            };
          }
          
          const phone = numbersToActuallyCheck[i];
          if (!phone) continue;

          // Add delay between API calls to prevent rate limiting
          if (i > 0) {
            await sleep(150); // 150ms delay between calls
          }

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
            // GSM codes 1, 5, 9, 12 indicate invalid numbers (Bad Number, Blocked)
            const invalidGsmCodes = ["1", "5", "9", "12"];
            const gsmCode = hlrResponse.gsm_code?.toString();
            const isInvalidByGsm = gsmCode && invalidGsmCodes.includes(gsmCode);
            
            // Override validNumber based on GSM code
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

          // CRITICAL: Save result IMMEDIATELY after each check
          await createHlrResult(resultData);

          // Update progress every 10 numbers or at the end
          if (processedCount % 10 === 0 || i === numbersToActuallyCheck.length - 1) {
            await updateHlrBatch(batchId, {
              processedNumbers: processedCount,
              validNumbers: validCount,
              invalidNumbers: invalidCount,
            });
            // Update graceful shutdown tracker
            updateBatchProgress(batchId, processedCount);
            
            // Broadcast progress via WebSocket
            broadcastBatchProgress(batchId, {
              processed: processedCount,
              total: numbersToCheck.length,
              valid: validCount,
              invalid: invalidCount,
              status: "processing",
              currentItem: numbersToActuallyCheck[i],
            });
          }
        }

        // Broadcast completion via WebSocket
        broadcastBatchProgress(batchId, {
          processed: numbersToCheck.length,
          total: numbersToCheck.length,
          valid: validCount,
          invalid: invalidCount,
          status: "completed",
        });

        // Mark batch as completed
        await updateHlrBatch(batchId, {
          status: "completed",
          processedNumbers: numbersToCheck.length,
          validNumbers: validCount,
          invalidNumbers: invalidCount,
          completedAt: new Date(),
        });
        
        // Unregister from graceful shutdown tracker
        unregisterBatch(batchId);
        
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
        if (!batch) {
          return null;
        }
        // Allow access if user owns the batch or is admin
        if (batch.userId !== ctx.user.id && ctx.user.role !== "admin") {
          return null;
        }
        
        // Get batch owner info for admin viewing other users' batches
        let batchOwner = null;
        if (ctx.user.role === "admin" && batch.userId !== ctx.user.id) {
          const owner = await getUserById(batch.userId);
          if (owner) {
            batchOwner = { id: owner.id, name: owner.name, username: owner.username };
          }
        }
        
        return { ...batch, batchOwner };
      }),

    // Get all batches for current user
    listBatches: protectedProcedure.query(async ({ ctx }) => {
      // Check permission
      const hasPermission = await userHasPermission(ctx.user.id, 'hlr.history');
      if (!hasPermission) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to view check history" });
      }
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
        // Admin can view any batch, regular users can only view their own
        const isAdmin = ctx.user.role === 'admin';
        if (!batch || (!isAdmin && batch.userId !== ctx.user.id)) {
          return { results: [], total: 0, pages: 0 };
        }
        const paginatedResults = await getHlrResultsByBatchIdPaginated(input.batchId, input.page, input.pageSize);
        
        // Add health scores and status classification to results
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

    // Export results to XLSX format
    exportXlsx: protectedProcedure
      .input(z.object({ 
        batchId: z.number(),
        fields: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check permission
        const hasExportPermission = await userHasPermission(ctx.user.id, 'hlr.export');
        if (!hasExportPermission) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to export results" });
        }
        
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
            needsPhoneNumbers: false,
          };
        }
        
        // If phone numbers provided, process remaining ones
        if (input.phoneNumbers && input.phoneNumbers.length > 0) {
          // Filter out already checked numbers
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

            // Add delay between API calls to prevent rate limiting
            if (i > 0) {
              await sleep(150);
            }

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
              const invalidGsmCodes = ["1", "5", "9", "12"];
              const gsmCode = hlrResponse.gsm_code?.toString();
              const isInvalidByGsm = gsmCode && invalidGsmCodes.includes(gsmCode);
              const finalValidNumber = isInvalidByGsm ? "invalid" : hlrResponse.valid_number;
              const isValid = finalValidNumber === "valid";
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
            alreadyChecked: alreadyChecked,
            newlyChecked: numbersToCheck.length,
            totalProcessed: processedCount,
            needsPhoneNumbers: false,
          };
        }
        
        // No phone numbers provided - try to use saved originalNumbers
        if (batch.originalNumbers && batch.originalNumbers.length > 0) {
          // Filter out already checked numbers
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
          
          // Check limits for remaining numbers
          const limitsCheck = await checkUserLimits(ctx.user.id, numbersToCheck.length);
          if (!limitsCheck.allowed) {
            throw new TRPCError({ code: "FORBIDDEN", message: limitsCheck.reason || "Limit exceeded" });
          }
          
          // Process remaining numbers using saved originalNumbers
          let validCount = batch.validNumbers || 0;
          let invalidCount = batch.invalidNumbers || 0;
          let processedCount = batch.processedNumbers || 0;
          
          for (let i = 0; i < numbersToCheck.length; i++) {
            const phone = numbersToCheck[i];
            if (!phone) continue;

            // Add delay between API calls to prevent rate limiting
            if (i > 0) {
              await sleep(150);
            }

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
              const invalidGsmCodes = ["1", "5", "9", "12"];
              const gsmCode = hlrResponse.gsm_code?.toString();
              const isInvalidByGsm = gsmCode && invalidGsmCodes.includes(gsmCode);
              const finalValidNumber = isInvalidByGsm ? "invalid" : hlrResponse.valid_number;
              const isValid = finalValidNumber === "valid";
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

            // Update progress every 10 numbers
            if (processedCount % 10 === 0 || i === numbersToCheck.length - 1) {
              await updateHlrBatch(input.batchId, {
                processedNumbers: processedCount,
                validNumbers: validCount,
                invalidNumbers: invalidCount,
              });
              
              // Broadcast progress via WebSocket
              broadcastBatchProgress(input.batchId, {
                processed: processedCount,
                total: batch.totalNumbers || numbersToCheck.length,
                valid: validCount,
                invalid: invalidCount,
                status: "processing",
                currentItem: phone,
              });
            }
          }

          // Broadcast completion
          broadcastBatchProgress(input.batchId, {
            processed: processedCount,
            total: batch.totalNumbers || numbersToCheck.length,
            valid: validCount,
            invalid: invalidCount,
            status: "completed",
          });

          // Mark batch as completed
          await updateHlrBatch(input.batchId, {
            status: "completed",
            processedNumbers: processedCount,
            validNumbers: validCount,
            invalidNumbers: invalidCount,
            completedAt: new Date(),
          });
          
          await incrementUserChecks(ctx.user.id, numbersToCheck.length);
          await logAction({ userId: ctx.user.id, action: "auto_resume_batch", details: `Auto-resumed batch ${input.batchId} using saved numbers, checked ${numbersToCheck.length} remaining numbers` });

          return { 
            batchId: input.batchId, 
            resumed: true,
            alreadyChecked: alreadyChecked,
            newlyChecked: numbersToCheck.length,
            totalProcessed: processedCount,
            needsPhoneNumbers: false,
            autoResumed: true,
          };
        }
        
        // No saved originalNumbers - return info about what's needed
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

          // Add delay between API calls to prevent rate limiting
          if (i > 0) {
            await sleep(150);
          }

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
            // GSM codes 1, 5, 9, 12 indicate invalid numbers (Bad Number, Blocked)
            const invalidGsmCodes = ["1", "5", "9", "12"];
            const gsmCode = hlrResponse.gsm_code?.toString();
            const isInvalidByGsm = gsmCode && invalidGsmCodes.includes(gsmCode);
            const finalValidNumber = isInvalidByGsm ? "invalid" : hlrResponse.valid_number;
            const isValid = finalValidNumber === "valid";
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
        // Check permission
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
        checksThisWeek: userLimits?.checksThisWeek || 0,
        checksThisMonth: stats.monthChecks,
        limits: {
          dailyLimit: userLimits?.dailyLimit || null,
          weeklyLimit: userLimits?.weeklyLimit || null,
          monthlyLimit: userLimits?.monthlyLimit || null,
          batchLimit: userLimits?.batchLimit || null,
        }
      };
    }),

    // Check API balance (admin only)
    getBalance: protectedProcedure.query(async ({ ctx }) => {
      // Only admins can see the balance
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
