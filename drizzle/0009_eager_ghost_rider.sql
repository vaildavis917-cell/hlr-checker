CREATE TABLE `role_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role` varchar(32) NOT NULL,
	`permissions` json NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `role_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `role_permissions_role_unique` UNIQUE(`role`)
);
