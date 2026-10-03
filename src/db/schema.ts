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
  /** Meta de água definida à mão (ml/dia); null = 35 ml por kg de peso de tendência. */
  waterGoalMl: integer('water_goal_ml'),
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

// ── Fase 2: exercícios, mídias e plano semanal ───────────────────────────────────────────

export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'traps',
  'front_delts',
  'side_delts',
  'rear_delts',
  'biceps',
  'triceps',
  'forearms',
  'quads',
  'hamstrings',
  'glutes',
  'adductors',
  'calves',
  'abs',
  'lower_back',
  'cardio',
] as const;
export const EQUIPMENT = [
  'machine',
  'cable',
  'dumbbell',
  'barbell',
  'ez_bar',
  'smith',
  'bodyweight',
  'other',
] as const;
/** kg; placas (só o número, sem converter); peso corporal (reps); tempo (cardio, prancha). */
export const LOAD_TYPES = ['kg', 'plates', 'bodyweight', 'time'] as const;
/**
 * Completo: 2×12 de aquecimento + 2 de preparação; leve: 1 série leve de 12; preparação: 1 série
 * de poucas reps perto da carga; direto: nenhuma. (Texto no SQLite: novos tipos não pedem migração.)
 */
export const WARMUP_TYPES = ['full', 'light', 'prep', 'none'] as const;
export const MEDIA_KINDS = ['link', 'image', 'video'] as const;
export const SESSION_KINDS = ['workout', 'activity'] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
export type Equipment = (typeof EQUIPMENT)[number];
export type LoadType = (typeof LOAD_TYPES)[number];
export type WarmupType = (typeof WARMUP_TYPES)[number];
export type MediaKind = (typeof MEDIA_KINDS)[number];
export type SessionKind = (typeof SESSION_KINDS)[number];

/** Uma série de referência: carga (kg, placas ou extra no peso corporal) × repetições. */
export type ReferenceSet = { load: number | null; reps: number };

/**
 * Os exercícios do usuário. O catálogo base (src/features/exercises/catalog) é fixo no app;
 * um exercício dele só vira linha aqui quando entra no plano, ganha mídia ou é editado,
 * e guarda `catalogKey` para mostrar as fotos e o "como fazer".
 */
export const exercises = sqliteTable('exercises', {
  ...syncColumns,
  name: text('name').notNull(),
  primaryMuscle: text('primary_muscle', { enum: MUSCLE_GROUPS }).notNull(),
  secondaryMuscles: text('secondary_muscles', { mode: 'json' }).$type<MuscleGroup[]>().notNull(),
  equipment: text('equipment', { enum: EQUIPMENT }).notNull(),
  loadType: text('load_type', { enum: LOAD_TYPES }).notNull(),
  unilateral: integer('unilateral', { mode: 'boolean' }).notNull(),
  /** Observação fixa, mostrada durante o treino (ex.: "técnica/lombar"). */
  notes: text('notes'),
  catalogKey: text('catalog_key'),
  /** Ponto de partida da progressão enquanto não há histórico (Fase 3). */
  referenceSets: text('reference_sets', { mode: 'json' }).$type<ReferenceSet[]>(),
  /** Quanto a carga sobe na progressão; null = padrão do equipamento. */
  loadIncrement: real('load_increment'),
});

/** Links (YouTube, Instagram...) e fotos/vídeos da galeria, guardados em Paths.document/media. */
export const exerciseMedia = sqliteTable(
  'exercise_media',
  {
    ...syncColumns,
    exerciseId: text('exercise_id').notNull(),
    kind: text('kind', { enum: MEDIA_KINDS }).notNull(),
    url: text('url'),
    /** Nome do arquivo dentro da pasta de mídias (o caminho absoluto muda entre versões do app). */
    fileName: text('file_name'),
    title: text('title'),
    sortOrder: integer('sort_order').notNull(),
  },
  (t) => [index('exercise_media_exercise_id_idx').on(t.exerciseId)],
);

/** Plano semanal. Por enquanto o app usa um só (o ativo). */
export const plans = sqliteTable('plans', {
  ...syncColumns,
  name: text('name').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull(),
  /** Orientações gerais do plano (vêm dos modelos prontos). */
  notes: text('notes'),
});

/** Um treino ou uma atividade (futebol) num dia da semana. Dia sem sessão = descanso. */
export const planSessions = sqliteTable(
  'plan_sessions',
  {
    ...syncColumns,
    planId: text('plan_id').notNull(),
    /** 1 = segunda ... 7 = domingo (ISO). */
    weekday: integer('weekday').notNull(),
    sortOrder: integer('sort_order').notNull(),
    kind: text('kind', { enum: SESSION_KINDS }).notNull(),
    name: text('name').notNull(),
    /** Horário 'HH:MM' (atividades). */
    time: text('time'),
  },
  (t) => [index('plan_sessions_plan_id_idx').on(t.planId)],
);

/** Um exercício dentro de um treino, com a prescrição. */
export const planExercises = sqliteTable(
  'plan_exercises',
  {
    ...syncColumns,
    sessionId: text('session_id').notNull(),
    exerciseId: text('exercise_id').notNull(),
    sortOrder: integer('sort_order').notNull(),
    /** Outros exercícios que valem no lugar deste (máquina ocupada, "supino OU crossover"). */
    alternativeIds: text('alternative_ids', { mode: 'json' }).$type<string[]>().notNull(),
    /** Séries válidas (sem contar aquecimento). */
    setsCount: integer('sets_count').notNull(),
    repsMin: integer('reps_min'),
    repsMax: integer('reps_max'),
    /** Exercícios por tempo, em segundos. */
    durationMinSec: integer('duration_min_sec'),
    durationMaxSec: integer('duration_max_sec'),
    /** Repetições na reserva nas séries antes da última; null = sem alvo. */
    rirTarget: integer('rir_target'),
    lastSetToFailure: integer('last_set_to_failure', { mode: 'boolean' }).notNull(),
    warmup: text('warmup', { enum: WARMUP_TYPES }).notNull(),
    restSec: integer('rest_sec').notNull(),
    /** Subir a carga só quando a última série chegar a estas reps (null = topo da faixa). */
    progressionTopReps: integer('progression_top_reps'),
  },
  (t) => [index('plan_exercises_session_id_idx').on(t.sessionId)],
);

/** Atividade marcada como feita num dia (ex.: o futebol de quinta). */
export const activityLogs = sqliteTable(
  'activity_logs',
  {
    ...syncColumns,
    sessionId: text('session_id').notNull(),
    day: text('day').notNull(),
  },
  (t) => [index('activity_logs_day_idx').on(t.day)],
);

// ── Fase 3: treinos feitos ────────────────────────────────────────────────────────────────

export const SET_KINDS = ['warmup', 'prep', 'working'] as const;
export type SetKind = (typeof SET_KINDS)[number];

/** Um treino feito (ou em andamento, enquanto `finishedAt` é null). */
export const workouts = sqliteTable(
  'workouts',
  {
    ...syncColumns,
    /** Treino do plano que deu origem (null se o treino do plano foi apagado depois). */
    planSessionId: text('plan_session_id'),
    name: text('name').notNull(),
    startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
    finishedAt: integer('finished_at', { mode: 'timestamp_ms' }),
    /** Fim do descanso em andamento (timer), para sobreviver a fechar o app. */
    restEndsAt: integer('rest_ends_at', { mode: 'timestamp_ms' }),
  },
  (t) => [index('workouts_started_at_idx').on(t.startedAt)],
);

/**
 * Um exercício dentro de um treino feito. Guarda uma cópia da prescrição do dia: mudar o plano
 * depois não altera o histórico.
 */
export const workoutExercises = sqliteTable(
  'workout_exercises',
  {
    ...syncColumns,
    workoutId: text('workout_id').notNull(),
    exerciseId: text('exercise_id').notNull(),
    /** Exercício do plano de onde veio (para as alternativas); null nos extras. */
    planExerciseId: text('plan_exercise_id'),
    sortOrder: integer('sort_order').notNull(),
    skipped: integer('skipped', { mode: 'boolean' }).notNull(),
    setsCount: integer('sets_count').notNull(),
    repsMin: integer('reps_min'),
    repsMax: integer('reps_max'),
    durationMinSec: integer('duration_min_sec'),
    durationMaxSec: integer('duration_max_sec'),
    rirTarget: integer('rir_target'),
    lastSetToFailure: integer('last_set_to_failure', { mode: 'boolean' }).notNull(),
    warmup: text('warmup', { enum: WARMUP_TYPES }).notNull(),
    restSec: integer('rest_sec').notNull(),
    progressionTopReps: integer('progression_top_reps'),
  },
  (t) => [index('workout_exercises_workout_id_idx').on(t.workoutId)],
);

/**
 * Uma série. Nasce planejada (com a sugestão de carga e reps) e vira feita quando `completedAt`
 * é preenchido. RIR 0 = até a falha.
 */
export const workoutSets = sqliteTable(
  'workout_sets',
  {
    ...syncColumns,
    workoutExerciseId: text('workout_exercise_id').notNull(),
    sortOrder: integer('sort_order').notNull(),
    kind: text('kind', { enum: SET_KINDS }).notNull(),
    load: real('load'),
    reps: integer('reps'),
    durationSec: integer('duration_sec'),
    rir: integer('rir'),
    /** Sugestão do app (para mostrar "↑ subir carga" e comparar com o feito). */
    suggestedLoad: real('suggested_load'),
    suggestedReps: integer('suggested_reps'),
    completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
  },
  (t) => [index('workout_sets_workout_exercise_id_idx').on(t.workoutExerciseId)],
);

// ── Fase 4: dieta ─────────────────────────────────────────────────────────────────────────

/**
 * Referência a um alimento de qualquer fonte: 'taco:123' (tabela embutida no app) ou
 * 'food:<id>' (linha de `foods`: seus alimentos e produtos lidos pelo código de barras).
 */
export type FoodKey = string;

/** Valores por 100 g. */
export type Per100 = { kcal: number; protein: number; carbs: number; fat: number; fiber: number };

export const FOOD_SOURCES = ['custom', 'off'] as const;
export type FoodSource = (typeof FOOD_SOURCES)[number];

/** Unidade da quantidade: gramas ou mililitros (bebidas). Os valores são por 100 g ou 100 ml. */
export const FOOD_UNITS = ['g', 'ml'] as const;
export type FoodUnit = (typeof FOOD_UNITS)[number];

const per100Columns = {
  kcal: real('kcal').notNull(),
  protein: real('protein').notNull(),
  carbs: real('carbs').notNull(),
  fat: real('fat').notNull(),
  fiber: real('fiber').notNull(),
};

/** Alimentos seus e produtos do Open Food Facts guardados no celular (valores por 100 g/ml). */
export const foods = sqliteTable(
  'foods',
  {
    ...syncColumns,
    source: text('source', { enum: FOOD_SOURCES }).notNull(),
    name: text('name').notNull(),
    brand: text('brand'),
    barcode: text('barcode'),
    unit: text('unit', { enum: FOOD_UNITS }).notNull().default('g'),
    ...per100Columns,
  },
  (t) => [index('foods_barcode_idx').on(t.barcode)],
);

/** Porções salvas de um alimento ("1 pão francês = 50 g", "1 lata = 350 ml"); na unidade dele. */
export const foodPortions = sqliteTable(
  'food_portions',
  {
    ...syncColumns,
    foodKey: text('food_key').notNull(),
    name: text('name').notNull(),
    /** Quantidade na unidade do alimento (g ou ml). */
    grams: real('grams').notNull(),
  },
  (t) => [index('food_portions_food_key_idx').on(t.foodKey)],
);

export const foodFavorites = sqliteTable('food_favorites', {
  ...syncColumns,
  foodKey: text('food_key').notNull(),
});

/** As refeições do dia (Café da manhã, Almoço...), na ordem; escondidas não aparecem. */
export const meals = sqliteTable('meals', {
  ...syncColumns,
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull(),
  hidden: integer('hidden', { mode: 'boolean' }).notNull(),
});

/**
 * Um alimento comido num dia e numa refeição. Guarda uma cópia do nome e dos valores por 100 g:
 * editar ou apagar o alimento depois não muda o que já foi registrado.
 */
export const diaryEntries = sqliteTable(
  'diary_entries',
  {
    ...syncColumns,
    day: text('day').notNull(),
    mealId: text('meal_id').notNull(),
    foodKey: text('food_key').notNull(),
    name: text('name').notNull(),
    /** Quantidade na unidade do alimento (g ou ml). */
    grams: real('grams').notNull(),
    unit: text('unit', { enum: FOOD_UNITS }).notNull().default('g'),
    ...per100Columns,
  },
  (t) => [index('diary_entries_day_idx').on(t.day)],
);

export type SavedMealItem = {
  foodKey: FoodKey;
  name: string;
  grams: number;
  /** Ausente nas refeições salvas antes de existir ml: gramas. */
  unit?: FoodUnit;
} & Per100;

/** Refeição salva para repetir com um toque ("Café padrão"). */
export const savedMeals = sqliteTable('saved_meals', {
  ...syncColumns,
  name: text('name').notNull(),
  items: text('items', { mode: 'json' }).$type<SavedMealItem[]>().notNull(),
});

export const waterLogs = sqliteTable(
  'water_logs',
  {
    ...syncColumns,
    day: text('day').notNull(),
    ml: integer('ml').notNull(),
  },
  (t) => [index('water_logs_day_idx').on(t.day)],
);

export type Profile = typeof profiles.$inferSelect;
export type GoalVersion = typeof goalVersions.$inferSelect;
export type WeightEntry = typeof weightEntries.$inferSelect;
export type BodyMeasurement = typeof bodyMeasurements.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type ExerciseMedia = typeof exerciseMedia.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type PlanSession = typeof planSessions.$inferSelect;
export type PlanExercise = typeof planExercises.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type WorkoutExercise = typeof workoutExercises.$inferSelect;
export type WorkoutSet = typeof workoutSets.$inferSelect;
export type Food = typeof foods.$inferSelect;
export type FoodPortion = typeof foodPortions.$inferSelect;
export type Meal = typeof meals.$inferSelect;
export type DiaryEntry = typeof diaryEntries.$inferSelect;
export type SavedMeal = typeof savedMeals.$inferSelect;
export type WaterLog = typeof waterLogs.$inferSelect;
