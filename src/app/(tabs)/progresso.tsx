import { ComingInPhase } from '@/components/coming-in-phase';
import { Screen } from '@/components/ui/screen';
import { WeightHistoryCard } from '@/features/weight/weight-history-card';

export default function ProgressScreen() {
  return (
    <Screen title="Progresso">
      <WeightHistoryCard />
      <ComingInPhase
        phase={7}
        items={[
          'Evolução de carga e e1RM por exercício',
          'Gráficos de peso e medidas',
          'Adesão à dieta e séries por grupo muscular na semana',
        ]}
      />
    </Screen>
  );
}
