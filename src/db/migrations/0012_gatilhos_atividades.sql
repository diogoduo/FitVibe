-- Gerado por scripts/build-sync-sql.mts a partir de src/db/schema.ts. Não edite à mão.
-- Fila de envio da sincronização.
INSERT OR IGNORE INTO `sync_state` (`id`, `applying`) VALUES (1, 0);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_activity_sessions_insert`
AFTER INSERT ON `activity_sessions`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('activity_sessions', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_activity_sessions_update`
AFTER UPDATE ON `activity_sessions`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('activity_sessions', NEW.`id`, NEW.`updated_at`);
END;
