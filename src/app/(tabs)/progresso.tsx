import { ComingInPhase } from '@/components/coming-in-phase';
import { Screen } from '@/components/ui/screen';

export default function ProgressScreen() {
  return (
    <Screen title="Progresso">
      <ComingInPhase
        phase={7}
        items={[
          'Evolução de carga e e1RM por exercício',
          'Peso com média móvel e medidas',
          'Adesão à dieta e séries por grupo muscular na semana',
        ]}
      />
    </Screen>
  );
}
