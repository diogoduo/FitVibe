import { useState } from 'react';
import { Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';

import { palette } from '@/theme/palette';

export type Bar = {
  /** Texto embaixo da barra (curto: "S", "12"). */
  label: string;
  value: number;
  color: string;
  /** O que aparece ao tocar na barra. */
  detail: string;
};

type BarChartProps = {
  bars: readonly Bar[];
  reference?: { value: number; label: string };
  height?: number;
  /** Mostra o rótulo de 1 em cada N barras (muitas barras). */
  labelEvery?: number;
};

const PAD = { top: 8, bottom: 4 };
const colors = palette.dark;

/** Barras verticais (react-native-svg) com uma linha de meta. Tocar mostra o detalhe. */
export function BarChart({ bars, reference, height = 140, labelEvery = 1 }: BarChartProps) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  if (bars.length === 0) return null;

  const max = Math.max(...bars.map((bar) => bar.value), reference?.value ?? 0, 1) * 1.1;
  const slot = width / bars.length;
  const barWidth = Math.max(2, slot * 0.7);
  const plotHeight = height - PAD.top - PAD.bottom;
  const toY = (value: number) => PAD.top + plotHeight - (value / max) * plotHeight;

  const pick = (event: GestureResponderEvent) => {
    if (slot <= 0) return;
    const index = Math.floor(event.nativeEvent.locationX / slot);
    setSelected(Math.min(bars.length - 1, Math.max(0, index)));
  };

  return (
    <View className="gap-1.5">
      <Text className="text-sm text-fg" numberOfLines={1}>
        {selected != null ? bars[selected].detail : ' '}
      </Text>
      <View
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onResponderGrant={pick}
        onResponderMove={pick}
        style={{ height }}
        accessibilityLabel="Gráfico de barras. Toque numa barra para ver o valor."
      >
        {width > 0 ? (
          <Svg width={width} height={height}>
            {bars.map((bar, index) => (
              <Rect
                key={index}
                x={index * slot + (slot - barWidth) / 2}
                y={toY(bar.value)}
                width={barWidth}
                height={Math.max(bar.value > 0 ? 2 : 0, height - PAD.bottom - toY(bar.value))}
                rx={Math.min(4, barWidth / 2)}
                fill={bar.color}
                opacity={selected == null || selected === index ? 1 : 0.5}
              />
            ))}
            {reference ? (
              <Line
                x1={0}
                x2={width}
                y1={toY(reference.value)}
                y2={toY(reference.value)}
                stroke={colors.warning}
                strokeDasharray="4 4"
                strokeWidth={1}
              />
            ) : null}
          </Svg>
        ) : null}
      </View>
      <View className="flex-row">
        {bars.map((bar, index) => (
          <Text
            key={index}
            className="text-center text-xs text-fg-muted"
            style={{ width: slot || undefined, flex: slot ? undefined : 1 }}
            numberOfLines={1}
          >
            {index % labelEvery === 0 ? bar.label : ''}
          </Text>
        ))}
      </View>
      {reference ? <Text className="text-xs text-fg-muted">- - - {reference.label}</Text> : null}
    </View>
  );
}
