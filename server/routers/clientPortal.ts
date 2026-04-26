import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  clientAccessTokens, clients, orders, orderStatusHistory,
  trackingPoints, drivers, vehicles,
} from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";

export const clientPortalRouter = router({

  // ─── Public: validate token and get client info ──────────────────────────
  validateToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const tokenList = await db.select({
        token: clientAccessTokens,
        client: clients,
      })
        .from(clientAccessTokens)
        .leftJoin(clients, eq(clientAccessTokens.clientId, clients.id))
        .where(and(
          eq(clientAccessTokens.token, input.token),
          eq(clientAccessTokens.isActive, true)
        ))
        .limit(1);

      const row = tokenList[0];
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Link de acesso inválido ou expirado" });

      // Check expiry
      if (row.token.expiresAt && new Date(row.token.expiresAt) < new Date()) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Link de acesso expirado" });
      }

      // Update lastUsedAt
      await db.update(clientAccessTokens)
        .set({ lastUsedAt: new Date() })
        .where(eq(clientAccessTokens.token, input.token));

      return { client: row.client };
    }),

  // ─── Public: list orders for client via token ────────────────────────────
  myOrders: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      // Resolve token → clientId
      const tokenList = await db.select().from(clientAccessTokens)
        .where(and(eq(clientAccessTokens.token, input.token), eq(clientAccessTokens.isActive, true)))
        .limit(1);
      const tok = tokenList[0];
      if (!tok) throw new TRPCError({ code: "UNAUTHORIZED", message: "Token inválido" });
      if (tok.expiresAt && new Date(tok.expiresAt) < new Date()) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Token expirado" });
      }

      const orderList = await db.select({
        order: orders,
        driverName: drivers.name,
        driverPhone: drivers.phone,
        vehiclePlate: vehicles.plate,
      })
        .from(orders)
        .leftJoin(drivers, eq(orders.driverId, drivers.id))
        .leftJoin(vehicles, eq(orders.vehicleId, vehicles.id))
        .where(eq(orders.clientId, tok.clientId))
        .orderBy(desc(orders.createdAt))
        .limit(50);

      return orderList;
    }),

  // ─── Public: get order details + tracking + history via token ────────────
  orderDetail: publicProcedure
    .input(z.object({ token: z.string(), orderId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Validate token
      const tokenList = await db.select().from(clientAccessTokens)
        .where(and(eq(clientAccessTokens.token, input.token), eq(clientAccessTokens.isActive, true)))
        .limit(1);
      const tok = tokenList[0];
      if (!tok) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Get order (must belong to client)
      const orderList = await db.select({
        order: orders,
        driverName: drivers.name,
        driverPhone: drivers.phone,
        driverLat: drivers.lat,
        driverLng: drivers.lng,
        vehiclePlate: vehicles.plate,
        vehicleModel: vehicles.model,
      })
        .from(orders)
        .leftJoin(drivers, eq(orders.driverId, drivers.id))
        .leftJoin(vehicles, eq(orders.vehicleId, vehicles.id))
        .where(and(eq(orders.id, input.orderId), eq(orders.clientId, tok.clientId)))
        .limit(1);

      const row = orderList[0];
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Pedido não encontrado" });

      // Get status history
      const history = await db.select().from(orderStatusHistory)
        .where(eq(orderStatusHistory.orderId, input.orderId))
        .orderBy(desc(orderStatusHistory.createdAt))
        .limit(20);

      // Get last 10 tracking points
      const tracking = await db.select().from(trackingPoints)
        .where(eq(trackingPoints.driverId, row.order.driverId ?? 0))
        .orderBy(desc(trackingPoints.createdAt))
        .limit(10);

      return { ...row, history, tracking };
    }),

  // ─── Admin: list all access tokens ──────────────────────────────────────
  listTokens: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select({
        token: clientAccessTokens,
        clientName: clients.name,
        clientCnpj: clients.cnpj,
      })
        .from(clientAccessTokens)
        .leftJoin(clients, eq(clientAccessTokens.clientId, clients.id))
        .orderBy(desc(clientAccessTokens.createdAt));
    }),

  // ─── Admin: create access token for client ───────────────────────────────
  createToken: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      label: z.string().optional(),
      expiresInDays: z.number().min(1).max(365).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const token = nanoid(32);
      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 86400000)
        : null;

      const [result] = await db.insert(clientAccessTokens).values({
        clientId: input.clientId,
        token,
        label: input.label ?? `Acesso ${new Date().toLocaleDateString("pt-BR")}`,
        isActive: true,
        expiresAt: expiresAt ?? undefined,
        createdBy: ctx.user!.id,
      }).$returningId();

      return { id: result.id, token };
    }),

  // ─── Admin: revoke token ─────────────────────────────────────────────────
  revokeToken: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(clientAccessTokens)
        .set({ isActive: false })
        .where(eq(clientAccessTokens.id, input.id));
      return { ok: true };
    }),
});
