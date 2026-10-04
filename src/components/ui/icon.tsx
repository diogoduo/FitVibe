import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { useColors } from '@/theme/theme';

type NamePair = Extract<SymbolViewProps['name'], { ios?: unknown }>;
type IconSpec = { ios: NonNullable<NamePair['ios']>; android: NonNullable<NamePair['android']> };

/**
 * Ícones do app: SF Symbols no iPhone (os mesmos do sistema, com animação) e Material Symbols
 * no Android. Os nomes ficam aqui, num lugar só; o TypeScript confere se existem.
 */
const ICONS = {
  bell: { ios: 'bell.fill', android: 'notifications' },
  search: { ios: 'magnifyingglass', android: 'search' },
  plus: { ios: 'plus', android: 'add' },
  gear: { ios: 'gearshape.fill', android: 'settings' },
  comment: { ios: 'bubble.right', android: 'chat_bubble' },
  heart: { ios: 'heart', android: 'favorite' },
  heartFill: { ios: 'heart.fill', android: 'favorite' },
  flame: { ios: 'flame.fill', android: 'local_fire_department' },
  drop: { ios: 'drop.fill', android: 'water_drop' },
  dumbbell: { ios: 'dumbbell.fill', android: 'fitness_center' },
  fork: { ios: 'fork.knife', android: 'restaurant' },
  bolt: { ios: 'bolt.fill', android: 'bolt' },
  scale: { ios: 'scalemass.fill', android: 'monitor_weight' },
  chart: { ios: 'chart.line.uptrend.xyaxis', android: 'monitoring' },
  trophy: { ios: 'trophy.fill', android: 'trophy' },
  check: { ios: 'checkmark', android: 'check' },
  checkCircle: { ios: 'checkmark.circle.fill', android: 'check_circle' },
  timer: { ios: 'timer', android: 'timer' },
  camera: { ios: 'camera.fill', android: 'photo_camera' },
  photos: { ios: 'photo.on.rectangle', android: 'photo_library' },
  person: { ios: 'person.crop.circle.fill', android: 'account_circle' },
  people: { ios: 'person.2.fill', android: 'group' },
  trash: { ios: 'trash.fill', android: 'delete' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right' },
  chevronLeft: { ios: 'chevron.left', android: 'chevron_left' },
  share: { ios: 'square.and.arrow.up', android: 'share' },
  lock: { ios: 'lock.fill', android: 'lock' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome' },
  calendar: { ios: 'calendar', android: 'calendar_month' },
  play: { ios: 'play.fill', android: 'play_arrow' },
  sun: { ios: 'sun.max.fill', android: 'light_mode' },
  barcode: { ios: 'barcode.viewfinder', android: 'barcode_scanner' },
  more: { ios: 'ellipsis', android: 'more_horiz' },
  close: { ios: 'xmark', android: 'close' },
  info: { ios: 'info.circle', android: 'info' },
  list: { ios: 'list.bullet', android: 'list' },
  cloud: { ios: 'icloud.fill', android: 'cloud' },
  bell_badge: { ios: 'bell.badge.fill', android: 'notifications_active' },
  ruler: { ios: 'ruler.fill', android: 'straighten' },
  figure: { ios: 'figure.strengthtraining.traditional', android: 'exercise' },
  lightbulb: { ios: 'lightbulb.fill', android: 'lightbulb' },
} satisfies Record<string, IconSpec>;

export type IconName = keyof typeof ICONS;

type IconProps = {
  name: IconName;
  size?: number;
  /** Padrão: a cor do texto do tema. */
  color?: string;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  /** Animação nativa do iPhone (ex.: { effect: { type: 'bounce' } } ao curtir). */
  animation?: SymbolViewProps['animationSpec'];
};

export function Icon({ name, size = 22, color, weight, animation }: IconProps) {
  const colors = useColors();
  return (
    <SymbolView
      name={ICONS[name]}
      size={size}
      tintColor={color ?? colors.fg}
      weight={weight}
      animationSpec={animation}
      resizeMode="scaleAspectFit"
    />
  );
}
