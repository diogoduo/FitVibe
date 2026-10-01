import type { Equipment, Exercise, LoadType, MuscleGroup } from '@/db/schema';
import { matchesSearch } from '@/lib/text';

import data from './catalog/catalog.json';
import { CATALOG_IMAGES } from './catalog/images';
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from './labels';

/**
 * Catálogo base de exercícios: nomes e "como fazer" em português escritos para o app, fotos
 * do free-exercise-db (domínio público). Fica embutido no app e funciona sem internet.
 */
export type CatalogExercise = {
  /** Id do exercício no free-exercise-db. */
  key: string;
  name: string;
  primary: MuscleGroup;
  secondary: MuscleGroup[];
  equipment: Equipment;
  load: LoadType;
  unilateral: boolean;
  steps: string[];
};

type RawEntry = Omit<CatalogExercise, 'unilateral'> & { unilateral?: boolean };

export const CATALOG: CatalogExercise[] = (data as RawEntry[]).map((entry) => ({
  ...entry,
  unilateral: entry.unilateral ?? false,
}));

const BY_KEY = new Map(CATALOG.map((entry) => [entry.key, entry]));

export function getCatalogExercise(key: string | null | undefined): CatalogExercise | null {
  return key ? (BY_KEY.get(key) ?? null) : null;
}

/** Fotos (início e fim do movimento) de um exercício do catálogo; vazio para os próprios. */
export function catalogImages(key: string | null | undefined): number[] {
  return key ? (CATALOG_IMAGES[key] ?? []) : [];
}

/** Item da biblioteca: um exercício seu (no banco) ou um do catálogo ainda não usado. */
export type LibraryItem =
  { kind: 'mine'; exercise: Exercise } | { kind: 'catalog'; entry: CatalogExercise };

const collator = new Intl.Collator('pt-BR');

/**
 * A lista da biblioteca: primeiro os seus exercícios, depois os do catálogo que você ainda não
 * usa (um exercício do catálogo que virou seu aparece só uma vez, como seu). A busca procura
 * no nome, no grupo muscular e no equipamento, sem diferenciar acento.
 */
export function buildLibrary(
  mine: readonly Exercise[],
  query: string,
  muscle: MuscleGroup | null,
): LibraryItem[] {
  const used = new Set(mine.map((exercise) => exercise.catalogKey).filter(Boolean));
  const matches = (name: string, primary: MuscleGroup, equipment: Equipment) =>
    (muscle == null || primary === muscle) &&
    matchesSearch(`${name} ${MUSCLE_LABELS[primary]} ${EQUIPMENT_LABELS[equipment]}`, query);

  const own = mine
    .filter((exercise) => matches(exercise.name, exercise.primaryMuscle, exercise.equipment))
    .sort((a, b) => collator.compare(a.name, b.name))
    .map((exercise): LibraryItem => ({ kind: 'mine', exercise }));
  const catalog = CATALOG.filter(
    (entry) => !used.has(entry.key) && matches(entry.name, entry.primary, entry.equipment),
  )
    .sort((a, b) => collator.compare(a.name, b.name))
    .map((entry): LibraryItem => ({ kind: 'catalog', entry }));
  return [...own, ...catalog];
}
