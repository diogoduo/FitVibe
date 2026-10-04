import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { FormScroll } from '@/components/ui/form-scroll';
import { TextField } from '@/components/ui/text-field';
import { ToggleField } from '@/components/ui/toggle-field';
import { useMeals } from '@/features/diary/queries';
import { waterSlots } from '@/features/reminders/plan';
import { rescheduleReminders, sendTestReminder } from '@/features/reminders/scheduler';
import {
  defaultMealTime,
  getReminderSettings,
  saveReminderSettings,
  WATER_INTERVAL_LABELS,
  WATER_INTERVALS,
  type MealReminder,
  type ReminderSettings,
} from '@/features/reminders/settings';
import { ensureNotificationPermission } from '@/features/workout/rest';
import { maskTime, parseTime } from '@/lib/dates';

const PERMISSION_HINT =
  'O iPhone não deixou o app mandar notificações. Libere em Ajustes do iPhone → Expo Go → Notificações.';

/** Lembretes deste celular: água de X em X horas e um horário por refeição. */
export default function RemindersScreen() {
  const { meals } = useMeals();
  const [initial] = useState(getReminderSettings);
  const [waterOn, setWaterOn] = useState(initial.water.enabled);
  const [start, setStart] = useState(initial.water.start);
  const [end, setEnd] = useState(initial.water.end);
  const [every, setEvery] = useState(initial.water.everyMinutes);
  const [mealReminders, setMealReminders] = useState(initial.meals);
  const [showErrors, setShowErrors] = useState(false);

  const visibleMeals = meals.filter((meal) => !meal.hidden);
  const startTime = parseTime(start);
  const endTime = parseTime(end);
  const waterError =
    !startTime || !endTime
      ? 'Use horários como 08:00.'
      : startTime >= endTime
        ? 'O fim precisa ser depois do início.'
        : undefined;
  const mealErrors = Object.fromEntries(
    Object.entries(mealReminders)
      .filter(([, meal]) => meal.enabled && !parseTime(meal.time))
      .map(([id]) => [id, 'Use um horário como 12:30.']),
  );
  const slots = !waterError ? waterSlots(startTime!, endTime!, every) : [];

  const setMeal = (id: string, patch: Partial<MealReminder>, name: string) =>
    setMealReminders((previous) => ({
      ...previous,
      [id]: {
        ...((previous[id] as MealReminder | undefined) ?? {
          enabled: false,
          time: defaultMealTime(name),
        }),
        ...patch,
      },
    }));

  const save = async () => {
    if ((waterOn && waterError) || Object.keys(mealErrors).length > 0) {
      setShowErrors(true);
      return;
    }
    const settings: ReminderSettings = {
      water: {
        enabled: waterOn,
        start: startTime ?? initial.water.start,
        end: endTime ?? initial.water.end,
        everyMinutes: every,
      },
      meals: Object.fromEntries(
        Object.entries(mealReminders).map(([id, meal]) => [
          id,
          { enabled: meal.enabled, time: parseTime(meal.time) ?? meal.time },
        ]),
      ),
    };
    const wantsAny = settings.water.enabled || Object.values(settings.meals).some((m) => m.enabled);
    const allowed = wantsAny ? await ensureNotificationPermission() : true;
    saveReminderSettings(settings);
    await rescheduleReminders();
    if (!allowed) {
      Alert.alert('Lembretes salvos, mas sem permissão', PERMISSION_HINT);
      return;
    }
    router.back();
  };

  const test = async () => {
    if (!(await ensureNotificationPermission())) {
      Alert.alert('Sem permissão', PERMISSION_HINT);
      return;
    }
    await sendTestReminder();
    Alert.alert('Lembrete de teste', 'Chega em 5 segundos. Pode bloquear a tela para ver.');
  };

  return (
    <FormScroll>
      <Stack.Screen options={{ title: 'Lembretes' }} />
      <Text className="text-base leading-6 text-fg-muted">
        Os lembretes ficam agendados neste celular e chegam mesmo com o app fechado. O de água para
        quando você bate a meta, e o da refeição não toca se ela já foi registrada.
      </Text>

      <View className="gap-3">
        <ToggleField
          label="Beber água"
          hint="De tempos em tempos, dizendo quanto falta para a meta."
          value={waterOn}
          onChange={setWaterOn}
        />
        {waterOn ? (
          <>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <TextField
                  label="Começa"
                  value={start}
                  onChangeText={(text) => setStart(maskTime(text))}
                  keyboardType="number-pad"
                  maxLength={5}
                />
              </View>
              <View className="flex-1">
                <TextField
                  label="Termina"
                  value={end}
                  onChangeText={(text) => setEnd(maskTime(text))}
                  keyboardType="number-pad"
                  maxLength={5}
                />
              </View>
            </View>
            <ChoiceChips
              label="De quanto em quanto tempo"
              options={WATER_INTERVALS.map((value) => ({
                value,
                label: WATER_INTERVAL_LABELS[value],
              }))}
              value={every}
              onChange={setEvery}
              error={showErrors ? waterError : undefined}
            />
            {slots.length > 0 ? (
              <Text className="text-sm leading-5 text-fg-muted">
                {slots.length} avisos por dia: {slots.join(', ')}.
              </Text>
            ) : null}
          </>
        ) : null}
      </View>

      <View className="gap-3">
        <Text className="text-sm font-semibold uppercase tracking-wider text-fg-muted">
          Refeições
        </Text>
        {visibleMeals.map((meal) => {
          const reminder = mealReminders[meal.id];
          return (
            <View key={meal.id} className="gap-2">
              <ToggleField
                label={meal.name}
                value={reminder?.enabled ?? false}
                onChange={(enabled) => setMeal(meal.id, { enabled }, meal.name)}
              />
              {reminder?.enabled ? (
                <TextField
                  label={`Horário · ${meal.name}`}
                  value={reminder.time}
                  onChangeText={(text) => setMeal(meal.id, { time: maskTime(text) }, meal.name)}
                  keyboardType="number-pad"
                  maxLength={5}
                  error={showErrors ? mealErrors[meal.id] : undefined}
                />
              ) : null}
            </View>
          );
        })}
      </View>

      <Button label="Salvar" onPress={() => void save()} />
      <Button label="Testar agora" variant="secondary" onPress={() => void test()} />
    </FormScroll>
  );
}
