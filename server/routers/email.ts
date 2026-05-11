import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { adminProcedure } from "./admin";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as XLSX from "xlsx";
import { processRemainingEmails } from "../batch";
import {
  createEmailBatch,
  completeEmailBatch,
  getEmailBatchesByUser,
  getEmailBatchById,
  deleteEmailBatch,
  getEmailResultsByBatch,
  getEmailFromCache,
  saveEmailToCache,
  getAllEmailBatches,
  getEmailBatchCountByUser,
  getIncompleteEmailBatches,
  getProcessedEmailsForBatch,
  getAllUsers,
  getUserById,
  checkUserLimits,
  incrementUserChecks,
  userHasPermission,
  logAction,
} from "../db";
import {
  verifyEmail,
  getCredits,
  getResultStatus,
  RESULT_DESCRIPTIONS,
  SUBRESULT_DESCRIPTIONS,
} from "../millionverifier";

export const emailRouter = router({
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

  checkSingle: protectedProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const hasPermission = await userHasPermission(ctx.user.id, "email.single");
      if (!hasPermission) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No permission for email check" });
      }

      const apiKey = process.env.MILLIONVERIFIER_API_KEY;
      if (!apiKey) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "API key not configured" });
      }

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

      const limitsCheck = await checkUserLimits(ctx.user.id, 1, 'email');
      if (!limitsCheck.allowed) {
        throw new TRPCError({ code: "FORBIDDEN", message: limitsCheck.reason || "Email limit exceeded" });
      }

      const result = await verifyEmail(input.email, apiKey);
      await incrementUserChecks(ctx.user.id, 1, 'email');

      await logAction({
        userId: ctx.user.id,
        action: "email_single",
        details: `Email: ${input.email}, Result: ${result.result}`,
        ipAddress: ctx.req.ip || ctx.req.headers["x-forwarded-for"]?.toString() || "unknown",
        userAgent: ctx.req.headers["user-agent"] || "unknown",
      });

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

  startBatch: protectedProcedure
    .input(z.object({
      name: z.string().optional().default(""),
      emails: z.array(z.string()).min(1).max(10000),
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

      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i;
      const validEmails = input.emails
        .map(e => e.trim().toLowerCase())
        .filter(e => e.length > 0 && emailRegex.test(e));
      if (validEmails.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No valid emails provided" });
      }

      const limitsCheck = await checkUserLimits(ctx.user.id, validEmails.length, 'email');
      if (!limitsCheck.allowed) {
        throw new TRPCError({ code: "FORBIDDEN", message: limitsCheck.reason || "Email limit exceeded" });
      }

      let batchName = input.name?.trim() || "";
      if (!batchName) {
        const batchCount = await getEmailBatchCountByUser(ctx.user.id);
        batchName = `Проверка ${batchCount + 1}`;
      }

      const batchId = await createEmailBatch({
        userId: ctx.user.id,
        name: batchName,
        totalEmails: validEmails.length,
        originalEmails: validEmails,
      });

      await logAction({
        userId: ctx.user.id,
        action: "email_batch_start",
        details: `Batch: ${input.name}, Emails: ${validEmails.length}`,
        ipAddress: ctx.req.ip || ctx.req.headers["x-forwarded-for"]?.toString() || "unknown",
        userAgent: ctx.req.headers["user-agent"] || "unknown",
      });

      processRemainingEmails(
        batchId,
        validEmails,
        {
          totalEmails: validEmails.length,
          processedEmails: 0,
          validEmails: 0,
          invalidEmails: 0,
          riskyEmails: 0,
          unknownEmails: 0,
        },
        {
          debitUserId: ctx.user.id,
          completionAction: "email_batch_complete",
          completionDetails: `Batch: ${batchName}, ${validEmails.length} emails`,
        }
      ).catch(err => {
        console.error(`[EmailBatch] Background processing failed for batch #${batchId}:`, err);
      });

      return {
        batchId,
        totalEmails: validEmails.length,
        started: true,
      };
    }),

  listBatches: protectedProcedure.query(async ({ ctx }) => {
    const hasPermission = await userHasPermission(ctx.user.id, "email.history");
    if (!hasPermission) {
      throw new TRPCError({ code: "FORBIDDEN", message: "No permission to view email history" });
    }
    return await getEmailBatchesByUser(ctx.user.id);
  }),

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

      let batchOwner = null;
      if (ctx.user.role === "admin" && batch.userId !== ctx.user.id) {
        const owner = await getUserById(batch.userId);
        if (owner) {
          batchOwner = { id: owner.id, name: owner.name, username: owner.username };
        }
      }

      return { batch, results, batchOwner };
    }),

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

  getDescriptions: publicProcedure.query(() => ({
    results: RESULT_DESCRIPTIONS,
    subresults: SUBRESULT_DESCRIPTIONS,
  })),

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

  adminDeleteBatch: adminProcedure
    .input(z.object({ batchId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const batch = await getEmailBatchById(input.batchId);
      if (!batch) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
      }

      await deleteEmailBatch(input.batchId);

      await logAction({
        userId: ctx.user.id,
        action: "admin_delete_email_batch",
        details: `Deleted email batch #${input.batchId} (${batch.name}) from user #${batch.userId}`,
        ipAddress: ctx.req.ip || ctx.req.headers["x-forwarded-for"]?.toString() || "unknown",
        userAgent: ctx.req.headers["user-agent"] || "unknown",
      });

      return { success: true };
    }),

  getIncompleteBatches: protectedProcedure.query(async ({ ctx }) => {
    return await getIncompleteEmailBatches(ctx.user.id);
  }),

  resumeBatch: protectedProcedure
    .input(z.object({
      batchId: z.number(),
      emails: z.array(z.string()).optional(),
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

      const processedEmails = await getProcessedEmailsForBatch(input.batchId);
      const processedSet = new Set(processedEmails.map(e => e.toLowerCase()));

      const emailsToUse = input.emails && input.emails.length > 0
        ? input.emails
        : (batch.originalEmails || []);

      if (emailsToUse.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No emails to process. Please provide email list." });
      }

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

      const limitsCheck = await checkUserLimits(ctx.user.id, remainingEmails.length, 'email');
      if (!limitsCheck.allowed) {
        throw new TRPCError({ code: "FORBIDDEN", message: limitsCheck.reason || "Email limit exceeded" });
      }

      await logAction({
        userId: ctx.user.id,
        action: "email_batch_resume",
        details: `Resuming batch: ${batch.name}, Remaining: ${remainingEmails.length}`,
        ipAddress: ctx.req.ip || ctx.req.headers["x-forwarded-for"]?.toString() || "unknown",
        userAgent: ctx.req.headers["user-agent"] || "unknown",
      });

      processRemainingEmails(input.batchId, remainingEmails, batch, {
        debitUserId: ctx.user.id,
        completionAction: "email_batch_resume_complete",
        completionDetails: `Resumed batch: ${batch.name}, Processed: ${remainingEmails.length}`,
      }).catch(err => {
        console.error(`[EmailBatch] Background resume failed for batch #${input.batchId}:`, err);
      });

      return {
        batchId: input.batchId,
        totalEmails: batch.totalEmails,
        started: true,
        resumed: remainingEmails.length,
      };
    }),
});
