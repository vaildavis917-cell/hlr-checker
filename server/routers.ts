import { COOKIE_NAME } from "@shared/const";
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
  createInviteCode,
  getAllInviteCodes,
  deleteInviteCode,
} from "./db";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
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

  // Create invite code
  createInvite: adminProcedure
    .input(z.object({ email: z.string().email().optional() }))
    .mutation(async ({ ctx, input }) => {
      const code = nanoid(16);
      await createInviteCode({
        code,
        email: input.email,
        createdBy: ctx.user.id,
      });
      return { code };
    }),

  // List all invite codes
  listInvites: adminProcedure.query(async () => {
    return await getAllInviteCodes();
  }),

  // Delete invite code
  deleteInvite: adminProcedure
    .input(z.object({ inviteId: z.number() }))
    .mutation(async ({ input }) => {
      await deleteInviteCode(input.inviteId);
      return { success: true };
    }),
});

export const appRouter = router({
  system: systemRouter,
  admin: adminRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  hlr: router({
    // Start a new HLR batch check
    startBatch: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        phoneNumbers: z.array(z.string()).min(1).max(1000),
      }))
      .mutation(async ({ ctx, input }) => {
        const { name, phoneNumbers } = input;
        
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

    // Get results for a specific batch
    getResults: protectedProcedure
      .input(z.object({ batchId: z.number() }))
      .query(async ({ ctx, input }) => {
        const batch = await getHlrBatchById(input.batchId);
        if (!batch || batch.userId !== ctx.user.id) {
          return [];
        }
        return await getHlrResultsByBatchId(input.batchId);
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

    // Check API balance
    getBalance: publicProcedure.query(async () => {
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
