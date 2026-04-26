import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { orders, financialTransactions, drivers, vehicles } from "../../drizzle/schema";
import { sql, gte, lte, and, eq } from "drizzle-orm";

export const reportsRouter = router({
  orders: protectedProcedure.input(z.object({
    dateFrom: z.date().optional(),
    dateTo: z.date().optional(),
    status: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return { items: [], summary: { total: 0, delivered: 0, inTransit: 0, revenue: 0 } };

    const conditions = [];
    if (input?.dateFrom) conditions.push(gte(orders.createdAt, input.dateFrom));
    if (input?.dateTo) conditions.push(lte(orders.createdAt, input.dateTo));
    if (input?.status) conditions.push(eq(orders.status, input.status as any));

    const items = conditions.length > 0
      ? await db.select().from(orders).where(and(...conditions)).orderBy(orders.createdAt)
      : await db.select().from(orders).orderBy(orders.createdAt);

    const total = items.length;
    const delivered = items.filter(o => o.status === "delivered").length;
    const inTransit = items.filter(o => o.status === "in_transit").length;
    const revenue = items.reduce((s, o) => s + (o.freightValue || 0), 0);

    return { items, summary: { total, delivered, inTransit, revenue } };
  }),

  financial: protectedProcedure.input(z.object({
    dateFrom: z.date().optional(),
    dateTo: z.date().optional(),
    type: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return { items: [], summary: { totalReceivable: 0, totalPayable: 0, overdue: 0 } };

    const conditions = [];
    if (input?.dateFrom) conditions.push(gte(financialTransactions.dueDate, input.dateFrom));
    if (input?.dateTo) conditions.push(lte(financialTransactions.dueDate, input.dateTo));
    if (input?.type) conditions.push(eq(financialTransactions.type, input.type as any));

    const items = conditions.length > 0
      ? await db.select().from(financialTransactions).where(and(...conditions)).orderBy(financialTransactions.dueDate)
      : await db.select().from(financialTransactions).orderBy(financialTransactions.dueDate);

    const totalReceivable = items.filter(t => t.type === "receivable").reduce((s, t) => s + t.amount, 0);
    const totalPayable = items.filter(t => t.type === "payable").reduce((s, t) => s + t.amount, 0);
    const overdue = items.filter(t => t.status === "overdue").length;

    return { items, summary: { totalReceivable, totalPayable, overdue } };
  }),

  drivers: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(drivers).orderBy(drivers.name);
  }),

  vehicles: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(vehicles).orderBy(vehicles.plate);
  }),
});
