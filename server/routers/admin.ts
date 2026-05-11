import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { registerActiveBatch, unregisterBatch } from "../_core/index";
import { processRemainingNumbers } from "../batch";
import {
  getAllUsers,
  deleteUser,
  updateUserRole,
  createUser,
  getUserByUsername,
  toggleUserActive,
  updateUserPassword,
  logAction,
  getActionLogs,
  updateUserLimits,
  unlockUser,
  getBalanceAlert,
  upsertBalanceAlert,
  getStatistics,
  getHlrResultsByBatchIdPaginated,
  calculateHealthScore,
  classifyQualityByHealthScore,
  getAllBatches,
  getHlrBatchById,
  updateHlrBatch,
  deleteHlrBatch,
  getCheckedPhoneNumbersInBatch,
  getAllIncompleteBatches,
  getSessionsByUserId,
  deleteSession,
  deleteAllUserSessions,
  getRolePermissions,
  getAllRolePermissions,
  setRolePermissions,
  getUserEffectivePermissions,
  setUserCustomPermissions,
  getAllAccessRequests,
  getAccessRequestById,
  getPendingAccessRequestsCount,
  approveAccessRequest,
  rejectAccessRequest,
  deleteAccessRequest,
  getSetting,
  setSetting,
  createCustomRole,
  getAllCustomRoles,
  getCustomRoleById,
  getCustomRoleByName,
  updateCustomRole,
  deleteCustomRole,
  initializeSystemRoles,
} from "../db";
import { testTelegramConnection } from "../telegram";
import { PERMISSIONS, PERMISSION_DESCRIPTIONS, DEFAULT_PERMISSIONS, Permission } from "../../drizzle/schema";

// Admin-only procedure (admin and manager roles)
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const adminRouter = router({
  listUsers: adminProcedure.query(async () => {
    return await getAllUsers();
  }),

  createUser: adminProcedure
    .input(z.object({
      username: z.string().min(3).max(64),
      password: z.string().min(6).max(128),
      name: z.string().optional(),
      email: z.string().email().optional(),
      role: z.enum(["user", "admin", "manager", "viewer"]).default("user"),
    }))
    .mutation(async ({ input }) => {
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

  deleteUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete yourself" });
      }
      await deleteUser(input.userId);
      return { success: true };
    }),

  updateUserRole: adminProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin", "manager", "viewer"]) }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id && input.role !== "admin") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot demote yourself" });
      }
      await updateUserRole(input.userId, input.role);
      return { success: true };
    }),

  toggleUserActive: adminProcedure
    .input(z.object({ userId: z.number(), isActive: z.enum(["yes", "no"]) }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot deactivate yourself" });
      }
      await toggleUserActive(input.userId, input.isActive);
      return { success: true };
    }),

  resetUserPassword: adminProcedure
    .input(z.object({ userId: z.number(), newPassword: z.string().min(6).max(128) }))
    .mutation(async ({ ctx, input }) => {
      await updateUserPassword(input.userId, input.newPassword);
      await logAction({ userId: ctx.user.id, action: "reset_password", details: `Reset password for user ${input.userId}` });
      return { success: true };
    }),

  unlockUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await unlockUser(input.userId);
      await logAction({ userId: ctx.user.id, action: "unlock_user", details: `Unlocked user ${input.userId}` });
      return { success: true };
    }),

  updateUserLimits: adminProcedure
    .input(z.object({
      userId: z.number(),
      hlrDailyLimit: z.number().nullable().optional(),
      hlrWeeklyLimit: z.number().nullable().optional(),
      hlrMonthlyLimit: z.number().nullable().optional(),
      hlrBatchLimit: z.number().nullable().optional(),
      emailDailyLimit: z.number().nullable().optional(),
      emailWeeklyLimit: z.number().nullable().optional(),
      emailMonthlyLimit: z.number().nullable().optional(),
      emailBatchLimit: z.number().nullable().optional(),
      dailyLimit: z.number().nullable().optional(),
      monthlyLimit: z.number().nullable().optional(),
      weeklyLimit: z.number().nullable().optional(),
      batchLimit: z.number().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const limits: any = {};

      if (input.hlrDailyLimit !== undefined) limits.hlrDailyLimit = input.hlrDailyLimit;
      if (input.hlrWeeklyLimit !== undefined) limits.hlrWeeklyLimit = input.hlrWeeklyLimit;
      if (input.hlrMonthlyLimit !== undefined) limits.hlrMonthlyLimit = input.hlrMonthlyLimit;
      if (input.hlrBatchLimit !== undefined) limits.hlrBatchLimit = input.hlrBatchLimit;

      if (input.emailDailyLimit !== undefined) limits.emailDailyLimit = input.emailDailyLimit;
      if (input.emailWeeklyLimit !== undefined) limits.emailWeeklyLimit = input.emailWeeklyLimit;
      if (input.emailMonthlyLimit !== undefined) limits.emailMonthlyLimit = input.emailMonthlyLimit;
      if (input.emailBatchLimit !== undefined) limits.emailBatchLimit = input.emailBatchLimit;

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

  getActionLogs: adminProcedure
    .input(z.object({ userId: z.number().optional(), limit: z.number().default(100) }))
    .query(async ({ input }) => {
      return await getActionLogs({ userId: input.userId, limit: input.limit });
    }),

  getStatistics: adminProcedure.query(async () => {
    return await getStatistics();
  }),

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

  getBalanceAlert: adminProcedure.query(async () => {
    return await getBalanceAlert();
  }),

  updateBalanceAlert: adminProcedure
    .input(z.object({ threshold: z.number().min(1), isEnabled: z.enum(["yes", "no"]) }))
    .mutation(async ({ input }) => {
      await upsertBalanceAlert(input.threshold, input.isEnabled);
      return { success: true };
    }),

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
        details: `Deleted batch #${input.batchId} (${batch.totalNumbers} numbers) from user #${batch.userId}`,
      });
      return { success: true };
    }),

  pauseBatch: adminProcedure
    .input(z.object({ batchId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const batch = await getHlrBatchById(input.batchId);
      if (!batch) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
      }
      if (batch.status !== "processing") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Batch is not in processing state" });
      }
      await updateHlrBatch(input.batchId, {
        status: "paused",
      });
      unregisterBatch(input.batchId);
      await logAction({
        userId: ctx.user.id,
        action: "admin_pause_batch",
        details: `Admin paused batch #${input.batchId} (user #${batch.userId}), processed: ${batch.processedNumbers}/${batch.totalNumbers}`,
      });
      return { success: true, batchId: input.batchId };
    }),

  resumeBatch: adminProcedure
    .input(z.object({ batchId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const batch = await getHlrBatchById(input.batchId);
      if (!batch) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
      }
      if (batch.status !== "processing" && batch.status !== "paused") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Batch cannot be resumed (status: " + batch.status + ")" });
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
          alreadyChecked,
          remaining: 0,
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
            alreadyChecked,
            remaining: 0,
            needsPhoneNumbers: false,
          };
        }

        await updateHlrBatch(input.batchId, { status: "processing" });
        registerActiveBatch(input.batchId, totalNumbers);

        processRemainingNumbers(input.batchId, numbersToCheck, batch).catch(err => {
          console.error(`[AdminResume] Error processing batch #${input.batchId}:`, err);
        });

        await logAction({
          userId: ctx.user.id,
          action: "admin_resume_batch",
          details: `Admin resumed batch #${input.batchId} (user #${batch.userId}), remaining: ${numbersToCheck.length}`,
        });

        return {
          batchId: input.batchId,
          resumed: true,
          alreadyChecked,
          remaining: numbersToCheck.length,
          needsPhoneNumbers: false,
        };
      }

      return {
        batchId: input.batchId,
        resumed: false,
        alreadyChecked,
        remaining,
        needsPhoneNumbers: true,
        message: `Batch has ${remaining} unchecked numbers but no saved original numbers list.`,
      };
    }),

  getAllIncompleteBatches: adminProcedure.query(async () => {
    return await getAllIncompleteBatches();
  }),

  getAvailablePermissions: adminProcedure.query(() => {
    return {
      permissions: PERMISSIONS,
      descriptions: PERMISSION_DESCRIPTIONS,
      defaults: DEFAULT_PERMISSIONS,
    };
  }),

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

  getRolePermissions: adminProcedure
    .input(z.object({ role: z.string() }))
    .query(async ({ input }) => {
      const permissions = await getRolePermissions(input.role);
      return { role: input.role, permissions };
    }),

  setRolePermissions: adminProcedure
    .input(z.object({
      role: z.string(),
      permissions: z.array(z.string()),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
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

  resetRolePermissions: adminProcedure
    .input(z.object({ role: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { deleteRolePermissions } = await import("../db");
      await deleteRolePermissions(input.role);
      await logAction({
        userId: ctx.user.id,
        action: "reset_role_permissions",
        details: `Reset permissions for role '${input.role}' to defaults`,
      });
      return { success: true, defaults: DEFAULT_PERMISSIONS[input.role] || [] };
    }),

  getUserPermissions: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const permissions = await getUserEffectivePermissions(input.userId);
      return { userId: input.userId, permissions };
    }),

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

      const existingUser = await getUserByUsername(input.username);
      if (existingUser) {
        throw new TRPCError({ code: "CONFLICT", message: "Username already exists" });
      }

      const userId = await createUser({
        username: input.username,
        password: input.password,
        name: request.name,
        email: request.email || undefined,
        role: input.role,
      });

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

  getTelegramSettings: adminProcedure.query(async () => {
    const botToken = await getSetting("telegram_bot_token");
    const chatId = await getSetting("telegram_chat_id");
    return {
      botToken: botToken ? "***" + botToken.slice(-4) : null,
      chatId,
      isConfigured: !!(botToken && chatId),
    };
  }),

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

  testTelegramConnection: adminProcedure
    .input(z.object({
      botToken: z.string().min(1),
      chatId: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const result = await testTelegramConnection(input.botToken, input.chatId);
      return result;
    }),

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

  listRoles: adminProcedure.query(async () => {
    await initializeSystemRoles();
    const roles = await getAllCustomRoles();
    return roles.map(role => ({
      ...role,
      permissions: JSON.parse(role.permissions) as string[],
    }));
  }),

  createRole: adminProcedure
    .input(z.object({
      name: z.string().min(2).max(64),
      description: z.string().max(256).optional(),
      permissions: z.array(z.string()),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
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
