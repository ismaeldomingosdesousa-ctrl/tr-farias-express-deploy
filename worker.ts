import "dotenv/config";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { appRouter } from "./server/routers";
import { createContext } from "./server/_core/context";
import { initDb } from "./server/db";
import { initEnv } from "./server/_core/env";
import { sdk } from "./server/_core/sdk";
import { buildSessionCookieString } from "./server/_core/cookies";
import * as db from "./server/db";
import { storagePut } from "./server/storage";
import { nanoid } from "nanoid";
import { getDb } from "./server/db";
import { orders } from "./drizzle/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

export interface Env {
  DB: any;
  ASSETS: { fetch: (req: Request) => Promise<Response> };
  JWT_SECRET: string;
  VITE_APP_ID: string;
  OAUTH_SERVER_URL: string;
  OWNER_OPEN_ID: string;
  BUILT_IN_FORGE_API_URL: string;
  BUILT_IN_FORGE_API_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  NODE_ENV?: string;
}

export default {
  async fetch(request: Request, env: Env, _ctx: any): Promise<Response> {
    initEnv(env as any);
    initDb(env.DB);

    const url = new URL(request.url);

    // ── OAuth callback ──────────────────────────────────────
    if (url.pathname === "/api/oauth/callback") {
      return handleOAuthCallback(request, url, env);
    }

    // ── Photo upload ────────────────────────────────────────
    if (url.pathname === "/api/upload/proof" && request.method === "POST") {
      return handlePhotoUpload(request);
    }

    // ── Stripe webhook ──────────────────────────────────────
    if (url.pathname === "/api/stripe/webhook" && request.method === "POST") {
      return handleStripeWebhook(request, env);
    }

    // ── tRPC ────────────────────────────────────────────────
    if (url.pathname.startsWith("/api/trpc")) {
      const response = await fetchRequestHandler({
        endpoint: "/api/trpc",
        req: request,
        router: appRouter,
        createContext: ({ req }) => createContext({ req }),
        responseMeta: ({ ctx }) => {
          if (!ctx?.setCookies?.length) return {};
          const headers = new Headers();
          for (const cookie of ctx.setCookies) {
            headers.append("Set-Cookie", cookie);
          }
          return { headers };
        },
        onError: ({ error }) => {
          if (error.code !== "UNAUTHORIZED") {
            console.error("[tRPC]", error);
          }
        },
      });
      return response;
    }

    // ── Static assets / SPA fallback ────────────────────────
    if (env.ASSETS) {
      // Paths with file extensions (JS, CSS, images, sw.js…) → serve asset directly
      if (url.pathname.includes(".")) {
        return env.ASSETS.fetch(request);
      }
      // All other paths (/, /orders, /driver, /track…) → SPA index.html
      return env.ASSETS.fetch(
        new Request(new URL("/index.html", request.url).toString())
      );
    }
    return new Response("Not found", { status: 404 });
  },
};

async function handleOAuthCallback(request: Request, url: URL, env: Env): Promise<Response> {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return jsonResponse({ error: "code and state are required" }, 400);
  }

  try {
    const tokenResponse = await sdk.exchangeCodeForToken(code, state);
    const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

    if (!userInfo.openId) {
      return jsonResponse({ error: "openId missing from user info" }, 400);
    }

    await db.upsertUser({
      openId: userInfo.openId,
      name: userInfo.name || null,
      email: userInfo.email ?? null,
      loginMethod: userInfo.loginMethod ?? (userInfo as any).platform ?? null,
      lastSignedIn: new Date(),
    });

    const sessionToken = await sdk.createSessionToken(userInfo.openId, {
      name: userInfo.name || "",
      expiresInMs: ONE_YEAR_MS,
    });

    const cookieStr = buildSessionCookieString(
      COOKIE_NAME,
      sessionToken,
      request,
      Math.floor(ONE_YEAR_MS / 1000)
    );

    return new Response(null, {
      status: 302,
      headers: { Location: "/", "Set-Cookie": cookieStr },
    });
  } catch (error) {
    console.error("[OAuth] Callback failed", error);
    return jsonResponse({ error: "OAuth callback failed" }, 500);
  }
}

async function handlePhotoUpload(request: Request): Promise<Response> {
  try {
    const body = await request.json() as {
      orderId: number;
      driverId: number;
      imageBase64: string;
      mimeType: string;
    };
    const { orderId, driverId, imageBase64, mimeType } = body;

    if (!orderId || !imageBase64) {
      return jsonResponse({ error: "orderId and imageBase64 are required" }, 400);
    }

    const ext = (mimeType || "image/jpeg").split("/")[1] ?? "jpg";
    const key = `delivery-proofs/order-${orderId}-driver-${driverId ?? "x"}-${nanoid(8)}.${ext}`;
    const buffer = Buffer.from(imageBase64, "base64");
    const { url } = await storagePut(key, buffer, mimeType || "image/jpeg");

    const dbConn = getDb();
    if (dbConn) {
      await dbConn.update(orders).set({ photoProofUrl: url }).where(eq(orders.id, Number(orderId)));
    }

    return jsonResponse({ url, key });
  } catch (err: any) {
    console.error("[PhotoUpload]", err);
    return jsonResponse({ error: err.message ?? "Upload failed" }, 500);
  }
}

async function handleStripeWebhook(request: Request, env: Env): Promise<Response> {
  try {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2025-03-31.basil" as any,
    });
    const rawBody = await request.text();
    const sig = request.headers.get("stripe-signature") ?? "";

    const event = stripe.webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET || "");

    if (event.id.startsWith("evt_test_")) {
      return jsonResponse({ verified: true });
    }

    // Handle payment events
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const txId = session.metadata?.financialTransactionId;
      if (txId) {
        await db.updateFinancialTransaction(Number(txId), {
          status: "paid",
          stripePaymentId: session.payment_intent as string,
          paidDate: new Date(),
        });
      }
    }

    return jsonResponse({ received: true });
  } catch (err: any) {
    return jsonResponse({ error: err.message }, 400);
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
