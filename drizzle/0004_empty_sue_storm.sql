CREATE TABLE `action_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` varchar(64) NOT NULL,
	`details` text,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `action_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `balance_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`threshold` int NOT NULL DEFAULT 10,
	`lastAlertSent` timestamp,
	`isEnabled` enum('yes','no') NOT NULL DEFAULT 'yes',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `balance_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `failedLoginAttempts` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `lockedUntil` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `dailyLimit` int;--> statement-breakpoint
ALTER TABLE `users` ADD `monthlyLimit` int;--> statement-breakpoint
ALTER TABLE `users` ADD `checksToday` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `checksThisMonth` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `lastCheckDate` varchar(10);--> statement-breakpoint
ALTER TABLE `users` ADD `lastCheckMonth` varchar(7);