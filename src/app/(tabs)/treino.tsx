import { ComingInPhase } from '@/components/coming-in-phase';
import { Screen } from '@/components/ui/screen';

export default function WorkoutScreen() {
  return (
    <Screen title="Treino">
      <ComingInPhase
        phase={2}
        items={[
          'Seu plano semanal, já carregado com os seus treinos',
          'Biblioteca de exercícios com fotos, links e vídeos',
        ]}
      />
      <ComingInPhase
        phase={3}
        items={['Registro das séries com e1RM, recordes e timer de descanso']}
      />
    </Screen>
  );
}
