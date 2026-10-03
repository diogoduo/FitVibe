CREATE TABLE `diary_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`day` text NOT NULL,
	`meal_id` text NOT NULL,
	`food_key` text NOT NULL,
	`name` text NOT NULL,
	`grams` real NOT NULL,
	`kcal` real NOT NULL,
	`protein` real NOT NULL,
	`carbs` real NOT NULL,
	`fat` real NOT NULL,
	`fiber` real NOT NULL
);
--> statement-breakpoint
CREATE INDEX `diary_entries_day_idx` ON `diary_entries` (`day`);--> statement-breakpoint
CREATE TABLE `food_favorites` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`food_key` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `food_portions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`food_key` text NOT NULL,
	`name` text NOT NULL,
	`grams` real NOT NULL
);
--> statement-breakpoint
CREATE INDEX `food_portions_food_key_idx` ON `food_portions` (`food_key`);--> statement-breakpoint
CREATE TABLE `foods` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`source` text NOT NULL,
	`name` text NOT NULL,
	`brand` text,
	`barcode` text,
	`kcal` real NOT NULL,
	`protein` real NOT NULL,
	`carbs` real NOT NULL,
	`fat` real NOT NULL,
	`fiber` real NOT NULL
);
--> statement-breakpoint
CREATE INDEX `foods_barcode_idx` ON `foods` (`barcode`);--> statement-breakpoint
CREATE TABLE `meals` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`name` text NOT NULL,
	`sort_order` integer NOT NULL,
	`hidden` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `saved_meals` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`name` text NOT NULL,
	`items` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `water_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`day` text NOT NULL,
	`ml` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `water_logs_day_idx` ON `water_logs` (`day`);--> statement-breakpoint
ALTER TABLE `profiles` ADD `water_goal_ml` integer;