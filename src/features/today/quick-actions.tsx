import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { todayKey } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme/theme';

import { addWater } from '../diary/repository';

/** Atalhos do Hoje: um copo d'água na hora, refeição, peso e treino. */
export function QuickActions() {
  const colors = useColors();
  const actions: { icon: IconName; label: string; color: string; onPress: () => void }[] = [
    {
      icon: 'drop',
      label: '+250 ml',
      color: colors.water,
      onPress: () => {
        addWater(todayKey(), 250);
        haptics.success();
      },
    },
    {
      icon: 'fork',
      label: 'Refeição',
      color: colors.primary,
      onPress: () => router.navigate('/dieta'),
    },
    { icon: 'scale', label: 'Peso', color: colors.protein, onPress: () => router.push('/peso') },
    {
      icon: 'dumbbell',
      label: 'Treino',
      color: colors.fg,
      onPress: () => router.navigate('/treino'),
    },
  ];

  return (
    <View className="flex-row gap-2">
      {actions.map((action) => (
        <PressableScale
          key={action.label}
          onPress={action.onPress}
          haptic={action.icon === 'drop' ? undefined : 'select'}
          scaleTo={0.92}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          className="flex-1 items-center gap-1.5 rounded-2xl border border-line bg-surface py-3"
        >
          <View
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: `${action.color}26` }}
          >
            <Icon name={action.icon} size={19} color={action.color} weight="semibold" />
          </View>
          <Text className="text-xs font-semibold text-fg">{action.label}</Text>
        </PressableScale>
      ))}
    </View>
  );
}
