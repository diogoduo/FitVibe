import { useState } from 'react';
import { Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';

import { useColors } from '@/theme/theme';

export type LinePoint = { x: number; y: number };

export type LineSeries = {
  points: readonly LinePoint[];
  color: string;
  /** Linha ligando os pontos (padrão) e/ou só os pontos. */
  line?: boolean;
  dots?: boolean;
};

type LineChartProps = {
  series: readonly LineSeries[];
  /** Texto do ponto escolhido: data e valor (usa a primeira série com ponto naquele x). */
  describe: (x: number, y: number) => string;
  formatY: (y: number) => string;
  xLabels?: [string, string];
  reference?: { y: number; label: string };
  height?: number;
};

const PAD = { top: 12, right: 8, bottom: 8, left: 8 };

/**
 * Gráfico de linha simples (react-native-svg), com o eixo x proporcional (datas com buracos
 * ficam com o espaço certo). Tocar ou arrastar mostra o ponto mais perto.
 */
export function LineChart({
  series,
  describe,
  formatY,
  xLabels,
  reference,
  height = 160,
}: LineChartProps) {
  const colors = useColors();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<LinePoint | null>(null);

  const all = series.flatMap((item) => item.points);
  if (all.length === 0) return null;

  const xs = all.map((point) => point.x);
  const ys = all.map((point) => point.y).concat(reference ? [reference.y] : []);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const rawMin = Math.min(...ys);
  const rawMax = Math.max(...ys);
  const margin = Math.max((rawMax - rawMin) * 0.1, Math.abs(rawMax) * 0.01, 0.5);
  const minY = rawMin - margin;
  const maxY = rawMax + margin;

  const plotWidth = Math.max(1, width - PAD.left - PAD.right);
  const plotHeight = height - PAD.top - PAD.bottom;
  const toX = (x: number) =>
    PAD.left + (maxX === minX ? plotWidth / 2 : ((x - minX) / (maxX - minX)) * plotWidth);
  const toY = (y: number) => PAD.top + ((maxY - y) / (maxY - minY)) * plotHeight;

  const pick = (event: GestureResponderEvent) => {
    const touchX = event.nativeEvent.locationX;
    const primary = series.find((item) => item.points.length > 0)!.points;
    let nearest = primary[0];
    for (const point of primary) {
      if (Math.abs(toX(point.x) - touchX) < Math.abs(toX(nearest.x) - touchX)) nearest = point;
    }
    setSelected(nearest);
  };

  return (
    <View className="gap-1.5">
      <Text className="text-sm text-fg" numberOfLines={1}>
        {selected ? describe(selected.x, selected.y) : ' '}
      </Text>
      <View
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onResponderGrant={pick}
        onResponderMove={pick}
        style={{ height }}
        accessibilityLabel="Gráfico. Toque para ver os valores."
      >
        {width > 0 ? (
          <Svg width={width} height={height}>
            {reference ? (
              <Line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={toY(reference.y)}
                y2={toY(reference.y)}
                stroke={colors.warning}
                strokeDasharray="4 4"
                strokeWidth={1}
              />
            ) : null}
            {series.map((item, index) => {
              const sorted = [...item.points].sort((a, b) => a.x - b.x);
              const path = sorted
                .map((point, i) => `${i === 0 ? 'M' : 'L'}${toX(point.x)},${toY(point.y)}`)
                .join(' ');
              return (
                <G key={index}>
                  {item.line !== false && sorted.length > 1 ? (
                    <Path d={path} stroke={item.color} strokeWidth={2.5} fill="none" />
                  ) : null}
                  {item.dots || sorted.length === 1
                    ? sorted.map((point) => (
                        <Circle
                          key={point.x}
                          cx={toX(point.x)}
                          cy={toY(point.y)}
                          r={3}
                          fill={item.color}
                        />
                      ))
                    : null}
                </G>
              );
            })}
            {selected ? (
              <>
                <Line
                  x1={toX(selected.x)}
                  x2={toX(selected.x)}
                  y1={PAD.top}
                  y2={height - PAD.bottom}
                  stroke={colors['fg-muted']}
                  strokeWidth={1}
                />
                <Circle
                  cx={toX(selected.x)}
                  cy={toY(selected.y)}
                  r={5}
                  fill={colors.fg}
                  stroke={colors.background}
                  strokeWidth={2}
                />
              </>
            ) : null}
          </Svg>
        ) : null}
      </View>
      <View className="flex-row justify-between">
        <Text className="text-xs text-fg-muted">{xLabels?.[0] ?? ''}</Text>
        <Text className="text-xs text-fg-muted">
          {formatY(rawMin)} – {formatY(rawMax)}
          {reference ? ` · meta ${reference.label}` : ''}
        </Text>
        <Text className="text-xs text-fg-muted">{xLabels?.[1] ?? ''}</Text>
      </View>
    </View>
  );
}
