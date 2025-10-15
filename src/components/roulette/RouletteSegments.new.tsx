import React from 'react';
import { RouletteElement } from './types';

interface RouletteSegmentsProps {
  elements: RouletteElement[];
  radius: number;
  center: number;
  scale?: number; // escala relativa al tamaño base 500px
}

const RouletteSegmentsComp = ({ elements, radius, center, scale = 1 }: RouletteSegmentsProps) => {
  const totalElements = elements.length;
  const arcAngle = 360 / totalElements;
  const isSingle = totalElements === 1;

  const polarToCartesian = (centerX: number, centerY: number, r: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (r * Math.cos(angleInRadians)),
      y: centerY + (r * Math.sin(angleInRadians))
    };
  };

  const getArcPath = (index: number) => {
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

  return (
    <g>
      <defs>
        <linearGradient id="segmentBorderGold" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#FDEEAE" />
          <stop offset="50%" stopColor="#F0B825" />
          <stop offset="100%" stopColor="#B47C00" />
        </linearGradient>
      </defs>

      {isSingle ? (
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill={elements[0]?.color || '#CCCCCC'}
          stroke="url(#segmentBorderGold)"
          strokeWidth={3}
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
              strokeWidth={3}
              data-prize-id={element.prizeId}
              style={{ transition: 'fill 0.3s ease' }}
            />
          );
        })
      )}

      {elements.map((element, i) => {
        const segmentAngle = i * arcAngle + arcAngle / 2;
        const rawLabel = element.label || '';
        const sectorAngle = arcAngle;
        const textLength = rawLabel.length;

        // compute radiusRatio and base font
        let radiusRatio;
        if (sectorAngle < 36) {
          radiusRatio = 0.77;
        } else if (sectorAngle < 60) {
          radiusRatio = 0.73;
        } else if (textLength <= 12) {
          radiusRatio = 0.60 + (textLength / 12) * 0.04;
        } else if (textLength <= 20) {
          radiusRatio = 0.65 + ((textLength - 12) / 8) * 0.04;
        } else {
          radiusRatio = 0.70 + Math.min((textLength - 20) * 0.01, 0.03);
        }

        const paddingPx = Math.max(12, Math.min(18, radius * 0.035));
        const textRadius = (radius * radiusRatio) - paddingPx;
        const finalTextRadius = Math.max(radius * 0.48, textRadius);

        const baseFontSize = 12 * scale;
        const sectorPenalty = sectorAngle < 50 ? 2.5 : sectorAngle < 70 ? 1.2 : 0;
        const lengthPenalty = Math.max(0, textLength - 15) * 0.03;
        const lineCountPenalty = 0; // we'll compute after lines
        let fontSize = Math.max(7, baseFontSize - lengthPenalty - lineCountPenalty - sectorPenalty);

        // lines from backend (fallback to rawLabel)
        let lines = Array.isArray(element.labelLines) && element.labelLines.length > 0
          ? element.labelLines
          : [rawLabel];

        // narrow sector: reduce to 2 lines
        if (sectorAngle < 30 && lines.length > 2) {
          lines = [lines[0], lines.slice(1).join(' ')];
        }

        // ensure we split very long lines
        const MAX_CHARS = 22;
        const splitLongLine = (l: string) => {
          if (l.length <= MAX_CHARS) return [l];
          const words = l.split(' ');
          if (words.length <= 1) return [l.slice(0, MAX_CHARS - 1) + '…'];
          const mid = Math.ceil(words.length / 2);
          return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
        };

        const expandedLines: string[] = [];
        for (const l of lines) {
          const parts = splitLongLine(l);
          for (const p of parts) expandedLines.push(p);
        }

        const displayLines = expandedLines;

        // recompute penalties after expansion
        const lcPenalty = (displayLines.length - 1) * 0.08;
        fontSize = Math.max(7, baseFontSize - lengthPenalty - lcPenalty - sectorPenalty);

        // compute lineSpacing
        let lineSpacing;
        if (sectorAngle < 36) {
          if (displayLines.length === 3) {
            fontSize = Math.max(6, fontSize * 0.92);
            lineSpacing = fontSize * 2.6;
          } else if (displayLines.length === 2) {
            fontSize = Math.max(7, fontSize * 0.95);
            lineSpacing = fontSize * 1.95;
          } else {
            lineSpacing = fontSize * 1.3;
          }
        } else if (sectorAngle < 60) {
          if (displayLines.length === 3) {
            fontSize = Math.max(7, fontSize * 0.95);
            lineSpacing = fontSize * 2.0;
          } else if (displayLines.length === 2) {
            lineSpacing = fontSize * 1.7;
          } else {
            lineSpacing = fontSize * 1.18;
          }
        } else {
          if (displayLines.length === 3) {
            lineSpacing = fontSize * 1.8;
          } else if (displayLines.length === 2) {
            lineSpacing = fontSize * 1.6;
          } else {
            lineSpacing = fontSize * 1.15;
          }
        }

        // adjusted spacing baseline
        let adjustedLineSpacing = Math.max(lineSpacing, fontSize * 1.4);
        if (displayLines.length === 3) adjustedLineSpacing = Math.max(adjustedLineSpacing, fontSize * 2.4);
        if (displayLines.length === 2) adjustedLineSpacing = Math.max(adjustedLineSpacing, fontSize * 1.5);

        // radial placement
        const extraPadding = fontSize * 0.18;
        let radialMultiplier = 1;
        if (displayLines.length === 3) radialMultiplier = sectorAngle < 50 ? 1.8 : 1.45;
        if (displayLines.length === 2) radialMultiplier = sectorAngle < 40 ? 1.3 : 1.1;

        const maxIndex = Math.max(0, displayLines.length - 1);
        const maxRadialOffset = maxIndex * adjustedLineSpacing * radialMultiplier + extraPadding * maxIndex;
        const minR = radius * 0.28;
        let finalTextRadiusAdjusted = finalTextRadius;
        const innerMost = finalTextRadius - maxRadialOffset;
        if (innerMost < minR) {
          finalTextRadiusAdjusted = finalTextRadius + (minR - innerMost);
        }

        // flip for bottom half for rotation only
        const shouldFlip = segmentAngle > 90 && segmentAngle < 270;

        // build text nodes
        const textNodes = displayLines.map((line, lineIndex) => {
          const radialOffset = lineIndex * adjustedLineSpacing * radialMultiplier + extraPadding * lineIndex;
          const r = finalTextRadiusAdjusted - radialOffset;
          const pos = polarToCartesian(center, center, r, segmentAngle);
          const bisectorAngle = segmentAngle - 90;
          const finalRotation = shouldFlip ? bisectorAngle + 180 : bisectorAngle;

          if (typeof window !== 'undefined' && (rawLabel.length > 10 || displayLines.length > 1)) {
            console.debug('[roulette-debug] linePos', i, lineIndex, { line, r, radialOffset, finalTextRadiusAdjusted, minR });
          }

          return (
            <text
              key={`label-${i}-${lineIndex}`}
              x={pos.x}
              y={pos.y}
              fill="white"
              fontSize={fontSize}
              fontWeight="900"
              letterSpacing="0"
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${finalRotation} ${pos.x} ${pos.y})`}
              style={{ pointerEvents: 'none', textTransform: 'uppercase', textShadow: '0 0 2px rgba(0,0,0,0.7)' }}
            >
              {line}
            </text>
          );
        });

        return (
          <g key={`label-group-${i}`}>
            <title>{rawLabel}</title>
            {textNodes}
          </g>
        );
      })}
    </g>
  );
};

const RouletteSegments = React.memo(RouletteSegmentsComp, (prev, next) => {
  if (prev.radius !== next.radius || prev.center !== next.center) return false;
  if (prev.scale !== next.scale) return false;
  if (prev.elements.length !== next.elements.length) return false;
  for (let i = 0; i < prev.elements.length; i++) {
    const a = prev.elements[i];
    const b = next.elements[i];
    if (a.label !== b.label || a.color !== b.color || a.prizeId !== b.prizeId) return false;
    if (JSON.stringify(a.labelLines) !== JSON.stringify(b.labelLines)) return false;
  }
  return true;
});

export default RouletteSegmentsComp;
