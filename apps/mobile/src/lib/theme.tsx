import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, useColorScheme } from 'react-native';

/**
 * Tokenii de design: aceleași roluri de culoare ca pe web (piatră, fier, pergament),
 * cu variantă deschisă și închisă. Contrastul textului respectă WCAG AA.
 */
const dark = {
  bg: '#0b0907',
  panel: '#17120e',
  panel2: '#241c15',
  line: '#4a3a28',
  ink: '#ecdfc4',
  muted: '#ab9b80',
  gold: '#d9ab4a',
  onGold: '#1d1307',
  ember: '#e07a35',
  blood: '#e0505a',
  heal: '#7cc35a',
  mana: '#6aa4e6',
  arcane: '#b297e0',
};

const light: typeof dark = {
  bg: '#f4ecdb',
  panel: '#fbf6ea',
  panel2: '#efe3c9',
  line: '#bfa173',
  ink: '#2a1c0f',
  muted: '#66543f',
  gold: '#855600',
  onGold: '#fbf6ea',
  ember: '#a3470a',
  blood: '#b0202a',
  heal: '#2d6f1d',
  mana: '#1d5ba3',
  arcane: '#64469f',
};

export type Palette = typeof dark;
export type ThemeName = 'dark' | 'light';

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 3, md: 6 } as const;
/** Ținta tactilă minimă din specificații. */
export const TOUCH = 44;
export const font = {
  display: { fontWeight: '800' as const, letterSpacing: 0.5 },
  label: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 1.2, textTransform: 'uppercase' as const },
};

interface Settings {
  theme: ThemeName | 'system';
  /** Mod calm: fără animații și fără vibrații. */
  calm: boolean;
}

interface ThemeContextValue {
  colors: Palette;
  name: ThemeName;
  settings: Settings;
  /** Animații oprite: mod calm sau „reduce motion” din sistem. */
  reduceMotion: boolean;
  setSettings: (next: Partial<Settings>) => void;
}

const STORAGE_KEY = 'deadlinehero.settings';
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [settings, setSettingsState] = useState<Settings>({ theme: 'system', calm: false });
  const [systemReduceMotion, setSystemReduceMotion] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((raw) => raw && setSettingsState((s) => ({ ...s, ...(JSON.parse(raw) as Partial<Settings>) })))
      .catch(() => undefined);
    void AccessibilityInfo.isReduceMotionEnabled().then(setSystemReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduceMotion);
    return () => sub.remove();
  }, []);

  const setSettings = useCallback((next: Partial<Settings>) => {
    setSettingsState((current) => {
      const merged = { ...current, ...next };
      void SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(merged)).catch(() => undefined);
      return merged;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const name: ThemeName = settings.theme === 'system' ? (system === 'light' ? 'light' : 'dark') : settings.theme;
    return {
      colors: name === 'light' ? light : dark,
      name,
      settings,
      reduceMotion: settings.calm || systemReduceMotion,
      setSettings,
    };
  }, [settings, system, systemReduceMotion, setSettings]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme trebuie folosit în ThemeProvider');
  return context;
}
