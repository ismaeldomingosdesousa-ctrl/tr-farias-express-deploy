import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { listFinancialTransactions, getFinancialTransactionById, createFinancialTransaction, updateFinancialTransaction } from "../db";

export const financialRouter = router({
  list: protectedProcedure.input(z.object({
    type: z.string().optional(),
    status: z.string().optional(),
  }).optional()).query(async ({ input }) => listFinancialTransactions(input)),

  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => getFinancialTransactionById(input.id)),

  create: protectedProcedure.input(z.object({
    type: z.enum(["receivable", "payable"]),
    category: z.string().min(1),
    description: z.string().optional(),
    orderId: z.number().optional(),
    clientId: z.number().optional(),
    driverId: z.number().optional(),
    amount: z.number().positive(),
    dueDate: z.date(),
    paymentMethod: z.string().optional(),
    invoiceNumber: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    const id = await createFinancialTransaction(input);
    return { id };
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    status: z.enum(["pending", "paid", "overdue", "cancelled"]).optional(),
    paidDate: z.date().optional(),
    paymentMethod: z.string().optional(),
    stripePaymentId: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await updateFinancialTransaction(id, data);
    return { success: true };
  }),

  markPaid: protectedProcedure.input(z.object({
    id: z.number(),
    paymentMethod: z.string().optional(),
  })).mutation(async ({ input }) => {
    await updateFinancialTransaction(input.id, {
      status: "paid",
      paidDate: new Date(),
      paymentMethod: input.paymentMethod,
    });
    return { success: true };
  }),
});
