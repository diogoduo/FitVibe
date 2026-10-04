import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { vars } from 'nativewind';
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { Appearance, useColorScheme, View } from 'react-native';

import { db } from '@/db/client';
import { appSettings } from '@/db/schema';

import { palette, toRgbChannels } from './palette';

/**
 * Tema do app: escuro (padrão), claro ou o do sistema. As classes do Tailwind leem variáveis
 * CSS (tailwind.config.js); aqui elas mudam para o subtree inteiro com `vars()`. Onde a cor
 * precisa estar no código (indicadores, gráficos, interruptores), use `useColors()`.
 */
export type ThemeChoice = 'system' | 'dark' | 'light';
export type Scheme = 'dark' | 'light';
export type Colors = (typeof palette)['dark'];

const KEY = 'theme';

const toVars = (colors: Colors) =>
  vars(
    Object.fromEntries(
      Object.entries(colors).map(([token, hex]) => [`--color-${token}`, toRgbChannels(hex)]),
    ),
  );

const THEME_VARS = { dark: toVars(palette.dark), light: toVars(palette.light) };

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
  const system = useColorScheme();
  const scheme: Scheme = choice === 'system' ? (system === 'light' ? 'light' : 'dark') : choice;

  // Alertas, teclado e seletores nativos seguem o tema escolhido (ou o do sistema).
  useEffect(() => {
    Appearance.setColorScheme(choice === 'system' ? 'unspecified' : choice);
  }, [choice]);

  return (
    <SchemeContext.Provider value={scheme}>
      <View style={[{ flex: 1, backgroundColor: palette[scheme].background }, THEME_VARS[scheme]]}>
        {children}
      </View>
    </SchemeContext.Provider>
  );
}
