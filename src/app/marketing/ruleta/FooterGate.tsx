"use client";

import { useEffect } from 'react';

export default function FooterGate() {
  useEffect(() => {
    const footer = document.querySelector<HTMLElement>('.roulette-footer');
    if (!footer) return;

    // Garantizar oculto al hidratar
    footer.style.display = 'none';

    const check = () => !document.querySelector('.roulette-loading-overlay');

    let rafId = 0;
    let timer: number | null = null;

    const tick = () => {
      if (check()) {
        // Mostrar cuando no exista overlay de loader
        footer.style.display = '';
        if (timer) window.clearInterval(timer);
        return;
      }
    };

    // Polling ligero mientras loader exista
    timer = window.setInterval(tick, 80);

    // Fallback por si se paga muy rápido
    rafId = window.requestAnimationFrame(tick);

    return () => {
      if (timer) window.clearInterval(timer);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return null;
}
