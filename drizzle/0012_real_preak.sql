ALTER TABLE `access_requests` ADD `telegram` varchar(128);--> statement-breakpoint
ALTER TABLE `access_requests` DROP COLUMN `reason`;