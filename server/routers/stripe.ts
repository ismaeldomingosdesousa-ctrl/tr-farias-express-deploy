import { z } from "zod";
import Stripe from "stripe";
import { protectedProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";
import { PRODUCTS } from "../stripe/products";

function getStripe() {
  return new Stripe(ENV.stripeSecretKey || "sk_placeholder", { apiVersion: "2025-03-31.basil" as any });
}

export const stripeRouter = router({
  // One-time payment checkout (freight, advance)
  createCheckout: protectedProcedure.input(z.object({
    type: z.enum(["freight", "advance", "invoice"]),
    amount: z.number().positive(),
    description: z.string().optional(),
    financialTransactionId: z.number().optional(),
  })).mutation(async ({ input, ctx }) => {
    const productConfig = input.type === "freight" ? PRODUCTS.FREIGHT_PAYMENT
      : input.type === "advance" ? PRODUCTS.DRIVER_ADVANCE
      : PRODUCTS.RECURRING_INVOICE;

    const origin = ctx.req.headers.get("origin") || "http://localhost:3000";

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "brl",
          product_data: {
            name: productConfig.name,
            description: input.description || productConfig.description,
          },
          unit_amount: Math.round(input.amount * 100),
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${origin}/financial?payment=success`,
      cancel_url: `${origin}/financial?payment=cancelled`,
      client_reference_id: ctx.user.id.toString(),
      customer_email: ctx.user.email || undefined,
      allow_promotion_codes: true,
      metadata: {
        user_id: ctx.user.id.toString(),
        customer_name: ctx.user.name || "",
        customer_email: ctx.user.email || "",
        type: input.type,
        financial_transaction_id: input.financialTransactionId?.toString() || "",
      },
    });

    return { url: session.url };
  }),

  // Recurring invoice subscription checkout
  createSubscription: protectedProcedure.input(z.object({
    amount: z.number().positive(),
    description: z.string().optional(),
    interval: z.enum(["week", "month", "year"]).default("month"),
    clientName: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const origin = ctx.req.headers.get("origin") || "http://localhost:3000";

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "brl",
          product_data: {
            name: PRODUCTS.RECURRING_INVOICE.name,
            description: input.description || `Fatura recorrente ${input.clientName ? `- ${input.clientName}` : ""}`,
          },
          unit_amount: Math.round(input.amount * 100),
          recurring: {
            interval: input.interval,
          },
        },
        quantity: 1,
      }],
      mode: "subscription",
      success_url: `${origin}/financial?subscription=success`,
      cancel_url: `${origin}/financial?subscription=cancelled`,
      client_reference_id: ctx.user.id.toString(),
      customer_email: ctx.user.email || undefined,
      allow_promotion_codes: true,
      metadata: {
        user_id: ctx.user.id.toString(),
        customer_name: ctx.user.name || "",
        type: "recurring_invoice",
        client_name: input.clientName || "",
      },
    });

    return { url: session.url };
  }),

  // List active subscriptions
  listSubscriptions: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Find customer by email
      const customers = await getStripe().customers.list({
        email: ctx.user.email || undefined,
        limit: 1,
      });

      if (customers.data.length === 0) return [];

      const subscriptions = await getStripe().subscriptions.list({
        customer: customers.data[0].id,
        limit: 20,
      });

      return subscriptions.data.map(sub => ({
        id: sub.id,
        status: sub.status,
        amount: (sub.items.data[0]?.price?.unit_amount || 0) / 100,
        currency: sub.items.data[0]?.price?.currency || "brl",
        interval: sub.items.data[0]?.price?.recurring?.interval || "month",
        currentPeriodEnd: new Date((sub as any).current_period_end * 1000),
        createdAt: new Date(sub.created * 1000),
      }));
    } catch {
      return [];
    }
  }),

  // Cancel subscription
  cancelSubscription: protectedProcedure.input(z.object({
    subscriptionId: z.string(),
  })).mutation(async ({ input }) => {
    await getStripe().subscriptions.cancel(input.subscriptionId);
    return { success: true };
  }),

  getPaymentHistory: protectedProcedure.query(async ({ ctx }) => {
    try {
      const sessions = await getStripe().checkout.sessions.list({
        limit: 20,
      });

      const userSessions = sessions.data.filter(
        s => s.client_reference_id === ctx.user.id.toString() && s.payment_status === "paid"
      );

      return userSessions.map(s => ({
        id: s.id,
        amount: (s.amount_total || 0) / 100,
        currency: s.currency || "brl",
        status: s.payment_status,
        type: s.metadata?.type || "unknown",
        createdAt: new Date(s.created * 1000),
      }));
    } catch {
      return [];
    }
  }),
});
