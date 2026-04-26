import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  drivers, driverCredentials, driverAdvances, routes, orders,
  trackingPoints, orderStatusHistory, deliveryOccurrences, alerts,
} from "../../drizzle/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { notifyOwner } from "../_core/notification";

// ─── Driver App Router ───────────────────────────────────────────────────────
// Public endpoints for the driver PWA (authenticated by CPF + PIN)

export const driverAppRouter = router({

  // Login: CPF + PIN → returns driver data
  login: publicProcedure
    .input(z.object({ cpf: z.string().min(11), pin: z.string().length(6) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      // Find driver by CPF
      const driverList = await db.select().from(drivers)
        .where(eq(drivers.cpf, input.cpf.replace(/\D/g, ""))).limit(1);
      const driver = driverList[0];
      if (!driver) throw new TRPCError({ code: "UNAUTHORIZED", message: "CPF não encontrado" });
      if (driver.status === "inactive" || driver.status === "suspended") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Motorista inativo ou suspenso" });
      }

      // Check PIN
      const credList = await db.select().from(driverCredentials)
        .where(and(eq(driverCredentials.driverId, driver.id), eq(driverCredentials.isActive, true))).limit(1);
      const cred = credList[0];
      if (!cred || cred.pin !== input.pin) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "PIN incorreto" });
      }

      return { driver };
    }),

  // Get driver's assigned routes (active/in_progress)
  myRoutes: publicProcedure
    .input(z.object({ driverId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(routes)
        .where(and(
          eq(routes.driverId, input.driverId),
          inArray(routes.status, ["planned", "in_progress"])
        ))
        .orderBy(desc(routes.createdAt));
    }),

  // Get orders for a specific route
  routeOrders: publicProcedure
    .input(z.object({ routeId: z.number(), driverId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      // Verify route belongs to driver
      const routeList = await db.select().from(routes)
        .where(and(eq(routes.id, input.routeId), eq(routes.driverId, input.driverId))).limit(1);
      if (!routeList[0]) throw new TRPCError({ code: "FORBIDDEN", message: "Rota não pertence a este motorista" });

      return db.select().from(orders)
        .where(eq(orders.driverId, input.driverId))
        .orderBy(orders.id);
    }),

  // Send GPS location
  sendLocation: publicProcedure
    .input(z.object({
      driverId: z.number(),
      routeId: z.number().optional(),
      lat: z.number(),
      lng: z.number(),
      speed: z.number().optional(),
      heading: z.number().optional(),
      accuracy: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const now = new Date();

      // Update driver's last known location
      await db.update(drivers)
        .set({ lat: input.lat, lng: input.lng, lastLocationUpdate: now })
        .where(eq(drivers.id, input.driverId));

      // Record tracking point
      await db.insert(trackingPoints).values({
        driverId: input.driverId,
        routeId: input.routeId ?? null,
        lat: input.lat,
        lng: input.lng,
        speed: input.speed ?? null,
        heading: input.heading ?? null,
        eventType: "gps_update",
      });

      return { ok: true };
    }),

  // Update delivery status
  updateDeliveryStatus: publicProcedure
    .input(z.object({
      orderId: z.number(),
      driverId: z.number(),
      status: z.enum(["in_transit", "delivered", "cancelled", "returned"]),
      note: z.string().optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.update(orders)
        .set({
          status: input.status,
          ...(input.status === "delivered" ? { actualDelivery: new Date() } : {}),
        })
        .where(eq(orders.id, input.orderId));

      await db.insert(orderStatusHistory).values({
        orderId: input.orderId,
        toStatus: input.status,
        notes: input.note ?? `Status atualizado pelo motorista (motorista ID ${input.driverId})`,
        userId: input.driverId,
      });

      // Notify owner on delivery
      if (input.status === "delivered") {
        await notifyOwner({
          title: "✅ Entrega Confirmada",
          content: `Pedido #${input.orderId} foi entregue pelo motorista ID ${input.driverId}.`,
        }).catch(() => {});
      }

      return { ok: true };
    }),

  // Register delivery occurrence (damage, refusal, etc.)
  registerOccurrence: publicProcedure
    .input(z.object({
      orderId: z.number(),
      driverId: z.number(),
      type: z.enum(["damage", "refusal", "address_not_found", "recipient_absent", "delay", "other"]),
      description: z.string().min(10),
      lat: z.number().optional(),
      lng: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.insert(deliveryOccurrences).values({
        orderId: input.orderId,
        driverId: input.driverId,
        type: input.type,
        description: input.description,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
      });

      // Create alert for the occurrence
      await db.insert(alerts).values({
        type: "delivery_delay",
        severity: "warning",
        title: `Ocorrência: ${input.type.replace(/_/g, " ").toUpperCase()}`,
        message: `Pedido #${input.orderId} — ${input.description}`,
        entityType: "order",
        entityId: input.orderId,
      });

      await notifyOwner({
        title: `⚠️ Ocorrência de Entrega`,
        content: `Pedido #${input.orderId}: ${input.type} — ${input.description}`,
      }).catch(() => {});

      return { ok: true };
    }),

  // Request advance payment
  requestAdvance: publicProcedure
    .input(z.object({
      driverId: z.number(),
      routeId: z.number().optional(),
      amount: z.number().min(10).max(5000),
      reason: z.string().min(10),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Check for pending advance
      const pending = await db.select().from(driverAdvances)
        .where(and(eq(driverAdvances.driverId, input.driverId), eq(driverAdvances.status, "pending")))
        .limit(1);
      if (pending[0]) {
        throw new TRPCError({ code: "CONFLICT", message: "Já existe uma solicitação de adiantamento pendente" });
      }

      const [advance] = await db.insert(driverAdvances).values({
        driverId: input.driverId,
        routeId: input.routeId ?? null,
        amount: input.amount,
        reason: input.reason,
        status: "pending",
      }).$returningId();

      await notifyOwner({
        title: `💰 Solicitação de Adiantamento`,
        content: `Motorista ID ${input.driverId} solicitou adiantamento de R$ ${input.amount.toFixed(2)}. Motivo: ${input.reason}`,
      }).catch(() => {});

      return { id: advance.id };
    }),

  // Get driver's advances history
  myAdvances: publicProcedure
    .input(z.object({ driverId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(driverAdvances)
        .where(eq(driverAdvances.driverId, input.driverId))
        .orderBy(desc(driverAdvances.createdAt))
        .limit(20);
    }),

  // Get driver profile
  profile: publicProcedure
    .input(z.object({ driverId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const list = await db.select().from(drivers).where(eq(drivers.id, input.driverId)).limit(1);
      return list[0] ?? null;
    }),

  // ─── Admin-only: manage driver PIN ────────────────────────────────────────
  setDriverPin: protectedProcedure
    .input(z.object({ driverId: z.number(), pin: z.string().length(6).regex(/^\d+$/) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.insert(driverCredentials)
        .values({ driverId: input.driverId, pin: input.pin, isActive: true })
        .onConflictDoUpdate({ target: driverCredentials.driverId, set: { pin: input.pin, isActive: true } });

      return { ok: true };
    }),

  // ─── Admin-only: list all advances ────────────────────────────────────────
  listAdvances: protectedProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const q = db.select({
        advance: driverAdvances,
        driverName: drivers.name,
        driverCpf: drivers.cpf,
      })
        .from(driverAdvances)
        .leftJoin(drivers, eq(driverAdvances.driverId, drivers.id))
        .orderBy(desc(driverAdvances.createdAt));
      return q;
    }),

    // ─── Admin-only: review advance ───────────────────────────────────────────
  reviewAdvance: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["approved", "rejected"]),
      reviewNote: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(driverAdvances)
        .set({
          status: input.status,
          reviewedBy: ctx.user!.id,
          reviewNote: input.reviewNote ?? null,
          reviewedAt: new Date(),
        })
        .where(eq(driverAdvances.id, input.id));
      return { ok: true };
    }),
  // ─── Admin-only: mark advance as paid ────────────────────────────────────
  markAdvancePaid: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Fetch advance to get driverId, routeId, amount
      const [advance] = await db.select().from(driverAdvances).where(eq(driverAdvances.id, input.id)).limit(1);
      if (!advance) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(driverAdvances)
        .set({ status: "paid", paidAt: new Date() })
        .where(eq(driverAdvances.id, input.id));
      // Create financial transaction (saída) linked to the advance
      const { financialTransactions } = await import("../../drizzle/schema");
      await db.insert(financialTransactions).values({
        type: "payable",
        category: "Adiantamento Motorista",
        description: `Adiantamento pago ao motorista ID ${advance.driverId}${advance.routeId ? ` - Rota ID ${advance.routeId}` : ""}`,
        driverId: advance.driverId,
        orderId: advance.routeId ?? undefined,
        amount: advance.amount,
        dueDate: new Date(),
        paidDate: new Date(),
        status: "paid",
        paymentMethod: "Adiantamento",
        invoiceNumber: `ADV-${advance.id}`,
      });
      return { ok: true };
    }),
});
