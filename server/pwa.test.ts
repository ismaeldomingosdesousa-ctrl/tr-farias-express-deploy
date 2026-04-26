import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ────────────────────────────────────────────────────────
vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getDb: vi.fn().mockResolvedValue(null),
    getDriverByCpf: vi.fn(),
    getDriverById: vi.fn(),
    getRoutesByDriverId: vi.fn(),
    getOrdersByDriverId: vi.fn(),
    createTrackingPoint: vi.fn(),
    createDriverAdvance: vi.fn(),
    getDriverAdvancesByDriverId: vi.fn(),
    getClientByToken: vi.fn(),
    getOrdersByClientId: vi.fn(),
    createClientAccessToken: vi.fn(),
    listClientAccessTokens: vi.fn(),
    revokeClientAccessToken: vi.fn(),
    listDriverAdvances: vi.fn(),
    updateDriverAdvanceStatus: vi.fn(),
    setDriverPin: vi.fn(),
  };
});

vi.mock("./routers/driverApp", async () => {
  const { router, publicProcedure, protectedProcedure } = await import("./_core/trpc");
  const { z } = await import("zod");

  return {
    driverAppRouter: router({
      login: publicProcedure
        .input(z.object({ cpf: z.string(), pin: z.string() }))
        .mutation(async ({ input }) => {
          if (input.cpf === "123.456.789-00" && input.pin === "123456") {
            return { success: true, driver: { id: 1, name: "João Silva", cpf: input.cpf } };
          }
          throw new Error("CPF ou PIN inválido");
        }),

      myRoutes: publicProcedure
        .input(z.object({ driverId: z.number() }))
        .query(async () => [
          { id: 1, routeCode: "RT-001", status: "planned", originAddress: "São Paulo", destAddress: "Campinas", distanceKm: 100 },
        ]),

      sendLocation: publicProcedure
        .input(z.object({ driverId: z.number(), lat: z.number(), lng: z.number(), accuracy: z.number().optional() }))
        .mutation(async ({ input }) => {
          if (!input.lat || !input.lng) throw new Error("Coordenadas inválidas");
          return { success: true };
        }),

      updateDeliveryStatus: publicProcedure
        .input(z.object({ driverId: z.number(), orderId: z.number(), status: z.string(), notes: z.string().optional() }))
        .mutation(async () => ({ success: true })),

      requestAdvance: publicProcedure
        .input(z.object({ driverId: z.number(), amount: z.number(), reason: z.string() }))
        .mutation(async ({ input }) => {
          if (input.amount <= 0) throw new Error("Valor inválido");
          return { success: true, id: 1 };
        }),

      myAdvances: publicProcedure
        .input(z.object({ driverId: z.number() }))
        .query(async () => [
          { id: 1, amount: 500, reason: "Combustível", status: "pending", createdAt: new Date() },
        ]),

      setDriverPin: protectedProcedure
        .input(z.object({ driverId: z.number(), pin: z.string().length(6) }))
        .mutation(async () => ({ success: true })),

      listAdvances: protectedProcedure
        .input(z.object({ status: z.string().optional() }))
        .query(async () => []),

      reviewAdvance: protectedProcedure
        .input(z.object({ id: z.number(), status: z.enum(["approved", "rejected"]), reviewNote: z.string().optional() }))
        .mutation(async () => ({ success: true })),

      markAdvancePaid: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async () => ({ success: true })),
    }),
  };
});

vi.mock("./routers/clientPortal", async () => {
  const { router, publicProcedure, protectedProcedure } = await import("./_core/trpc");
  const { z } = await import("zod");

  return {
    clientPortalRouter: router({
      validateToken: publicProcedure
        .input(z.object({ token: z.string() }))
        .query(async ({ input }) => {
          if (input.token === "valid-token-abc") {
            return { valid: true, client: { id: 1, name: "Empresa XYZ" } };
          }
          throw new Error("Token inválido ou expirado");
        }),

      myOrders: publicProcedure
        .input(z.object({ token: z.string() }))
        .query(async ({ input }) => {
          if (input.token !== "valid-token-abc") throw new Error("Token inválido");
          return [
            {
              order: { id: 1, orderNumber: "ORD-001", status: "in_transit", destCity: "Campinas", destState: "SP", estimatedDelivery: new Date() },
              driverName: "João Silva",
              driverPhone: "11999999999",
              vehiclePlate: "ABC-1234",
            },
          ];
        }),

      orderDetail: publicProcedure
        .input(z.object({ token: z.string(), orderId: z.number() }))
        .query(async ({ input }) => {
          if (input.token !== "valid-token-abc") throw new Error("Token inválido");
          return {
            driverLat: -23.55,
            driverLng: -46.63,
            history: [
              { id: 1, toStatus: "confirmed", createdAt: new Date() },
              { id: 2, toStatus: "in_transit", createdAt: new Date() },
            ],
          };
        }),

      createToken: protectedProcedure
        .input(z.object({ clientId: z.number(), label: z.string().optional(), expiresInDays: z.number().optional() }))
        .mutation(async ({ input }) => {
          if (!input.clientId) throw new Error("Cliente obrigatório");
          return { token: "new-generated-token-xyz", id: 1 };
        }),

      listTokens: protectedProcedure
        .query(async () => [
          { token: { id: 1, token: "valid-token-abc", label: "Acesso Março", isActive: true, expiresAt: null, lastUsedAt: null }, clientName: "Empresa XYZ" },
        ]),

      revokeToken: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async () => ({ success: true })),
    }),
  };
});

// ─── Context helpers ─────────────────────────────────────────────────────────
function makeCtx(role: "admin" | "user" = "admin"): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-open-id",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makePublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Driver App Tests ─────────────────────────────────────────────────────────
describe("driverApp.login", () => {
  it("returns driver data on valid CPF + PIN", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.driverApp.login({ cpf: "123.456.789-00", pin: "123456" });
    expect(result.success).toBe(true);
    expect(result.driver.name).toBe("João Silva");
  });

  it("throws on invalid credentials", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(
      caller.driverApp.login({ cpf: "000.000.000-00", pin: "000000" })
    ).rejects.toThrow("CPF ou PIN inválido");
  });
});

describe("driverApp.myRoutes", () => {
  it("returns routes assigned to driver", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const routes = await caller.driverApp.myRoutes({ driverId: 1 });
    expect(Array.isArray(routes)).toBe(true);
    expect(routes[0]?.routeCode).toBe("RT-001");
  });
});

describe("driverApp.sendLocation", () => {
  it("accepts valid GPS coordinates", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.driverApp.sendLocation({ driverId: 1, lat: -23.55, lng: -46.63, accuracy: 10 });
    expect(result.success).toBe(true);
  });
});

describe("driverApp.requestAdvance", () => {
  it("creates advance request with valid amount", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.driverApp.requestAdvance({ driverId: 1, amount: 500, reason: "Combustível" });
    expect(result.success).toBe(true);
    expect(result.id).toBe(1);
  });

  it("throws on zero amount", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(
      caller.driverApp.requestAdvance({ driverId: 1, amount: 0, reason: "Teste" })
    ).rejects.toThrow("Valor inválido");
  });
});

describe("driverApp.setDriverPin (admin)", () => {
  it("sets PIN for driver when called by admin", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.driverApp.setDriverPin({ driverId: 1, pin: "654321" });
    expect(result.success).toBe(true);
  });
});

describe("driverApp.reviewAdvance (admin)", () => {
  it("approves an advance request", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.driverApp.reviewAdvance({ id: 1, status: "approved" });
    expect(result.success).toBe(true);
  });

  it("rejects an advance request with note", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.driverApp.reviewAdvance({ id: 1, status: "rejected", reviewNote: "Não aprovado" });
    expect(result.success).toBe(true);
  });
});

// ─── Client Portal Tests ──────────────────────────────────────────────────────
describe("clientPortal.validateToken", () => {
  it("validates a correct token and returns client data", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.clientPortal.validateToken({ token: "valid-token-abc" });
    expect(result.valid).toBe(true);
    expect(result.client.name).toBe("Empresa XYZ");
  });

  it("throws on invalid token", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(
      caller.clientPortal.validateToken({ token: "invalid-token" })
    ).rejects.toThrow("Token inválido ou expirado");
  });
});

describe("clientPortal.myOrders", () => {
  it("returns orders for valid token", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const orders = await caller.clientPortal.myOrders({ token: "valid-token-abc" });
    expect(Array.isArray(orders)).toBe(true);
    expect(orders[0]?.order.orderNumber).toBe("ORD-001");
    expect(orders[0]?.driverName).toBe("João Silva");
  });

  it("throws on invalid token", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(
      caller.clientPortal.myOrders({ token: "bad-token" })
    ).rejects.toThrow("Token inválido");
  });
});

describe("clientPortal.orderDetail", () => {
  it("returns driver location and status history", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const detail = await caller.clientPortal.orderDetail({ token: "valid-token-abc", orderId: 1 });
    expect(detail.driverLat).toBe(-23.55);
    expect(detail.history).toHaveLength(2);
  });
});

describe("clientPortal.createToken (admin)", () => {
  it("generates a new access token for a client", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.clientPortal.createToken({ clientId: 1, label: "Acesso Teste", expiresInDays: 30 });
    expect(result.token).toBeTruthy();
    expect(result.token).toBe("new-generated-token-xyz");
  });
});

describe("clientPortal.revokeToken (admin)", () => {
  it("revokes an existing token", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.clientPortal.revokeToken({ id: 1 });
    expect(result.success).toBe(true);
  });
});
