import React from 'react';
import { usePointerOffset } from './usePointerOffset';

interface RoulettePointerProps {
  spinning?: boolean;
  scale?: number; // escala relativa a 500px
  /** Override directo (en px negativos). Si se provee, no se usa el hook. */
  pointerOffset?: number;
  theme?: string;
}

const RoulettePointer: React.FC<RoulettePointerProps> = ({ spinning = false, scale = 1, pointerOffset, theme = '' }) => {
  const baseWidth = 60;
  const baseHeight = 70;
  const w = baseWidth * scale;
  const h = baseHeight * scale;
  const dynamicOffset = usePointerOffset(scale);
  const topOffset = pointerOffset !== undefined ? pointerOffset : dynamicOffset;
  const normalizedTheme = theme.trim().toLowerCase();
  const isChristmasTheme = normalizedTheme === 'christmas' || normalizedTheme === 'navidad';
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 60 70`}
      style={{
        position: 'absolute',
  top: `${topOffset}px`, // controlar vía hook/override
        left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 1000, // asegurar que quede por encima de glow/overlay
        filter: spinning 
          ? 'drop-shadow(0 0 8px rgba(255,215,0,0.8))' 
          : 'drop-shadow(2px 2px 5px rgba(0,0,0,0.5))'
      }}
    >
      {isChristmasTheme ? (
        <>
          <defs>
            <linearGradient id="pointerStar" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="#FDF5A5" />
              <stop offset="50%" stopColor="#F5C542" />
              <stop offset="100%" stopColor="#C88F0A" />
            </linearGradient>
            <filter id="pointerStarGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d="M30 6 L35.8 23.4 L54 23.4 L39 34.6 L44.6 52 L30 41.2 L15.4 52 L21 34.6 L6 23.4 L24.2 23.4 Z"
            fill="url(#pointerStar)"
            stroke="#8C5C00"
            strokeWidth="1.6"
            filter={spinning ? "url(#pointerStarGlow)" : "none"}
          />
        </>
      ) : (
        <>
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
          <path
            d="M 30 70 L 55 20 C 50 15, 10 15, 5 20 Z"
            fill="url(#pointerGold)"
            stroke="#614200"
            strokeWidth="2"
            filter={spinning ? "url(#pointerGlow)" : "none"}
          />
          <path
            d="M 30 67 L 52 22 C 48 18, 12 18, 8 22 Z"
            fill="url(#pointerHighlight)"
            opacity="0.7"
          />
          <path
            d="M 30 60 L 45 25 C 40 22, 20 22, 15 25 Z"
            fill="none"
            stroke="#614200"
            strokeWidth="1"
            opacity="0.5"
          />
          {spinning && (
            <>
              <circle
                cx="30"
                cy="45"
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
        </>
      )}
    </svg>
  );
};

export default RoulettePointer;
