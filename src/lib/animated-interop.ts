import { cssInterop } from 'nativewind';
import Animated from 'react-native-reanimated';

/**
 * Deixa usar className (Tailwind) no Animated.View do Reanimated, como num View comum.
 * Importado uma vez no topo do app (src/app/_layout.tsx).
 */
cssInterop(Animated.View, { className: 'style' });
