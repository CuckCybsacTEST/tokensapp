import React, { useState } from 'react';
import btnStyles from './spinButton.module.css';

interface SpinButtonProps {
  onClick: () => void;
  disabled?: boolean;
  scale?: number; // escala relativa al tamaño base (500)
  theme?: string;
}

// Componente de botón mejorado con mejor manejo de eventos
const SpinButton: React.FC<SpinButtonProps> = ({ onClick, disabled = false, scale = 1, theme = '' }) => {
  const [isHover, setIsHover] = useState(false);
  const [isPress, setIsPress] = useState(false);
  const normalizedTheme = theme.trim().toLowerCase();
  const isChristmasTheme = normalizedTheme === 'christmas' || normalizedTheme === 'navidad';
  const glossyStart = isChristmasTheme
    ? (isPress ? '#E64C65' : isHover ? '#F15A6B' : '#E6495F')
    : (isPress ? '#FF7070' : isHover ? '#FF7F7F' : '#FF6B6B');
  const glossyEnd = isChristmasTheme
    ? (isPress ? '#8C152A' : isHover ? '#A3192E' : '#8C152A')
    : (isPress ? '#D40000' : isHover ? '#D41010' : '#C40C0C');
  const goldTop = isChristmasTheme
    ? (isHover ? '#FFE6A3' : '#FDE6B0')
    : (isHover ? '#FFF7D0' : '#FFF3C1');
  const goldMid = isChristmasTheme ? '#E7B10A' : '#F0B825';
  const goldBottom = isChristmasTheme
    ? (isPress ? '#8C6314' : '#B8860B')
    : (isPress ? '#8F6200' : '#B47C00');
  const arrowMid = isChristmasTheme ? '#FFE8A8' : '#FFD700';
  const arrowEnd = isChristmasTheme ? '#E7B10A' : '#F0B825';
  const outerStroke = isChristmasTheme ? '#21503A' : '#A66F00';
  const innerStroke = isChristmasTheme ? '#7A1026' : '#800000';
  const glowFlood = isChristmasTheme ? '#F8D16A' : '#FFDD00';
  
  const size = 130 * scale; // escalar tamaño del botón
  const center = size / 2;
  const outerRingRadius = 63 * scale; 
  const innerCircleRadius = 54 * scale;
  
  // Crear un área efectiva completa para detectar eventos del mouse
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      onClick();
    }
  };
  
  // Controladores de eventos simplificados
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) setIsPress(true);
  };
  
  const handleMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) setIsPress(false);
  };
  
  const handleMouseEnter = () => {
    if (!disabled) setIsHover(true);
  };
  
  const handleMouseLeave = () => {
    if (!disabled) {
      setIsHover(false);
      setIsPress(false);
    }
  };

  const [isFocused, setIsFocused] = useState(false);

  return (
    <div 
      className={btnStyles.container}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: size,
        height: size,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: '50%',
        cursor: disabled ? 'not-allowed' : 'pointer',
        zIndex: 30, // Aumentamos el z-index para asegurarnos de que esté por encima
        background: 'transparent',
        boxShadow: isFocused ? '0 0 0 3px rgba(255, 215, 0, 0.8)' : 
                   isHover ? '0 0 15px 5px rgba(255, 215, 0, 0.3)' : 
                   isPress ? '0 0 8px 3px rgba(255, 215, 0, 0.5)' : 'none',
        transition: 'box-shadow 0.3s ease, transform 0.18s ease-out',
        outline: 'none'
      }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={(e: React.KeyboardEvent) => {
        // Activar el giro con Enter o Space
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Girar la ruleta"
    >
      <div className={btnStyles.bounce}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{
          /* Rebote sutil en móvil al tocar */
          transform: isPress ? 'scale(0.965)' : isHover ? 'scale(1.03)' : 'scale(1)',
          filter: `drop-shadow(2px 3px ${isPress ? '3px' : '5px'} rgba(0,0,0,0.4))`,
          transition: 'transform 0.2s ease-out, filter 0.2s ease-out',
          opacity: disabled ? 0.7 : 1,
          pointerEvents: 'none' // El SVG no captura eventos, solo el div padre
        }}
  >
      <defs>
        <radialGradient id="redGlossy" cx="50%" cy="40%" r="50%" fx="50%" fy="40%">
          <stop offset="0%" stopColor={glossyStart} />
          <stop offset="100%" stopColor={glossyEnd} />
        </radialGradient>
        <linearGradient id="spinButtonGold" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={goldTop} />
          <stop offset="50%" stopColor={goldMid} />
          <stop offset="100%" stopColor={goldBottom} />
        </linearGradient>
        <linearGradient id="arrowGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor={arrowMid} />
          <stop offset="100%" stopColor={arrowEnd} />
        </linearGradient>
        
        <filter id="arrowShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#614200" floodOpacity="0.5" />
        </filter>
        <filter id="buttonGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feFlood floodColor={glowFlood} floodOpacity="0.3" result="glowColor" />
          <feComposite in="glowColor" in2="blur" operator="in" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Base que contiene todos los elementos */}
      <g>
        {/* Outer gold ring with glow effect when hovered */}
        <circle 
          cx={center} 
          cy={center} 
          r={outerRingRadius} 
          fill="url(#spinButtonGold)"
          stroke={outerStroke}
          strokeWidth="1.5"
          filter={isHover ? "url(#buttonGlow)" : "none"}
        />

        {/* Inner red button */}
        <circle 
          cx={center} 
          cy={center} 
          r={innerCircleRadius} 
          fill="url(#redGlossy)" 
          stroke={innerStroke} 
          strokeWidth={isPress ? 2 : 3.5}
        />

        {/* Texto GIRAR */}
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#FFFFFF"
          fontFamily="Arial, sans-serif"
          fontWeight="bold"
          fontSize={`${24 * scale}px`}
          filter="url(#arrowShadow)"
          style={{
            textShadow: '0 0 3px rgba(255,255,255,0.7)'
          }}
        >
          GIRAR
        </text>
      </g>
      
      {/* Efecto pulsante para llamar la atención */}
      {isHover && !isPress && (
        <circle 
          cx={center} 
          cy={center} 
          r={outerRingRadius + 5} 
          fill="none" 
          stroke="#FFD700" 
          strokeWidth="2" 
          opacity="0.8"
          style={{
            animation: 'pulse 1.5s infinite',
          }}
        >
          <animate 
            attributeName="r" 
            values={`${outerRingRadius + 2};${outerRingRadius + 6};${outerRingRadius + 2}`} 
            dur="1.5s" 
            repeatCount="indefinite" 
          />
          <animate 
            attributeName="opacity" 
            values="0.8;0.4;0.8" 
            dur="1.5s" 
            repeatCount="indefinite" 
          />
        </circle>
      )}
    </svg>
      </div>
    </div>
  );
};

export default SpinButton;
