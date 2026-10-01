import { Text, View } from 'react-native';

import { formatInt } from '@/lib/numbers';

type MacroTilesProps = {
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** Linha pequena embaixo de cada macro (ex.: '2 g/kg'). */
  details?: { protein: string; carbs: string; fat: string };
};

/** Proteína, carboidrato e gordura lado a lado. */
export function MacroTiles({ proteinG, carbsG, fatG, details }: MacroTilesProps) {
  return (
    <View className="flex-row gap-2">
      <Tile name="Proteína" grams={proteinG} detail={details?.protein} />
      <Tile name="Carboidrato" grams={carbsG} detail={details?.carbs} />
      <Tile name="Gordura" grams={fatG} detail={details?.fat} />
    </View>
  );
}

function Tile({ name, grams, detail }: { name: string; grams: number; detail?: string }) {
  return (
    <View className="flex-1 items-center gap-0.5 rounded-xl bg-surface-2 px-1 py-3">
      <Text className="text-xs font-medium uppercase tracking-wider text-fg-muted">{name}</Text>
      <Text className="text-xl font-bold text-fg">{formatInt(grams)} g</Text>
      {detail ? <Text className="text-xs text-fg-muted">{detail}</Text> : null}
    </View>
  );
}
