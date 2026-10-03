import { todayKey } from '@/lib/dates';

import { deleteMyDaySummaries, publishDaySummary } from './api';
import { daySnapshot } from './snapshots';
import type { SocialProfile } from './types';

/**
 * Resumo do dia que aparece no perfil: depois de cada sincronização, o celular publica o dia
 * de hoje com as partes que a pessoa escolheu compartilhar. Só envia quando algo mudou.
 */
let lastPublished: string | null = null;

export async function publishToday(profile: SocialProfile) {
  const share = {
    training: profile.share_training,
    diet: profile.share_diet,
    body: profile.share_body,
  };
  if (!share.training && !share.diet && !share.body) {
    const key = `${profile.user_id}:nada`;
    if (lastPublished === key) return;
    await deleteMyDaySummaries();
    lastPublished = key;
    return;
  }
  const snapshot = daySnapshot(todayKey(), share);
  const key = `${profile.user_id}:${JSON.stringify(snapshot)}`;
  if (key === lastPublished) return;
  await publishDaySummary(snapshot);
  lastPublished = key;
}

/** Mudou o que compartilha: apaga os dias já publicados e publica hoje de novo. */
export async function republishToday(profile: SocialProfile) {
  await deleteMyDaySummaries();
  lastPublished = null;
  await publishToday(profile);
}
