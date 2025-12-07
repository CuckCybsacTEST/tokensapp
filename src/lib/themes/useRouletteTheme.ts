// src/lib/themes/useRouletteTheme.ts
import React, { useContext } from 'react';
import { ThemeName, ThemeConfig } from './types';
import { getThemeConfig } from './registry';

interface RouletteThemeContextValue {
  theme: ThemeName;
  config: ThemeConfig;
  setTheme: (theme: ThemeName) => void;
}

const RouletteThemeContext = React.createContext<RouletteThemeContextValue | null>(null);

export const useRouletteTheme = () => {
  const context = useContext(RouletteThemeContext);
  if (!context) {
    // Return default values when no provider is available
    return {
      theme: 'default' as ThemeName,
      config: getThemeConfig('default'),
      setTheme: () => {
        console.warn('useRouletteTheme: No RouletteThemeProvider found. Theme changes will not be applied.');
      },
    };
  }
  return context;
};

export { RouletteThemeContext };