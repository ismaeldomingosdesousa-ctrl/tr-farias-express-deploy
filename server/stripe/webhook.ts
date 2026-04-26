import express from "express";
import Stripe from "stripe";
import { ENV } from "../_core/env";
import { updateFinancialTransaction } from "../db";

const getStripe = () => new Stripe(ENV.stripeSecretKey || "sk_placeholder", { apiVersion: "2025-03-31.basil" as any });

export function registerStripeWebhook(app: express.Express) {
  // MUST be registered BEFORE express.json() middleware
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    let event: Stripe.Event;

    try {
      event = getStripe().webhooks.constructEvent(req.body, sig, ENV.stripeWebhookSecret || "");
    } catch (err: any) {
      console.error("[Stripe Webhook] Signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle test events
    if (event.id.startsWith("evt_test_")) {
      console.log("[Webhook] Test event detected, returning verification response");
      return res.json({ verified: true });
    }

    console.log(`[Stripe Webhook] Event: ${event.type} (${event.id})`);

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const txId = session.metadata?.financial_transaction_id;
          if (txId) {
            await updateFinancialTransaction(parseInt(txId), {
              status: "paid",
              paidDate: new Date(),
              stripePaymentId: session.payment_intent as string,
              paymentMethod: "stripe",
            });
            console.log(`[Stripe] Transaction ${txId} marked as paid`);
          }
          break;
        }
        case "payment_intent.succeeded": {
          const pi = event.data.object as Stripe.PaymentIntent;
          console.log(`[Stripe] PaymentIntent succeeded: ${pi.id}`);
          break;
        }
        case "invoice.paid": {
          const invoice = event.data.object as Stripe.Invoice;
          console.log(`[Stripe] Invoice paid: ${invoice.id}`);
          break;
        }
        default:
          console.log(`[Stripe] Unhandled event type: ${event.type}`);
      }
    } catch (err) {
      console.error("[Stripe Webhook] Processing error:", err);
    }

    res.json({ received: true });
  });
}
