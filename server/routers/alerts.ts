import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { listAlerts, createAlert, markAlertRead, markAllAlertsRead } from "../db";
import { notifyOwner } from "../_core/notification";

export const alertsRouter = router({
  list: protectedProcedure.input(z.object({
    unreadOnly: z.boolean().optional(),
  }).optional()).query(async ({ input, ctx }) => listAlerts(ctx.user.id, input?.unreadOnly)),

  create: protectedProcedure.input(z.object({
    type: z.enum(["delivery_delay", "route_deviation", "document_expiry", "low_inventory", "maintenance_due", "payment_overdue", "geofence_breach", "system"]),
    severity: z.enum(["info", "warning", "critical"]).default("warning"),
    title: z.string().min(1),
    message: z.string().min(1),
    entityType: z.string().optional(),
    entityId: z.number().optional(),
  })).mutation(async ({ input, ctx }) => {
    await createAlert({ ...input, userId: ctx.user.id });
    // Send notification to owner for critical and warning alerts
    if (input.severity === "critical" || input.severity === "warning") {
      try {
        await notifyOwner({
          title: `[${input.severity.toUpperCase()}] ${input.title}`,
          content: input.message,
        });
      } catch (e) {
        console.warn("[Alerts] Failed to notify owner:", e);
      }
    }
    return { success: true };
  }),

  markRead: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await markAlertRead(input.id);
    return { success: true };
  }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await markAllAlertsRead(ctx.user.id);
    return { success: true };
  }),
});
