import { router } from 'expo-router';
import { Alert } from 'react-native';

import { haptics } from '@/lib/haptics';

import { activityKindFor } from './rating';
import { getActiveActivity, logFinishedActivity, startActivity } from './repository';

const open = (id: string) => router.push({ pathname: '/atividade/[id]', params: { id } });

/** Começa o cronômetro (ou abre a que já está rodando, perguntando se for outra). */
export function startOrContinueActivity(session: { id: string; name: string }) {
  const active = getActiveActivity();
  if (active && active.planSessionId !== session.id) {
    Alert.alert('Já tem uma atividade rolando', `"${active.name}" ainda não foi finalizada.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Continuar essa', onPress: () => open(active.id) },
    ]);
    return;
  }
  haptics.firm();
  open(active?.id ?? startActivity({ planSessionId: session.id, name: session.name }));
}

/** "Já joguei": registra agora com uma duração típica, para ajustar na tela. */
export function logActivityAfter(session: { id: string; name: string }) {
  const minutes = activityKindFor(session.name) === 'football' ? 90 : 60;
  open(logFinishedActivity({ planSessionId: session.id, name: session.name, minutes }));
}

export const openActivity = open;
