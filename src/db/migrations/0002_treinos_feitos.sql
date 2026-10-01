CREATE TABLE `workout_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`workout_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`plan_exercise_id` text,
	`sort_order` integer NOT NULL,
	`skipped` integer NOT NULL,
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
CREATE INDEX `workout_exercises_workout_id_idx` ON `workout_exercises` (`workout_id`);--> statement-breakpoint
CREATE TABLE `workout_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`workout_exercise_id` text NOT NULL,
	`sort_order` integer NOT NULL,
	`kind` text NOT NULL,
	`load` real,
	`reps` integer,
	`duration_sec` integer,
	`rir` integer,
	`suggested_load` real,
	`suggested_reps` integer,
	`completed_at` integer
);
--> statement-breakpoint
CREATE INDEX `workout_sets_workout_exercise_id_idx` ON `workout_sets` (`workout_exercise_id`);--> statement-breakpoint
CREATE TABLE `workouts` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`plan_session_id` text,
	`name` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`rest_ends_at` integer
);
--> statement-breakpoint
CREATE INDEX `workouts_started_at_idx` ON `workouts` (`started_at`);--> statement-breakpoint
ALTER TABLE `exercises` ADD `load_increment` real;