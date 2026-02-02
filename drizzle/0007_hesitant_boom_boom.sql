ALTER TABLE `users` ADD `weeklyLimit` int;--> statement-breakpoint
ALTER TABLE `users` ADD `batchLimit` int;--> statement-breakpoint
ALTER TABLE `users` ADD `checksThisWeek` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `lastCheckWeek` varchar(10);