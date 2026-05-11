import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createExportTemplate,
  getExportTemplatesByUserId,
  getExportTemplateById,
  updateExportTemplate,
  deleteExportTemplate,
  getDefaultExportTemplate,
} from "../db";
import { EXPORT_FIELDS } from "./hlr";

export const exportTemplatesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await getExportTemplatesByUserId(ctx.user.id);
  }),

  getAvailableFields: protectedProcedure.query(() => {
    return EXPORT_FIELDS;
  }),

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

  getDefault: protectedProcedure.query(async ({ ctx }) => {
    return await getDefaultExportTemplate(ctx.user.id);
  }),
});
