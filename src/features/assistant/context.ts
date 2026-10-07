import { and, asc, eq, isNull } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  exercises,
  foodFavorites,
  foodPortions,
  foods,
  meals,
  planSessions,
  workoutExercises,
} from '@/db/schema';

import { recentFoodKeys } from '../foods/repository';
import { getActivePlan } from '../plan/repository';
import { getActiveWorkout } from '../workout/repository';
import { buildFoodCatalog } from './catalog';
import type { AssistantContext } from './request';

/** Lê do celular o que a IA precisa saber agora (na hora de mandar a fala). */
export function loadAssistantContext(now = new Date()): AssistantContext {
  const catalog = buildFoodCatalog({
    rows: db.select().from(foods).all(),
    portions: db.select().from(foodPortions).where(isNull(foodPortions.deletedAt)).all(),
    favorites: new Set(
      db
        .select()
        .from(foodFavorites)
        .where(isNull(foodFavorites.deletedAt))
        .all()
        .map((favorite) => favorite.foodKey),
    ),
    recent: recentFoodKeys(40),
  });

  const visibleMeals = db
    .select({ id: meals.id, name: meals.name })
    .from(meals)
    .where(and(isNull(meals.deletedAt), eq(meals.hidden, false)))
    .orderBy(asc(meals.sortOrder))
    .all();

  const workout = getActiveWorkout();
  const entries = workout
    ? db
        .select({ entryId: workoutExercises.id, name: exercises.name })
        .from(workoutExercises)
        .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
        .where(
          and(
            eq(workoutExercises.workoutId, workout.id),
            isNull(workoutExercises.deletedAt),
            eq(workoutExercises.skipped, false),
            // Cardio por tempo não tem séries de carga × reps.
            isNull(workoutExercises.durationMinSec),
          ),
        )
        .orderBy(asc(workoutExercises.sortOrder))
        .all()
    : [];

  const plan = getActivePlan();
  const sessions = plan
    ? db
        .select()
        .from(planSessions)
        .where(
          and(
            eq(planSessions.planId, plan.id),
            eq(planSessions.kind, 'workout'),
            isNull(planSessions.deletedAt),
          ),
        )
        .orderBy(asc(planSessions.weekday), asc(planSessions.sortOrder))
        .all()
    : [];

  return {
    now,
    meals: visibleMeals,
    catalog,
    exercises: entries.map((entry, index) => ({ code: `e${index + 1}`, ...entry })),
    sessions: sessions.map((session, index) => ({
      code: `s${index + 1}`,
      id: session.id,
      name: session.name,
      weekday: session.weekday,
    })),
  };
}
