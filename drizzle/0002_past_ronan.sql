CREATE TABLE `client_access_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`token` varchar(64) NOT NULL,
	`label` varchar(100),
	`isActive` boolean NOT NULL DEFAULT true,
	`expiresAt` timestamp,
	`lastUsedAt` timestamp,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `client_access_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `client_access_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `delivery_occurrences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`driverId` int NOT NULL,
	`type` enum('damage','refusal','address_not_found','recipient_absent','delay','other') NOT NULL,
	`description` text NOT NULL,
	`photoUrl` text,
	`lat` float,
	`lng` float,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `delivery_occurrences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `driver_advances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driverId` int NOT NULL,
	`routeId` int,
	`amount` float NOT NULL,
	`reason` text NOT NULL,
	`status` enum('pending','approved','rejected','paid') NOT NULL DEFAULT 'pending',
	`reviewedBy` int,
	`reviewNote` text,
	`reviewedAt` timestamp,
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `driver_advances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `driver_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driverId` int NOT NULL,
	`pin` varchar(6) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `driver_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `driver_credentials_driverId_unique` UNIQUE(`driverId`)
);
