import { useEffect, useState } from 'react';

/**
 * Calcula un offset vertical negativo para posicionar el puntero sobre la ruleta
 * de forma responsiva y SSR-safe. Se recalcula en resize con un debounce ligero.
 */
export function usePointerOffset(scale: number) {
  const [offset, setOffset] = useState<number>(() => -30 * scale);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let frame: number | null = null;
    const compute = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let base = -30 * scale; // default (ruedas medianas)
      // Desktop amplio: ligeramente más abajo (menos negativo)
      if (vw >= 1280) base = -26 * scale;
      // Rangos intermedios pequeños
      if (vw < 390 || vh < 660) base = -24 * scale; // pequeño
      if (vw < 360 || vh < 600) base = -22 * scale; // ultra pequeño (SE / muy bajo)
      setOffset(base);
    };
    compute();

    const handle = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(compute);
    };
    window.addEventListener('resize', handle);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('resize', handle);
    };
  }, [scale]);

  return offset;
}
