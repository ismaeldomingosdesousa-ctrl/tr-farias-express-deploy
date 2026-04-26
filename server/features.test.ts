import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock database module
vi.mock("./db", () => ({
  listOrders: vi.fn().mockResolvedValue([
    { id: 1, orderNumber: "ORD-ABC123", status: "pending", clientId: 1, originCity: "São Paulo", originState: "SP", destCity: "Rio de Janeiro", destState: "RJ", freightValue: 1500, createdAt: new Date() },
    { id: 2, orderNumber: "ORD-DEF456", status: "in_transit", clientId: 2, originCity: "Curitiba", originState: "PR", destCity: "Florianópolis", destState: "SC", freightValue: 800, createdAt: new Date() },
  ]),
  getOrderById: vi.fn().mockResolvedValue({ id: 1, orderNumber: "ORD-ABC123", status: "pending", clientId: 1 }),
  createOrder: vi.fn().mockResolvedValue(1),
  updateOrder: vi.fn().mockResolvedValue(undefined),
  getOrderItems: vi.fn().mockResolvedValue([]),
  createOrderItem: vi.fn().mockResolvedValue(1),
  addOrderStatusHistory: vi.fn().mockResolvedValue(undefined),
  getOrderStatusHistory: vi.fn().mockResolvedValue([]),
  listDrivers: vi.fn().mockResolvedValue([
    { id: 1, name: "João Silva", cpf: "12345678900", cnh: "CNH123", cnhCategory: "E", status: "available", totalTrips: 50, rating: 4.8 },
  ]),
  getDriverById: vi.fn().mockResolvedValue({ id: 1, name: "João Silva", cpf: "12345678900", cnh: "CNH123", status: "available" }),
  createDriver: vi.fn().mockResolvedValue(1),
  updateDriver: vi.fn().mockResolvedValue(undefined),
  listVehicles: vi.fn().mockResolvedValue([
    { id: 1, plate: "ABC-1234", type: "truck", brand: "Volvo", model: "FH 540", capacityKg: 30000, status: "available" },
  ]),
  createVehicle: vi.fn().mockResolvedValue(1),
  updateVehicle: vi.fn().mockResolvedValue(undefined),
  listClients: vi.fn().mockResolvedValue([
    { id: 1, companyName: "Empresa Teste", cnpj: "12345678000100", status: "active" },
  ]),
  createClient: vi.fn().mockResolvedValue(1),
  updateClient: vi.fn().mockResolvedValue(undefined),
  listWarehouses: vi.fn().mockResolvedValue([
    { id: 1, name: "Armazém Central", code: "WH-001", status: "active", totalCapacityM3: 5000 },
  ]),
  getWarehouseById: vi.fn().mockResolvedValue({ id: 1, name: "Armazém Central", code: "WH-001" }),
  createWarehouse: vi.fn().mockResolvedValue(1),
  updateWarehouse: vi.fn().mockResolvedValue(undefined),
  listInventory: vi.fn().mockResolvedValue([
    { id: 1, sku: "SKU-001", productName: "Produto Teste", availableQty: 100, minQty: 10, warehouseId: 1 },
  ]),
  getInventoryById: vi.fn().mockResolvedValue({ id: 1, sku: "SKU-001", availableQty: 100, warehouseId: 1 }),
  createInventoryItem: vi.fn().mockResolvedValue(1),
  updateInventoryItem: vi.fn().mockResolvedValue(undefined),
  createInventoryMovement: vi.fn().mockResolvedValue(1),
  listInventoryMovements: vi.fn().mockResolvedValue([]),
  listQuotes: vi.fn().mockResolvedValue([
    { id: 1, quoteNumber: "QT-ABC123", status: "pending", totalPrice: 2500, originCity: "SP", destCity: "RJ" },
  ]),
  createQuote: vi.fn().mockResolvedValue(1),
  updateQuote: vi.fn().mockResolvedValue(undefined),
  listRoutes: vi.fn().mockResolvedValue([
    { id: 1, routeCode: "RT-001", status: "planned", distanceKm: 450 },
  ]),
  createRoute: vi.fn().mockResolvedValue(1),
  updateRoute: vi.fn().mockResolvedValue(undefined),
  getRouteById: vi.fn().mockResolvedValue({
    id: 1, routeCode: "RT-001", status: "in_progress", distanceKm: 450,
    originLat: -23.55, originLng: -46.63, destLat: -22.90, destLng: -43.17,
  }),
  getTrackingByOrder: vi.fn().mockResolvedValue([]),
  getTrackingByRoute: vi.fn().mockResolvedValue([]),
  getLatestTrackingByVehicle: vi.fn().mockResolvedValue(null),
  addTrackingPoint: vi.fn().mockResolvedValue(undefined),
  listFiscalDocuments: vi.fn().mockResolvedValue([
    { id: 1, number: "CTE-001", type: "cte", series: "1", status: "draft", totalValue: 1500 },
  ]),
  createFiscalDocument: vi.fn().mockResolvedValue(1),
  updateFiscalDocument: vi.fn().mockResolvedValue(undefined),
  listFinancialTransactions: vi.fn().mockResolvedValue([
    { id: 1, type: "receivable", category: "frete", amount: 1500, status: "pending", dueDate: new Date() },
  ]),
  createFinancialTransaction: vi.fn().mockResolvedValue(1),
  updateFinancialTransaction: vi.fn().mockResolvedValue(undefined),
  listAlerts: vi.fn().mockResolvedValue([
    { id: 1, type: "delivery_delay", severity: "warning", title: "Atraso", message: "Entrega atrasada", isRead: false, createdAt: new Date() },
  ]),
  createAlert: vi.fn().mockResolvedValue(undefined),
  markAlertRead: vi.fn().mockResolvedValue(undefined),
  markAllAlertsRead: vi.fn().mockResolvedValue(undefined),
  getDashboardKPIs: vi.fn().mockResolvedValue({
    totalOrders: 10, pendingOrders: 3, inTransitOrders: 4, deliveredOrders: 3,
    activeDrivers: 5, availableVehicles: 8, totalRevenue: 15000, unreadAlerts: 2,
    confirmedRevenue: 10000, pendingRevenue: 5000, activeClients: 3,
    deliveryRate: 75, fleetOccupancy: 40, processingOrders: 2,
  }),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getDb: vi.fn(),
}));

// Mock notification module
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(role: "user" | "admin" = "admin"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@trfarias.com.br",
    name: "Test User",
    loginMethod: "manus",
    role,
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

// ─── ORDERS (OMS) ────────────────────────────────────────
describe("orders", () => {
  const caller = appRouter.createCaller(createTestContext());

  it("lists orders", async () => {
    const result = await caller.orders.list();
    expect(result).toHaveLength(2);
    expect(result[0].orderNumber).toBe("ORD-ABC123");
  });

  it("lists orders filtered by status", async () => {
    const result = await caller.orders.list({ status: "in_transit" });
    expect(result).toBeDefined();
  });

  it("gets order by id", async () => {
    const result = await caller.orders.getById({ id: 1 });
    expect(result).toBeDefined();
    expect(result?.orderNumber).toBe("ORD-ABC123");
  });

  it("creates an order with auto-generated number", async () => {
    const result = await caller.orders.create({
      clientId: 1,
      originCity: "São Paulo",
      originState: "SP",
      destCity: "Rio de Janeiro",
      destState: "RJ",
      totalWeight: 500,
      freightValue: 1500,
    });
    expect(result.id).toBe(1);
    expect(result.orderNumber).toMatch(/^ORD-/);
  });

  it("updates order status with history", async () => {
    const result = await caller.orders.updateStatus({
      id: 1,
      status: "confirmed",
      notes: "Confirmado pelo operador",
    });
    expect(result.success).toBe(true);
  });
});

// ─── DRIVERS ─────────────────────────────────────────────
describe("drivers", () => {
  const caller = appRouter.createCaller(createTestContext());

  it("lists drivers", async () => {
    const result = await caller.drivers.list();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("João Silva");
  });

  it("creates a driver", async () => {
    const result = await caller.drivers.create({
      name: "Maria Santos",
      cpf: "98765432100",
      cnh: "CNH456",
      cnhCategory: "D",
      phone: "11999999999",
    });
    expect(result.id).toBe(1);
  });
});

// ─── VEHICLES (TMS) ─────────────────────────────────────
describe("vehicles", () => {
  const caller = appRouter.createCaller(createTestContext());

  it("lists vehicles", async () => {
    const result = await caller.vehicles.list();
    expect(result).toHaveLength(1);
    expect(result[0].plate).toBe("ABC-1234");
  });

  it("creates a vehicle", async () => {
    const result = await caller.vehicles.create({
      plate: "XYZ-9876",
      type: "truck",
      brand: "Scania",
      model: "R 450",
      capacityKg: 25000,
    });
    expect(result.id).toBe(1);
  });
});

// ─── WAREHOUSE (WMS) ────────────────────────────────────
describe("warehouse", () => {
  const caller = appRouter.createCaller(createTestContext());

  it("lists warehouses", async () => {
    const result = await caller.warehouse.list();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Armazém Central");
  });

  it("lists inventory items", async () => {
    const result = await caller.warehouse.inventoryList();
    expect(result).toHaveLength(1);
    expect(result[0].sku).toBe("SKU-001");
  });
});

// ─── QUOTES ─────────────────────────────────────────────
describe("quotes", () => {
  const caller = appRouter.createCaller(createTestContext());

  it("lists quotes", async () => {
    const result = await caller.quotes.list();
    expect(result).toHaveLength(1);
    expect(result[0].quoteNumber).toBe("QT-ABC123");
  });

  it("creates a quote", async () => {
    const result = await caller.quotes.create({
      originZip: "01001-000",
      originCity: "São Paulo",
      originState: "SP",
      destZip: "30130-000",
      destCity: "Belo Horizonte",
      destState: "MG",
      weightKg: 1000,
      volumeM3: 5,
      distanceKm: 580,
      urgency: "standard",
    });
    expect(result.id).toBe(1);
    expect(result.quoteNumber).toMatch(/^COT-/);
  });
});

// ─── ROUTES (TMS) ───────────────────────────────────────
describe("routes", () => {
  const caller = appRouter.createCaller(createTestContext());

  it("lists routes", async () => {
    const result = await caller.routes.list();
    expect(result).toHaveLength(1);
    expect(result[0].routeCode).toBe("RT-001");
  });
});

// ─── FISCAL ─────────────────────────────────────────────
describe("fiscal", () => {
  const caller = appRouter.createCaller(createTestContext());

  it("lists fiscal documents", async () => {
    const result = await caller.fiscal.list();
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("cte");
  });

  it("creates a fiscal document", async () => {
    const result = await caller.fiscal.create({
      type: "cte",
      totalValue: 1500,
    });
    expect(result.id).toBe(1);
    expect(result.number).toBeDefined();
  });
});

// ─── FINANCIAL ──────────────────────────────────────────
describe("financial", () => {
  const caller = appRouter.createCaller(createTestContext());

  it("lists financial transactions", async () => {
    const result = await caller.financial.list();
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("receivable");
  });

  it("creates a financial transaction", async () => {
    const result = await caller.financial.create({
      type: "receivable",
      category: "frete",
      amount: 2500,
      dueDate: new Date(),
    });
    expect(result.id).toBe(1);
  });
});

// ─── ALERTS ─────────────────────────────────────────────
describe("alerts", () => {
  const caller = appRouter.createCaller(createTestContext());

  it("lists alerts", async () => {
    const result = await caller.alerts.list();
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("warning");
  });

  it("marks alert as read", async () => {
    await caller.alerts.markRead({ id: 1 });
    // Should not throw
  });

  it("marks all alerts as read", async () => {
    await caller.alerts.markAllRead();
    // Should not throw
  });
});

// ─── DASHBOARD ──────────────────────────────────────────
describe("dashboard", () => {
  const caller = appRouter.createCaller(createTestContext());

  it("returns KPIs", async () => {
    const result = await caller.dashboard.kpis();
    expect(result.totalOrders).toBe(10);
    expect(result.activeDrivers).toBe(5);
    expect(result.totalRevenue).toBe(15000);
    expect(result.deliveryRate).toBe(75);
  });
});

// ─── CLIENTS ────────────────────────────────────────────
describe("clients", () => {
  const caller = appRouter.createCaller(createTestContext());

  it("lists clients", async () => {
    const result = await caller.clients.list();
    expect(result).toHaveLength(1);
    expect(result[0].companyName).toBe("Empresa Teste");
  });

  it("creates a client", async () => {
    const result = await caller.clients.create({
      name: "Nova Empresa",
      cnpj: "98765432000100",
      contactPerson: "Fulano",
      phone: "11888888888",
    });
    expect(result.id).toBe(1);
  });
});

// ─── TRACKING ───────────────────────────────────────────
describe("tracking", () => {
  const caller = appRouter.createCaller(createTestContext());

  it("lists tracking events by order", async () => {
    const result = await caller.tracking.byOrder({ orderId: 1 });
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("adds a tracking point", async () => {
    const result = await caller.tracking.addPoint({
      orderId: 1,
      lat: -23.55,
      lng: -46.63,
      eventType: "pickup",
      notes: "Carga coletada",
    });
    expect(result.success).toBe(true);
  });

  it("calculates ETA for a route", async () => {
    const result = await caller.tracking.calculateETA({
      routeId: 1,
      currentLat: -23.20,
      currentLng: -45.90,
      speedKmh: 80,
    });
    expect(result).toBeDefined();
    expect("routeId" in result).toBe(true);
    if ("routeId" in result) {
      expect(result.routeId).toBe(1);
      expect(result.remainingDistanceKm).toBeGreaterThan(0);
      expect(result.etaMinutes).toBeGreaterThan(0);
      expect(result.estimatedArrival).toBeGreaterThan(Date.now() - 60000);
    }
  });

  it("checks geofence - vehicle within corridor", async () => {
    // Point on the line between SP and RJ
    const result = await caller.tracking.checkGeofence({
      routeId: 1,
      lat: -23.20,
      lng: -44.90,
      corridorRadiusKm: 50,
    });
    expect(result).toBeDefined();
    expect(result.withinGeofence).toBe(true);
    expect(result.deviationDetected).toBe(false);
  });

  it("checks geofence - vehicle outside corridor", async () => {
    // Point far away from SP-RJ route (e.g., Manaus)
    const result = await caller.tracking.checkGeofence({
      routeId: 1,
      lat: -3.12,
      lng: -60.02,
      corridorRadiusKm: 15,
    });
    expect(result).toBeDefined();
    expect(result.withinGeofence).toBe(false);
    expect(result.deviationDetected).toBe(true);
  });

  it("adds tracking point with geofence auto-check", async () => {
    const result = await caller.tracking.addPoint({
      routeId: 1,
      lat: -3.12,
      lng: -60.02,
      eventType: "position_update",
    });
    expect(result.success).toBe(true);
    // Should have created a geofence breach alert
  });
});
