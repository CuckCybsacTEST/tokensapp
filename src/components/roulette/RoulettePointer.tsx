import React from 'react';

interface RoulettePointerProps {
  spinning?: boolean;
}

const RoulettePointer: React.FC<RoulettePointerProps> = ({ spinning = false }) => {
  return (
    <svg
      width="60"
      height="70"
      viewBox="0 0 60 70"
      style={{
        position: 'absolute',
        top: '-30px', // Ajustado para posicionar correctamente el puntero invertido
        left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 1000, // asegurar que quede por encima de glow/overlay
        filter: spinning 
          ? 'drop-shadow(0 0 8px rgba(255,215,0,0.8))' 
          : 'drop-shadow(2px 2px 5px rgba(0,0,0,0.5))'
      }}
    >
      <defs>
        <linearGradient id="pointerGold" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#FDEEAE" />
          <stop offset="40%" stopColor="#F0B825" />
          <stop offset="100%" stopColor="#B47C00" />
        </linearGradient>
        <linearGradient id="pointerHighlight" x1="0" y1="0.5" x2="1" y2="0.5">
          <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
          <stop offset="100%" stopColor="rgba(255,215,0,0)" />
        </linearGradient>
        <filter id="pointerGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="glow" />
          <feComposite in="SourceGraphic" in2="glow" operator="over" />
        </filter>
      </defs>
      
      {/* Triángulo principal - Invertido para apuntar hacia la ruleta */}
      <path
        d="M 30 70 L 55 20 C 50 15, 10 15, 5 20 Z"
        fill="url(#pointerGold)"
        stroke="#614200"
        strokeWidth="2"
        filter={spinning ? "url(#pointerGlow)" : "none"}
      />

      {/* Efecto de brillo en el puntero */}
      <path
        d="M 30 67 L 52 22 C 48 18, 12 18, 8 22 Z"
        fill="url(#pointerHighlight)"
        opacity="0.7"
      />
      
      {/* Decoración interna para más detalle - también invertida */}
      <path
        d="M 30 60 L 45 25 C 40 22, 20 22, 15 25 Z"
        fill="none"
        stroke="#614200"
        strokeWidth="1"
        opacity="0.5"
      />
      
      {/* Destello cuando está girando - ajustado a la nueva posición */}
      {spinning && (
        <>
          <circle
            cx="30"
            cy="45" // Ajustado para coincidir con el puntero invertido
            r="4"
            fill="#FFFFFF"
            opacity="0.8"
          >
            <animate 
              attributeName="opacity" 
              values="0.9;0.3;0.9" 
              dur="0.7s" 
              repeatCount="indefinite" 
            />
            <animate 
              attributeName="r" 
              values="3;5;3" 
              dur="0.8s" 
              repeatCount="indefinite" 
            />
          </circle>
        </>
      )}
    </svg>
  );
};

export default RoulettePointer;
