import React from 'react';

interface RouletteFrameProps {
  spinning?: boolean;
}

const RouletteFrame: React.FC<RouletteFrameProps> = ({ spinning = false }) => {
  const width = 500;
  const height = 500;
  const center = width / 2;
  const frameOuterRadius = 245;
  const frameInnerRadius = 205;
  const lightRadius = 225;
  const numLights = 36;
  const lightSize = 8;

  const lights = Array.from({ length: numLights }, (_, i) => {
    const angle = (i / numLights) * 2 * Math.PI;
    const cx = center + lightRadius * Math.cos(angle);
    const cy = center + lightRadius * Math.sin(angle);
    return { cx, cy, delay: i * (1.5 / numLights) }; // Añadir delay para animación secuencial
  });

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ position: 'absolute', top: 0, left: 0, zIndex: 5 }}>
      <defs>
        <radialGradient id="goldGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="60%" style={{ stopColor: '#F0B825' }} />
          <stop offset="80%" style={{ stopColor: '#B47C00' }} />
          <stop offset="100%" style={{ stopColor: '#8C5C00' }} />
        </radialGradient>
        <radialGradient id="lightGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" style={{ stopColor: '#FFFFFF' }} />
          <stop offset="40%" style={{ stopColor: '#FFFFE0' }} />
          <stop offset="100%" style={{ stopColor: '#F0B825' }} />
        </radialGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="enhancedGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feFlood floodColor="#FFFF00" floodOpacity="0.5" result="yellowGlow" />
          <feComposite in="yellowGlow" in2="blur" operator="in" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        
        {/* Definir patrones para textura del marco */}
        <pattern id="noisePattern" width="100" height="100" patternUnits="userSpaceOnUse" patternTransform="scale(0.1)">
          <rect width="100%" height="100%" fill="#F0B825" />
          <rect width="1" height="1" x="0" y="0" fill="#B47C00" opacity="0.2" />
          <rect width="1" height="1" x="25" y="25" fill="#B47C00" opacity="0.2" />
          <rect width="1" height="1" x="50" y="50" fill="#B47C00" opacity="0.2" />
          <rect width="1" height="1" x="75" y="75" fill="#B47C00" opacity="0.2" />
          <rect width="1" height="1" x="12" y="37" fill="#B47C00" opacity="0.2" />
          <rect width="1" height="1" x="62" y="87" fill="#B47C00" opacity="0.2" />
        </pattern>
      </defs>

      {/* Marco exterior mejorado */}
      <circle 
        cx={center} 
        cy={center} 
        r={frameOuterRadius} 
        fill="url(#goldGradient)" 
        stroke="#4A3000" 
        strokeWidth="4"
        style={{ filter: spinning ? 'url(#enhancedGlow)' : 'none' }}
      />
      
      {/* Textura decorativa en el marco */}
      <circle 
        cx={center} 
        cy={center} 
        r={frameOuterRadius - 5} 
        fill="url(#noisePattern)" 
        opacity="0.1" 
      />
      
      {/* Marco interior y decoración */}
      <circle cx={center} cy={center} r={frameInnerRadius} fill="transparent" stroke="#FFF2AE" strokeWidth="2.5" />
      <circle cx={center} cy={center} r={frameInnerRadius + 2} fill="transparent" stroke="#4A3000" strokeWidth="4.5" />
      
      {/* Detalles decorativos en el marco */}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * 2 * Math.PI;
        const x1 = center + (frameInnerRadius + 10) * Math.cos(angle);
        const y1 = center + (frameInnerRadius + 10) * Math.sin(angle);
        const x2 = center + (frameOuterRadius - 10) * Math.cos(angle);
        const y2 = center + (frameOuterRadius - 10) * Math.sin(angle);
        
        return (
          <line 
            key={`line-${i}`} 
            x1={x1} 
            y1={y1} 
            x2={x2} 
            y2={y2} 
            stroke="#4A3000" 
            strokeWidth="2" 
            opacity="0.6" 
          />
        );
      })}

      {/* Luces con animación */}
      <g style={{ filter: spinning ? 'url(#enhancedGlow)' : 'url(#glow)' }}>
        {lights.map((light, i) => (
          <circle 
            key={i} 
            cx={light.cx} 
            cy={light.cy} 
            r={lightSize} 
            fill="url(#lightGradient)"
            style={{ opacity: !spinning ? 0.7 : 1 }}
          >
            {spinning && (
              <>
                <animate 
                  attributeName="opacity" 
                  values="1;0.1;1" 
                  dur="0.7s" 
                  repeatCount="indefinite"
                  begin={`${light.delay}s`}
                />
                <animate 
                  attributeName="r" 
                  values={`${lightSize};${lightSize*1.6};${lightSize}`} 
                  dur="0.5s" 
                  repeatCount="indefinite"
                  begin={`${light.delay}s`}
                />
              </>
            )}
          </circle>
        ))}
      </g>
      
      {/* Efectos adicionales cuando está girando */}
      {spinning && (
        <circle 
          cx={center} 
          cy={center} 
          r={frameInnerRadius - 5} 
          fill="none" 
          stroke="#FFFFFF" 
          strokeWidth="2" 
          opacity="0.2"
        >
          <animate 
            attributeName="opacity" 
            values="0.2;0.5;0.2" 
            dur="2s" 
            repeatCount="indefinite" 
          />
        </circle>
      )}
    </svg>
  );
};

export default RouletteFrame;
