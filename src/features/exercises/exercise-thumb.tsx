import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import { catalogImages } from './catalog';

type ExerciseThumbProps = {
  name: string;
  catalogKey: string | null;
  /** Largura em pontos; a altura segue a proporção das fotos (3:2). */
  width?: number;
};

/** Miniatura do exercício: a 1ª foto do catálogo, ou a inicial do nome nos exercícios próprios. */
export function ExerciseThumb({ name, catalogKey, width = 60 }: ExerciseThumbProps) {
  const [image] = catalogImages(catalogKey);
  const size = { width, height: Math.round((width * 2) / 3) };

  if (!image) {
    return (
      <View
        style={size}
        className="items-center justify-center rounded-lg bg-surface-2"
        accessibilityElementsHidden
      >
        <Text className="text-lg font-bold text-fg-muted">{name.charAt(0).toUpperCase()}</Text>
      </View>
    );
  }
  return (
    <Image
      source={image}
      style={[size, { borderRadius: 8 }]}
      contentFit="cover"
      accessibilityIgnoresInvertColors
    />
  );
}
