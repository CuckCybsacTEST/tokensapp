// src/components/theme/ThemeWrapper.tsx
'use client';

import React, { useEffect } from 'react';
import { ThemeName } from '@/lib/themes/types';
import { getThemeConfig } from '@/lib/themes/registry';

interface ThemeWrapperProps {
  theme: ThemeName;
  children: React.ReactNode;
}

export const ThemeWrapper: React.FC<ThemeWrapperProps> = ({ theme, children }) => {
  const themeConfig = getThemeConfig(theme);

  useEffect(() => {
    const root = document.documentElement;

    // Aplicar estilos globales del tema
    const globalConfig = themeConfig.global;

    // Crear estilos dinámicos para el fondo
    let backgroundStyle = '';
    if (globalConfig.background.gradients.length > 0) {
      backgroundStyle = globalConfig.background.gradients.join(', ');
    }

    // Aplicar estilos al body
    const body = document.body;
    if (backgroundStyle) {
      body.style.background = backgroundStyle;
    }
    body.style.color = globalConfig.text.primary;

    // Limpiar estilos cuando el componente se desmonte o cambie el tema
    return () => {
      body.style.background = '';
      body.style.color = '';
    };
  }, [theme, themeConfig]);

  return (
    <div
      className={`theme-wrapper theme-${theme} ${themeConfig.global.layout.paddingAdjustments.container}`}
      data-theme={theme}
    >
      {children}
    </div>
  );
};