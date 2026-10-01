import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import type { Equipment, LoadType, MuscleGroup, ReferenceSet } from '@/db/schema';
import { weekdayName } from '@/lib/dates';

import { catalogImages, getCatalogExercise } from './catalog';
import { formatReferenceSet } from './exercise-form';
import { EQUIPMENT_LABELS, LOAD_TYPE_LABELS, MUSCLE_LABELS } from './labels';

export type ExerciseDetailData = {
  name: string;
  catalogKey: string | null;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  loadType: LoadType;
  unilateral: boolean;
  notes: string | null;
  referenceSets: ReferenceSet[] | null;
};

type ExerciseDetailProps = {
  exercise: ExerciseDetailData;
  /** Onde aparece no plano (só para os seus exercícios). */
  usage?: { sessionName: string; weekday: number }[];
  /** Mídias e botões, abaixo do "como fazer". */
  children?: ReactNode;
};

/** Fotos, grupos musculares, observação, referência e "como fazer" de um exercício. */
export function ExerciseDetail({ exercise, usage = [], children }: ExerciseDetailProps) {
  const images = catalogImages(exercise.catalogKey);
  const steps = getCatalogExercise(exercise.catalogKey)?.steps ?? [];
  const tags = [
    EQUIPMENT_LABELS[exercise.equipment],
    LOAD_TYPE_LABELS[exercise.loadType],
    ...(exercise.unilateral ? ['Unilateral (cada lado)'] : []),
  ];

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-4 p-4 pb-12"
      contentInsetAdjustmentBehavior="automatic"
    >
      {images.length > 0 ? (
        <View className="flex-row gap-2">
          {images.map((image, index) => (
            <Image
              key={index}
              source={image}
              style={{ flex: 1, aspectRatio: 3 / 2, borderRadius: 12 }}
              contentFit="cover"
              accessibilityLabel={index === 0 ? 'Início do movimento' : 'Fim do movimento'}
            />
          ))}
        </View>
      ) : null}

      <View className="gap-1">
        <Text className="text-2xl font-bold text-fg">{exercise.name}</Text>
        <Text className="text-base text-fg">
          {MUSCLE_LABELS[exercise.primaryMuscle]}
          {exercise.secondaryMuscles.length > 0 ? (
            <Text className="text-fg-muted">
              {' '}
              · também {exercise.secondaryMuscles.map((m) => MUSCLE_LABELS[m]).join(', ')}
            </Text>
          ) : null}
        </Text>
        <Text className="text-sm text-fg-muted">{tags.join(' · ')}</Text>
      </View>

      {exercise.notes ? (
        <Card title="Observação">
          <Text className="text-base leading-6 text-warning">{exercise.notes}</Text>
        </Card>
      ) : null}

      {exercise.referenceSets?.length ? (
        <Card title="Referência">
          <Text className="text-base text-fg">
            {exercise.referenceSets
              .map((set) => formatReferenceSet(set, exercise.loadType))
              .join('  ·  ')}
          </Text>
          <Text className="text-sm leading-5 text-fg-muted">
            Ponto de partida para sugerir a carga até você registrar o primeiro treino (Fase 3).
          </Text>
        </Card>
      ) : null}

      {usage.length > 0 ? (
        <Text className="text-sm text-fg-muted">
          No seu plano:{' '}
          {usage.map((item) => `${weekdayName(item.weekday)} (${item.sessionName})`).join(', ')}
        </Text>
      ) : null}

      {steps.length > 0 ? (
        <Card title="Como fazer">
          {steps.map((step, index) => (
            <View key={index} className="flex-row gap-3">
              <Text className="w-5 text-base font-bold text-primary">{index + 1}</Text>
              <Text className="flex-1 text-base leading-6 text-fg">{step}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      {children}
    </ScrollView>
  );
}
