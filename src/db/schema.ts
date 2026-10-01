import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Esquema do banco local (SQLite). As migrações em src/db/migrations são geradas a partir
 * deste arquivo com `npm run db:generate`; nunca edite as migrações à mão.
 *
 * Toda tabela de dados do usuário já nasce pronta para a sincronização da Fase 5:
 * id UUID gerado no celular, `updated_at` para o Last-Write-Wins e exclusão lógica
 * (`deleted_at`), para que a exclusão também seja sincronizada.
 *
 * Datas: instantes em ms (`timestamp_ms`); dias do calendário como texto 'AAAA-MM-DD'
 * no fuso do celular (ver src/lib/dates.ts).
 *
 * Este arquivo é lido também pelo drizzle-kit no Node: não importe nada do React Native aqui.
 */
const syncColumns = {
  id: text('id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
};

export const SEXES = ['male', 'female'] as const;
export const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'very', 'extra'] as const;
export const GOAL_TYPES = ['lose', 'maintain', 'gain'] as const;

export type Sex = (typeof SEXES)[number];
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];
export type GoalType = (typeof GOAL_TYPES)[number];

/** Perfil do usuário: uma linha só (a não excluída). */
export const profiles = sqliteTable('profiles', {
  ...syncColumns,
  name: text('name').notNull(),
  sex: text('sex', { enum: SEXES }).notNull(),
  birthDate: text('birth_date').notNull(),
  heightCm: real('height_cm').notNull(),
  /** Opcional. Quando preenchido, a TMB passa a ser Katch-McArdle. */
  bodyFatPct: real('body_fat_pct'),
  activityLevel: text('activity_level', { enum: ACTIVITY_LEVELS }).notNull(),
  goal: text('goal', { enum: GOAL_TYPES }).notNull(),
  /** Ritmo em kg por semana, sempre positivo; o sinal vem de `goal`. Ignorado em 'maintain'. */
  weeklyRateKg: real('weekly_rate_kg').notNull(),
  proteinPerKg: real('protein_per_kg').notNull(),
  fatPerKg: real('fat_per_kg').notNull(),
  /** Calorias definidas à mão pelo usuário; null = usa a conta. */
  kcalOverride: integer('kcal_override'),
  /** Tendência de peso em que o usuário dispensou o aviso de recálculo das metas. */
  recalcDismissedAtKg: real('recalc_dismissed_at_kg'),
});

/**
 * Histórico das metas: cada mudança vira uma versão que vale a partir de `effectiveFrom`.
 * A meta de um dia é a versão mais recente com `effectiveFrom` <= aquele dia. Mudanças no
 * mesmo dia atualizam a versão do dia em vez de criar outra.
 */
export const goalVersions = sqliteTable(
  'goal_versions',
  {
    ...syncColumns,
    effectiveFrom: text('effective_from').notNull(),
    kcal: integer('kcal').notNull(),
    proteinG: integer('protein_g').notNull(),
    carbsG: integer('carbs_g').notNull(),
    fatG: integer('fat_g').notNull(),
    // Retrato das entradas da conta, para explicar a meta depois.
    weightKg: real('weight_kg').notNull(),
    bmr: integer('bmr').notNull(),
    bmrFormula: text('bmr_formula', { enum: ['mifflin', 'katch'] }).notNull(),
    tdee: integer('tdee').notNull(),
    kcalOverridden: integer('kcal_overridden', { mode: 'boolean' }).notNull(),
  },
  (t) => [index('goal_versions_effective_from_idx').on(t.effectiveFrom)],
);

export const weightEntries = sqliteTable(
  'weight_entries',
  {
    ...syncColumns,
    measuredAt: integer('measured_at', { mode: 'timestamp_ms' }).notNull(),
    weightKg: real('weight_kg').notNull(),
    note: text('note'),
  },
  (t) => [index('weight_entries_measured_at_idx').on(t.measuredAt)],
);

/** Uma medição por linha; todas as medidas são opcionais e em cm, de um lado só. */
export const bodyMeasurements = sqliteTable(
  'body_measurements',
  {
    ...syncColumns,
    measuredOn: text('measured_on').notNull(),
    neckCm: real('neck_cm'),
    shouldersCm: real('shoulders_cm'),
    chestCm: real('chest_cm'),
    waistCm: real('waist_cm'),
    abdomenCm: real('abdomen_cm'),
    hipsCm: real('hips_cm'),
    armCm: real('arm_cm'),
    forearmCm: real('forearm_cm'),
    thighCm: real('thigh_cm'),
    calfCm: real('calf_cm'),
    note: text('note'),
  },
  (t) => [index('body_measurements_measured_on_idx').on(t.measuredOn)],
);

export type Profile = typeof profiles.$inferSelect;
export type GoalVersion = typeof goalVersions.$inferSelect;
export type WeightEntry = typeof weightEntries.$inferSelect;
export type BodyMeasurement = typeof bodyMeasurements.$inferSelect;
