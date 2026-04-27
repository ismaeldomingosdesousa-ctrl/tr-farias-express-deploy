import { eq, desc, sql, and, asc, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  InsertUser, users,
  clients, InsertClient,
  drivers, InsertDriver,
  vehicles, InsertVehicle,
  warehouses, InsertWarehouse,
  inventory, InsertInventory,
  inventoryMovements, InsertInventoryMovement,
  orders, InsertOrder,
  orderItems, InsertOrderItem,
  orderStatusHistory,
  quotes, InsertQuote,
  routes, InsertRoute,
  trackingPoints, InsertTrackingPoint,
  fiscalDocuments, InsertFiscalDocument,
  financialTransactions, InsertFinancialTransaction,
  alerts, InsertAlert,
  userCredentials,
} from "../drizzle/schema";
import { ENV } from './_core/env';

// Set once per Worker request via initDb(env.DB)
let _d1: any = null;

export function initDb(d1: any): void {
  _d1 = d1;
}

export function getDb() {
  if (!_d1) return null;
  return drizzle(_d1);
}

// ─── USER HELPERS ────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onConflictDoUpdate({
    target: users.openId,
    set: updateSet as any,
  });
}

export async function getUserByOpenId(openId: string) {
  const db = getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── LOCAL AUTH HELPERS ──────────────────────────────────
export async function getUserCredentialsByEmail(email: string) {
  const db = getDb(); if (!db) return undefined;
  const r = await db.select().from(userCredentials).where(eq(userCredentials.email, email.toLowerCase())).limit(1);
  return r[0];
}
export async function upsertLocalUser(email: string, passwordHash: string, name: string, role: "user" | "admin" = "user") {
  const db = getDb(); if (!db) return;
  await db.insert(userCredentials).values({ email: email.toLowerCase(), passwordHash, name, role })
    .onConflictDoUpdate({ target: userCredentials.email, set: { passwordHash, name, role, updatedAt: new Date() } });
}

// ─── CLIENT HELPERS ──────────────────────────────────────
export async function listClients() {
  const db = getDb(); if (!db) return [];
  return db.select().from(clients).orderBy(desc(clients.createdAt));
}
export async function getClientById(id: number) {
  const db = getDb(); if (!db) return undefined;
  const r = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return r[0];
}
export async function createClient(data: InsertClient) {
  const db = getDb(); if (!db) return;
  const r = await db.insert(clients).values(data).returning({ id: clients.id });
  return r[0]?.id;
}
export async function updateClient(id: number, data: Partial<InsertClient>) {
  const db = getDb(); if (!db) return;
  await db.update(clients).set({ ...data, updatedAt: new Date() }).where(eq(clients.id, id));
}

// ─── DRIVER HELPERS ──────────────────────────────────────
export async function listDrivers() {
  const db = getDb(); if (!db) return [];
  return db.select().from(drivers).orderBy(desc(drivers.createdAt));
}
export async function getDriverById(id: number) {
  const db = getDb(); if (!db) return undefined;
  const r = await db.select().from(drivers).where(eq(drivers.id, id)).limit(1);
  return r[0];
}
export async function createDriver(data: InsertDriver) {
  const db = getDb(); if (!db) return;
  const r = await db.insert(drivers).values(data).returning({ id: drivers.id });
  return r[0]?.id;
}
export async function updateDriver(id: number, data: Partial<InsertDriver>) {
  const db = getDb(); if (!db) return;
  await db.update(drivers).set({ ...data, updatedAt: new Date() }).where(eq(drivers.id, id));
}

// ─── VEHICLE HELPERS ─────────────────────────────────────
export async function listVehicles() {
  const db = getDb(); if (!db) return [];
  return db.select().from(vehicles).orderBy(desc(vehicles.createdAt));
}
export async function getVehicleById(id: number) {
  const db = getDb(); if (!db) return undefined;
  const r = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
  return r[0];
}
export async function createVehicle(data: InsertVehicle) {
  const db = getDb(); if (!db) return;
  const r = await db.insert(vehicles).values(data).returning({ id: vehicles.id });
  return r[0]?.id;
}
export async function updateVehicle(id: number, data: Partial<InsertVehicle>) {
  const db = getDb(); if (!db) return;
  await db.update(vehicles).set({ ...data, updatedAt: new Date() }).where(eq(vehicles.id, id));
}

// ─── WAREHOUSE HELPERS ───────────────────────────────────
export async function listWarehouses() {
  const db = getDb(); if (!db) return [];
  return db.select().from(warehouses).orderBy(desc(warehouses.createdAt));
}
export async function getWarehouseById(id: number) {
  const db = getDb(); if (!db) return undefined;
  const r = await db.select().from(warehouses).where(eq(warehouses.id, id)).limit(1);
  return r[0];
}
export async function createWarehouse(data: InsertWarehouse) {
  const db = getDb(); if (!db) return;
  const r = await db.insert(warehouses).values(data).returning({ id: warehouses.id });
  return r[0]?.id;
}
export async function updateWarehouse(id: number, data: Partial<InsertWarehouse>) {
  const db = getDb(); if (!db) return;
  await db.update(warehouses).set({ ...data, updatedAt: new Date() }).where(eq(warehouses.id, id));
}

// ─── INVENTORY HELPERS ───────────────────────────────────
export async function listInventory(warehouseId?: number) {
  const db = getDb(); if (!db) return [];
  if (warehouseId) {
    return db.select().from(inventory).where(eq(inventory.warehouseId, warehouseId)).orderBy(asc(inventory.productName));
  }
  return db.select().from(inventory).orderBy(asc(inventory.productName));
}
export async function getInventoryById(id: number) {
  const db = getDb(); if (!db) return undefined;
  const r = await db.select().from(inventory).where(eq(inventory.id, id)).limit(1);
  return r[0];
}
export async function createInventoryItem(data: InsertInventory) {
  const db = getDb(); if (!db) return;
  const r = await db.insert(inventory).values(data).returning({ id: inventory.id });
  return r[0]?.id;
}
export async function updateInventoryItem(id: number, data: Partial<InsertInventory>) {
  const db = getDb(); if (!db) return;
  await db.update(inventory).set({ ...data, updatedAt: new Date() }).where(eq(inventory.id, id));
}
export async function createInventoryMovement(data: InsertInventoryMovement) {
  const db = getDb(); if (!db) return;
  await db.insert(inventoryMovements).values(data);
}
export async function listInventoryMovements(warehouseId?: number) {
  const db = getDb(); if (!db) return [];
  if (warehouseId) {
    return db.select().from(inventoryMovements).where(eq(inventoryMovements.warehouseId, warehouseId)).orderBy(desc(inventoryMovements.createdAt)).limit(100);
  }
  return db.select().from(inventoryMovements).orderBy(desc(inventoryMovements.createdAt)).limit(100);
}

// ─── ORDER HELPERS ───────────────────────────────────────
export async function listOrders(filters?: { status?: string; clientId?: number }) {
  const db = getDb(); if (!db) return [];
  const conditions = [];
  if (filters?.status) conditions.push(eq(orders.status, filters.status as any));
  if (filters?.clientId) conditions.push(eq(orders.clientId, filters.clientId));
  if (conditions.length > 0) {
    return db.select().from(orders).where(and(...conditions)).orderBy(desc(orders.createdAt));
  }
  return db.select().from(orders).orderBy(desc(orders.createdAt));
}
export async function getOrderById(id: number) {
  const db = getDb(); if (!db) return undefined;
  const r = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return r[0];
}
export async function createOrder(data: InsertOrder) {
  const db = getDb(); if (!db) return;
  const r = await db.insert(orders).values(data).returning({ id: orders.id });
  return r[0]?.id;
}
export async function updateOrder(id: number, data: Partial<InsertOrder>) {
  const db = getDb(); if (!db) return;
  await db.update(orders).set({ ...data, updatedAt: new Date() }).where(eq(orders.id, id));
}
export async function getOrderItems(orderId: number) {
  const db = getDb(); if (!db) return [];
  return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
}
export async function createOrderItem(data: InsertOrderItem) {
  const db = getDb(); if (!db) return;
  await db.insert(orderItems).values(data);
}
export async function addOrderStatusHistory(orderId: number, fromStatus: string | null, toStatus: string, userId?: number, notes?: string) {
  const db = getDb(); if (!db) return;
  await db.insert(orderStatusHistory).values({ orderId, fromStatus, toStatus, userId, notes });
}
export async function getOrderStatusHistory(orderId: number) {
  const db = getDb(); if (!db) return [];
  return db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, orderId)).orderBy(desc(orderStatusHistory.createdAt));
}

// ─── QUOTE HELPERS ───────────────────────────────────────
export async function listQuotes() {
  const db = getDb(); if (!db) return [];
  return db.select().from(quotes).orderBy(desc(quotes.createdAt));
}
export async function getQuoteById(id: number) {
  const db = getDb(); if (!db) return undefined;
  const r = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
  return r[0];
}
export async function createQuote(data: InsertQuote) {
  const db = getDb(); if (!db) return;
  const r = await db.insert(quotes).values(data).returning({ id: quotes.id });
  return r[0]?.id;
}
export async function updateQuote(id: number, data: Partial<InsertQuote>) {
  const db = getDb(); if (!db) return;
  await db.update(quotes).set({ ...data, updatedAt: new Date() }).where(eq(quotes.id, id));
}

// ─── ROUTE HELPERS ───────────────────────────────────────
export async function listRoutes() {
  const db = getDb(); if (!db) return [];
  return db.select().from(routes).orderBy(desc(routes.createdAt));
}
export async function getRouteById(id: number) {
  const db = getDb(); if (!db) return undefined;
  const r = await db.select().from(routes).where(eq(routes.id, id)).limit(1);
  return r[0];
}
export async function createRoute(data: InsertRoute) {
  const db = getDb(); if (!db) return;
  const r = await db.insert(routes).values(data).returning({ id: routes.id });
  return r[0]?.id;
}
export async function updateRoute(id: number, data: Partial<InsertRoute>) {
  const db = getDb(); if (!db) return;
  await db.update(routes).set({ ...data, updatedAt: new Date() }).where(eq(routes.id, id));
}

// ─── TRACKING HELPERS ────────────────────────────────────
export async function addTrackingPoint(data: InsertTrackingPoint) {
  const db = getDb(); if (!db) return;
  await db.insert(trackingPoints).values(data);
}
export async function getTrackingByOrder(orderId: number) {
  const db = getDb(); if (!db) return [];
  return db.select().from(trackingPoints).where(eq(trackingPoints.orderId, orderId)).orderBy(asc(trackingPoints.createdAt));
}
export async function getTrackingByRoute(routeId: number) {
  const db = getDb(); if (!db) return [];
  return db.select().from(trackingPoints).where(eq(trackingPoints.routeId, routeId)).orderBy(asc(trackingPoints.createdAt));
}
export async function getLatestTrackingByVehicle(vehicleId: number) {
  const db = getDb(); if (!db) return undefined;
  const r = await db.select().from(trackingPoints).where(eq(trackingPoints.vehicleId, vehicleId)).orderBy(desc(trackingPoints.createdAt)).limit(1);
  return r[0];
}

// ─── FISCAL DOCUMENT HELPERS ─────────────────────────────
export async function listFiscalDocuments(type?: string) {
  const db = getDb(); if (!db) return [];
  if (type) {
    return db.select().from(fiscalDocuments).where(eq(fiscalDocuments.type, type as any)).orderBy(desc(fiscalDocuments.createdAt));
  }
  return db.select().from(fiscalDocuments).orderBy(desc(fiscalDocuments.createdAt));
}
export async function getFiscalDocById(id: number) {
  const db = getDb(); if (!db) return undefined;
  const r = await db.select().from(fiscalDocuments).where(eq(fiscalDocuments.id, id)).limit(1);
  return r[0];
}
export async function createFiscalDocument(data: InsertFiscalDocument) {
  const db = getDb(); if (!db) return;
  const r = await db.insert(fiscalDocuments).values(data).returning({ id: fiscalDocuments.id });
  return r[0]?.id;
}
export async function updateFiscalDocument(id: number, data: Partial<InsertFiscalDocument>) {
  const db = getDb(); if (!db) return;
  await db.update(fiscalDocuments).set({ ...data, updatedAt: new Date() }).where(eq(fiscalDocuments.id, id));
}

// ─── FINANCIAL HELPERS ───────────────────────────────────
export async function listFinancialTransactions(filters?: { type?: string; status?: string }) {
  const db = getDb(); if (!db) return [];
  const conditions = [];
  if (filters?.type) conditions.push(eq(financialTransactions.type, filters.type as any));
  if (filters?.status) conditions.push(eq(financialTransactions.status, filters.status as any));
  if (conditions.length > 0) {
    return db.select().from(financialTransactions).where(and(...conditions)).orderBy(desc(financialTransactions.createdAt));
  }
  return db.select().from(financialTransactions).orderBy(desc(financialTransactions.createdAt));
}
export async function getFinancialTransactionById(id: number) {
  const db = getDb(); if (!db) return undefined;
  const r = await db.select().from(financialTransactions).where(eq(financialTransactions.id, id)).limit(1);
  return r[0];
}
export async function createFinancialTransaction(data: InsertFinancialTransaction) {
  const db = getDb(); if (!db) return;
  const r = await db.insert(financialTransactions).values(data).returning({ id: financialTransactions.id });
  return r[0]?.id;
}
export async function updateFinancialTransaction(id: number, data: Partial<InsertFinancialTransaction>) {
  const db = getDb(); if (!db) return;
  await db.update(financialTransactions).set({ ...data, updatedAt: new Date() }).where(eq(financialTransactions.id, id));
}

// ─── ALERT HELPERS ───────────────────────────────────────
export async function listAlerts(userId?: number, unreadOnly?: boolean) {
  const db = getDb(); if (!db) return [];
  const conditions = [];
  if (userId) conditions.push(eq(alerts.userId, userId));
  if (unreadOnly) conditions.push(eq(alerts.isRead, false));
  if (conditions.length > 0) {
    return db.select().from(alerts).where(and(...conditions)).orderBy(desc(alerts.createdAt)).limit(50);
  }
  return db.select().from(alerts).orderBy(desc(alerts.createdAt)).limit(50);
}
export async function createAlert(data: InsertAlert) {
  const db = getDb(); if (!db) return;
  await db.insert(alerts).values(data);
}
export async function markAlertRead(id: number) {
  const db = getDb(); if (!db) return;
  await db.update(alerts).set({ isRead: true }).where(eq(alerts.id, id));
}
export async function markAllAlertsRead(userId: number) {
  const db = getDb(); if (!db) return;
  await db.update(alerts).set({ isRead: true }).where(eq(alerts.userId, userId));
}

// ─── DASHBOARD KPI HELPERS ───────────────────────────────
export async function getDashboardKPIs() {
  const db = getDb();
  if (!db) return {
    totalOrders: 0, pendingOrders: 0, inTransitOrders: 0, deliveredOrders: 0,
    activeDrivers: 0, availableVehicles: 0, totalClients: 0,
    totalRevenue: 0, pendingRevenue: 0, unreadAlerts: 0,
  };

  const [orderStats] = await db.select({
    total: count(),
    pending: sql<number>`SUM(CASE WHEN status IN ('pending','confirmed','picking','packed','awaiting_pickup') THEN 1 ELSE 0 END)`,
    inTransit: sql<number>`SUM(CASE WHEN status = 'in_transit' THEN 1 ELSE 0 END)`,
    delivered: sql<number>`SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END)`,
  }).from(orders);

  const [driverStats] = await db.select({
    active: sql<number>`SUM(CASE WHEN status IN ('available','on_trip') THEN 1 ELSE 0 END)`,
  }).from(drivers);

  const [vehicleStats] = await db.select({
    available: sql<number>`SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END)`,
  }).from(vehicles);

  const [clientStats] = await db.select({ total: count() }).from(clients);

  const [revenueStats] = await db.select({
    totalRevenue: sql<number>`COALESCE(SUM(CASE WHEN type = 'receivable' AND status = 'paid' THEN amount ELSE 0 END), 0)`,
    pendingRevenue: sql<number>`COALESCE(SUM(CASE WHEN type = 'receivable' AND status = 'pending' THEN amount ELSE 0 END), 0)`,
  }).from(financialTransactions);

  const [alertStats] = await db.select({
    unread: sql<number>`SUM(CASE WHEN "isRead" = 0 THEN 1 ELSE 0 END)`,
  }).from(alerts);

  return {
    totalOrders: orderStats?.total ?? 0,
    pendingOrders: Number(orderStats?.pending ?? 0),
    inTransitOrders: Number(orderStats?.inTransit ?? 0),
    deliveredOrders: Number(orderStats?.delivered ?? 0),
    activeDrivers: Number(driverStats?.active ?? 0),
    availableVehicles: Number(vehicleStats?.available ?? 0),
    totalClients: clientStats?.total ?? 0,
    totalRevenue: Number(revenueStats?.totalRevenue ?? 0),
    pendingRevenue: Number(revenueStats?.pendingRevenue ?? 0),
    unreadAlerts: Number(alertStats?.unread ?? 0),
  };
}
