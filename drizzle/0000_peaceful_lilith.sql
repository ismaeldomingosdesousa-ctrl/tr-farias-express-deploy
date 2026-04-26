CREATE TABLE `alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`severity` text DEFAULT 'warning' NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`entityType` text,
	`entityId` integer,
	`isRead` integer DEFAULT false NOT NULL,
	`userId` integer,
	`emailSent` integer DEFAULT false,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `client_access_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`clientId` integer NOT NULL,
	`token` text NOT NULL,
	`label` text,
	`isActive` integer DEFAULT true NOT NULL,
	`expiresAt` integer,
	`lastUsedAt` integer,
	`createdBy` integer,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `client_access_tokens_token_unique` ON `client_access_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `clients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`cnpj` text NOT NULL,
	`email` text,
	`phone` text,
	`address` text,
	`city` text,
	`state` text,
	`zipCode` text,
	`contactPerson` text,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `delivery_occurrences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`orderId` integer NOT NULL,
	`driverId` integer NOT NULL,
	`type` text NOT NULL,
	`description` text NOT NULL,
	`photoUrl` text,
	`lat` real,
	`lng` real,
	`resolvedAt` integer,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `driver_advances` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`driverId` integer NOT NULL,
	`routeId` integer,
	`amount` real NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewedBy` integer,
	`reviewNote` text,
	`reviewedAt` integer,
	`paidAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `driver_credentials` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`driverId` integer NOT NULL,
	`pin` text NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `driver_credentials_driverId_unique` ON `driver_credentials` (`driverId`);--> statement-breakpoint
CREATE TABLE `drivers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`cpf` text NOT NULL,
	`cnh` text NOT NULL,
	`cnhCategory` text,
	`cnhExpiry` integer,
	`phone` text,
	`email` text,
	`address` text,
	`city` text,
	`state` text,
	`status` text DEFAULT 'available' NOT NULL,
	`rating` real DEFAULT 5,
	`totalTrips` integer DEFAULT 0,
	`lat` real,
	`lng` real,
	`lastLocationUpdate` integer,
	`cnhDocUrl` text,
	`crlvDocUrl` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `financial_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`category` text NOT NULL,
	`description` text,
	`orderId` integer,
	`clientId` integer,
	`driverId` integer,
	`amount` real NOT NULL,
	`dueDate` integer NOT NULL,
	`paidDate` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`paymentMethod` text,
	`stripePaymentId` text,
	`invoiceNumber` text,
	`notes` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `fiscal_documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`number` text NOT NULL,
	`series` text,
	`accessKey` text,
	`orderId` integer,
	`routeId` integer,
	`clientId` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`issueDate` integer,
	`totalValue` real,
	`xmlUrl` text,
	`pdfUrl` text,
	`sefazProtocol` text,
	`notes` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`warehouseId` integer NOT NULL,
	`sku` text NOT NULL,
	`productName` text NOT NULL,
	`description` text,
	`category` text,
	`quantity` integer DEFAULT 0 NOT NULL,
	`minQuantity` integer DEFAULT 0,
	`maxQuantity` integer,
	`unit` text,
	`weightKg` real,
	`volumeM3` real,
	`location` text,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inventory_movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`inventoryId` integer NOT NULL,
	`warehouseId` integer NOT NULL,
	`type` text NOT NULL,
	`quantity` integer NOT NULL,
	`reference` text,
	`notes` text,
	`userId` integer,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`orderId` integer NOT NULL,
	`sku` text NOT NULL,
	`productName` text NOT NULL,
	`quantity` integer NOT NULL,
	`weightKg` real,
	`volumeM3` real,
	`unitPrice` real,
	`totalPrice` real
);
--> statement-breakpoint
CREATE TABLE `order_status_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`orderId` integer NOT NULL,
	`fromStatus` text,
	`toStatus` text NOT NULL,
	`notes` text,
	`userId` integer,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`orderNumber` text NOT NULL,
	`clientId` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`originAddress` text,
	`originCity` text,
	`originState` text,
	`originZip` text,
	`originLat` real,
	`originLng` real,
	`destAddress` text,
	`destCity` text,
	`destState` text,
	`destZip` text,
	`destLat` real,
	`destLng` real,
	`totalWeight` real,
	`totalVolume` real,
	`totalValue` real,
	`freightValue` real,
	`estimatedDelivery` integer,
	`actualDelivery` integer,
	`driverId` integer,
	`vehicleId` integer,
	`routeId` integer,
	`warehouseId` integer,
	`notes` text,
	`photoProofUrl` text,
	`clientNotifiedAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_orderNumber_unique` ON `orders` (`orderNumber`);--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`quoteNumber` text NOT NULL,
	`clientId` integer,
	`originZip` text NOT NULL,
	`originCity` text,
	`originState` text,
	`destZip` text NOT NULL,
	`destCity` text,
	`destState` text,
	`weightKg` real NOT NULL,
	`volumeM3` real,
	`distanceKm` real,
	`urgency` text DEFAULT 'standard' NOT NULL,
	`basePrice` real,
	`weightPrice` real,
	`distancePrice` real,
	`urgencyMultiplier` real DEFAULT 1,
	`totalPrice` real,
	`validUntil` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`orderId` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quotes_quoteNumber_unique` ON `quotes` (`quoteNumber`);--> statement-breakpoint
CREATE TABLE `routes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`routeCode` text NOT NULL,
	`driverId` integer,
	`vehicleId` integer,
	`status` text DEFAULT 'planned' NOT NULL,
	`originAddress` text,
	`originLat` real,
	`originLng` real,
	`destAddress` text,
	`destLat` real,
	`destLng` real,
	`distanceKm` real,
	`estimatedDuration` integer,
	`actualDuration` integer,
	`startedAt` integer,
	`completedAt` integer,
	`waypoints` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tracking_points` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`orderId` integer,
	`routeId` integer,
	`driverId` integer,
	`vehicleId` integer,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`speed` real,
	`heading` real,
	`eventType` text,
	`notes` text,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`openId` text NOT NULL,
	`name` text,
	`email` text,
	`loginMethod` text,
	`role` text DEFAULT 'user' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`lastSignedIn` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_openId_unique` ON `users` (`openId`);--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plate` text NOT NULL,
	`type` text NOT NULL,
	`brand` text,
	`model` text,
	`year` integer,
	`capacityKg` real,
	`capacityM3` real,
	`driverId` integer,
	`status` text DEFAULT 'available' NOT NULL,
	`lat` real,
	`lng` real,
	`lastLocationUpdate` integer,
	`fuelType` text,
	`kmCurrent` real,
	`nextMaintenanceKm` real,
	`crlvExpiry` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `warehouses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`address` text,
	`city` text,
	`state` text,
	`zipCode` text,
	`lat` real,
	`lng` real,
	`capacity` real,
	`usedCapacity` real DEFAULT 0,
	`managerId` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `warehouses_code_unique` ON `warehouses` (`code`);