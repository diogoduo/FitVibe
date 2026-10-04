import { Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { useColors } from '@/theme/theme';

import { dismissTip, useDismissedTips } from './seen';

export const TIPS = {
  hoje: 'Toque nos anéis para abrir a Dieta. O atalho "+250 ml" soma um copo d\'água na hora.',
  treino:
    'Toque em "Começar" no treino do dia. Cada série já vem com a carga sugerida: confira, marque ✓ e o descanso começa sozinho.',
  dieta: 'Deslize um alimento para a esquerda para tirá-lo. As setas no topo mostram outros dias.',
  feed: 'Toque duas vezes numa foto para curtir. O sino mostra quem curtiu, comentou ou te seguiu.',
  perfil: 'Em "Progresso" ficam os gráficos, o gasto real e as fotos. O ⚙️ abre os Ajustes.',
} as const;

export type TipId = keyof typeof TIPS;

/** Dica curta na primeira visita de uma aba; some ao tocar em "Entendi". */
export function TipCard({ id }: { id: TipId }) {
  const colors = useColors();
  const dismissed = useDismissedTips();
  if (dismissed.includes(id)) return null;

  return (
    <Animated.View entering={FadeInDown.duration(300)} exiting={FadeOut.duration(200)}>
      <View
        className="flex-row items-start gap-3 rounded-2xl border p-3"
        style={{ borderColor: `${colors.primary}55`, backgroundColor: `${colors.primary}14` }}
      >
        <Icon name="lightbulb" size={18} color={colors.primary} />
        <View className="flex-1 gap-2">
          <Text className="text-sm leading-5 text-fg">{TIPS[id]}</Text>
          <PressableScale
            onPress={() => dismissTip(id, dismissed)}
            haptic="select"
            accessibilityRole="button"
            className="self-start rounded-full bg-primary px-3 py-1.5"
          >
            <Text className="text-xs font-bold text-on-primary">Entendi</Text>
          </PressableScale>
        </View>
      </View>
    </Animated.View>
  );
}
