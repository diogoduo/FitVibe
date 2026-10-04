import { ActivityIndicator, type ActivityIndicatorProps } from 'react-native';

import { useColors } from '@/theme/theme';

/** Indicador de carregamento na cor de destaque do tema atual. */
export function Spinner(props: Omit<ActivityIndicatorProps, 'color'>) {
  const colors = useColors();
  return <ActivityIndicator color={colors.primary} {...props} />;
}
