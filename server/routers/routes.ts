import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { listRoutes, getRouteById, createRoute, updateRoute, listOrders, updateOrder, addOrderStatusHistory } from "../db";
import { nanoid } from "nanoid";

export const routesRouter = router({
  list: protectedProcedure.query(async () => listRoutes()),
  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => getRouteById(input.id)),

  create: protectedProcedure.input(z.object({
    driverId: z.number().optional(),
    vehicleId: z.number().optional(),
    originAddress: z.string().optional(),
    originLat: z.number().optional(),
    originLng: z.number().optional(),
    destAddress: z.string().optional(),
    destLat: z.number().optional(),
    destLng: z.number().optional(),
    distanceKm: z.number().optional(),
    estimatedDuration: z.number().optional(),
    waypoints: z.any().optional(),
  })).mutation(async ({ input }) => {
    const routeCode = `RT-${nanoid(8).toUpperCase()}`;
    const id = await createRoute({ ...input, routeCode });
    return { id, routeCode };
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    driverId: z.number().optional().nullable(),
    vehicleId: z.number().optional().nullable(),
    status: z.enum(["planned", "in_progress", "completed", "cancelled"]).optional(),
    startedAt: z.date().optional(),
    completedAt: z.date().optional(),
    actualDuration: z.number().optional(),
  })).mutation(async ({ input, ctx }) => {
    const { id, ...data } = input;

    // Fetch the route before updating to get driverId for cascade
    const route = await getRouteById(id);
    await updateRoute(id, data);

    // ── Cascade order status when route transitions ──────────────────────────
    // Uses routeId linkage for precision — only orders explicitly tied to this route are updated
    if (data.status === "in_progress") {
      const allOrders = await listOrders();
      const toUpdate = allOrders.filter(
        o => o.routeId === id &&
          ["pending", "confirmed", "picking", "packed", "awaiting_pickup"].includes(o.status)
      );
      for (const order of toUpdate) {
        await updateOrder(order.id, { status: "in_transit" });
        await addOrderStatusHistory(order.id, order.status, "in_transit", ctx.user.id, `Rota ${route?.routeCode ?? id} iniciada`);
      }
    }

    if (data.status === "completed") {
      const allOrders = await listOrders();
      const toDeliver = allOrders.filter(
        o => o.routeId === id && o.status === "in_transit"
      );
      for (const order of toDeliver) {
        await updateOrder(order.id, { status: "delivered", actualDelivery: new Date() });
        await addOrderStatusHistory(order.id, "in_transit", "delivered", ctx.user.id, `Rota ${route?.routeCode ?? id} concluída`);
      }
    }

    return { success: true };
  }),
});
