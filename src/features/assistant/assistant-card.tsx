import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { useColors } from '@/theme/theme';

/** Abre o assistente: `voz` já começa a ouvir; `texto` abre para digitar. */
export const openAssistant = (modo: 'voz' | 'texto' = 'voz') =>
  router.push({ pathname: '/assistente', params: { modo } });

/** Topo do Hoje: falar o que comeu, bebeu ou treinou, e o app registra. */
export function AssistantCard() {
  const colors = useColors();
  return (
    <View className="flex-row items-center gap-3 rounded-3xl border border-line bg-surface p-3">
      <PressableScale
        onPress={() => openAssistant('voz')}
        haptic="firm"
        scaleTo={0.9}
        accessibilityRole="button"
        accessibilityLabel="Registrar falando"
        className="h-14 w-14 items-center justify-center rounded-full bg-primary"
      >
        <Icon name="mic" size={24} color={colors['on-primary']} />
      </PressableScale>
      <PressableScale
        onPress={() => openAssistant('voz')}
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityHint="Abre o assistente e começa a ouvir"
        className="flex-1"
      >
        <Text className="text-base font-bold text-fg">Registrar falando</Text>
        <Text className="text-sm leading-5 text-fg-muted" numberOfLines={2}>
          “Almocei 200 de arroz, feijão e 2 bifes” · água · peso · treino
        </Text>
      </PressableScale>
      <PressableScale
        onPress={() => openAssistant('texto')}
        haptic="select"
        scaleTo={0.9}
        accessibilityRole="button"
        accessibilityLabel="Digitar para o assistente"
        className="h-10 w-10 items-center justify-center rounded-full bg-surface-2"
      >
        <Icon name="keyboard" size={18} color={colors.primary} />
      </PressableScale>
    </View>
  );
}
