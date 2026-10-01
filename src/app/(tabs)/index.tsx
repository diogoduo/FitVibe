import { Screen } from '@/components/ui/screen';
import { DailyGoalCard } from '@/features/goals/daily-goal-card';
import { TodayPlanCard } from '@/features/plan/today-plan-card';
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
      <TodayPlanCard />
      <WeightSummaryCard />
    </Screen>
  );
}
