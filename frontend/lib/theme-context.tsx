'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  ThemeMode,
  ResolvedTheme,
  DerivedThemePalette,
  THEME_MODE_STORAGE_KEY,
  PRIMARY_COLOR_STORAGE_KEY,
  DEFAULT_PRIMARY_COLOR,
  generateColorPalette,
  applyThemeToDom,
} from './theme-utils';

export interface ThemeContextType {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  primaryColor: string;
  palette: DerivedThemePalette;
  setThemeMode: (mode: ThemeMode) => void;
  setPrimaryColor: (hexColor: string) => void;
  resetToDefault: () => void;
  isCustomizerOpen: boolean;
  setIsCustomizerOpen: (open: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(THEME_MODE_STORAGE_KEY) as ThemeMode | null;
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          return saved;
        }
      } catch {}
    }
    return 'light';
  });

  const [primaryColor, setPrimaryColorState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(PRIMARY_COLOR_STORAGE_KEY);
        if (saved) return saved;
      } catch {}
    }
    return DEFAULT_PRIMARY_COLOR;
  });

  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [systemIsDark, setSystemIsDark] = useState<boolean>(false);

  // Monitor system color scheme
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemIsDark(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Determine actual resolved theme (light or dark)
  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (themeMode === 'system') {
      return systemIsDark ? 'dark' : 'light';
    }
    return themeMode === 'dark' ? 'dark' : 'light';
  }, [themeMode, systemIsDark]);

  // Derived color palette based on current primary color
  const palette = useMemo(() => {
    return generateColorPalette(primaryColor);
  }, [primaryColor]);

  // Apply theme classes and dynamic CSS variables to DOM
  useEffect(() => {
    applyThemeToDom(resolvedTheme, palette);
  }, [resolvedTheme, palette]);

  const setThemeMode = useCallback((newMode: ThemeMode) => {
    setThemeModeState(newMode);
    try {
      localStorage.setItem(THEME_MODE_STORAGE_KEY, newMode);
    } catch {}
  }, []);

  const setPrimaryColor = useCallback((hexColor: string) => {
    setPrimaryColorState(hexColor);
    try {
      localStorage.setItem(PRIMARY_COLOR_STORAGE_KEY, hexColor);
    } catch {}
  }, []);

  const resetToDefault = useCallback(() => {
    setThemeMode('light');
    setPrimaryColor(DEFAULT_PRIMARY_COLOR);
    try {
      localStorage.removeItem(THEME_MODE_STORAGE_KEY);
      localStorage.removeItem(PRIMARY_COLOR_STORAGE_KEY);
    } catch {}
  }, [setThemeMode, setPrimaryColor]);

  const contextValue: ThemeContextType = useMemo(
    () => ({
      themeMode,
      resolvedTheme,
      primaryColor,
      palette,
      setThemeMode,
      setPrimaryColor,
      resetToDefault,
      isCustomizerOpen,
      setIsCustomizerOpen,
    }),
    [themeMode, resolvedTheme, primaryColor, palette, setThemeMode, setPrimaryColor, resetToDefault, isCustomizerOpen]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
