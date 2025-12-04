import React, { useLayoutEffect, useRef, useState, useEffect } from 'react';

interface RouletteHeadingProps {
  kicker?: string;
  title: string;
  subtitle?: string;
  /** Callback con la altura total renderizada (px) para espaciar la ruleta */
  onHeight?: (h: number) => void;
  className?: string;
}

/**
 * Componente desacoplado del layout de la ruleta que expone su altura para permitir
 * que el contenedor de la rueda aplique un paddingTop exacto en móviles pequeños.
 */
const RouletteHeading: React.FC<RouletteHeadingProps> = ({ kicker, title, subtitle, onHeight, className }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setHeight(rect.height);
    onHeight?.(rect.height);
  }, [title, subtitle, kicker]);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const h = e.contentRect.height;
        if (Math.abs(h - height) > 1) {
          setHeight(h);
          onHeight?.(h);
        }
      }
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [height]);

  return (
    <div ref={ref} className={className}>
      {kicker && (
        <div className="text-[11px] tracking-[0.25em] font-semibold uppercase text-amber-300 mb-3 select-none text-center">
          {kicker}
        </div>
      )}
      <h1 className="font-extrabold leading-tight text-white text-balance text-center" style={{
        fontSize: 'clamp(2rem, 5vw, 2.75rem)'
      }}>
        {title}
      </h1>
      {subtitle && (
        <p className="mt-3 text-white/80 leading-relaxed text-pretty text-center" style={{
          fontSize: 'clamp(0.85rem, 2.4vw, 1.05rem)'
        }}>
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default RouletteHeading;
