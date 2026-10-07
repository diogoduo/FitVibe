CREATE TABLE `activity_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`plan_session_id` text,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`day` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`wins` integer DEFAULT 0 NOT NULL,
	`draws` integer DEFAULT 0 NOT NULL,
	`losses` integer DEFAULT 0 NOT NULL,
	`goals` integer DEFAULT 0 NOT NULL,
	`assists` integer DEFAULT 0 NOT NULL,
	`notes` text
);
--> statement-breakpoint
CREATE INDEX `activity_sessions_day_idx` ON `activity_sessions` (`day`);--> statement-breakpoint
ALTER TABLE `workout_exercises` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `workouts` ADD `notes` text;