// src/lib/themes/registry.ts
import { ThemeConfig, ThemeName } from './types';

export const themeRegistry: Record<ThemeName, ThemeConfig> = {
  default: {
    name: 'default',
    displayName: 'Golounge Dark',
    colors: {
      primary: '#FF5500', // Intense Orange
      secondary: '#1A0804', // Very Dark Brown
      accent: '#FFD700', // Gold
      background: '#040201', // Deepest Coffee
      text: '#FFFFFF',
      success: '#00FA9A',
      warning: '#FF8800',
      error: '#FF2222',
    },
    roulette: {
      frame: {
        // Dark Copper/Gold
        goldGradient: ['#E6B87D', '#C48A48', '#8B5A2B'], // Coppery Gold
        innerGlow: ['#FFEEDD', '#C48A48'],
        texturePattern: '#1A0804', // Dark brown pattern
        borderGlow: '#FF5500', // Orange glow
        innerBorderColor: '#FFD700',
        outerBorderColor: '#000000',
        markLinesColor: '#E6B87D',
      },
      segments: {
        palette: [
          'url(#grad-gl-orange)',
          'url(#grad-gl-dark)',
          'url(#grad-gl-orange-2)',
          'url(#grad-gl-dark-2)',
          'url(#grad-gl-orange-3)',
          'url(#grad-gl-dark)',
        ],
        textColor: '#FFFFFF',
        borderColor: '#E6B87D', // Gold borders
        textOrientation: 'radial',
        customGradients: [
          {
            id: 'grad-gl-orange',
            stops: [{ offset: '0%', color: '#FF7700' }, { offset: '100%', color: '#FF4400' }] // Vibrant Orange
          },
          {
            id: 'grad-gl-dark',
            stops: [{ offset: '0%', color: '#2B110A' }, { offset: '100%', color: '#160805' }] // Deep Chocolate
          },
          {
            id: 'grad-gl-orange-2',
            stops: [{ offset: '0%', color: '#FFAA00' }, { offset: '100%', color: '#FF6600' }] // Gold-Orange
          },
          {
            id: 'grad-gl-dark-2',
            stops: [{ offset: '0%', color: '#3E1C12' }, { offset: '100%', color: '#1F0B06' }] // Lighter Chocolate
          },
          {
             id: 'grad-gl-orange-3',
             stops: [{ offset: '0%', color: '#FFCC00' }, { offset: '100%', color: '#FF8800' }] // Bright Gold
          }
        ]
      },
      pointer: {
        offset: 0,
        color: '#FFFFFF', // White pointer
      },
      spinButton: {
        glossyStart: '#FFFFFF',
        glossyEnd: '#FF5500', 
        goldTop: '#E6B87D',
        goldMid: '#C48A48',
        goldBottom: '#8B5A2B',
        arrowMid: '#FFFFFF',
        arrowEnd: '#FFD700',
        outerStroke: '#000000',
        innerStroke: '#FFFFFF',
        glowFlood: '#FF5500',
      },
    },
    global: {
      background: {
        gradients: [
          // Texture layer (very subtle grid/diagonal)
          'repeating-linear-gradient(45deg, rgba(255, 85, 0, 0.05) 0px, rgba(255, 85, 0, 0.05) 1px, transparent 1px, transparent 15px)',
          
          // Base Background (Deep Coffee/Black)
          'radial-gradient(circle at center, #2B110A 0%, #040201 100%)' 
        ],
        overlays: [],
        confettiColors: ['#FF5500', '#FF8800', '#FFFFFF', '#C48A48']
      },
      text: {
        primary: '#FFFFFF',
        secondary: '#E6B87D',
      },
      buttons: {
        primary: 'bg-gradient-to-r from-[#FF7700] to-[#FF4400] hover:from-[#FF9900] hover:to-[#FF5500] text-white shadow-[0_4px_15px_rgba(255,85,0,0.4)]',
      },
      modal: {
        background: 'linear-gradient(145deg, #1A0804 0%, #080302 100%)', // Dark Brown Modal
        boxShadow: '0 10px 40px -10px rgba(255, 85, 0, 0.3)',
        accentGradient: 'bg-gradient-to-r from-[#FF7700] to-[#FF4400]',
      },
      layout: {
        paddingAdjustments: {
          container: 'pt-2',
          viewport: 'pt-0',
        },
        themeClass: 'theme-golounge',
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
      buttons: {
        primary: 'bg-gradient-to-r from-[#B8002D] to-[#155734] hover:from-[#A00028] hover:to-[#0F4229] text-white',
      },
      modal: {
        background: 'linear-gradient(180deg, #0E0606, #07070C)',
        boxShadow: '0 12px 32px -10px rgba(184, 0, 45, 0.6)',
        accentGradient: 'bg-gradient-to-r from-[#B8002D] to-[#155734]',
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
      buttons: {
        primary: 'bg-gradient-to-r from-[#B8002D] to-[#155734] hover:from-[#A00028] hover:to-[#0F4229] text-white',
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
      buttons: {
        primary: 'bg-gradient-to-r from-[#06B6D4] to-[#10B981] hover:from-[#0891B2] hover:to-[#059669] text-white',
      },
      modal: {
        background: 'linear-gradient(180deg, #0E0606, #07070C)',
        boxShadow: '0 12px 32px -10px rgba(6, 182, 212, 0.6)',
        accentGradient: 'bg-gradient-to-r from-[#06B6D4] to-[#10B981]',
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