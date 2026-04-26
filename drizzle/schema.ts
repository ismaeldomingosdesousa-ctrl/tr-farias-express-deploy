import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  boolean,
  bigint,
  json,
} from "drizzle-orm/mysql-core";

// ─── USERS ───────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── CLIENTES (Embarcadores) ─────────────────────────────
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  cnpj: varchar("cnpj", { length: 18 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zipCode", { length: 10 }),
  contactPerson: varchar("contactPerson", { length: 255 }),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// ─── MOTORISTAS ──────────────────────────────────────────
export const drivers = mysqlTable("drivers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  cpf: varchar("cpf", { length: 14 }).notNull(),
  cnh: varchar("cnh", { length: 20 }).notNull(),
  cnhCategory: varchar("cnhCategory", { length: 5 }),
  cnhExpiry: timestamp("cnhExpiry"),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  status: mysqlEnum("status", ["available", "on_trip", "inactive", "suspended"]).default("available").notNull(),
  rating: float("rating").default(5.0),
  totalTrips: int("totalTrips").default(0),
  lat: float("lat"),
  lng: float("lng"),
  lastLocationUpdate: timestamp("lastLocationUpdate"),
  cnhDocUrl: text("cnhDocUrl"),
  crlvDocUrl: text("crlvDocUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Driver = typeof drivers.$inferSelect;
export type InsertDriver = typeof drivers.$inferInsert;

// ─── VEÍCULOS ────────────────────────────────────────────
export const vehicles = mysqlTable("vehicles", {
  id: int("id").autoincrement().primaryKey(),
  plate: varchar("plate", { length: 10 }).notNull(),
  type: mysqlEnum("type", ["vuc", "toco", "truck", "carreta", "bitrem", "van", "utilitario"]).notNull(),
  brand: varchar("brand", { length: 100 }),
  model: varchar("model", { length: 100 }),
  year: int("year"),
  capacityKg: float("capacityKg"),
  capacityM3: float("capacityM3"),
  driverId: int("driverId"),
  status: mysqlEnum("status", ["available", "in_use", "maintenance", "inactive"]).default("available").notNull(),
  lat: float("lat"),
  lng: float("lng"),
  lastLocationUpdate: timestamp("lastLocationUpdate"),
  fuelType: varchar("fuelType", { length: 20 }),
  kmCurrent: float("kmCurrent"),
  nextMaintenanceKm: float("nextMaintenanceKm"),
  crlvExpiry: timestamp("crlvExpiry"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = typeof vehicles.$inferInsert;

// ─── ARMAZÉNS ────────────────────────────────────────────
export const warehouses = mysqlTable("warehouses", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 20 }).notNull(),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zipCode", { length: 10 }),
  lat: float("lat"),
  lng: float("lng"),
  totalCapacityM3: float("totalCapacityM3"),
  usedCapacityM3: float("usedCapacityM3").default(0),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Warehouse = typeof warehouses.$inferSelect;
export type InsertWarehouse = typeof warehouses.$inferInsert;

// ─── ESTOQUE ─────────────────────────────────────────────
export const inventory = mysqlTable("inventory", {
  id: int("id").autoincrement().primaryKey(),
  sku: varchar("sku", { length: 50 }).notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  warehouseId: int("warehouseId").notNull(),
  location: varchar("location", { length: 50 }),
  availableQty: int("availableQty").default(0).notNull(),
  reservedQty: int("reservedQty").default(0).notNull(),
  minQty: int("minQty").default(0),
  weightKg: float("weightKg"),
  volumeM3: float("volumeM3"),
  unitPrice: float("unitPrice"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = typeof inventory.$inferInsert;

// ─── MOVIMENTAÇÕES DE ESTOQUE ────────────────────────────
export const inventoryMovements = mysqlTable("inventory_movements", {
  id: int("id").autoincrement().primaryKey(),
  inventoryId: int("inventoryId").notNull(),
  warehouseId: int("warehouseId").notNull(),
  type: mysqlEnum("type", ["inbound", "outbound", "transfer", "adjustment", "picking", "packing"]).notNull(),
  quantity: int("quantity").notNull(),
  reference: varchar("reference", { length: 100 }),
  notes: text("notes"),
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type InsertInventoryMovement = typeof inventoryMovements.$inferInsert;

// ─── PEDIDOS (OMS) ───────────────────────────────────────
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 30 }).notNull().unique(),
  clientId: int("clientId").notNull(),
  status: mysqlEnum("status", [
    "pending", "confirmed", "picking", "packed", "awaiting_pickup",
    "in_transit", "delivered", "cancelled", "returned"
  ]).default("pending").notNull(),
  priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"]).default("normal").notNull(),
  originAddress: text("originAddress"),
  originCity: varchar("originCity", { length: 100 }),
  originState: varchar("originState", { length: 2 }),
  originZip: varchar("originZip", { length: 10 }),
  originLat: float("originLat"),
  originLng: float("originLng"),
  destAddress: text("destAddress"),
  destCity: varchar("destCity", { length: 100 }),
  destState: varchar("destState", { length: 2 }),
  destZip: varchar("destZip", { length: 10 }),
  destLat: float("destLat"),
  destLng: float("destLng"),
  totalWeight: float("totalWeight"),
  totalVolume: float("totalVolume"),
  totalValue: float("totalValue"),
  freightValue: float("freightValue"),
  estimatedDelivery: timestamp("estimatedDelivery"),
  actualDelivery: timestamp("actualDelivery"),
  driverId: int("driverId"),
  vehicleId: int("vehicleId"),
  routeId: int("routeId"),
  warehouseId: int("warehouseId"),
  notes: text("notes"),
  photoProofUrl: text("photoProofUrl"),
  clientNotifiedAt: timestamp("clientNotifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// ─── ITENS DO PEDIDO ─────────────────────────────────────
export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  sku: varchar("sku", { length: 50 }).notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  quantity: int("quantity").notNull(),
  weightKg: float("weightKg"),
  volumeM3: float("volumeM3"),
  unitPrice: float("unitPrice"),
  totalPrice: float("totalPrice"),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

// ─── HISTÓRICO DE STATUS DO PEDIDO ───────────────────────
export const orderStatusHistory = mysqlTable("order_status_history", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  fromStatus: varchar("fromStatus", { length: 30 }),
  toStatus: varchar("toStatus", { length: 30 }).notNull(),
  notes: text("notes"),
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;

// ─── COTAÇÕES ────────────────────────────────────────────
export const quotes = mysqlTable("quotes", {
  id: int("id").autoincrement().primaryKey(),
  quoteNumber: varchar("quoteNumber", { length: 30 }).notNull().unique(),
  clientId: int("clientId"),
  originZip: varchar("originZip", { length: 10 }).notNull(),
  originCity: varchar("originCity", { length: 100 }),
  originState: varchar("originState", { length: 2 }),
  destZip: varchar("destZip", { length: 10 }).notNull(),
  destCity: varchar("destCity", { length: 100 }),
  destState: varchar("destState", { length: 2 }),
  weightKg: float("weightKg").notNull(),
  volumeM3: float("volumeM3"),
  distanceKm: float("distanceKm"),
  urgency: mysqlEnum("urgency", ["standard", "express", "same_day"]).default("standard").notNull(),
  basePrice: float("basePrice"),
  weightPrice: float("weightPrice"),
  distancePrice: float("distancePrice"),
  urgencyMultiplier: float("urgencyMultiplier").default(1.0),
  totalPrice: float("totalPrice"),
  validUntil: timestamp("validUntil"),
  status: mysqlEnum("status", ["pending", "accepted", "rejected", "expired", "converted"]).default("pending").notNull(),
  orderId: int("orderId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = typeof quotes.$inferInsert;

// ─── ROTAS (TMS) ─────────────────────────────────────────
export const routes = mysqlTable("routes", {
  id: int("id").autoincrement().primaryKey(),
  routeCode: varchar("routeCode", { length: 30 }).notNull(),
  driverId: int("driverId"),
  vehicleId: int("vehicleId"),
  status: mysqlEnum("status", ["planned", "in_progress", "completed", "cancelled"]).default("planned").notNull(),
  originAddress: text("originAddress"),
  originLat: float("originLat"),
  originLng: float("originLng"),
  destAddress: text("destAddress"),
  destLat: float("destLat"),
  destLng: float("destLng"),
  distanceKm: float("distanceKm"),
  estimatedDuration: int("estimatedDuration"),
  actualDuration: int("actualDuration"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  waypoints: json("waypoints"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Route = typeof routes.$inferSelect;
export type InsertRoute = typeof routes.$inferInsert;

// ─── TRACKING (Rastreamento) ─────────────────────────────
export const trackingPoints = mysqlTable("tracking_points", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId"),
  routeId: int("routeId"),
  driverId: int("driverId"),
  vehicleId: int("vehicleId"),
  lat: float("lat").notNull(),
  lng: float("lng").notNull(),
  speed: float("speed"),
  heading: float("heading"),
  eventType: varchar("eventType", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TrackingPoint = typeof trackingPoints.$inferSelect;
export type InsertTrackingPoint = typeof trackingPoints.$inferInsert;

// ─── DOCUMENTOS FISCAIS ──────────────────────────────────
export const fiscalDocuments = mysqlTable("fiscal_documents", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["cte", "mdfe", "nfe"]).notNull(),
  number: varchar("number", { length: 50 }).notNull(),
  series: varchar("series", { length: 10 }),
  accessKey: varchar("accessKey", { length: 50 }),
  orderId: int("orderId"),
  routeId: int("routeId"),
  clientId: int("clientId"),
  status: mysqlEnum("status", ["draft", "authorized", "cancelled", "rejected", "corrected"]).default("draft").notNull(),
  issueDate: timestamp("issueDate"),
  totalValue: float("totalValue"),
  xmlUrl: text("xmlUrl"),
  pdfUrl: text("pdfUrl"),
  sefazProtocol: varchar("sefazProtocol", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FiscalDocument = typeof fiscalDocuments.$inferSelect;
export type InsertFiscalDocument = typeof fiscalDocuments.$inferInsert;

// ─── FINANCEIRO - TRANSAÇÕES ─────────────────────────────
export const financialTransactions = mysqlTable("financial_transactions", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["receivable", "payable"]).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  description: text("description"),
  orderId: int("orderId"),
  clientId: int("clientId"),
  driverId: int("driverId"),
  amount: float("amount").notNull(),
  dueDate: timestamp("dueDate").notNull(),
  paidDate: timestamp("paidDate"),
  status: mysqlEnum("status", ["pending", "paid", "overdue", "cancelled"]).default("pending").notNull(),
  paymentMethod: varchar("paymentMethod", { length: 50 }),
  stripePaymentId: varchar("stripePaymentId", { length: 255 }),
  invoiceNumber: varchar("invoiceNumber", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FinancialTransaction = typeof financialTransactions.$inferSelect;
export type InsertFinancialTransaction = typeof financialTransactions.$inferInsert;

// ─── ALERTAS ─────────────────────────────────────────────
export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", [
    "delivery_delay", "route_deviation", "document_expiry",
    "low_inventory", "maintenance_due", "payment_overdue",
    "geofence_breach", "system"
  ]).notNull(),
  severity: mysqlEnum("severity", ["info", "warning", "critical"]).default("warning").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  entityType: varchar("entityType", { length: 50 }),
  entityId: int("entityId"),
  isRead: boolean("isRead").default(false).notNull(),
  userId: int("userId"),
  emailSent: boolean("emailSent").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

// ─── ADIANTAMENTOS DE MOTORISTAS ───────────────────────────────────────
export const driverAdvances = mysqlTable("driver_advances", {
  id: int("id").autoincrement().primaryKey(),
  driverId: int("driverId").notNull(),
  routeId: int("routeId"),
  amount: float("amount").notNull(),
  reason: text("reason").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "paid"]).default("pending").notNull(),
  reviewedBy: int("reviewedBy"),
  reviewNote: text("reviewNote"),
  reviewedAt: timestamp("reviewedAt"),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DriverAdvance = typeof driverAdvances.$inferSelect;
export type InsertDriverAdvance = typeof driverAdvances.$inferInsert;

// ─── TOKENS DE ACESSO DE CLIENTES ──────────────────────────────────────
export const clientAccessTokens = mysqlTable("client_access_tokens", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  label: varchar("label", { length: 100 }),
  isActive: boolean("isActive").default(true).notNull(),
  expiresAt: timestamp("expiresAt"),
  lastUsedAt: timestamp("lastUsedAt"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ClientAccessToken = typeof clientAccessTokens.$inferSelect;
export type InsertClientAccessToken = typeof clientAccessTokens.$inferInsert;

// ─── CREDENCIAIS DO MOTORISTA (PIN para login no PWA) ───────────────────
export const driverCredentials = mysqlTable("driver_credentials", {
  id: int("id").autoincrement().primaryKey(),
  driverId: int("driverId").notNull().unique(),
  pin: varchar("pin", { length: 6 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DriverCredential = typeof driverCredentials.$inferSelect;
export type InsertDriverCredential = typeof driverCredentials.$inferInsert;

// ─── OCORRÊNCIAS DE ENTREGA ────────────────────────────────────────────────
export const deliveryOccurrences = mysqlTable("delivery_occurrences", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  driverId: int("driverId").notNull(),
  type: mysqlEnum("type", ["damage", "refusal", "address_not_found", "recipient_absent", "delay", "other"]).notNull(),
  description: text("description").notNull(),
  photoUrl: text("photoUrl"),
  lat: float("lat"),
  lng: float("lng"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DeliveryOccurrence = typeof deliveryOccurrences.$inferSelect;
export type InsertDeliveryOccurrence = typeof deliveryOccurrences.$inferInsert;
