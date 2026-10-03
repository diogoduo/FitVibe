import type { ReactNode } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ScreenProps = {
  title: string;
  subtitle?: string;
  /** Botão ao lado do título (ex.: ⚙️ Ajustes no Perfil). */
  action?: ReactNode;
  children?: ReactNode;
};

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
          <Text className="text-3xl font-bold text-fg">{title}</Text>
          {subtitle ? <Text className="mt-1 text-base text-fg-muted">{subtitle}</Text> : null}
        </View>
        {action}
      </View>
      {children}
    </ScrollView>
  );
}
