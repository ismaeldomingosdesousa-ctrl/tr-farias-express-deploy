import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { listOrders, getOrderById, createOrder, updateOrder, getOrderItems, createOrderItem, addOrderStatusHistory, getOrderStatusHistory, getClientById } from "../db";
import { nanoid } from "nanoid";
import { notifyOwner } from "../_core/notification";
import { getDb } from "../db";
import { clientAccessTokens } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

export const ordersRouter = router({
  list: protectedProcedure.input(z.object({
    status: z.string().optional(),
    clientId: z.number().optional(),
  }).optional()).query(async ({ input }) => listOrders(input)),

  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => getOrderById(input.id)),

  getItems: protectedProcedure.input(z.object({ orderId: z.number() })).query(async ({ input }) => getOrderItems(input.orderId)),

  getHistory: protectedProcedure.input(z.object({ orderId: z.number() })).query(async ({ input }) => getOrderStatusHistory(input.orderId)),

  create: protectedProcedure.input(z.object({
    clientId: z.number(),
    priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
    originAddress: z.string().optional(),
    originCity: z.string().optional(),
    originState: z.string().optional(),
    originZip: z.string().optional(),
    destAddress: z.string().optional(),
    destCity: z.string().optional(),
    destState: z.string().optional(),
    destZip: z.string().optional(),
    totalWeight: z.number().optional(),
    totalVolume: z.number().optional(),
    totalValue: z.number().optional(),
    freightValue: z.number().optional(),
    notes: z.string().optional(),
    warehouseId: z.number().optional(),
    routeId: z.number().optional(),
    driverId: z.number().optional(),
    vehicleId: z.number().optional(),
    items: z.array(z.object({
      sku: z.string(),
      productName: z.string(),
      quantity: z.number(),
      weightKg: z.number().optional(),
      volumeM3: z.number().optional(),
      unitPrice: z.number().optional(),
      totalPrice: z.number().optional(),
    })).optional(),
  })).mutation(async ({ input, ctx }) => {
    const orderNumber = `ORD-${nanoid(8).toUpperCase()}`;
    const { items, ...orderData } = input;
    const id = await createOrder({ ...orderData, orderNumber });
    if (id && items) {
      for (const item of items) {
        await createOrderItem({ ...item, orderId: id });
      }
    }
    if (id) {
      await addOrderStatusHistory(id, null, "pending", ctx.user.id, "Pedido criado");
    }
    return { id, orderNumber };
  }),

  updateStatus: protectedProcedure.input(z.object({
    id: z.number(),
    status: z.enum(["pending", "confirmed", "picking", "packed", "awaiting_pickup", "in_transit", "delivered", "cancelled", "returned"]),
    notes: z.string().optional(),
    origin: z.string().optional(), // frontend must pass window.location.origin for email links
  })).mutation(async ({ input, ctx }) => {
    const order = await getOrderById(input.id);
    if (!order) throw new Error("Pedido não encontrado");
    await updateOrder(input.id, { status: input.status });
    await addOrderStatusHistory(input.id, order.status, input.status, ctx.user.id, input.notes);

    // Send email notification to client when order goes in_transit or delivered
    if (input.status === "in_transit" || input.status === "delivered") {
      try {
        const client = order.clientId ? await getClientById(order.clientId) : null;
        if (client?.email) {
          // Find client tracking token
          const db = await getDb();
          let trackingLink = "";
          if (db && client.id) {
            const tokenRows = await db.select().from(clientAccessTokens)
              .where(and(eq(clientAccessTokens.clientId, client.id), eq(clientAccessTokens.isActive, true)))
              .limit(1);
            if (tokenRows[0]) {
              const origin = input.origin ?? "https://trfariaslog-v7qxma99.manus.space";
              trackingLink = `${origin}/track?token=${tokenRows[0].token}`;
            }
          }

          const statusLabel = input.status === "in_transit" ? "Em Trânsito" : "Entregue";
          const emoji = input.status === "in_transit" ? "🚚" : "✅";

          await notifyOwner({
            title: `${emoji} Pedido ${order.orderNumber} — ${statusLabel}`,
            content: [
              `Cliente: ${client.name}`,
              `Email do cliente: ${client.email}`,
              `Pedido: ${order.orderNumber}`,
              `Status: ${statusLabel}`,
              trackingLink ? `Link de rastreamento para o cliente: ${trackingLink}` : "",
              `\nEste é um aviso automático do sistema TR Farias Express.`,
            ].filter(Boolean).join("\n"),
          });

          // Mark order as notified
          await updateOrder(input.id, { clientNotifiedAt: new Date() });
        }
      } catch (e) {
        console.warn("[Orders] Failed to send client notification:", e);
      }
    }

    return { success: true };
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    driverId: z.number().optional().nullable(),
    vehicleId: z.number().optional().nullable(),
    routeId: z.number().optional().nullable(),
    estimatedDelivery: z.date().optional().nullable(),
    notes: z.string().optional(),
    freightValue: z.number().optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await updateOrder(id, data);
    return { success: true };
  }),
});
