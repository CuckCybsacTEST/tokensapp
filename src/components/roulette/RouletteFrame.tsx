import React from 'react';
import { ThemeName } from '@/lib/themes/types';
import { useRouletteTheme } from '@/lib/themes/useRouletteTheme';

interface RouletteFrameProps {
  spinning?: boolean;
  scale?: number; // relativo a 500
  wheelRadius?: number; // radio interno de segmentos para ajustar gap
  lowMotion?: boolean; // reduce efectos y animaciones
  theme?: ThemeName; // Usar ThemeName en lugar de string
}

const RouletteFrame: React.FC<RouletteFrameProps> = ({
  spinning = false,
  scale = 1,
  wheelRadius,
  lowMotion = false,
  theme: propTheme
}) => {
  // Usar el hook de tema para obtener la configuración
  const { theme: contextTheme, config } = useRouletteTheme();
  const theme = propTheme || contextTheme;
  const themeConfig = config;

  const baseSize = 500;
  const width = baseSize * scale;
  const height = baseSize * scale;
  const center = baseSize / 2; // mantenemos viewBox base para simplificar escalado via width/height

  // Ajuste dinámico del marco basado en wheelRadius
  const computedWheelRadius = wheelRadius ? (wheelRadius / scale) : 205; // convertir a coordenadas base
  // Reducimos padding para que los sectores se acerquen más al borde interno del marco
  const desiredPadding = 10; // antes 18
  let frameInnerRadius = computedWheelRadius + desiredPadding; // menor gap
  // Limitar para no superar espacio disponible (250 es el máximo centro->borde)
  if (frameInnerRadius > 238) frameInnerRadius = 238; // margen de seguridad
  let frameOuterRadius = frameInnerRadius + 34; // mantenemos grosor exterior
  if (frameOuterRadius > 248) frameOuterRadius = 248; // tope absoluto
  // Ajustamos el radio de luces para seguir centradas en el anillo
  const lightRadius = Math.min(frameInnerRadius + 14, frameOuterRadius - 8);
  const numLights = 36;
  const lightSize = 8;

  const lights = Array.from({ length: numLights }, (_, i) => {
    const angle = (i / numLights) * 2 * Math.PI;
    const cx = center + lightRadius * Math.cos(angle);
    const cy = center + lightRadius * Math.sin(angle);
    return { cx, cy, delay: i * (1.5 / numLights) }; // Añadir delay para animación secuencial
  });

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${baseSize} ${baseSize}`}
      style={{ position: 'absolute', top: 0, left: 0, zIndex: 5 }}
    >
      <defs>
        <radialGradient id="goldGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="60%" style={{ stopColor: themeConfig.roulette.frame.goldGradient[0] }} />
          <stop offset="80%" style={{ stopColor: themeConfig.roulette.frame.goldGradient[1] }} />
          <stop offset="100%" style={{ stopColor: themeConfig.roulette.frame.goldGradient[2] }} />
        </radialGradient>
        <radialGradient id="lightGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" style={{ stopColor: '#FFFFFF' }} />
          <stop offset="40%" style={{ stopColor: themeConfig.roulette.frame.innerGlow[0] }} />
          <stop offset="100%" style={{ stopColor: themeConfig.roulette.frame.innerGlow[1] }} />
        </radialGradient>
        <filter id="enhancedGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feFlood floodColor="#FFFF00" floodOpacity="0.35" result="yellowGlow" />
          <feComposite in="yellowGlow" in2="blur" operator="in" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <pattern
          id="noisePattern"
          width="100"
          height="100"
          patternUnits="userSpaceOnUse"
          patternTransform="scale(0.1)"
        >
          <rect width="100%" height="100%" fill={themeConfig.roulette.frame.goldGradient[0]} />
          <rect width="1" height="1" x="0" y="0" fill={themeConfig.roulette.frame.texturePattern} opacity="0.2" />
          <rect width="1" height="1" x="25" y="25" fill={themeConfig.roulette.frame.texturePattern} opacity="0.2" />
          <rect width="1" height="1" x="50" y="50" fill={themeConfig.roulette.frame.texturePattern} opacity="0.2" />
          <rect width="1" height="1" x="75" y="75" fill={themeConfig.roulette.frame.texturePattern} opacity="0.2" />
          <rect width="1" height="1" x="12" y="37" fill={themeConfig.roulette.frame.texturePattern} opacity="0.2" />
          <rect width="1" height="1" x="62" y="87" fill={themeConfig.roulette.frame.texturePattern} opacity="0.2" />
        </pattern>
      </defs>

      <circle
        cx={center}
        cy={center}
        r={frameOuterRadius}
        fill="url(#goldGradient)"
        stroke="#4A3000"
        strokeWidth={3.2}
        style={{ filter: spinning && !lowMotion ? 'url(#enhancedGlow)' : 'none' }}
      />

      <circle cx={center} cy={center} r={frameOuterRadius - 5} fill="url(#noisePattern)" opacity="0.1" />

      <circle
        cx={center}
        cy={center}
        r={frameInnerRadius}
        fill="transparent"
        stroke={themeConfig?.roulette?.frame?.innerBorderColor || '#FFF2AE'}
        strokeWidth={2}
      />

      <circle
        cx={center}
        cy={center}
        r={frameInnerRadius + 2}
        fill="transparent"
        stroke={themeConfig?.roulette?.frame?.outerBorderColor || '#4A3000'}
        strokeWidth={3.8}
      />

      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * 2 * Math.PI;
        const x1 = center + (frameInnerRadius + 10) * Math.cos(angle);
        const y1 = center + (frameInnerRadius + 10) * Math.sin(angle);
        const x2 = center + (frameOuterRadius - 10) * Math.cos(angle);
        const y2 = center + (frameOuterRadius - 10) * Math.sin(angle);

        return (
          <line
            key={`frame-mark-${i}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={themeConfig?.roulette?.frame?.markLinesColor || '#4A3000'}
            strokeWidth={2}
            opacity={0.6}
          />
        );
      })}

      {lights.map((light, index) => {
        const lightFill = themeConfig?.roulette?.frame?.lightColors
          ? themeConfig.roulette.frame.lightColors[index % 2]
          : undefined;
        
        // Efecto "chase" constante:
        // Duración del ciclo completo: 1.2s
        // Delay escalonado para crear la ola.
        // Opacidad varía de encendido (1) a apagado (0.3).
        const animationDuration = spinning ? "0.6s" : "1.2s"; 
        
        return (
          <circle
            key={`frame-light-${index}`}
            cx={light.cx}
            cy={light.cy}
            r={lightSize}
            fill={lightFill || 'url(#lightGradient)'}
            // Eliminamos la opacidad estática en style para que la animación controle
            style={{ }}
          >
            {!lowMotion && (
              <>
                 {/* Animación de Opacidad (Encender/Apagar) - Siempre activa */}
                <animate
                  attributeName="opacity"
                  values="1;0.4;1"
                  dur={animationDuration}
                  repeatCount="indefinite"
                  begin={`${light.delay}s`}
                />
                
                {/* Animación de Tamaño (Pulsar) - Solo cuando gira para más intensidad */}
                {spinning && (
                  <animate
                    attributeName="r"
                    values={`${lightSize};${lightSize * 1.5};${lightSize}`}
                    dur={animationDuration}
                    repeatCount="indefinite"
                    begin={`${light.delay}s`}
                  />
                )}
              </>
            )}
          </circle>
        );
      })}

      <circle
        cx={center}
        cy={center}
        r={frameInnerRadius - 5}
        fill="none"
        stroke={themeConfig.roulette.frame.borderGlow}
        strokeWidth={2}
        opacity={0.2}
      >
        <animate attributeName="opacity" values="0.2;0.5;0.2" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
};

export default RouletteFrame;
