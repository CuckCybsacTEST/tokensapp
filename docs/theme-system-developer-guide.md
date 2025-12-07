# Guía para Desarrolladores: Sistema de Temas de Ruleta

## Resumen

El sistema de temas de ruleta es una arquitectura escalable que permite crear y gestionar temas visuales para la ruleta de tokens sin modificar código hardcoded. Los temas se definen de forma centralizada y se aplican dinámicamente a través de un sistema de configuración.

## Arquitectura

### Componentes Principales

1. **Tipos** (`src/lib/themes/types.ts`): Define las interfaces TypeScript para temas
2. **Registro** (`src/lib/themes/registry.ts`): Almacena todas las configuraciones de temas
3. **Hook** (`src/lib/themes/useRouletteTheme.ts`): Proporciona acceso defensivo a temas
4. **Provider** (`src/components/theme/RouletteThemeProvider.tsx`): Gestiona el estado del tema
5. **Wrapper** (`src/components/theme/ThemeWrapper.tsx`): Aplica estilos globales

### Estructura de un Tema

```typescript
interface ThemeConfig {
  name: ThemeName;                    // Identificador único
  displayName: string;               // Nombre para mostrar en UI
  colors: {                          // Colores principales
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    success: string;
    warning: string;
    error: string;
  };
  roulette: {                        // Configuración específica de ruleta
    frame: {                         // Marco de la ruleta
      goldGradient: string[];        // Gradiente dorado [inicio, medio, fin]
      innerGlow: string[];           // Brillo interno [inicio, fin]
      texturePattern: string;        // Patrón de textura
      borderGlow: string;            // Brillo del borde
    };
    segments: {                      // Segmentos de premios
      palette: string[];             // Array de colores para segmentos
      textColor: string;             // Color del texto
      borderColor: string;           // Color del borde
    };
    pointer: {                       // Punta/puntero
      offset: number;                // Offset vertical en px
      color: string;                 // Color principal
    };
    spinButton: {                    // Botón de giro
      glossyStart: string;           // Inicio del gradiente glossy
      glossyEnd: string;             // Fin del gradiente glossy
      goldTop: string;               // Parte superior dorada
      goldMid: string;               // Parte media dorada
      goldBottom: string;            // Parte inferior dorada
      arrowMid: string;              // Flecha parte media
      arrowEnd: string;              // Flecha parte final
      outerStroke: string;           // Borde exterior
      innerStroke: string;           // Borde interior
      glowFlood: string;             // Color del glow
    };
  };
  global: {                          // Configuración global
    background: {
      gradients: string[];           // Gradientes de fondo CSS
      overlays: string[];            // Overlays adicionales
    };
    text: {
      primary: string;               // Color de texto principal
      secondary: string;             // Color de texto secundario
    };
    layout: {
      paddingAdjustments: {          // Ajustes de padding
        container: string;
        viewport: string;
      };
    };
  };
}
```

## Cómo Agregar un Nuevo Tema

### Método 1: Agregar al Registro Estático

1. **Editar `src/lib/themes/registry.ts`**:
```typescript
export const themeRegistry: Record<ThemeName, ThemeConfig> = {
  // ... temas existentes
  'mi-nuevo-tema': {
    name: 'mi-nuevo-tema',
    displayName: 'Mi Nuevo Tema',
    colors: {
      primary: '#FF6B6B',
      secondary: '#4ECDC4',
      accent: '#45B7D1',
      background: '#0F172A',
      text: '#F8FAFC',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    roulette: {
      frame: {
        goldGradient: ['#FF6B6B', '#E74C3C', '#C0392B'],
        innerGlow: ['#FFFFE0', '#FF6B6B'],
        texturePattern: '#E74C3C',
        borderGlow: '#FF8A80',
      },
      segments: {
        palette: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'],
        textColor: '#FFFFFF',
        borderColor: '#FFFFFF',
      },
      pointer: {
        offset: 0,
        color: '#FF6B6B',
      },
      spinButton: {
        glossyStart: '#FFFFFF',
        glossyEnd: '#FF6B6B',
        goldTop: '#FF6B6B',
        goldMid: '#FF6B6B',
        goldBottom: '#E74C3C',
        arrowMid: '#FFD700',
        arrowEnd: '#FF6B6B',
        outerStroke: '#C0392B',
        innerStroke: '#800000',
        glowFlood: '#FF8A80',
      },
    },
    global: {
      background: {
        gradients: [
          'linear-gradient(135deg, rgba(255, 107, 107, 0.1) 0%, rgba(78, 205, 196, 0.1) 100%)',
        ],
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
};
```

2. **Agregar el nombre del tema al tipo `ThemeName`** en `src/lib/themes/types.ts`:
```typescript
export type ThemeName = 'default' | 'christmas' | 'halloween' | 'summer' | 'mi-nuevo-tema';
```

### Método 2: Usar la API de Admin (Recomendado)

1. **Acceder al panel de admin**: `/admin/themes`
2. **Hacer clic en "Crear Nuevo Tema"**
3. **Configurar colores y propiedades**
4. **Guardar el tema**

Los temas creados vía API se almacenan en memoria y estarán disponibles hasta el próximo reinicio del servidor.

## Cómo Usar Temas en Componentes

### En Páginas de Ruleta

```tsx
// Pasar tema como prop o parámetro de URL
<RouletteClientPage theme="christmas" />

// O usar parámetro de URL: /marketing/ruleta?theme=christmas
```

### En Componentes Individuales

```tsx
import { useRouletteTheme } from '@/lib/themes/useRouletteTheme';

function MiComponente() {
  const { theme, config } = useRouletteTheme();

  // Acceder a colores del tema
  const primaryColor = config.colors.primary;
  const segmentPalette = config.roulette.segments.palette;

  return (
    <div style={{ backgroundColor: primaryColor }}>
      {/* Usar colores del tema */}
    </div>
  );
}
```

### Aplicar Tema Global

```tsx
import { RouletteThemeProvider } from '@/components/theme/RouletteThemeProvider';
import { ThemeWrapper } from '@/components/theme/ThemeWrapper';

function App() {
  return (
    <RouletteThemeProvider theme="christmas">
      <ThemeWrapper>
        {/* Tu aplicación aquí */}
      </ThemeWrapper>
    </RouletteThemeProvider>
  );
}
```

## API Endpoints

### GET `/api/admin/themes`
Obtiene la configuración de todos los temas o un tema específico.

**Parámetros de consulta:**
- `theme` (opcional): Nombre del tema específico

**Respuesta:**
```json
{
  "themes": ["default", "christmas", "halloween"],
  "configs": {
    "default": { /* configuración completa */ },
    "christmas": { /* configuración completa */ }
  },
  "defaultTheme": "default"
}
```

### POST `/api/admin/themes`
Crea o actualiza un tema.

**Body:**
```json
{
  "themeName": "mi-tema",
  "config": { /* configuración completa del tema */ },
  "action": "create" | "update"
}
```

### DELETE `/api/admin/themes?theme=nombre-tema`
Elimina un tema (excepto el tema "default").

## Panel de Administración

Accede a `/admin/themes` para:
- Ver todos los temas disponibles
- Crear nuevos temas con editor visual
- Editar temas existentes
- Eliminar temas (excepto "default")
- Previsualizar temas en la ruleta

## Mejores Prácticas

### Diseño de Colores
- Mantén contraste adecuado para accesibilidad
- Usa paletas coherentes (3-8 colores para segmentos)
- Considera el contexto de uso (ruleta debe ser legible)

### Nombres de Temas
- Usa kebab-case para nombres técnicos: `summer-vibes`
- Nombres descriptivos para display: `Summer Vibes`

### Configuración de Segmentos
- Mínimo 2 colores, máximo 12 para buena distribución
- Colores deben contrastar bien con el texto blanco
- Considera temas festivos o de temporada

### Testing
- Prueba temas en diferentes dispositivos
- Verifica contraste de colores
- Testea con diferentes cantidades de premios

## Troubleshooting

### Tema no se aplica
- Verifica que el `RouletteThemeProvider` envuelva los componentes
- Confirma que el nombre del tema existe en el registro
- Revisa la consola por errores del hook

### Colores incorrectos
- Verifica la estructura del objeto de configuración
- Asegúrate de que las propiedades requeridas estén presentes
- Usa el panel de admin para validar configuraciones

### Errores de TypeScript
- Importa tipos correctos desde `@/lib/themes/types`
- Usa `ThemeName` para nombres de temas
- Verifica que la configuración cumpla con la interfaz `ThemeConfig`

## Ejemplos de Temas

### Tema de Verano
```typescript
{
  name: 'summer',
  displayName: 'Summer Vibes',
  colors: {
    primary: '#FF6B35',
    secondary: '#F7931E',
    accent: '#FFD23F',
    // ... otros colores
  },
  roulette: {
    segments: {
      palette: ['#FF6B35', '#F7931E', '#FFD23F', '#06FFA5', '#00D4FF', '#BD00FF'],
      // ... otras configuraciones
    },
    // ... otras configuraciones
  }
}
```

### Tema de Halloween
```typescript
{
  name: 'halloween',
  displayName: 'Halloween Night',
  colors: {
    primary: '#FF6B35',
    secondary: '#2D1B69',
    accent: '#9D4EDD',
    // ... otros colores
  },
  roulette: {
    segments: {
      palette: ['#FF6B35', '#2D1B69', '#9D4EDD', '#7B2CBF', '#3C096C', '#240046'],
      // ... otras configuraciones
    },
    // ... otras configuraciones
  }
}
```

## Migración desde Código Hardcoded

Si tienes lógica hardcoded para temas específicos:

1. **Identifica la lógica**: Busca condicionales `if (theme === 'christmas')`
2. **Extrae configuración**: Mueve colores y estilos a objetos de configuración
3. **Actualiza componentes**: Reemplaza condicionales con acceso a `config`
4. **Prueba exhaustivamente**: Verifica que todos los casos funcionen

### Antes (Hardcoded):
```tsx
const segmentColor = theme === 'christmas'
  ? '#C51732'
  : '#FF6B6B';
```

### Después (Configurado):
```tsx
const { config } = useRouletteTheme();
const segmentColor = config.roulette.segments.palette[index];
```