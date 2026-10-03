CREATE TABLE `sync_cursors` (
	`table_name` text PRIMARY KEY NOT NULL,
	`server_updated_at` text NOT NULL,
	`row_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_queue` (
	`table_name` text NOT NULL,
	`row_id` text NOT NULL,
	`queued_updated_at` integer NOT NULL,
	PRIMARY KEY(`table_name`, `row_id`)
);
--> statement-breakpoint
CREATE TABLE `sync_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`applying` integer DEFAULT 0 NOT NULL,
	`user_id` text,
	`last_sync_at` integer,
	`last_error` text
);
