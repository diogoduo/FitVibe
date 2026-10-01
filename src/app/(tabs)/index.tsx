import { ComingInPhase } from '@/components/coming-in-phase';
import { Screen } from '@/components/ui/screen';
import { DailyGoalCard } from '@/features/goals/daily-goal-card';
import { RecalcPromptCard } from '@/features/goals/recalc-prompt-card';
import { WeightSummaryCard } from '@/features/weight/weight-summary-card';

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
      <RecalcPromptCard />
      <DailyGoalCard />
      <WeightSummaryCard />
      <ComingInPhase phase={3} items={['O treino do dia, pronto para registrar as séries']} />
    </Screen>
  );
}
