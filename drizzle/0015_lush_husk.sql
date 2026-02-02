ALTER TABLE `users` ADD `hlrDailyLimit` int;--> statement-breakpoint
ALTER TABLE `users` ADD `hlrWeeklyLimit` int;--> statement-breakpoint
ALTER TABLE `users` ADD `hlrMonthlyLimit` int;--> statement-breakpoint
ALTER TABLE `users` ADD `hlrBatchLimit` int;--> statement-breakpoint
ALTER TABLE `users` ADD `hlrChecksToday` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `hlrChecksThisWeek` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `hlrChecksThisMonth` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `hlrLastCheckDate` varchar(10);--> statement-breakpoint
ALTER TABLE `users` ADD `hlrLastCheckWeek` varchar(10);--> statement-breakpoint
ALTER TABLE `users` ADD `hlrLastCheckMonth` varchar(7);--> statement-breakpoint
ALTER TABLE `users` ADD `emailDailyLimit` int;--> statement-breakpoint
ALTER TABLE `users` ADD `emailWeeklyLimit` int;--> statement-breakpoint
ALTER TABLE `users` ADD `emailMonthlyLimit` int;--> statement-breakpoint
ALTER TABLE `users` ADD `emailBatchLimit` int;--> statement-breakpoint
ALTER TABLE `users` ADD `emailChecksToday` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `emailChecksThisWeek` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `emailChecksThisMonth` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `emailLastCheckDate` varchar(10);--> statement-breakpoint
ALTER TABLE `users` ADD `emailLastCheckWeek` varchar(10);--> statement-breakpoint
ALTER TABLE `users` ADD `emailLastCheckMonth` varchar(7);