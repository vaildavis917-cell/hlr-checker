CREATE TABLE `email_batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`totalEmails` int NOT NULL DEFAULT 0,
	`processedEmails` int NOT NULL DEFAULT 0,
	`validEmails` int NOT NULL DEFAULT 0,
	`invalidEmails` int NOT NULL DEFAULT 0,
	`riskyEmails` int NOT NULL DEFAULT 0,
	`unknownEmails` int NOT NULL DEFAULT 0,
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `email_batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`quality` varchar(32),
	`result` varchar(32),
	`resultCode` int,
	`subresult` varchar(64),
	`isFree` boolean DEFAULT false,
	`isRole` boolean DEFAULT false,
	`didYouMean` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `email_cache_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_cache_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `email_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`batchId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`quality` varchar(32),
	`result` varchar(32),
	`resultCode` int,
	`subresult` varchar(64),
	`isFree` boolean DEFAULT false,
	`isRole` boolean DEFAULT false,
	`didYouMean` varchar(320),
	`executionTime` int,
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_results_id` PRIMARY KEY(`id`)
);
