"use client";

import { useEffect } from "react";

const FOOTER_POLL_INTERVAL_MS = 80; // frecuencia de polling para detectar overlay

export default function FooterGate() {
  useEffect(() => {
    const footer = document.querySelector<HTMLElement>(".roulette-footer");
    if (!footer) return;

    const applyResidualScrollGuard = () => {
      const body = document.body;
      const html = document.documentElement;
      const bodyOverflow = body.scrollHeight - window.innerHeight;
      const htmlOverflow = html.scrollHeight - window.innerHeight;
      const hasOnlyPhantomOverflow = bodyOverflow > 0 && bodyOverflow <= 2 && htmlOverflow <= 0;
      body.style.overflowY = hasOnlyPhantomOverflow ? "hidden" : "auto";
    };

    // Garantizar oculto al hidratar
    footer.style.display = "none";

    const check = () => !document.querySelector(".roulette-loading-overlay");

    let rafId = 0;
    let timer: number | null = null;

    const tick = () => {
      if (check()) {
        // Mostrar cuando no exista overlay de loader
        footer.style.display = "";
        applyResidualScrollGuard();
        if (timer) window.clearInterval(timer);
        return;
      }
    };

    // Polling ligero mientras loader exista
    timer = window.setInterval(tick, FOOTER_POLL_INTERVAL_MS);

    // Fallback por si se paga muy rápido
    rafId = window.requestAnimationFrame(tick);
    window.addEventListener("resize", applyResidualScrollGuard);

    return () => {
      if (timer) window.clearInterval(timer);
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", applyResidualScrollGuard);
      document.body.style.overflowY = "";
    };
  }, []);

  return null;
}
