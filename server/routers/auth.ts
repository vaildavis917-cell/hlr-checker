import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME, TWELVE_HOURS_MS } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { login } from "../auth";
import {
  hasAnyAdmin,
  createUser,
  createAccessRequest,
  getSessionsByUserId,
  getSessionByToken,
  deleteSession,
  deleteAllUserSessions,
  logAction,
  getActionLogs,
  countActionLogs,
} from "../db";
import { notifyNewAccessRequest } from "../telegram";

export const authRouter = router({
  me: publicProcedure.query(opts => opts.ctx.user),

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

      if ('locked' in result && result.locked) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Account is locked. Try again in 15 minutes." });
      }

      if ('attemptsLeft' in result && !('user' in result)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: `Invalid password. ${result.attemptsLeft} attempts remaining.`,
        });
      }

      if (!('user' in result) || !('token' in result)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid username or password" });
      }

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
        },
      };
    }),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),

  needsSetup: publicProcedure.query(async () => {
    const hasAdmin = await hasAnyAdmin();
    return { needsSetup: !hasAdmin };
  }),

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

      const result = await login(input.username, input.password, ctx.req);
      if (result && 'token' in result) {
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, result.token, { ...cookieOptions, maxAge: TWELVE_HOURS_MS });
      }

      return { userId, success: true };
    }),

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

      await notifyNewAccessRequest(input.name, input.telegram || null);

      return { success: true, requestId };
    }),

  getSessions: protectedProcedure.query(async ({ ctx }) => {
    const sessions = await getSessionsByUserId(ctx.user.id);

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
});
