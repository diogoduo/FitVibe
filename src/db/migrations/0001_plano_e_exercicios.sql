CREATE TABLE `activity_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`session_id` text NOT NULL,
	`day` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `activity_logs_day_idx` ON `activity_logs` (`day`);--> statement-breakpoint
CREATE TABLE `exercise_media` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`exercise_id` text NOT NULL,
	`kind` text NOT NULL,
	`url` text,
	`file_name` text,
	`title` text,
	`sort_order` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `exercise_media_exercise_id_idx` ON `exercise_media` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`name` text NOT NULL,
	`primary_muscle` text NOT NULL,
	`secondary_muscles` text NOT NULL,
	`equipment` text NOT NULL,
	`load_type` text NOT NULL,
	`unilateral` integer NOT NULL,
	`notes` text,
	`catalog_key` text,
	`reference_sets` text
);
--> statement-breakpoint
CREATE TABLE `plan_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`session_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`sort_order` integer NOT NULL,
	`alternative_ids` text NOT NULL,
	`sets_count` integer NOT NULL,
	`reps_min` integer,
	`reps_max` integer,
	`duration_min_sec` integer,
	`duration_max_sec` integer,
	`rir_target` integer,
	`last_set_to_failure` integer NOT NULL,
	`warmup` text NOT NULL,
	`rest_sec` integer NOT NULL,
	`progression_top_reps` integer
);
--> statement-breakpoint
CREATE INDEX `plan_exercises_session_id_idx` ON `plan_exercises` (`session_id`);--> statement-breakpoint
CREATE TABLE `plan_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`plan_id` text NOT NULL,
	`weekday` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`time` text
);
--> statement-breakpoint
CREATE INDEX `plan_sessions_plan_id_idx` ON `plan_sessions` (`plan_id`);--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`name` text NOT NULL,
	`is_active` integer NOT NULL
);
