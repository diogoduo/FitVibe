import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { createContext, useContext, useLayoutEffect, type ReactNode } from 'react';
import { Appearance, useColorScheme, View } from 'react-native';

import { db } from '@/db/client';
import { appSettings } from '@/db/schema';

import { palette } from './palette';

/**
 * Tema do app: escuro (padrão), claro ou o do sistema. Um mecanismo só: o app força o modo do
 * iPhone para este app (Appearance.setColorScheme) e tudo segue esse modo — as classes do
 * Tailwind (as duas paletas estão no tailwind.config.js), os componentes nativos (teclado,
 * alertas, seletores) e `useColors()`, para as cores que precisam estar no código.
 */
export type ThemeChoice = 'system' | 'dark' | 'light';
export type Scheme = 'dark' | 'light';
export type Colors = (typeof palette)['dark'];

const KEY = 'theme';

const SchemeContext = createContext<Scheme>('dark');

export const useScheme = () => useContext(SchemeContext);
export const useColors = (): Colors => palette[useScheme()];

export function useThemeChoice(): ThemeChoice {
  const { data } = useLiveQuery(db.select().from(appSettings).where(eq(appSettings.key, KEY)));
  const value = data[0]?.value;
  return value === 'light' || value === 'system' ? value : 'dark';
}

export function saveThemeChoice(choice: ThemeChoice) {
  db.insert(appSettings)
    .values({ key: KEY, value: choice })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: choice } })
    .run();
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const choice = useThemeChoice();
  // Depois do setColorScheme, este já devolve o modo forçado (ou o do iPhone, em "sistema").
  const appearance = useColorScheme();
  const scheme: Scheme = choice === 'system' ? (appearance === 'light' ? 'light' : 'dark') : choice;

  // Antes de pintar a tela, para não piscar o tema errado.
  useLayoutEffect(() => {
    Appearance.setColorScheme(choice === 'system' ? 'unspecified' : choice);
  }, [choice]);

  return (
    <SchemeContext.Provider value={scheme}>
      <View style={{ flex: 1, backgroundColor: palette[scheme].background }}>{children}</View>
    </SchemeContext.Provider>
  );
}
