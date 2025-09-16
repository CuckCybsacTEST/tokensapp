import React from 'react';
import { RouletteElement } from './types';

interface RouletteSegmentsProps {
  elements: RouletteElement[];
  radius: number;
  center: number;
}

const RouletteSegments = ({ elements, radius, center }: RouletteSegmentsProps) => {
  const totalElements = elements.length;
  const arcAngle = 360 / totalElements;
  const isSingle = totalElements === 1;

  // Función para calcular el path del segmento
  const getArcPath = (index: number) => {
    const startAngle = index * arcAngle;
    const endAngle = startAngle + arcAngle;

    const start = polarToCartesian(center, center, radius, endAngle);
    const end = polarToCartesian(center, center, radius, startAngle);

    // Para segmentos mayores a 180° debemos usar largeArcFlag=1; para pequeños, 0
    // En el caso especial de 360° (sólo un elemento), devolvemos null y tratamos aparte
    if (arcAngle >= 360) return null;
    const largeArcFlag = arcAngle > 180 ? "1" : "0";

    return [
      "M", center, center,
      "L", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      "Z"
    ].join(" ");
  };

  // Función para convertir coordenadas polares a cartesianas
  const polarToCartesian = (centerX: number, centerY: number, r: number, angleInDegrees: number) => {
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
          strokeWidth={3.5}
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
              strokeWidth="3.5"
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
          const pathRadius = radius * 0.75; // Aumentado para darle más espacio al texto
          
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
        
        return (
          <text
            key={`label-${i}`}
            fill="white"
            fontSize="12"
            fontWeight="900"
            letterSpacing="0.6"
            style={{
              pointerEvents: "none",
              textTransform: "uppercase",
              textShadow: "0px 0px 3px rgba(0,0,0,0.8)",
            }}
          >
            <textPath 
              href={`#${pathId}`} 
              startOffset={startOffset} 
              textAnchor="middle"
              // Si el texto necesita voltearse, lo rotamos 180 grados para que se lea correctamente
              style={{
                dominantBaseline: "middle",
                transform: needsFlip ? "rotate(180deg)" : "none",
                transformOrigin: "center",
                transformBox: "fill-box"
              }}
            >
              {element.label}
            </textPath>
          </text>
        );
      })}
    </g>
  );
};

export default RouletteSegments;
