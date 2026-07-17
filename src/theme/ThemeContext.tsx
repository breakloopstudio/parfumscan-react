// src/theme/ThemeContext.tsx
// Contexte de thème — provider + hook useTheme()

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { lightTheme, darkTheme } from './theme';
import type { Theme } from './theme';
export type { Theme } from './theme';
import { getThemeMode, setThemeMode, type ThemeMode } from '../services/theme-storage';

type ResolvedMode = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  resolvedMode: ResolvedMode;
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [ready, setReady] = useState(false);
  const systemScheme = useColorScheme();

  useEffect(() => {
    getThemeMode()
      .then(v => { setModeState(v); setReady(true); })
      .catch(() => { setModeState('system'); setReady(true); });
  }, []);

  const resolvedMode: ResolvedMode =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    setThemeMode(m);
  }, []);

  const theme = resolvedMode === 'dark' ? darkTheme : lightTheme;

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, mode, resolvedMode, setMode }),
    [theme, mode, resolvedMode, setMode],
  );

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={resolvedMode === 'dark' ? 'light' : 'dark'} />
      {ready ? children : null}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
