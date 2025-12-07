// src/lib/themes/types.ts
export type ThemeName = 'default' | 'christmas' | 'halloween' | 'summer';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  success: string;
  warning: string;
  error: string;
}

export interface RouletteThemeConfig {
  frame: {
    goldGradient: [string, string, string];
    innerGlow: [string, string];
    texturePattern: string;
    borderGlow: string;
    innerBorderColor: string;
    outerBorderColor: string;
    markLinesColor: string;
    lightColors?: [string, string]; // Para alternar colores de luces en temas específicos
  };
  segments: {
    palette: string[];
    textColor: string;
    borderColor: string;
  };
  pointer: {
    offset: number;
    color: string;
    type?: 'star' | 'arrow'; // Tipo de puntero
    starColors?: [string, string, string]; // Gradiente para estrella [inicio, medio, fin]
    starStroke?: string; // Color del borde de la estrella
  };
  spinButton: {
    glossyStart: string;
    glossyEnd: string;
    goldTop: string;
    goldMid: string;
    goldBottom: string;
    arrowMid: string;
    arrowEnd: string;
    outerStroke: string;
    innerStroke: string;
    glowFlood: string;
  };
}

export interface GlobalThemeConfig {
  background: {
    gradients: string[];
    overlays: string[];
    snowEffect?: {
      colors: string[];
      sizes: string[];
    };
    confettiColors?: string[]; // Colores para animación de confetti
  };
  text: {
    primary: string;
    secondary: string;
  };
  layout: {
    paddingAdjustments: {
      container: string;
      viewport: string;
    };
    containerClass?: string; // Clases CSS adicionales para el contenedor
    themeClass?: string; // Clase CSS específica del tema para elementos
  };
}

export interface ThemeConfig {
  name: ThemeName;
  displayName: string;
  colors: ThemeColors;
  roulette: RouletteThemeConfig;
  global: GlobalThemeConfig;
}