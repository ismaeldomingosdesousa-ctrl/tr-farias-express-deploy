import {
  integer,
  sqliteTable,
  text,
  real,
} from "drizzle-orm/sqlite-core";

// ─── USERS ───────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role").$type<"user" | "admin">().default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── CLIENTES (Embarcadores) ─────────────────────────────
export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  cnpj: text("cnpj").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zipCode"),
  contactPerson: text("contactPerson"),
  status: text("status").$type<"active" | "inactive">().default("active").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// ─── MOTORISTAS ──────────────────────────────────────────
export const drivers = sqliteTable("drivers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  cpf: text("cpf").notNull(),
  cnh: text("cnh").notNull(),
  cnhCategory: text("cnhCategory"),
  cnhExpiry: integer("cnhExpiry", { mode: "timestamp" }),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  status: text("status").$type<"available" | "on_trip" | "inactive" | "suspended">().default("available").notNull(),
  rating: real("rating").default(5.0),
  totalTrips: integer("totalTrips").default(0),
  lat: real("lat"),
  lng: real("lng"),
  lastLocationUpdate: integer("lastLocationUpdate", { mode: "timestamp" }),
  cnhDocUrl: text("cnhDocUrl"),
  crlvDocUrl: text("crlvDocUrl"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});

export type Driver = typeof drivers.$inferSelect;
export type InsertDriver = typeof drivers.$inferInsert;

// ─── VEÍCULOS ────────────────────────────────────────────
export const vehicles = sqliteTable("vehicles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  plate: text("plate").notNull(),
  type: text("type").$type<"vuc" | "toco" | "truck" | "carreta" | "bitrem" | "van" | "utilitario">().notNull(),
  brand: text("brand"),
  model: text("model"),
  year: integer("year"),
  capacityKg: real("capacityKg"),
  capacityM3: real("capacityM3"),
  driverId: integer("driverId"),
  status: text("status").$type<"available" | "in_use" | "maintenance" | "inactive">().default("available").notNull(),
  lat: real("lat"),
  lng: real("lng"),
  lastLocationUpdate: integer("lastLocationUpdate", { mode: "timestamp" }),
  fuelType: text("fuelType"),
  kmCurrent: real("kmCurrent"),
  nextMaintenanceKm: real("nextMaintenanceKm"),
  crlvExpiry: integer("crlvExpiry", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});

export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = typeof vehicles.$inferInsert;

// ─── ARMAZÉNS ────────────────────────────────────────────
export const warehouses = sqliteTable("warehouses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zipCode"),
  lat: real("lat"),
  lng: real("lng"),
  capacity: real("capacity"),
  usedCapacity: real("usedCapacity").default(0),
  managerId: integer("managerId"),
  status: text("status").$type<"active" | "inactive" | "maintenance">().default("active").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});

export type Warehouse = typeof warehouses.$inferSelect;
export type InsertWarehouse = typeof warehouses.$inferInsert;

// ─── ESTOQUE ─────────────────────────────────────────────
export const inventory = sqliteTable("inventory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  warehouseId: integer("warehouseId").notNull(),
  sku: text("sku").notNull(),
  productName: text("productName").notNull(),
  description: text("description"),
  category: text("category"),
  quantity: integer("quantity").notNull().default(0),
  minQuantity: integer("minQuantity").default(0),
  maxQuantity: integer("maxQuantity"),
  unit: text("unit"),
  weightKg: real("weightKg"),
  volumeM3: real("volumeM3"),
  location: text("location"),
  status: text("status").$type<"active" | "inactive" | "reserved">().default("active").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = typeof inventory.$inferInsert;

// ─── MOVIMENTAÇÕES DE ESTOQUE ────────────────────────────
export const inventoryMovements = sqliteTable("inventory_movements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  inventoryId: integer("inventoryId").notNull(),
  warehouseId: integer("warehouseId").notNull(),
  type: text("type").$type<"inbound" | "outbound" | "transfer" | "adjustment" | "picking" | "packing">().notNull(),
  quantity: integer("quantity").notNull(),
  reference: text("reference"),
  notes: text("notes"),
  userId: integer("userId"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type InsertInventoryMovement = typeof inventoryMovements.$inferInsert;

// ─── PEDIDOS (OMS) ───────────────────────────────────────
export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderNumber: text("orderNumber").notNull().unique(),
  clientId: integer("clientId").notNull(),
  status: text("status").$type<
    "pending" | "confirmed" | "picking" | "packed" | "awaiting_pickup" |
    "in_transit" | "delivered" | "cancelled" | "returned"
  >().default("pending").notNull(),
  priority: text("priority").$type<"low" | "normal" | "high" | "urgent">().default("normal").notNull(),
  originAddress: text("originAddress"),
  originCity: text("originCity"),
  originState: text("originState"),
  originZip: text("originZip"),
  originLat: real("originLat"),
  originLng: real("originLng"),
  destAddress: text("destAddress"),
  destCity: text("destCity"),
  destState: text("destState"),
  destZip: text("destZip"),
  destLat: real("destLat"),
  destLng: real("destLng"),
  totalWeight: real("totalWeight"),
  totalVolume: real("totalVolume"),
  totalValue: real("totalValue"),
  freightValue: real("freightValue"),
  estimatedDelivery: integer("estimatedDelivery", { mode: "timestamp" }),
  actualDelivery: integer("actualDelivery", { mode: "timestamp" }),
  driverId: integer("driverId"),
  vehicleId: integer("vehicleId"),
  routeId: integer("routeId"),
  warehouseId: integer("warehouseId"),
  notes: text("notes"),
  photoProofUrl: text("photoProofUrl"),
  clientNotifiedAt: integer("clientNotifiedAt", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// ─── ITENS DO PEDIDO ─────────────────────────────────────
export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("orderId").notNull(),
  sku: text("sku").notNull(),
  productName: text("productName").notNull(),
  quantity: integer("quantity").notNull(),
  weightKg: real("weightKg"),
  volumeM3: real("volumeM3"),
  unitPrice: real("unitPrice"),
  totalPrice: real("totalPrice"),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

// ─── HISTÓRICO DE STATUS DO PEDIDO ───────────────────────
export const orderStatusHistory = sqliteTable("order_status_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("orderId").notNull(),
  fromStatus: text("fromStatus"),
  toStatus: text("toStatus").notNull(),
  notes: text("notes"),
  userId: integer("userId"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;

// ─── COTAÇÕES ────────────────────────────────────────────
export const quotes = sqliteTable("quotes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  quoteNumber: text("quoteNumber").notNull().unique(),
  clientId: integer("clientId"),
  originZip: text("originZip").notNull(),
  originCity: text("originCity"),
  originState: text("originState"),
  destZip: text("destZip").notNull(),
  destCity: text("destCity"),
  destState: text("destState"),
  weightKg: real("weightKg").notNull(),
  volumeM3: real("volumeM3"),
  distanceKm: real("distanceKm"),
  urgency: text("urgency").$type<"standard" | "express" | "same_day">().default("standard").notNull(),
  basePrice: real("basePrice"),
  weightPrice: real("weightPrice"),
  distancePrice: real("distancePrice"),
  urgencyMultiplier: real("urgencyMultiplier").default(1.0),
  totalPrice: real("totalPrice"),
  validUntil: integer("validUntil", { mode: "timestamp" }),
  status: text("status").$type<"pending" | "accepted" | "rejected" | "expired" | "converted">().default("pending").notNull(),
  orderId: integer("orderId"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = typeof quotes.$inferInsert;

// ─── ROTAS (TMS) ─────────────────────────────────────────
export const routes = sqliteTable("routes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  routeCode: text("routeCode").notNull(),
  driverId: integer("driverId"),
  vehicleId: integer("vehicleId"),
  status: text("status").$type<"planned" | "in_progress" | "completed" | "cancelled">().default("planned").notNull(),
  originAddress: text("originAddress"),
  originLat: real("originLat"),
  originLng: real("originLng"),
  destAddress: text("destAddress"),
  destLat: real("destLat"),
  destLng: real("destLng"),
  distanceKm: real("distanceKm"),
  estimatedDuration: integer("estimatedDuration"),
  actualDuration: integer("actualDuration"),
  startedAt: integer("startedAt", { mode: "timestamp" }),
  completedAt: integer("completedAt", { mode: "timestamp" }),
  waypoints: text("waypoints", { mode: "json" }).$type<any[]>(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});

export type Route = typeof routes.$inferSelect;
export type InsertRoute = typeof routes.$inferInsert;

// ─── TRACKING (Rastreamento) ─────────────────────────────
export const trackingPoints = sqliteTable("tracking_points", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("orderId"),
  routeId: integer("routeId"),
  driverId: integer("driverId"),
  vehicleId: integer("vehicleId"),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  speed: real("speed"),
  heading: real("heading"),
  eventType: text("eventType"),
  notes: text("notes"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type TrackingPoint = typeof trackingPoints.$inferSelect;
export type InsertTrackingPoint = typeof trackingPoints.$inferInsert;

// ─── DOCUMENTOS FISCAIS ──────────────────────────────────
export const fiscalDocuments = sqliteTable("fiscal_documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").$type<"cte" | "mdfe" | "nfe">().notNull(),
  number: text("number").notNull(),
  series: text("series"),
  accessKey: text("accessKey"),
  orderId: integer("orderId"),
  routeId: integer("routeId"),
  clientId: integer("clientId"),
  status: text("status").$type<"draft" | "authorized" | "cancelled" | "rejected" | "corrected">().default("draft").notNull(),
  issueDate: integer("issueDate", { mode: "timestamp" }),
  totalValue: real("totalValue"),
  xmlUrl: text("xmlUrl"),
  pdfUrl: text("pdfUrl"),
  sefazProtocol: text("sefazProtocol"),
  notes: text("notes"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});

export type FiscalDocument = typeof fiscalDocuments.$inferSelect;
export type InsertFiscalDocument = typeof fiscalDocuments.$inferInsert;

// ─── FINANCEIRO - TRANSAÇÕES ─────────────────────────────
export const financialTransactions = sqliteTable("financial_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").$type<"receivable" | "payable">().notNull(),
  category: text("category").notNull(),
  description: text("description"),
  orderId: integer("orderId"),
  clientId: integer("clientId"),
  driverId: integer("driverId"),
  amount: real("amount").notNull(),
  dueDate: integer("dueDate", { mode: "timestamp" }).notNull(),
  paidDate: integer("paidDate", { mode: "timestamp" }),
  status: text("status").$type<"pending" | "paid" | "overdue" | "cancelled">().default("pending").notNull(),
  paymentMethod: text("paymentMethod"),
  stripePaymentId: text("stripePaymentId"),
  invoiceNumber: text("invoiceNumber"),
  notes: text("notes"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});

export type FinancialTransaction = typeof financialTransactions.$inferSelect;
export type InsertFinancialTransaction = typeof financialTransactions.$inferInsert;

// ─── ALERTAS ─────────────────────────────────────────────
export const alerts = sqliteTable("alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").$type<
    "delivery_delay" | "route_deviation" | "document_expiry" |
    "low_inventory" | "maintenance_due" | "payment_overdue" |
    "geofence_breach" | "system"
  >().notNull(),
  severity: text("severity").$type<"info" | "warning" | "critical">().default("warning").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  entityType: text("entityType"),
  entityId: integer("entityId"),
  isRead: integer("isRead", { mode: "boolean" }).default(false).notNull(),
  userId: integer("userId"),
  emailSent: integer("emailSent", { mode: "boolean" }).default(false),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

// ─── ADIANTAMENTOS DE MOTORISTAS ─────────────────────────
export const driverAdvances = sqliteTable("driver_advances", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  driverId: integer("driverId").notNull(),
  routeId: integer("routeId"),
  amount: real("amount").notNull(),
  reason: text("reason").notNull(),
  status: text("status").$type<"pending" | "approved" | "rejected" | "paid">().default("pending").notNull(),
  reviewedBy: integer("reviewedBy"),
  reviewNote: text("reviewNote"),
  reviewedAt: integer("reviewedAt", { mode: "timestamp" }),
  paidAt: integer("paidAt", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});

export type DriverAdvance = typeof driverAdvances.$inferSelect;
export type InsertDriverAdvance = typeof driverAdvances.$inferInsert;

// ─── TOKENS DE ACESSO DE CLIENTES ────────────────────────
export const clientAccessTokens = sqliteTable("client_access_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("clientId").notNull(),
  token: text("token").notNull().unique(),
  label: text("label"),
  isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }),
  lastUsedAt: integer("lastUsedAt", { mode: "timestamp" }),
  createdBy: integer("createdBy"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type ClientAccessToken = typeof clientAccessTokens.$inferSelect;
export type InsertClientAccessToken = typeof clientAccessTokens.$inferInsert;

// ─── CREDENCIAIS DO MOTORISTA (PIN para login no PWA) ────
export const driverCredentials = sqliteTable("driver_credentials", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  driverId: integer("driverId").notNull().unique(),
  pin: text("pin").notNull(),
  isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});

export type DriverCredential = typeof driverCredentials.$inferSelect;
export type InsertDriverCredential = typeof driverCredentials.$inferInsert;

// ─── CREDENCIAIS LOCAIS (email/senha) ────────────────────
export const userCredentials = sqliteTable("user_credentials", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("passwordHash").notNull(),
  name: text("name"),
  role: text("role").$type<"user" | "admin">().default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});

export type UserCredential = typeof userCredentials.$inferSelect;

// ─── OCORRÊNCIAS DE ENTREGA ───────────────────────────────
export const deliveryOccurrences = sqliteTable("delivery_occurrences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("orderId").notNull(),
  driverId: integer("driverId").notNull(),
  type: text("type").$type<"damage" | "refusal" | "address_not_found" | "recipient_absent" | "delay" | "other">().notNull(),
  description: text("description").notNull(),
  photoUrl: text("photoUrl"),
  lat: real("lat"),
  lng: real("lng"),
  resolvedAt: integer("resolvedAt", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type DeliveryOccurrence = typeof deliveryOccurrences.$inferSelect;
export type InsertDeliveryOccurrence = typeof deliveryOccurrences.$inferInsert;
