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
  };
  segments: {
    palette: string[];
    textColor: string;
    borderColor: string;
  };
  pointer: {
    offset: number;
    color: string;
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
  };
}

export interface ThemeConfig {
  name: ThemeName;
  displayName: string;
  colors: ThemeColors;
  roulette: RouletteThemeConfig;
  global: GlobalThemeConfig;
}