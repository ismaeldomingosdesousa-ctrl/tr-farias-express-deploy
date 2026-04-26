import { describe, expect, it, vi, beforeEach } from "vitest";

// Hoist mock fns so they are available before vi.mock runs
const { mockCheckoutCreate, mockCheckoutList, mockSubscriptionsList, mockSubscriptionsCancel, mockCustomersList } = vi.hoisted(() => ({
  mockCheckoutCreate: vi.fn(),
  mockCheckoutList: vi.fn(),
  mockSubscriptionsList: vi.fn(),
  mockSubscriptionsCancel: vi.fn(),
  mockCustomersList: vi.fn(),
}));

vi.mock("stripe", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      checkout: {
        sessions: {
          create: mockCheckoutCreate,
          list: mockCheckoutList,
        },
      },
      subscriptions: {
        list: mockSubscriptionsList,
        cancel: mockSubscriptionsCancel,
      },
      customers: {
        list: mockCustomersList,
      },
    })),
  };
});

// Mock env
vi.mock("./_core/env", () => ({
  ENV: {
    stripeSecretKey: "sk_test_fake",
    forgeApiUrl: "https://api.test.com",
    forgeApiKey: "test-key",
    ownerOpenId: "owner-1",
  },
}));

// Mock products
vi.mock("./stripe/products", () => ({
  PRODUCTS: {
    FREIGHT_PAYMENT: { name: "Pagamento de Frete", description: "Pagamento de frete" },
    DRIVER_ADVANCE: { name: "Adiantamento Motorista", description: "Adiantamento para motorista" },
    RECURRING_INVOICE: { name: "Fatura Recorrente", description: "Fatura recorrente de transporte" },
  },
}));

// Mock db
vi.mock("./db", () => ({
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getDb: vi.fn(),
  listAlerts: vi.fn().mockResolvedValue([]),
  createAlert: vi.fn(),
  markAlertRead: vi.fn(),
  markAllAlertsRead: vi.fn(),
  getDashboardKPIs: vi.fn().mockResolvedValue({}),
  listOrders: vi.fn().mockResolvedValue([]),
  getOrderById: vi.fn(),
  createOrder: vi.fn(),
  updateOrder: vi.fn(),
  getOrderItems: vi.fn().mockResolvedValue([]),
  createOrderItem: vi.fn(),
  addOrderStatusHistory: vi.fn(),
  getOrderStatusHistory: vi.fn().mockResolvedValue([]),
  listDrivers: vi.fn().mockResolvedValue([]),
  getDriverById: vi.fn(),
  createDriver: vi.fn(),
  updateDriver: vi.fn(),
  listVehicles: vi.fn().mockResolvedValue([]),
  createVehicle: vi.fn(),
  updateVehicle: vi.fn(),
  listClients: vi.fn().mockResolvedValue([]),
  getClientById: vi.fn(),
  createClient: vi.fn(),
  updateClient: vi.fn(),
  listWarehouses: vi.fn().mockResolvedValue([]),
  getWarehouseById: vi.fn(),
  createWarehouse: vi.fn(),
  updateWarehouse: vi.fn(),
  listInventory: vi.fn().mockResolvedValue([]),
  getInventoryById: vi.fn(),
  createInventoryItem: vi.fn(),
  updateInventoryItem: vi.fn(),
  createInventoryMovement: vi.fn(),
  listInventoryMovements: vi.fn().mockResolvedValue([]),
  listQuotes: vi.fn().mockResolvedValue([]),
  getQuoteById: vi.fn(),
  createQuote: vi.fn(),
  updateQuote: vi.fn(),
  listRoutes: vi.fn().mockResolvedValue([]),
  getRouteById: vi.fn(),
  createRoute: vi.fn(),
  updateRoute: vi.fn(),
  getTrackingByOrder: vi.fn().mockResolvedValue([]),
  getTrackingByRoute: vi.fn().mockResolvedValue([]),
  getLatestTrackingByVehicle: vi.fn(),
  addTrackingPoint: vi.fn(),
  listFiscalDocuments: vi.fn().mockResolvedValue([]),
  createFiscalDocument: vi.fn(),
  updateFiscalDocument: vi.fn(),
  listFinancialTransactions: vi.fn().mockResolvedValue([]),
  createFinancialTransaction: vi.fn(),
  updateFinancialTransaction: vi.fn(),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@trfarias.com.br",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: { origin: "https://test.manus.space" } } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("stripe", () => {
  const caller = appRouter.createCaller(createTestContext());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createCheckout", () => {
    it("creates a freight payment checkout session", async () => {
      mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/session/123" });

      const result = await caller.stripe.createCheckout({
        type: "freight",
        amount: 1500,
        description: "Frete SP-RJ",
      });

      expect(result.url).toBe("https://checkout.stripe.com/session/123");
      expect(mockCheckoutCreate).toHaveBeenCalledTimes(1);
      expect(mockCheckoutCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "payment",
          line_items: expect.arrayContaining([
            expect.objectContaining({
              price_data: expect.objectContaining({
                currency: "brl",
                unit_amount: 150000,
              }),
            }),
          ]),
        })
      );
    });

    it("creates an advance payment checkout session", async () => {
      mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/session/456" });

      const result = await caller.stripe.createCheckout({
        type: "advance",
        amount: 500,
      });

      expect(result.url).toBe("https://checkout.stripe.com/session/456");
    });
  });

  describe("createSubscription", () => {
    it("creates a monthly subscription checkout", async () => {
      mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/sub/789" });

      const result = await caller.stripe.createSubscription({
        amount: 2000,
        interval: "month",
        clientName: "Empresa ABC",
        description: "Fatura mensal de transporte",
      });

      expect(result.url).toBe("https://checkout.stripe.com/sub/789");
      expect(mockCheckoutCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "subscription",
          line_items: expect.arrayContaining([
            expect.objectContaining({
              price_data: expect.objectContaining({
                currency: "brl",
                unit_amount: 200000,
                recurring: { interval: "month" },
              }),
            }),
          ]),
        })
      );
    });

    it("creates a weekly subscription checkout", async () => {
      mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/sub/weekly" });

      const result = await caller.stripe.createSubscription({
        amount: 500,
        interval: "week",
      });

      expect(result.url).toBeDefined();
      expect(mockCheckoutCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "subscription",
          line_items: expect.arrayContaining([
            expect.objectContaining({
              price_data: expect.objectContaining({
                recurring: { interval: "week" },
              }),
            }),
          ]),
        })
      );
    });
  });

  describe("listSubscriptions", () => {
    it("returns empty array when no customer found", async () => {
      mockCustomersList.mockResolvedValue({ data: [] });

      const result = await caller.stripe.listSubscriptions();
      expect(result).toEqual([]);
    });

    it("returns subscriptions for existing customer", async () => {
      mockCustomersList.mockResolvedValue({ data: [{ id: "cus_123" }] });
      mockSubscriptionsList.mockResolvedValue({
        data: [{
          id: "sub_abc",
          status: "active",
          created: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 2592000,
          items: { data: [{ price: { unit_amount: 200000, currency: "brl", recurring: { interval: "month" } } }] },
        }],
      });

      const result = await caller.stripe.listSubscriptions();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("sub_abc");
      expect(result[0].status).toBe("active");
      expect(result[0].amount).toBe(2000);
      expect(result[0].interval).toBe("month");
    });
  });

  describe("cancelSubscription", () => {
    it("cancels a subscription successfully", async () => {
      mockSubscriptionsCancel.mockResolvedValue({ id: "sub_abc", status: "canceled" });

      const result = await caller.stripe.cancelSubscription({ subscriptionId: "sub_abc" });
      expect(result.success).toBe(true);
      expect(mockSubscriptionsCancel).toHaveBeenCalledWith("sub_abc");
    });
  });

  describe("getPaymentHistory", () => {
    it("returns empty array on error", async () => {
      mockCheckoutList.mockRejectedValue(new Error("API error"));

      const result = await caller.stripe.getPaymentHistory();
      expect(result).toEqual([]);
    });

    it("returns filtered payment history", async () => {
      mockCheckoutList.mockResolvedValue({
        data: [
          { id: "cs_1", client_reference_id: "1", payment_status: "paid", amount_total: 150000, currency: "brl", created: Math.floor(Date.now() / 1000), metadata: { type: "freight" } },
          { id: "cs_2", client_reference_id: "2", payment_status: "paid", amount_total: 50000, currency: "brl", created: Math.floor(Date.now() / 1000), metadata: { type: "advance" } },
        ],
      });

      const result = await caller.stripe.getPaymentHistory();
      expect(result).toHaveLength(1); // Only user 1's payments
      expect(result[0].amount).toBe(1500);
      expect(result[0].type).toBe("freight");
    });
  });
});
