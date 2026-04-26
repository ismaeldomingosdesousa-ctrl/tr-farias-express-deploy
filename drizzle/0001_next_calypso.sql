CREATE TABLE `alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('delivery_delay','route_deviation','document_expiry','low_inventory','maintenance_due','payment_overdue','geofence_breach','system') NOT NULL,
	`severity` enum('info','warning','critical') NOT NULL DEFAULT 'warning',
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`entityType` varchar(50),
	`entityId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`userId` int,
	`emailSent` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`cnpj` varchar(18) NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`address` text,
	`city` varchar(100),
	`state` varchar(2),
	`zipCode` varchar(10),
	`contactPerson` varchar(255),
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `drivers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`cpf` varchar(14) NOT NULL,
	`cnh` varchar(20) NOT NULL,
	`cnhCategory` varchar(5),
	`cnhExpiry` timestamp,
	`phone` varchar(20),
	`email` varchar(320),
	`address` text,
	`city` varchar(100),
	`state` varchar(2),
	`status` enum('available','on_trip','inactive','suspended') NOT NULL DEFAULT 'available',
	`rating` float DEFAULT 5,
	`totalTrips` int DEFAULT 0,
	`lat` float,
	`lng` float,
	`lastLocationUpdate` timestamp,
	`cnhDocUrl` text,
	`crlvDocUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drivers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financial_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('receivable','payable') NOT NULL,
	`category` varchar(100) NOT NULL,
	`description` text,
	`orderId` int,
	`clientId` int,
	`driverId` int,
	`amount` float NOT NULL,
	`dueDate` timestamp NOT NULL,
	`paidDate` timestamp,
	`status` enum('pending','paid','overdue','cancelled') NOT NULL DEFAULT 'pending',
	`paymentMethod` varchar(50),
	`stripePaymentId` varchar(255),
	`invoiceNumber` varchar(50),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financial_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fiscal_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('cte','mdfe','nfe') NOT NULL,
	`number` varchar(50) NOT NULL,
	`series` varchar(10),
	`accessKey` varchar(50),
	`orderId` int,
	`routeId` int,
	`clientId` int,
	`status` enum('draft','authorized','cancelled','rejected','corrected') NOT NULL DEFAULT 'draft',
	`issueDate` timestamp,
	`totalValue` float,
	`xmlUrl` text,
	`pdfUrl` text,
	`sefazProtocol` varchar(50),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fiscal_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sku` varchar(50) NOT NULL,
	`productName` varchar(255) NOT NULL,
	`warehouseId` int NOT NULL,
	`location` varchar(50),
	`availableQty` int NOT NULL DEFAULT 0,
	`reservedQty` int NOT NULL DEFAULT 0,
	`minQty` int DEFAULT 0,
	`weightKg` float,
	`volumeM3` float,
	`unitPrice` float,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inventoryId` int NOT NULL,
	`warehouseId` int NOT NULL,
	`type` enum('inbound','outbound','transfer','adjustment','picking','packing') NOT NULL,
	`quantity` int NOT NULL,
	`reference` varchar(100),
	`notes` text,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`sku` varchar(50) NOT NULL,
	`productName` varchar(255) NOT NULL,
	`quantity` int NOT NULL,
	`weightKg` float,
	`volumeM3` float,
	`unitPrice` float,
	`totalPrice` float,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_status_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`fromStatus` varchar(30),
	`toStatus` varchar(30) NOT NULL,
	`notes` text,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_status_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(30) NOT NULL,
	`clientId` int NOT NULL,
	`status` enum('pending','confirmed','picking','packed','awaiting_pickup','in_transit','delivered','cancelled','returned') NOT NULL DEFAULT 'pending',
	`priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
	`originAddress` text,
	`originCity` varchar(100),
	`originState` varchar(2),
	`originZip` varchar(10),
	`originLat` float,
	`originLng` float,
	`destAddress` text,
	`destCity` varchar(100),
	`destState` varchar(2),
	`destZip` varchar(10),
	`destLat` float,
	`destLng` float,
	`totalWeight` float,
	`totalVolume` float,
	`totalValue` float,
	`freightValue` float,
	`estimatedDelivery` timestamp,
	`actualDelivery` timestamp,
	`driverId` int,
	`vehicleId` int,
	`warehouseId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quoteNumber` varchar(30) NOT NULL,
	`clientId` int,
	`originZip` varchar(10) NOT NULL,
	`originCity` varchar(100),
	`originState` varchar(2),
	`destZip` varchar(10) NOT NULL,
	`destCity` varchar(100),
	`destState` varchar(2),
	`weightKg` float NOT NULL,
	`volumeM3` float,
	`distanceKm` float,
	`urgency` enum('standard','express','same_day') NOT NULL DEFAULT 'standard',
	`basePrice` float,
	`weightPrice` float,
	`distancePrice` float,
	`urgencyMultiplier` float DEFAULT 1,
	`totalPrice` float,
	`validUntil` timestamp,
	`status` enum('pending','accepted','rejected','expired','converted') NOT NULL DEFAULT 'pending',
	`orderId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotes_id` PRIMARY KEY(`id`),
	CONSTRAINT `quotes_quoteNumber_unique` UNIQUE(`quoteNumber`)
);
--> statement-breakpoint
CREATE TABLE `routes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`routeCode` varchar(30) NOT NULL,
	`driverId` int,
	`vehicleId` int,
	`status` enum('planned','in_progress','completed','cancelled') NOT NULL DEFAULT 'planned',
	`originAddress` text,
	`originLat` float,
	`originLng` float,
	`destAddress` text,
	`destLat` float,
	`destLng` float,
	`distanceKm` float,
	`estimatedDuration` int,
	`actualDuration` int,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`waypoints` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `routes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tracking_points` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int,
	`routeId` int,
	`driverId` int,
	`vehicleId` int,
	`lat` float NOT NULL,
	`lng` float NOT NULL,
	`speed` float,
	`heading` float,
	`eventType` varchar(50),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tracking_points_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`plate` varchar(10) NOT NULL,
	`type` enum('vuc','toco','truck','carreta','bitrem','van','utilitario') NOT NULL,
	`brand` varchar(100),
	`model` varchar(100),
	`year` int,
	`capacityKg` float,
	`capacityM3` float,
	`driverId` int,
	`status` enum('available','in_use','maintenance','inactive') NOT NULL DEFAULT 'available',
	`lat` float,
	`lng` float,
	`lastLocationUpdate` timestamp,
	`fuelType` varchar(20),
	`kmCurrent` float,
	`nextMaintenanceKm` float,
	`crlvExpiry` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `warehouses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(20) NOT NULL,
	`address` text,
	`city` varchar(100),
	`state` varchar(2),
	`zipCode` varchar(10),
	`lat` float,
	`lng` float,
	`totalCapacityM3` float,
	`usedCapacityM3` float DEFAULT 0,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `warehouses_id` PRIMARY KEY(`id`)
);
