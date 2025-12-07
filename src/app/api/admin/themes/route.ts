import { NextRequest, NextResponse } from 'next/server';
import { getThemeConfig, getAvailableThemeNames, updateThemeConfig, createTheme, deleteTheme } from '@/lib/themes/registry';
import { ThemeName, RouletteThemeConfig } from '@/lib/themes/types';

// GET /api/admin/themes - Obtener configuración de temas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const themeName = searchParams.get('theme') as ThemeName;

    if (themeName) {
      // Obtener configuración específica de un tema
      const config = getThemeConfig(themeName);
      if (!config) {
        return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
      }
      return NextResponse.json({ theme: themeName, config });
    } else {
      // Obtener lista de todos los temas disponibles
      const themes = getAvailableThemeNames();
      const themeConfigs = themes.reduce((acc: Record<ThemeName, any>, theme: ThemeName) => {
        acc[theme] = getThemeConfig(theme);
        return acc;
      }, {} as Record<ThemeName, any>);

      return NextResponse.json({
        themes,
        configs: themeConfigs,
        defaultTheme: 'default' as ThemeName
      });
    }
  } catch (error) {
    console.error('Error fetching themes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/themes - Crear o actualizar tema
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { themeName, config, action } = body;

    if (!themeName || typeof themeName !== 'string') {
      return NextResponse.json({ error: 'themeName is required and must be a string' }, { status: 400 });
    }

    if (action === 'create') {
      // Crear nuevo tema
      if (!config) {
        return NextResponse.json({ error: 'config is required for theme creation' }, { status: 400 });
      }

      const success = createTheme(themeName as ThemeName, config);
      if (!success) {
        return NextResponse.json({ error: 'Failed to create theme' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Theme '${themeName}' created successfully`
      });
    } else {
      // Actualizar tema existente
      if (!config) {
        return NextResponse.json({ error: 'config is required for theme update' }, { status: 400 });
      }

      const success = updateThemeConfig(themeName as ThemeName, config);
      if (!success) {
        return NextResponse.json({ error: 'Failed to update theme' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Theme '${themeName}' updated successfully`
      });
    }
  } catch (error) {
    console.error('Error updating theme:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/themes - Eliminar tema
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const themeName = searchParams.get('theme') as ThemeName;

    if (!themeName) {
      return NextResponse.json({ error: 'theme parameter is required' }, { status: 400 });
    }

    if (themeName === 'default') {
      return NextResponse.json({ error: 'Cannot delete default theme' }, { status: 400 });
    }

    const success = deleteTheme(themeName);
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete theme or theme not found' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Theme '${themeName}' deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting theme:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}