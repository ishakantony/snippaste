CREATE TABLE IF NOT EXISTS `snips` (
	`slug` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`password_hash` text,
	`password_updated_at` integer
);
