import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { listFiscalDocuments, getFiscalDocById, createFiscalDocument, updateFiscalDocument } from "../db";
import { nanoid } from "nanoid";

export const fiscalRouter = router({
  list: protectedProcedure.input(z.object({ type: z.string().optional() }).optional()).query(async ({ input }) => listFiscalDocuments(input?.type)),
  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => getFiscalDocById(input.id)),
  create: protectedProcedure.input(z.object({
    type: z.enum(["cte", "mdfe", "nfe"]),
    orderId: z.number().optional(),
    routeId: z.number().optional(),
    clientId: z.number().optional(),
    totalValue: z.number().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    const number = `${input.type.toUpperCase()}-${nanoid(10).toUpperCase()}`;
    const accessKey = nanoid(44);
    const id = await createFiscalDocument({
      ...input,
      number,
      series: "001",
      accessKey,
      issueDate: new Date(),
      status: "draft",
    });
    return { id, number, accessKey };
  }),
  update: protectedProcedure.input(z.object({
    id: z.number(),
    status: z.enum(["draft", "authorized", "cancelled", "rejected", "corrected"]).optional(),
    sefazProtocol: z.string().optional(),
    xmlUrl: z.string().optional(),
    pdfUrl: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await updateFiscalDocument(id, data);
    return { success: true };
  }),
  authorize: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const doc = await getFiscalDocById(input.id);
    if (!doc) throw new Error("Documento não encontrado");
    if (doc.status !== "draft") throw new Error("Apenas documentos em rascunho podem ser autorizados");
    const protocol = `SEFAZ-${Date.now()}-${nanoid(6)}`;
    await updateFiscalDocument(input.id, { status: "authorized", sefazProtocol: protocol });
    return { success: true, protocol };
  }),
  cancel: protectedProcedure.input(z.object({ id: z.number(), notes: z.string().optional() })).mutation(async ({ input }) => {
    const doc = await getFiscalDocById(input.id);
    if (!doc) throw new Error("Documento não encontrado");
    if (doc.status === "cancelled") throw new Error("Documento já cancelado");
    await updateFiscalDocument(input.id, { status: "cancelled", notes: input.notes });
    return { success: true };
  }),
});
