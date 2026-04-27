import "dotenv/config";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { appRouter } from "./server/routers";
import { createContext } from "./server/_core/context";
import { initDb } from "./server/db";
import { initEnv } from "./server/_core/env";
import { buildSessionCookieString } from "./server/_core/cookies";
import * as db from "./server/db";
import { storagePut } from "./server/storage";
import { nanoid } from "nanoid";
import { getDb } from "./server/db";
import { orders } from "./drizzle/schema";
import { eq } from "drizzle-orm";
import { SignJWT } from "jose";
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
    const hostname = url.hostname;

    // ── Domain routing ──────────────────────────────────────
    // Apex → www
    if (hostname === "trfarias.com.br") {
      return new Response(null, {
        status: 301,
        headers: { Location: `https://www.trfarias.com.br${url.pathname}${url.search}` },
      });
    }
    // login subdomain → app subdomain (SPA shows login when unauthenticated)
    if (hostname === "login.trfarias.com.br") {
      return new Response(null, {
        status: 302,
        headers: { Location: "https://app.trfarias.com.br/dashboard" },
      });
    }
    // app root → dashboard
    if (hostname === "app.trfarias.com.br" && url.pathname === "/") {
      return new Response(null, {
        status: 302,
        headers: { Location: "https://app.trfarias.com.br/dashboard" },
      });
    }

    // ── Local auth ──────────────────────────────────────────
    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      return handleLogin(request, env);
    }
    if (url.pathname === "/api/auth/seed" && request.method === "POST") {
      return handleSeedAdmin(request, env);
    }

    // ── OAuth callback (legacy, kept for compatibility) ────
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

// ── PBKDF2 password utilities ────────────────────────────
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256);
  const toHex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `pbkdf2:${toHex(salt.buffer)}:${toHex(bits)}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "pbkdf2") return false;
  const saltHex = parts[1];
  const expectedHex = parts[2];
  const salt = new Uint8Array((saltHex.match(/.{2}/g) ?? []).map(b => parseInt(b, 16)));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256);
  const newHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("");
  return newHex === expectedHex;
}

async function createLocalSessionToken(openId: string, name: string, jwtSecret: string): Promise<string> {
  const secretKey = new TextEncoder().encode(jwtSecret);
  return new SignJWT({ openId, appId: "trfarias", name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(Math.floor((Date.now() + ONE_YEAR_MS) / 1000))
    .sign(secretKey);
}

// ── Login handler ─────────────────────────────────────────
async function handleLogin(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as { email?: string; password?: string };
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";

    if (!email || !password) {
      return jsonResponse({ error: "E-mail e senha são obrigatórios" }, 400);
    }

    const cred = await db.getUserCredentialsByEmail(email);
    if (!cred) return jsonResponse({ error: "Credenciais inválidas" }, 401);

    const valid = await verifyPassword(password, cred.passwordHash);
    if (!valid) return jsonResponse({ error: "Credenciais inválidas" }, 401);

    const openId = `local:${email}`;
    await db.upsertUser({
      openId,
      email,
      name: cred.name ?? email,
      loginMethod: "local",
      lastSignedIn: new Date(),
      role: cred.role as "user" | "admin",
    });

    const jwtSecret = env.JWT_SECRET || "";
    if (!jwtSecret) return jsonResponse({ error: "JWT_SECRET não configurado" }, 500);

    const sessionToken = await createLocalSessionToken(openId, cred.name ?? email, jwtSecret);
    const cookieStr = buildSessionCookieString(COOKIE_NAME, sessionToken, request, Math.floor(ONE_YEAR_MS / 1000));

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Set-Cookie": cookieStr },
    });
  } catch (err: any) {
    console.error("[Login]", err);
    return jsonResponse({ error: "Erro interno" }, 500);
  }
}

// ── Seed admin handler ────────────────────────────────────
async function handleSeedAdmin(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as { secret?: string; email?: string; password?: string; name?: string };
    if (body.secret !== (env.JWT_SECRET || "")) {
      return jsonResponse({ error: "Não autorizado" }, 403);
    }
    const email = (body.email ?? "admin@trfarias.com").toLowerCase();
    const password = body.password ?? "Admin@2026";
    const name = body.name ?? "Administrador";
    const hash = await hashPassword(password);
    await db.upsertLocalUser(email, hash, name, "admin");
    return jsonResponse({ ok: true, email });
  } catch (err: any) {
    console.error("[Seed]", err);
    return jsonResponse({ error: err.message }, 500);
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
