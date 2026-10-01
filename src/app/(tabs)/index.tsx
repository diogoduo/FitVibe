import { ComingInPhase } from '@/components/coming-in-phase';
import { Screen } from '@/components/ui/screen';

function formatToday() {
  const text = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function TodayScreen() {
  return (
    <Screen title="Hoje" subtitle={formatToday()}>
      <ComingInPhase
        phase={1}
        items={[
          'Seu perfil e as metas de calorias e macros',
          'Peso em jejum com média móvel de 7 dias',
        ]}
      />
      <ComingInPhase phase={3} items={['O treino do dia, pronto para registrar as séries']} />
    </Screen>
  );
}
