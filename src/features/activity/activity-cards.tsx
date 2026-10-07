import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { todayKey } from '@/lib/dates';
import { formatDecimal } from '@/lib/numbers';
import { useNow } from '@/lib/use-now';

import { useActiveActivity, useFinishedActivities } from './queries';
import { activityMinutes, footballRating, statsOf } from './rating';
import { logActivityAfter, openActivity, startOrContinueActivity } from './start';

/** Hoje e Treino: aparece enquanto o cronômetro de uma atividade está rodando. */
export function ActiveActivityCard() {
  const active = useActiveActivity();
  const now = useNow(30_000);
  if (!active) return null;
  return (
    <Card icon={active.kind === 'football' ? 'football' : 'timer'} title="Rolando agora">
      <Text className="text-xl font-semibold text-fg">{active.name}</Text>
      <Text className="text-sm text-fg-muted">
        Há {activityMinutes(active, new Date(now))} min
        {active.kind === 'football'
          ? ` · ${active.wins}V ${active.draws}E ${active.losses}D · ${active.goals} gols`
          : ''}
      </Text>
      <Button label="Abrir" icon="play" onPress={() => openActivity(active.id)} />
    </Card>
  );
}

/**
 * A atividade do plano no Hoje: começar o cronômetro, registrar depois ("Já joguei") ou, se
 * já foi hoje, a nota e o resumo.
 */
export function ActivityActions({ session }: { session: { id: string; name: string } }) {
  const today = todayKey();
  const active = useActiveActivity();
  const done = useFinishedActivities(today, today).filter(
    (item) => item.planSessionId === session.id,
  );

  if (active?.planSessionId === session.id) {
    return <Button label="Abrir (rolando)" icon="play" onPress={() => openActivity(active.id)} />;
  }
  const last = done.at(-1);
  if (last) {
    const rating = last.kind === 'football' ? footballRating(statsOf(last)) : null;
    return (
      <View className="gap-2">
        <Text className="text-base font-semibold text-success">
          Feito hoje ✓ · {activityMinutes(last)} min
          {rating ? ` · nota ${formatDecimal(rating.score)} (${rating.title})` : ''}
        </Text>
        <Button
          label="Ver resumo"
          icon="list"
          variant="secondary"
          onPress={() => openActivity(last.id)}
        />
      </View>
    );
  }
  return (
    <View className="flex-row gap-3">
      <Button
        label="Já joguei"
        variant="secondary"
        onPress={() => logActivityAfter(session)}
        grow
      />
      <Button label="Começar" icon="play" onPress={() => startOrContinueActivity(session)} grow />
    </View>
  );
}
