import React, { useMemo } from 'react';
import { RouletteElement } from './types';

interface RouletteSegmentsProps {
  elements: RouletteElement[];
  radius: number;
  center: number;
  scale?: number; // escala relativa al tamaño base 500px
}

// Heurística para dividir texto en líneas equilibradas (hasta 3 líneas para textos largos)
function splitLabel(label: string): string[] {
  const clean = label.trim().replace(/\s+/g, ' ');
  if (clean.length <= 8) return [clean];
  // Si hay precio en soles, separa la parte de precio
  const solMatch = clean.match(/(.*?)(\s+S\/.*)/);
  if (solMatch) {
    // Agrupar conectores con la palabra siguiente
    const beforePrice = solMatch[1].trim();
    const price = solMatch[2].trim();
    const connectorWordRegex = /\s+(\+|&|\*|\/|,)\s+/g;
    let parts = [];
    let lastIndex = 0;
    let match;
    const regex = /\s+(\+|&|\*|\/|,)\s+/g;
    while ((match = regex.exec(beforePrice)) !== null) {
      const prev = beforePrice.slice(lastIndex, match.index).trim();
      const connector = match[1];
      lastIndex = regex.lastIndex;
      const nextSpace = beforePrice.indexOf(' ', lastIndex);
      let nextWord;
      if (nextSpace === -1) {
        nextWord = beforePrice.slice(lastIndex).trim();
        lastIndex = beforePrice.length;
      } else {
        nextWord = beforePrice.slice(lastIndex, nextSpace).trim();
        lastIndex = nextSpace;
      }
      if (prev) parts.push(prev);
      parts.push(connector + ' ' + nextWord);
    }
    if (lastIndex < beforePrice.length) {
      const rest = beforePrice.slice(lastIndex).trim();
      if (rest) parts.push(rest);
    }
    return [...parts, price];
  }
  // Agrupar conectores con la palabra siguiente
  const connectorWordRegex = /\s+(\+|&|\*|\/|,)\s+/g;
  let parts = [];
  let lastIndex = 0;
  let match;
  const regex = /\s+(\+|&|\*|\/|,)\s+/g;
  while ((match = regex.exec(clean)) !== null) {
    const prev = clean.slice(lastIndex, match.index).trim();
    const connector = match[1];
    lastIndex = regex.lastIndex;
    const nextSpace = clean.indexOf(' ', lastIndex);
    let nextWord;
    if (nextSpace === -1) {
      nextWord = clean.slice(lastIndex).trim();
      lastIndex = clean.length;
    } else {
      nextWord = clean.slice(lastIndex, nextSpace).trim();
      lastIndex = nextSpace;
    }
    if (prev) parts.push(prev);
    parts.push(connector + ' ' + nextWord);
  }
  if (lastIndex < clean.length) {
    const rest = clean.slice(lastIndex).trim();
    if (rest) parts.push(rest);
  }
  // Si hay al menos 3 partes, forzar 3 líneas
  if (parts.length >= 3) {
    return parts;
  }
  // Si el texto es muy largo, dividir en 3 líneas aunque tenga pocas palabras
  if (clean.length > 22) {
    if (parts.length >= 2) {
      const third = Math.ceil(parts.length / 3);
      const l1 = parts.slice(0, third).join(' ');
      const l2 = parts.slice(third, 2 * third).join(' ');
      const l3 = parts.slice(2 * third).join(' ');
      return [l1, l2, l3];
    } else {
      const mid1 = Math.floor(clean.length / 3);
      const mid2 = Math.floor(2 * clean.length / 3);
      return [clean.slice(0, mid1), clean.slice(mid1, mid2), clean.slice(mid2)];
    }
  }
  // De lo contrario, 2 líneas como antes
  let best: { lines: string[]; score: number } | null = null;
  const wordParts = clean.split(' ');
  for (let i = 1; i < wordParts.length; i++) {
    const l1 = wordParts.slice(0, i).join(' ');
    const l2 = wordParts.slice(i).join(' ');
    const diff = Math.abs(l1.length - l2.length);
    const longest = Math.max(l1.length, l2.length);
    const score = diff + longest * 0.15;
    if (!best || score < best.score) best = { lines: [l1, l2], score };
  }
  return best ? best.lines : [clean];
}

const RouletteSegmentsComp = ({ elements, radius, center, scale = 1 }: RouletteSegmentsProps) => {
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
        // Usar labelLines del backend si está disponible, sino dividir localmente
        let lines: string[];
        if (element.labelLines && element.labelLines.length > 0) {
          lines = element.labelLines;
        } else {
          lines = splitLabel(rawLabel.toUpperCase());
        }
        // Font-size dinámico: base 12 * scale, pero reforzado para móviles (scale<0.8)
  const baseFs = 13 * scale; // aumentado de 12 a 13 para mejor legibilidad
        const fontSize = baseFs < 11 ? 11 : baseFs; // mínimo
        // Reducir fontSize para más líneas para encajar mejor
        let lineFs;
        if (lines.length === 4 || lines.length === 3) {
          lineFs = fontSize * 0.75;
        } else if (lines.length === 2) {
          lineFs = fontSize * 0.9;
        } else {
          lineFs = fontSize;
        }
  // Espaciado más generoso para 3 líneas
  const lineSpacing = lines.length > 2 ? lineFs * 1.15 : lineFs * 0.95;
        
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
              textShadow: "0 0 2px rgba(0,0,0,0.65)",
            }}
          >
            {lines.map((ln, idx) => {
              let dyValue: string;
              if (lines.length === 1) {
                dyValue = '0';
              } else if (lines.length === 2) {
                dyValue = idx === 0 ? `-${lineSpacing * 0.4}` : `${lineSpacing * 0.8}`;
              } else if (lines.length === 4) {
                if (idx === 0) dyValue = `-${lineSpacing * 0.3}`;
                else if (idx === 1) dyValue = `${lineSpacing * 1.0}`;
                else if (idx === 2) dyValue = `${lineSpacing * 2.0}`;
                else dyValue = `${lineSpacing * 3.0}`;
              } else { // 3 líneas
                if (idx === 0) dyValue = `-${lineSpacing * 0.55}`;
                else if (idx === 1) dyValue = `${lineSpacing * 0.7}`;
                else dyValue = `${lineSpacing * 1.8}`;
              }
              return (
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
                    dy={dyValue}
                  >{ln}</tspan>
                </textPath>
              );
            })}
          </text>
        );
      })}
    </g>
  );
};

const RouletteSegments = React.memo(RouletteSegmentsComp, (prev, next) => {
  // Re-render solo si cambian los elementos o geometría clave
  if (prev.radius !== next.radius || prev.center !== next.center) return false;
  if (prev.scale !== next.scale) return false;
  if (prev.elements.length !== next.elements.length) return false;
  for (let i = 0; i < prev.elements.length; i++) {
    const a = prev.elements[i];
    const b = next.elements[i];
    if (a.label !== b.label || a.color !== b.color || a.prizeId !== b.prizeId) return false;
  }
  return true;
});

export default RouletteSegments;
