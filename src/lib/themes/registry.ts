// src/lib/themes/registry.ts
import { ThemeConfig, ThemeName } from './types';

export const themeRegistry: Record<ThemeName, ThemeConfig> = {
  default: {
    name: 'default',
    displayName: 'Por Defecto',
    colors: {
      primary: '#F0B825',
      secondary: '#B47C00',
      accent: '#8C5C00',
      background: '#0F172A',
      text: '#F8FAFC',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    roulette: {
      frame: {
        goldGradient: ['#F0B825', '#B47C00', '#8C5C00'],
        innerGlow: ['#FFFFE0', '#F0B825'],
        texturePattern: '#B47C00',
        borderGlow: '#FFF2AE',
        innerBorderColor: '#FFF2AE',
        outerBorderColor: '#4A3000',
        markLinesColor: '#4A3000',
      },
      segments: {
        palette: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'],
        textColor: '#FFFFFF',
        borderColor: '#FFFFFF',
      },
      pointer: {
        offset: 0,
        color: '#F0B825',
      },
      spinButton: {
        glossyStart: '#FFFFFF',
        glossyEnd: '#F0B825',
        goldTop: '#F0B825',
        goldMid: '#F0B825',
        goldBottom: '#B47C00',
        arrowMid: '#FFD700',
        arrowEnd: '#F0B825',
        outerStroke: '#A66F00',
        innerStroke: '#800000',
        glowFlood: '#FFDD00',
      },
    },
    global: {
      background: {
        gradients: [],
        overlays: [],
      },
      text: {
        primary: '#F8FAFC',
        secondary: '#CBD5E1',
      },
      layout: {
        paddingAdjustments: {
          container: '',
          viewport: '',
        },
      },
    },
  },
  christmas: {
    name: 'christmas',
    displayName: 'Navidad',
    colors: {
      primary: '#E7B10A',
      secondary: '#B8002D',
      accent: '#155734',
      background: '#0F172A',
      text: '#F7FAFC',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    roulette: {
      frame: {
        goldGradient: ['#E2C76A', '#B98C07', '#7A5603'],
        innerGlow: ['#FFF7D6', '#E9B949'],
        texturePattern: '#9A7024',
        borderGlow: '#FDEAB4',
        innerBorderColor: '#FDEAB4',
        outerBorderColor: '#27613C',
        markLinesColor: '#1F4330',
        lightColors: ['#C51732', '#1E6138'],
      },
      segments: {
        palette: ['#B8002D', '#155734', '#E7B10A', '#0B3D20'],
        textColor: '#FFFFFF',
        borderColor: '#FFFFFF',
      },
      pointer: {
        offset: 20,
        color: '#E7B10A',
        type: 'star',
        starColors: ['#FDF5A5', '#F5C542', '#C88F0A'],
        starStroke: '#8C5C00',
      },
      spinButton: {
        glossyStart: '#FFFFFF',
        glossyEnd: '#E7B10A',
        goldTop: '#E7B10A',
        goldMid: '#E7B10A',
        goldBottom: '#B98C07',
        arrowMid: '#FFE8A8',
        arrowEnd: '#E7B10A',
        outerStroke: '#21503A',
        innerStroke: '#7A1026',
        glowFlood: '#F8D16A',
      },
    },
    global: {
      background: {
        gradients: [
          'radial-gradient(circle at 15% 15%, rgba(255, 255, 255, 0.08), transparent 55%)',
          'radial-gradient(circle at 85% 20%, rgba(255, 255, 255, 0.06), transparent 60%)',
          'radial-gradient(circle at 50% 100%, rgba(70, 15, 18, 0.82), rgba(8, 12, 20, 0.92))',
        ],
        overlays: [
          'repeating-linear-gradient(135deg, rgba(255, 64, 85, 0.18) 0px, rgba(255, 64, 85, 0.18) 12px, transparent 12px, transparent 26px)',
          'repeating-linear-gradient(225deg, rgba(46, 150, 92, 0.16) 0px, rgba(46, 150, 92, 0.16) 14px, transparent 14px, transparent 30px)',
        ],
        snowEffect: {
          colors: ['rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0.6)', 'rgba(255, 255, 255, 0.55)', 'rgba(255, 255, 255, 0.65)'],
          sizes: ['2px 2px', '1.5px 1.5px', '1.2px 1.2px', '1.8px 1.8px'],
        },
        confettiColors: ['#ff1c1c', '#ffb347', '#ffd700', '#2ecc71', '#34c759', '#ffffff'],
      },
      text: {
        primary: '#F7FAFC',
        secondary: '#CBD5E1',
      },
      layout: {
        paddingAdjustments: {
          container: 'px-0 pt-0 pb-0',
          viewport: 'rouletteViewportChristmas',
        },
        containerClass: 'pt-16 sm:pt-0',
        themeClass: 'roulette-theme--christmas',
      },
    },
  },
  halloween: {
    name: 'halloween',
    displayName: 'Halloween',
    colors: {
      primary: '#FF6B35',
      secondary: '#F7931E',
      accent: '#2D1B69',
      background: '#0F172A',
      text: '#F8FAFC',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    roulette: {
      frame: {
        goldGradient: ['#FF6B35', '#F7931E', '#2D1B69'],
        innerGlow: ['#FFB366', '#FF6B35'],
        texturePattern: '#F7931E',
        borderGlow: '#FF8C42',
        innerBorderColor: '#FF8C42',
        outerBorderColor: '#4A3000',
        markLinesColor: '#4A3000',
      },
      segments: {
        palette: ['#FF6B35', '#F7931E', '#2D1B69', '#8B5CF6', '#F59E0B', '#EF4444'],
        textColor: '#FFFFFF',
        borderColor: '#FFFFFF',
      },
      pointer: {
        offset: 0,
        color: '#FF6B35',
      },
      spinButton: {
        glossyStart: '#FFFFFF',
        glossyEnd: '#FF6B35',
        goldTop: '#FF6B35',
        goldMid: '#F7931E',
        goldBottom: '#2D1B69',
        arrowMid: '#FFB366',
        arrowEnd: '#FF6B35',
        outerStroke: '#F7931E',
        innerStroke: '#2D1B69',
        glowFlood: '#FF8C42',
      },
    },
    global: {
      background: {
        gradients: [
          'radial-gradient(circle at 20% 20%, rgba(255, 107, 53, 0.1), transparent 50%)',
          'radial-gradient(circle at 80% 30%, rgba(247, 147, 30, 0.08), transparent 55%)',
          'radial-gradient(circle at 40% 80%, rgba(45, 27, 105, 0.85), rgba(15, 23, 42, 0.95))',
        ],
        overlays: [
          'repeating-linear-gradient(135deg, rgba(255, 107, 53, 0.15) 0px, rgba(255, 107, 53, 0.15) 15px, transparent 15px, transparent 30px)',
          'repeating-linear-gradient(225deg, rgba(139, 92, 246, 0.12) 0px, rgba(139, 92, 246, 0.12) 18px, transparent 18px, transparent 36px)',
        ],
      },
      text: {
        primary: '#F8FAFC',
        secondary: '#CBD5E1',
      },
      layout: {
        paddingAdjustments: {
          container: '',
          viewport: '',
        },
      },
    },
  },
  summer: {
    name: 'summer',
    displayName: 'Verano',
    colors: {
      primary: '#06B6D4',
      secondary: '#10B981',
      accent: '#F59E0B',
      background: '#0F172A',
      text: '#F8FAFC',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    roulette: {
      frame: {
        goldGradient: ['#06B6D4', '#10B981', '#F59E0B'],
        innerGlow: ['#A5F3FC', '#06B6D4'],
        texturePattern: '#10B981',
        borderGlow: '#7DD3FC',
        innerBorderColor: '#7DD3FC',
        outerBorderColor: '#4A3000',
        markLinesColor: '#4A3000',
      },
      segments: {
        palette: ['#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'],
        textColor: '#FFFFFF',
        borderColor: '#FFFFFF',
      },
      pointer: {
        offset: 0,
        color: '#06B6D4',
      },
      spinButton: {
        glossyStart: '#FFFFFF',
        glossyEnd: '#06B6D4',
        goldTop: '#06B6D4',
        goldMid: '#10B981',
        goldBottom: '#F59E0B',
        arrowMid: '#A5F3FC',
        arrowEnd: '#06B6D4',
        outerStroke: '#10B981',
        innerStroke: '#F59E0B',
        glowFlood: '#7DD3FC',
      },
    },
    global: {
      background: {
        gradients: [
          'radial-gradient(circle at 25% 25%, rgba(6, 182, 212, 0.1), transparent 45%)',
          'radial-gradient(circle at 75% 35%, rgba(16, 185, 129, 0.08), transparent 50%)',
          'radial-gradient(circle at 60% 90%, rgba(245, 158, 11, 0.12), rgba(15, 23, 42, 0.9))',
        ],
        overlays: [
          'repeating-linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0px, rgba(6, 182, 212, 0.1) 20px, transparent 20px, transparent 40px)',
          'repeating-linear-gradient(225deg, rgba(16, 185, 129, 0.08) 0px, rgba(16, 185, 129, 0.08) 25px, transparent 25px, transparent 50px)',
        ],
      },
      text: {
        primary: '#F8FAFC',
        secondary: '#CBD5E1',
      },
      layout: {
        paddingAdjustments: {
          container: '',
          viewport: '',
        },
      },
    },
  },
};

export const getThemeConfig = (themeName: ThemeName): ThemeConfig => {
  return themeRegistry[themeName] || themeRegistry.default;
};

export const getAvailableThemes = (): ThemeConfig[] => {
  return Object.values(themeRegistry);
};

// Funciones para gestión dinámica de temas
export const updateThemeConfig = (themeName: ThemeName, newConfig: Partial<ThemeConfig>): boolean => {
  if (!themeRegistry[themeName]) {
    return false;
  }

  themeRegistry[themeName] = {
    ...themeRegistry[themeName],
    ...newConfig,
  };

  return true;
};

export const createTheme = (themeName: ThemeName, config: ThemeConfig): boolean => {
  if (themeRegistry[themeName]) {
    return false; // Tema ya existe
  }

  themeRegistry[themeName] = config;
  return true;
};

export const deleteTheme = (themeName: ThemeName): boolean => {
  if (!themeRegistry[themeName] || themeName === 'default') {
    return false; // No existe o es el tema por defecto
  }

  delete themeRegistry[themeName];
  return true;
};

export const getAvailableThemeNames = (): ThemeName[] => {
  return Object.keys(themeRegistry) as ThemeName[];
};