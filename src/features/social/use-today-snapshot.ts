import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { todayKey } from '@/lib/dates';

import { daySnapshot } from './snapshots';
import type { DaySnapshot } from './types';

/** O meu dia de hoje, recalculado logo depois de cada alteração no banco. */
export function useTodaySnapshot(training: boolean, diet: boolean, body: boolean): DaySnapshot {
  const [snapshot, setSnapshot] = useState(() => daySnapshot(todayKey(), { training, diet, body }));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => setSnapshot(daySnapshot(todayKey(), { training, diet, body }));
    refresh();
    const subscription = addDatabaseChangeListener(() => {
      clearTimeout(timer);
      timer = setTimeout(refresh, 300);
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [training, diet, body]);

  return snapshot;
}
