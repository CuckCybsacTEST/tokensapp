import React, { useMemo } from 'react';
import { RouletteElement } from './types';

interface RouletteSegmentsProps {
  elements: RouletteElement[];
  radius: number;
  center: number;
  scale?: number; // escala relativa al tamaño base 500px
}

// Heurística para dividir texto en dos líneas equilibradas
function splitLabel(label: string): string[] {
  const clean = label.trim().replace(/\s+/g, ' ');
  if (clean.length <= 8) return [clean];
  const parts = clean.split(' ');
  if (parts.length === 1) {
    // Palabra muy larga: cortar por la mitad aproximada
    const mid = Math.ceil(clean.length / 2);
    return [clean.slice(0, mid), clean.slice(mid)];
  }
  // Intentar todas las particiones y elegir la más balanceada por longitud
  let best: { lines: string[]; score: number } | null = null;
  for (let i = 1; i < parts.length; i++) {
    const l1 = parts.slice(0, i).join(' ');
    const l2 = parts.slice(i).join(' ');
    const diff = Math.abs(l1.length - l2.length);
    const longest = Math.max(l1.length, l2.length);
    // Penalizar líneas muy disparejas o una línea demasiado larga
    const score = diff + longest * 0.15;
    if (!best || score < best.score) best = { lines: [l1, l2], score };
  }
  return best ? best.lines : [clean];
}

const RouletteSegments = ({ elements, radius, center, scale = 1 }: RouletteSegmentsProps) => {
  const totalElements = elements.length;
  const arcAngle = 360 / totalElements;
  const isSingle = totalElements === 1;

  // Función para calcular el path del segmento
  const getArcPath = (index: number) => {
    // Dibujamos cada sector como un anillo desde el centro exacto
    const startAngle = index * arcAngle;
    const endAngle = startAngle + arcAngle;
    if (arcAngle >= 360) return null;
    const largeArcFlag = arcAngle > 180 ? '1' : '0';
    const start = polarToCartesian(center, center, radius, endAngle);
    const end = polarToCartesian(center, center, radius, startAngle);
    return [
      'M', center, center,
      'L', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      'Z'
    ].join(' ');
  };

  // Función para convertir coordenadas polares a cartesianas
  const polarToCartesian = (centerX: number, centerY: number, r: number, angleInDegrees: number) => {
    // Restamos 90 grados para que el ángulo 0 esté en la parte superior
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (r * Math.cos(angleInRadians)),
      y: centerY + (r * Math.sin(angleInRadians))
    };
  };

  // Función para calcular la posición del texto (mantener por compatibilidad)
  const getTextPosition = (index: number) => {
    // Posicionamos el texto en el medio del segmento
    const angle = (index * arcAngle + arcAngle / 2);
    // Usamos un radio menor para que el texto esté dentro del segmento
    const r = radius * 0.65;
    const position = polarToCartesian(center, center, r, angle);
    
    return {
      x: position.x,
      y: position.y,
      rotation: angle
    };
  };

  return (
    <g>
      <defs>
        <linearGradient id="segmentBorderGold" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#FDEEAE" />
          <stop offset="50%" stopColor="#F0B825" />
          <stop offset="100%" stopColor="#B47C00" />
        </linearGradient>
      </defs>

      {/* Dibuja los segmentos */}
      {isSingle ? (
        // Un solo elemento: dibujar un círculo completo como segmento
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill={elements[0]?.color || '#CCCCCC'}
          stroke="url(#segmentBorderGold)"
          strokeWidth={3} /* Igual que la base */
          data-prize-id={elements[0]?.prizeId}
        />
      ) : (
        elements.map((element, i) => {
          const d = getArcPath(i);
          if (!d) return null;
          return (
            <path
              key={`segment-${i}`}
              d={d}
              fill={element.color || '#CCCCCC'}
              stroke="url(#segmentBorderGold)"
              strokeWidth={3} /* Igual que la base */
              data-prize-id={element.prizeId}
              style={{ transition: 'fill 0.3s ease' }}
            />
          );
        })
      )}
      
      {/* Luego dibuja todas las etiquetas encima de los segmentos, usando un método mejorado */}
      <defs>
        {elements.map((_, i) => {
          const angle = i * arcAngle + arcAngle / 2;
          // Radio para el path del texto, ajustado para que quede en el medio del segmento
          const pathRadius = radius * 0.75; // ya proporcional al radio
          
          // Calculamos un arco más grande para acomodar mejor el texto
          const segmentSpan = Math.min(25, arcAngle * 0.75); // Aumentamos el span para textos más largos
          const startAngle = angle - segmentSpan;
          const endAngle = angle + segmentSpan;
          
          const startPoint = polarToCartesian(center, center, pathRadius, startAngle);
          const endPoint = polarToCartesian(center, center, pathRadius, endAngle);
          
          // Crear un path curvo para el texto
          const pathId = `textPath-${i}`;
          
          // Para textos en la parte superior de la ruleta (entre 90° y 270°)
          // invertimos la dirección para que se lean correctamente
          const needsFlip = angle > 90 && angle < 270;
          
          // Creamos un arco más suave
          const largeArcFlag = 0; // Siempre usar arco pequeño
          const sweepFlag = needsFlip ? 0 : 1; // Cambiar dirección según posición
          
          return (
            <path
              key={pathId}
              id={pathId}
              d={`M ${needsFlip ? endPoint.x : startPoint.x} ${needsFlip ? endPoint.y : startPoint.y} 
                 A ${pathRadius} ${pathRadius} 0 ${largeArcFlag} ${sweepFlag} ${needsFlip ? startPoint.x : endPoint.x} ${needsFlip ? startPoint.y : endPoint.y}`}
              fill="none"
            />
          );
        })}
      </defs>
      
      {/* Dibujar los textos siguiendo los paths curvos */}
      {elements.map((element, i) => {
        const angle = i * arcAngle + arcAngle / 2;
        const pathId = `textPath-${i}`;
        
        // Para textos en la parte superior, invertimos la orientación
        const needsFlip = angle > 90 && angle < 270;
        
        // Siempre centrar el texto en el path
        const startOffset = "50%";
        const rawLabel = element.label || '';
        const lines = splitLabel(rawLabel.toUpperCase());
        // Font-size dinámico: base 12 * scale, pero reforzado para móviles (scale<0.8)
  const baseFs = 13 * scale; // aumentado de 12 a 13 para mejor legibilidad
        const fontSize = baseFs < 11 ? 11 : baseFs; // mínimo
        // Si hay dos líneas, reducimos ligeramente para encajar
        const lineFs = lines.length > 1 ? fontSize * 0.9 : fontSize;
        const lineSpacing = lineFs * 0.95; // proximidad entre líneas
        
        return (
          <text
            key={`label-${i}`}
            fill="white"
            fontSize={lineFs}
            fontWeight="900"
            letterSpacing="0.6"
            style={{
              pointerEvents: "none",
              textTransform: "uppercase",
              textShadow: "0px 0px 3px rgba(0,0,0,0.8)",
            }}
          >
            {lines.map((ln, idx) => (
              <textPath
                key={idx}
                href={`#${pathId}`}
                startOffset={startOffset}
                textAnchor="middle"
                style={{
                  dominantBaseline: 'middle',
                  transform: needsFlip ? 'rotate(180deg)' : 'none',
                  transformOrigin: 'center',
                  transformBox: 'fill-box'
                }}
              >
                <tspan
                  x="0"
                  dy={idx === 0 ? (lines.length > 1 ? `-${lineSpacing * 0.4}` : '0') : `${lineSpacing * 0.8}`}
                >{ln}</tspan>
              </textPath>
            ))}
          </text>
        );
      })}
    </g>
  );
};

export default RouletteSegments;
