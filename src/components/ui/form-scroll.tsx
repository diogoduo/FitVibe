import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';

/**
 * Rolagem dos formulários: abre espaço para o teclado (iOS), mantém os toques nos botões
 * com o teclado aberto e fecha o teclado arrastando a tela.
 */
export function FormScroll({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-5 p-4 pb-12"
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      {children}
    </ScrollView>
  );
}
