import { router } from 'expo-router';
import { Alert } from 'react-native';

import { getActiveWorkout, startWorkout } from './repository';
import { ensureNotificationPermission } from './rest';

const openWorkout = (id: string) => router.push({ pathname: '/registro/[id]', params: { id } });

/**
 * "Começar treino": abre o treino em andamento se for o mesmo; se houver outro em andamento,
 * pergunta antes. Pede a permissão de notificação (timer de descanso) na primeira vez.
 */
export function startOrContinueWorkout(sessionId: string) {
  const active = getActiveWorkout();
  if (active && active.planSessionId !== sessionId) {
    Alert.alert('Já tem um treino em andamento', `"${active.name}" ainda não foi finalizado.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Continuar esse', onPress: () => openWorkout(active.id) },
    ]);
    return;
  }
  const id = active?.id ?? startWorkout(sessionId);
  void ensureNotificationPermission();
  openWorkout(id);
}

export function continueWorkout(workoutId: string) {
  openWorkout(workoutId);
}
