import { Children, isValidElement, type ReactNode } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ScreenProps = {
  title: string;
  subtitle?: string;
  /** Botão ao lado do título (ex.: ⚙️ Ajustes no Perfil). */
  action?: ReactNode;
  children?: ReactNode;
};

/** Cada cartão entra deslizando um pouco depois do anterior (só na primeira vez). */
const enter = (index: number) => FadeInDown.duration(380).delay(Math.min(index, 6) * 55);

/** Tela padrão das abas: título grande + conteúdo rolável. */
export function Screen({ title, subtitle, action, children }: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-background"
      // No iOS a tab bar nativa ajusta os insets sozinha; no Android, só o topo precisa de folga.
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-4 px-4 pb-10"
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
        <Animated.View
          key={isValidElement(child) && child.key != null ? child.key : index}
          entering={enter(index)}
          style={{ gap: 16 }}
        >
          {child}
        </Animated.View>
      ))}
    </ScrollView>
  );
}
