import { eq, isNotNull } from 'drizzle-orm';

import { db, newId } from '@/db/client';
import {
  activityLogs,
  bodyMeasurements,
  diaryEntries,
  exerciseMedia,
  exercises,
  foodFavorites,
  foodPortions,
  foods,
  goalVersions,
  meals,
  planExercises,
  planSessions,
  plans,
  profiles,
  savedMeals,
  waterLogs,
  weightEntries,
  workoutExercises,
  workouts,
  workoutSets,
  type Profile,
} from '@/db/schema';
import { toDayKey, todayKey } from '@/lib/dates';
import { roundTenth } from '@/lib/numbers';

import { computeGoals } from '../goals/energy';
import { saveGoalVersion } from '../goals/repository';
import { pickProfileData, toEnergyInput, type ProfileData } from './profile-form';

/** Fim do cadastro: perfil, primeira pesagem e primeira meta, tudo ou nada. */
export function createProfile(data: ProfileData, firstWeightKg: number) {
  const now = new Date();
  const today = toDayKey(now);
  db.transaction((tx) => {
    tx.insert(profiles)
      .values({ id: newId(), ...data })
      .run();
    tx.insert(weightEntries)
      .values({ id: newId(), measuredAt: now, weightKg: firstWeightKg, note: null })
      .run();
    const goals = computeGoals(toEnergyInput(data, firstWeightKg, today));
    saveGoalVersion(tx, goals, firstWeightKg, today);
  });
}

/** Salva o perfil editado e a meta resultante (nova versão a partir de hoje, se mudou). */
export function updateProfile(id: string, data: ProfileData, referenceWeightKg: number) {
  const today = todayKey();
  db.transaction((tx) => {
    tx.update(profiles)
      .set({ ...data, recalcDismissedAtKg: null })
      .where(eq(profiles.id, id))
      .run();
    const goals = computeGoals(toEnergyInput(data, referenceWeightKg, today));
    saveGoalVersion(tx, goals, referenceWeightKg, today);
  });
}

/** Refaz as metas com o peso de tendência atual (aviso de recálculo na aba Hoje). */
export function recalculateGoals(profile: Profile, referenceWeightKg: number) {
  updateProfile(profile.id, pickProfileData(profile), referenceWeightKg);
}

/** "Agora não" no aviso de recálculo: guarda em que tendência a pessoa dispensou. */
export function dismissRecalc(profileId: string, trendKg: number) {
  db.update(profiles)
    .set({ recalcDismissedAtKg: roundTenth(trendKg) })
    .where(eq(profiles.id, profileId))
    .run();
}

/**
 * Apaga tudo do banco (exclusão de verdade, não lógica). Os arquivos de mídia são apagados à
 * parte (media/files.ts), porque não ficam no banco. O `where` evita a otimização de
 * truncate do SQLite, que não avisa o change listener e deixaria as telas desatualizadas.
 */
export function wipeAllData() {
  db.transaction((tx) => {
    for (const table of [
      diaryEntries,
      savedMeals,
      meals,
      waterLogs,
      foodPortions,
      foodFavorites,
      foods,
      workoutSets,
      workoutExercises,
      workouts,
      activityLogs,
      planExercises,
      planSessions,
      plans,
      exerciseMedia,
      exercises,
      weightEntries,
      bodyMeasurements,
      goalVersions,
      profiles,
    ]) {
      tx.delete(table).where(isNotNull(table.id)).run();
    }
  });
}
