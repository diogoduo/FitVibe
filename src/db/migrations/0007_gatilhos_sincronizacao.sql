-- Gerado por scripts/build-sync-sql.mts a partir de src/db/schema.ts. Não edite à mão.
-- Fila de envio da sincronização.
INSERT OR IGNORE INTO `sync_state` (`id`, `applying`) VALUES (1, 0);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_activity_logs_insert`
AFTER INSERT ON `activity_logs`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('activity_logs', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_activity_logs_update`
AFTER UPDATE ON `activity_logs`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('activity_logs', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_body_measurements_insert`
AFTER INSERT ON `body_measurements`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('body_measurements', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_body_measurements_update`
AFTER UPDATE ON `body_measurements`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('body_measurements', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_diary_entries_insert`
AFTER INSERT ON `diary_entries`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('diary_entries', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_diary_entries_update`
AFTER UPDATE ON `diary_entries`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('diary_entries', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_exercise_media_insert`
AFTER INSERT ON `exercise_media`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('exercise_media', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_exercise_media_update`
AFTER UPDATE ON `exercise_media`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('exercise_media', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_exercises_insert`
AFTER INSERT ON `exercises`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('exercises', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_exercises_update`
AFTER UPDATE ON `exercises`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('exercises', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_food_favorites_insert`
AFTER INSERT ON `food_favorites`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('food_favorites', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_food_favorites_update`
AFTER UPDATE ON `food_favorites`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('food_favorites', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_food_portions_insert`
AFTER INSERT ON `food_portions`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('food_portions', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_food_portions_update`
AFTER UPDATE ON `food_portions`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('food_portions', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_foods_insert`
AFTER INSERT ON `foods`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('foods', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_foods_update`
AFTER UPDATE ON `foods`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('foods', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_goal_versions_insert`
AFTER INSERT ON `goal_versions`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('goal_versions', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_goal_versions_update`
AFTER UPDATE ON `goal_versions`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('goal_versions', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_meals_insert`
AFTER INSERT ON `meals`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('meals', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_meals_update`
AFTER UPDATE ON `meals`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('meals', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_plan_exercises_insert`
AFTER INSERT ON `plan_exercises`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('plan_exercises', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_plan_exercises_update`
AFTER UPDATE ON `plan_exercises`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('plan_exercises', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_plan_sessions_insert`
AFTER INSERT ON `plan_sessions`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('plan_sessions', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_plan_sessions_update`
AFTER UPDATE ON `plan_sessions`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('plan_sessions', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_plans_insert`
AFTER INSERT ON `plans`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('plans', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_plans_update`
AFTER UPDATE ON `plans`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('plans', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_profiles_insert`
AFTER INSERT ON `profiles`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('profiles', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_profiles_update`
AFTER UPDATE ON `profiles`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('profiles', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_saved_meals_insert`
AFTER INSERT ON `saved_meals`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('saved_meals', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_saved_meals_update`
AFTER UPDATE ON `saved_meals`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('saved_meals', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_water_logs_insert`
AFTER INSERT ON `water_logs`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('water_logs', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_water_logs_update`
AFTER UPDATE ON `water_logs`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('water_logs', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_weight_entries_insert`
AFTER INSERT ON `weight_entries`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('weight_entries', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_weight_entries_update`
AFTER UPDATE ON `weight_entries`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('weight_entries', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_workout_exercises_insert`
AFTER INSERT ON `workout_exercises`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('workout_exercises', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_workout_exercises_update`
AFTER UPDATE ON `workout_exercises`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('workout_exercises', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_workout_sets_insert`
AFTER INSERT ON `workout_sets`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('workout_sets', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_workout_sets_update`
AFTER UPDATE ON `workout_sets`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('workout_sets', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_workouts_insert`
AFTER INSERT ON `workouts`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('workouts', NEW.`id`, NEW.`updated_at`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `sync_queue_workouts_update`
AFTER UPDATE ON `workouts`
WHEN (SELECT `applying` FROM `sync_state` WHERE `id` = 1) = 0
BEGIN
  INSERT OR REPLACE INTO `sync_queue` (`table_name`, `row_id`, `queued_updated_at`)
  VALUES ('workouts', NEW.`id`, NEW.`updated_at`);
END;
