CREATE TABLE `progress_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`taken_on` text NOT NULL,
	`pose` text NOT NULL,
	`file_name` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `progress_photos_taken_on_idx` ON `progress_photos` (`taken_on`);