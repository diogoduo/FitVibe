import { Screen } from '@/components/ui/screen';
import { AssistantCard } from '@/features/assistant/assistant-card';
import { EnergyBalanceCard } from '@/features/energy/energy-balance-card';
import { WeekSummaryCard } from '@/features/week/week-card';
import { WaterCard } from '@/features/diary/water-card';
import { AdaptiveGoalPrompt } from '@/features/goals/adaptive-cards';
import { RecalcPromptCard } from '@/features/goals/recalc-prompt-card';
import { TodayPlanCard } from '@/features/plan/today-plan-card';
import { useProfile } from '@/features/profile/queries';
import { DayRingsCard } from '@/features/today/day-rings-card';
import { QuickActions } from '@/features/today/quick-actions';
import { TipCard } from '@/features/tutorial/tip-card';
import { WeightSummaryCard } from '@/features/weight/weight-summary-card';
import { ActiveActivityCard } from '@/features/activity/activity-cards';
import { ActiveWorkoutCard } from '@/features/workout/active-workout-card';

function formatToday() {
  const text = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Bom dia, Diogo" de acordo com a hora. */
function greeting(name: string | undefined) {
  const hour = new Date().getHours();
  const hello =
    hour < 5 ? 'Boa noite' : hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const first = name?.trim().split(/\s+/)[0];
  return first ? `${hello}, ${first}` : hello;
}

export default function TodayScreen() {
  const { profile } = useProfile();
  return (
    <Screen title={greeting(profile?.name)} subtitle={formatToday()}>
      <TipCard id="hoje" />
      <AssistantCard />
      <QuickActions />
      <WeekSummaryCard />
      <ActiveWorkoutCard />
      <ActiveActivityCard />
      <AdaptiveGoalPrompt />
      <RecalcPromptCard />
      <DayRingsCard />
      <EnergyBalanceCard />
      <TodayPlanCard />
      <WaterCard />
      <WeightSummaryCard />
    </Screen>
  );
}
