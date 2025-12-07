// src/components/theme/RouletteThemeProvider.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ThemeName } from '@/lib/themes/types';
import { getThemeConfig } from '@/lib/themes/registry';
import { RouletteThemeContext } from '@/lib/themes/useRouletteTheme';

interface RouletteThemeProviderProps {
  children: React.ReactNode;
  initialTheme?: ThemeName;
  onThemeChange?: (theme: ThemeName) => void;
}

export const RouletteThemeProvider: React.FC<RouletteThemeProviderProps> = ({
  children,
  initialTheme = 'default',
  onThemeChange,
}) => {
  const [theme, setThemeState] = useState<ThemeName>(initialTheme);

  const config = getThemeConfig(theme);

  const setTheme = useCallback((newTheme: ThemeName) => {
    setThemeState(newTheme);
    onThemeChange?.(newTheme);
  }, [onThemeChange]);

  // Aplicar el tema al DOM cuando cambie
  useEffect(() => {
    const root = document.documentElement;

    // Aplicar atributo data para CSS
    root.setAttribute('data-roulette-theme', theme);

    // Aplicar variables CSS globales
    const themeConfig = getThemeConfig(theme);

    // Variables de colores globales
    root.style.setProperty('--theme-primary', themeConfig.colors.primary);
    root.style.setProperty('--theme-secondary', themeConfig.colors.secondary);
    root.style.setProperty('--theme-accent', themeConfig.colors.accent);
    root.style.setProperty('--theme-background', themeConfig.colors.background);
    root.style.setProperty('--theme-text', themeConfig.colors.text);

    // Variables específicas de ruleta
    root.style.setProperty('--roulette-frame-gold-1', themeConfig.roulette.frame.goldGradient[0]);
    root.style.setProperty('--roulette-frame-gold-2', themeConfig.roulette.frame.goldGradient[1]);
    root.style.setProperty('--roulette-frame-gold-3', themeConfig.roulette.frame.goldGradient[2]);

  }, [theme]);

  const value = {
    theme,
    config,
    setTheme,
  };

  return (
    <RouletteThemeContext.Provider value={value}>
      {children}
    </RouletteThemeContext.Provider>
  );
};