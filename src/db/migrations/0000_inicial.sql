CREATE TABLE `body_measurements` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`measured_on` text NOT NULL,
	`neck_cm` real,
	`shoulders_cm` real,
	`chest_cm` real,
	`waist_cm` real,
	`abdomen_cm` real,
	`hips_cm` real,
	`arm_cm` real,
	`forearm_cm` real,
	`thigh_cm` real,
	`calf_cm` real,
	`note` text
);
--> statement-breakpoint
CREATE INDEX `body_measurements_measured_on_idx` ON `body_measurements` (`measured_on`);--> statement-breakpoint
CREATE TABLE `goal_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`effective_from` text NOT NULL,
	`kcal` integer NOT NULL,
	`protein_g` integer NOT NULL,
	`carbs_g` integer NOT NULL,
	`fat_g` integer NOT NULL,
	`weight_kg` real NOT NULL,
	`bmr` integer NOT NULL,
	`bmr_formula` text NOT NULL,
	`tdee` integer NOT NULL,
	`kcal_overridden` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `goal_versions_effective_from_idx` ON `goal_versions` (`effective_from`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`name` text NOT NULL,
	`sex` text NOT NULL,
	`birth_date` text NOT NULL,
	`height_cm` real NOT NULL,
	`body_fat_pct` real,
	`activity_level` text NOT NULL,
	`goal` text NOT NULL,
	`weekly_rate_kg` real NOT NULL,
	`protein_per_kg` real NOT NULL,
	`fat_per_kg` real NOT NULL,
	`kcal_override` integer,
	`recalc_dismissed_at_kg` real
);
--> statement-breakpoint
CREATE TABLE `weight_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`measured_at` integer NOT NULL,
	`weight_kg` real NOT NULL,
	`note` text
);
--> statement-breakpoint
CREATE INDEX `weight_entries_measured_at_idx` ON `weight_entries` (`measured_at`);