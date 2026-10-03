CREATE TABLE `post_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`data` text NOT NULL,
	`caption` text,
	`day` text,
	`photo_file` text,
	`photo_width` integer,
	`photo_height` integer,
	`created_at` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text
);
