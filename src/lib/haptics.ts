import * as Haptics from 'expo-haptics';

/**
 * Vibração leve nos momentos que importam (concluir série, recorde, água, curtir). Nunca
 * derruba nada: sem suporte (simulador, Android sem motor), só não vibra.
 */
const quiet = (promise: Promise<void>) => void promise.catch(() => {});

export const haptics = {
  /** Escolher uma opção (chips, abas). */
  select: () => quiet(Haptics.selectionAsync()),
  /** Toque num botão principal, +água, curtir. */
  tap: () => quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Ação feita com peso (concluir série, postar). */
  firm: () => quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Deu certo / recorde. */
  success: () => quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};

export type HapticKind = keyof typeof haptics;
