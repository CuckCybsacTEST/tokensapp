import React, { useMemo } from 'react';
import { RouletteElement } from './types';
import { ThemeName } from '@/lib/themes/types';
import { useRouletteTheme } from '@/lib/themes/useRouletteTheme';

interface RouletteSegmentsProps {
  elements: RouletteElement[];
  radius: number;
  center: number;
  scale?: number; // escala relativa al tamaño base 500px
  theme?: ThemeName;
}

// Helper para dividir texto en líneas balanceadas (soporta hasta 5 líneas)
function splitTextBalanced(text: string, maxLines: number = 2): string[] {
    const words = text.split(' ');
    if (words.length <= 1) return [text];
    
    // Si pedimos más líneas de las que hay en palabras, devolvemos palabras
    if (maxLines >= words.length) return words;

    // Algoritmo de balanceo por longitud de caracteres
    const totalLen = text.length;
    const targetLen = totalLen / maxLines;
    
    const lines: string[] = [];
    let currentLine: string[] = [];
    let currentLen = 0;
    
    // Formar las primeras (maxLines - 1) líneas
    let wordIdx = 0;
    while (lines.length < maxLines - 1 && wordIdx < words.length) {
        const word = words[wordIdx];
        const nextLen = currentLen + (currentLine.length > 0 ? 1 : 0) + word.length;
        
        // Decidir si agregar la palabra o saltar de línea
        // Si ya tenemos contenido y agregar la palabra se pasa mucho del target...
        if (currentLine.length > 0 && Math.abs(nextLen - targetLen) > Math.abs(currentLen - targetLen)) {
            // Mejor cerrar la línea aquí
            lines.push(currentLine.join(' '));
            currentLine = [];
            currentLen = 0;
            // No incrementamos wordIdx para procesarla en la siguiente línea
        } else {
            currentLine.push(word);
            currentLen += (currentLine.length > 0 ? 1 : 0) + word.length;
            wordIdx++;
        }
    }
    
    // El resto va a la última línea
    const rest = words.slice(wordIdx).join(' ');
    if (currentLine.length > 0 && rest) {
         // Si quedó algo en buffer, unirl y meter a rest (caso borde) - Simplificación:
         // Simplemente lo metemos como línea separada si el buffer tenía cosas?
         // No, el loop de arriba vacía a `lines`.
         // Si currentLine tiene cosas pero no se pushearon:
         // Deberíamos consolidar. 
         // En estrategia simple: push currentLineJoin + rest
         if (rest) {
             if (currentLine.length > 0) lines.push(currentLine.join(' ')); 
             lines.push(rest);
         } else {
             if (currentLine.length > 0) lines.push(currentLine.join(' '));
         }
    } else if (rest) {
        lines.push(rest);
    } else if (currentLine.length > 0) {
        lines.push(currentLine.join(' '));
    }

    // Unir si resultaron más líneas de las pedidas (por edge cases en loop)
    while (lines.length > maxLines) {
        // Unir las dos más cortas consecutivas? Simplificado: unir ultimas dos
        const last = lines.pop();
        const prev = lines.pop();
        if (prev && last) lines.push(prev + ' ' + last);
    }

    return lines;
}

// Heurística para dividir texto en líneas equilibradas
function splitLabel(label: string): string[] {
  const clean = label.trim().replace(/\s+/g, ' ');
  if (clean.length <= 10) return [clean];

  // Si hay precio en soles, separa la parte de precio de forma inteligente
  const solMatch = clean.match(/(.*?)(\s+S\/.*)/);
  if (solMatch) {
    let beforePrice = solMatch[1].trim();
    const price = solMatch[2].trim();
    
    // Si la parte anterior es larga, dividirla
    if (beforePrice.length > 35) { // Muy largo
       return [...splitTextBalanced(beforePrice, 3), price];
    }
    if (beforePrice.length > 15) {
       return [...splitTextBalanced(beforePrice, 2), price];
    }
    return [beforePrice, price];
  }
  
  // Detectar conectores explícitos (+)
  if (clean.includes('+')) {
      const parts = clean.split('+').map(p => p.trim());
      // Si alguna parte es muy larga, subdividir
      const finalLines: string[] = [];
      parts.forEach((p, idx) => {
          const prefix = idx > 0 ? '+ ' : '';
          const pWithPrefix = prefix + p;
          if (pWithPrefix.length > 18) {
              finalLines.push(...splitTextBalanced(pWithPrefix, 2));
          } else {
              finalLines.push(pWithPrefix);
          }
      });
      return finalLines;
  }

  // Fallback a división por longitud
  if (clean.length > 45) {
      return splitTextBalanced(clean, 4); // Hasta 4 líneas para textos muy largos
  } else if (clean.length > 30) {
      return splitTextBalanced(clean, 3);
  } else if (clean.length > 12) {
      return splitTextBalanced(clean, 2);
  }

  return [clean];
}

const RouletteSegmentsComp = ({ elements, radius, center, scale = 1, theme: propTheme }: RouletteSegmentsProps) => {
  // Usar el hook de tema para obtener la configuración
  const { theme: contextTheme, config } = useRouletteTheme();
  const theme = propTheme || contextTheme;
  const themeConfig = config;

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

        {/* Custom Gradients from Theme */}
        {themeConfig?.roulette?.segments?.customGradients?.map((grad) => (
          <linearGradient 
            key={grad.id} 
            id={grad.id} 
            x1="0" y1="0" x2="1" y2="1" 
            gradientTransform={grad.rotate ? `rotate(${grad.rotate})` : undefined}
          >
            {grad.stops.map((stop, idx) => (
              <stop key={idx} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
        ))}
      </defs>

      {/* Dibuja los segmentos */}
      {isSingle ? (
        // Un solo elemento: dibujar un círculo completo como segmento
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill={themeConfig?.roulette?.segments?.palette[0] || (elements[0]?.color || '#CCCCCC')}
          stroke="url(#segmentBorderGold)"
          strokeWidth={3} /* Igual que la base */
          data-prize-id={elements[0]?.prizeId}
        />
      ) : (
        elements.map((element, i) => {
          const d = getArcPath(i);
          if (!d) return null;
          const segmentColor = themeConfig?.roulette?.segments?.palette[i % (themeConfig?.roulette?.segments?.palette?.length || 7)] || (element.color || '#CCCCCC');
          return (
            <path
              key={`segment-${i}`}
              d={d}
              fill={segmentColor}
              stroke="url(#segmentBorderGold)"
              strokeWidth={3} /* Igual que la base */
              data-prize-id={element.prizeId}
              style={{ transition: 'fill 0.3s ease' }}
            />
          );
        })
      )}
      
      {/* Dibujar los textos en orientación radial (rectos) */}
      {elements.map((element, i) => {
        const angle = i * arcAngle + arcAngle / 2;
        // Text position at proportional radius
        // Center button is roughly 30%. Outer edge 100%. Safe zone 35-95%. Center ~65%.
        const r = radius * 0.65; 
        const { x, y } = polarToCartesian(center, center, r, angle);

        // Logic to rotate text to be radial
        // Angle 0 is Up.
        // Right side (0-180): Read center->out. Rotate = angle - 90.
        // Left side (180-360): Read out->center. Rotate = angle + 90.
        const normalizedAngle = angle % 360;
        const isRightSide = normalizedAngle >= 0 && normalizedAngle < 180;
        const rotate = isRightSide ? normalizedAngle - 90 : normalizedAngle + 90;

        const rawLabel = element.label || '';
        
        // Usar lógica de split o datos del backend
        let lines: string[];
        if (element.labelLines && element.labelLines.length > 0) {
          lines = element.labelLines;
        } else {
          lines = splitLabel(rawLabel.toUpperCase());
        }

        const baseFs = 13 * scale; 
        const fontSize = baseFs < 11 ? 11 : baseFs; 
        
        // Ajustamos tamaño de fuente según número de líneas y longitud
        // En modo radial, el ancho angular es limitante para la altura (stacking lines)
        // Y el radio es limitante para la longitud de cada línea.
        let lineFs = fontSize;
        const maxLineLength = Math.max(...lines.map(l => l.length));

        // Si es muy largo (>15 chars) y no se ha dividido suficiente, reducir fuente
        if (maxLineLength > 15) {
           lineFs = fontSize * 0.85;
        }
        if (maxLineLength > 20) {
           lineFs = fontSize * 0.75;
        }

        // Si hay muchas líneas, también reducir para que no invadan angularmente a los vecinos
        if (lines.length === 3) {
           lineFs = Math.min(lineFs, fontSize * 0.85);
        }
        if (lines.length >= 4) {
           lineFs = Math.min(lineFs, fontSize * 0.70);
        }

        const lineSpacing = lineFs * 1.1;

        return (
          <text
            key={`label-${i}`}
            x={x}
            y={y}
            fill="white"
            fontSize={lineFs}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(${rotate}, ${x}, ${y})`}
            style={{
              pointerEvents: "none",
              textTransform: "uppercase",
              textShadow: "0 0 3px rgba(0,0,0,0.8)", 
            }}
          >
            {lines.map((ln, idx) => {
               // Cálculo de posición vertical (dy) para centrado perfecto de bloque multilínea
               let dyValue: string | number = 0;
               
               if (idx === 0) {
                 if (lines.length === 1) {
                     dyValue = "0.35em"; // Ajuste óptico para 1 línea sola
                 } else {
                     // Calcular offset inicial para que el bloque de texto quede centrado en el punto (x,y)
                     const totalH = (lines.length - 1) * lineSpacing;
                     // Subimos la mitad de la altura total desde el centro
                     // Ajuste fino 0.3em para compensar la baseline
                     dyValue = -(totalH / 2) + (lineFs * 0.3);
                 }
               } else {
                 dyValue = lineSpacing;
               }

              return (
                <tspan
                  key={idx}
                  x={x}
                  dy={dyValue}
                >{ln}</tspan>
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
