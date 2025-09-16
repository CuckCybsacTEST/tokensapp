"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

export interface RouletteElement {
  prizeId: string;
  label: string;
  color: string | null;
  count: number; // remaining weight
}

export interface SpinResult {
  chosen: { prizeId: string; label: string; color: string | null; tokenId?: string | null };
  order: number;
  finished: boolean;
  remaining: { prizeId: string; count: number; label: string; color: string | null }[];
}

interface Props {
  elements: RouletteElement[]; // remaining elements (weights current)
  onSpin: () => Promise<SpinResult>;
  spinning: boolean;
  history: { order: number; prizeId: string; label?: string; tokenId?: string|null }[];
  onSpinEnd?: (res: SpinResult) => void;
  disabled?: boolean;
}

// Helper to build path d attribute for a circular segment
function buildSegmentPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const toXY = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  const p1 = toXY(startAngle);
  const p2 = toXY(endAngle);
  return `M ${cx} ${cy} L ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArc} 1 ${p2.x} ${p2.y} Z`;
}

export const RouletteWheel: React.FC<Props> = ({ elements, onSpin, spinning, history, onSpinEnd, disabled }) => {
  const total = useMemo(() => elements.reduce((a, e) => a + e.count, 0), [elements]);
  const [rotation, setRotation] = useState(0);
  const baseTurns = 5; // vueltas completas para animación
  const [pendingResult, setPendingResult] = useState<SpinResult | null>(null);
  const animRef = useRef<HTMLDivElement | null>(null);
  const [localSpinning, setLocalSpinning] = useState(false);

  // Construir segmentos de tamaño uniforme (independiente del peso)
  const segments = useMemo(() => {
    const n = elements.length;
    if (n === 0) return [] as (RouletteElement & { start: number; end: number; mid: number })[];
    const step = 360 / n;
    return elements.map((e, idx) => {
      const start = idx * step;
      const end = start + step;
      const mid = start + step / 2;
      return { ...e, start, end, mid };
    });
  }, [elements]);

  async function handleSpin() {
    if (localSpinning || spinning || disabled || elements.length === 0 || total === 0) return;
    setLocalSpinning(true);
    try {
      const res = await onSpin();
      // Encontrar segmento elegido (puede que ya no esté si count quedaba 1 y se eliminó, usar res.chosen)
      const seg = segments.find((s) => s.prizeId === res.chosen.prizeId);
      let midAngle = 0;
      if (seg) {
        midAngle = seg.mid;
      } else {
        // reconstruir midAngle proporcional si no está: distribuir uniformemente
        midAngle = 0; // fallback -> no girar raro
      }
      // Queremos que el puntero (arriba 0°) caiga en midAngle => rotamos para llevar midAngle a 0 => + (360 - midAngle)
  // Normalizar para que la rotación final modulo 360 sea exactamente (360 - midAngle)
  const currentMod = ((rotation % 360) + 360) % 360;
  const desiredMod = (360 - midAngle) % 360;
  const delta = (desiredMod - currentMod + 360) % 360; // ajuste mínimo positivo
  const target = rotation + baseTurns * 360 + delta;
      setPendingResult(res);
      requestAnimationFrame(() => setRotation(target));
    } catch (e) {
      setLocalSpinning(false);
    }
  }

  useEffect(() => {
    if (!pendingResult) return;
    const el = animRef.current;
    if (!el) return;
    function onEnd() {
      if (pendingResult) {
        onSpinEnd?.(pendingResult);
      }
      setPendingResult(null);
      setLocalSpinning(false);
    }
    el.addEventListener("transitionend", onEnd, { once: true });
    return () => {
      el.removeEventListener("transitionend", onEnd as any);
    };
  }, [pendingResult, onSpinEnd]);

  const size = 320;
  const r = size / 2 - 4;
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <div
          ref={animRef}
          className="transition-[transform] ease-out duration-[3000ms] will-change-transform"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            role="img"
            aria-label="Ruleta de premios"
          >
            <circle cx={size / 2} cy={size / 2} r={r} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={2} />
            {segments.map((s, idx) => (
              <path
                key={s.prizeId}
                d={buildSegmentPath(size / 2, size / 2, r, s.start - 90, s.end - 90)}
                fill={s.color || "#94a3b8"}
                stroke="#0f172a"
                strokeWidth={0.5}
                opacity={segments.length === 1 ? 1 : 0.92}
              >
                <title>{`${s.label} (${s.count})`}</title>
              </path>
            ))}
            {segments.map((s) => {
              const angle = ((s.start + s.end) / 2) - 90; // center text
              const rad = (angle * Math.PI) / 180;
              const tr = r * 0.55;
              const x = size / 2 + tr * Math.cos(rad);
              const y = size / 2 + tr * Math.sin(rad);
              return (
                <text
                  key={s.prizeId + "-label"}
                  x={x}
                  y={y}
                  fontSize={Math.max(10, Math.min(14, 180 / segments.length))}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#0f172a"
                  style={{ pointerEvents: "none" }}
                >
                  {s.label.slice(0, 14)}
                </text>
              );
            })}
          </svg>
        </div>
        {/* Pointer */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2">
          <div className="h-0 w-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-amber-500 drop-shadow" />
        </div>
      </div>
      <button
        onClick={handleSpin}
        disabled={localSpinning || spinning || disabled || total === 0}
        className="btn"
      >
        {localSpinning ? "Girando…" : "Girar"}
      </button>
      <div className="text-xs text-slate-500">
        {total} restantes | elementos: {elements.length}
      </div>
      {/* Lista accesible de segmentos */}
      {segments.length > 0 && (
        <ul className="sr-only" aria-label="Segmentos de la ruleta">
          {segments.map(s => (
            <li key={s.prizeId}>{s.label}: {s.count} restantes</li>
          ))}
        </ul>
      )}
      {history.length > 0 && (
        <ol className="mt-2 max-h-40 w-full overflow-auto rounded border border-slate-200 p-2 text-xs dark:border-slate-600">
          {history.map((h) => (
            <li key={h.order} className="flex items-center justify-between py-0.5">
              <span className="font-mono">#{h.order}</span>
              <span className="truncate max-w-[140px]" title={h.label || h.prizeId}>{h.label || h.prizeId.slice(0,8)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

export default RouletteWheel;
