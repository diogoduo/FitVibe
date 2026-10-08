import { Children, isValidElement, useState, type ReactNode } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/theme/theme';

type ScreenProps = {
  title: string;
  subtitle?: string;
  /** Botão ao lado do título (ex.: ⚙️ Ajustes no Perfil). */
  action?: ReactNode;
  children?: ReactNode;
};

/** Cada cartão entra deslizando um pouco depois do anterior (só na primeira vez). */
const enter = (index: number) => FadeInDown.duration(380).delay(Math.min(index, 6) * 55);

const SPACING = 16;

/** Tela padrão das abas: título grande + conteúdo rolável. */
export function Screen({ title, subtitle, action, children }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        className="flex-1 bg-background"
        // No iOS a tab bar nativa ajusta os insets sozinha; no Android, só o topo precisa de folga.
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="px-4 pb-10"
        contentContainerStyle={Platform.OS === 'android' ? { paddingTop: insets.top } : undefined}
      >
        <View className="flex-row items-center gap-3 pt-4">
          <View className="flex-1">
            <Text className="text-3xl font-extrabold tracking-tight text-fg">{title}</Text>
            {subtitle ? <Text className="mt-1 text-base text-fg-muted">{subtitle}</Text> : null}
          </View>
          {action}
        </View>
        {/* A chave vem do React (posição original): um cartão que aparece não remonta os outros. */}
        {Children.toArray(children).map((child, index) => (
          <Spaced
            key={isValidElement(child) && child.key != null ? child.key : index}
            index={index}
          >
            {child}
          </Spaced>
        ))}
      </ScrollView>
      {/* Fundo atrás da barra de status: o que rola não passa por cima do relógio e da bateria. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: insets.top,
          backgroundColor: colors.background,
        }}
      />
    </View>
  );
}

/**
 * O espaço acima de cada cartão só existe quando ele mostra algo: muitos cartões ficam
 * escondidos (dica dispensada, treino em andamento, resumo da semana fora do domingo) e, com o
 * espaçamento fixo, deixavam um buraco entre os outros.
 */
function Spaced({ index, children }: { index: number; children: ReactNode }) {
  const [visible, setVisible] = useState(true);
  return (
    <Animated.View
      entering={enter(index)}
      onLayout={(event) => {
        const next = event.nativeEvent.layout.height > 0;
        if (next !== visible) setVisible(next);
      }}
      style={{ gap: SPACING, marginTop: visible ? SPACING : 0 }}
    >
      {children}
    </Animated.View>
  );
}
