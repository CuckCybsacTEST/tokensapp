import { NextRequest, NextResponse } from 'next/server';
import { getAvailableThemeNames, getThemeConfig } from '@/lib/themes/registry';

export async function GET(request: NextRequest) {
  try {
    const themes = getAvailableThemeNames();
    const stats = {
      totalThemes: themes.length,
      themes: themes.map(themeName => {
        const config = getThemeConfig(themeName);
        return {
          name: themeName,
          displayName: config.displayName,
          segmentCount: config.roulette.segments.palette.length,
          hasCustomPointer: config.roulette.pointer.offset !== 0,
          colors: {
            primary: config.colors.primary,
            secondary: config.colors.secondary,
            accent: config.colors.accent,
          }
        };
      }),
      systemInfo: {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        features: [
          'Dynamic theme switching',
          'Admin panel management',
          'URL parameter support',
          'Type-safe configuration',
          'Backward compatibility'
        ]
      }
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching theme stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}