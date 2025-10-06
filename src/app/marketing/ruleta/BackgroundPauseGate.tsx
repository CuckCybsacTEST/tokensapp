"use client";

import { useEffect } from "react";

/**
 * Pausa las animaciones del fondo (DiscoBackground) durante 1 frame
 * cuando el loader overlay está presente, para evitar un reinicio visible.
 */
export default function BackgroundPauseGate() {
  useEffect(() => {
    // Si no hay overlay, nada que hacer
    const hasOverlay = () => !!document.querySelector(".roulette-loading-overlay");
    const pauseOnce = () => {
      const roots = Array.from(document.querySelectorAll<HTMLElement>('[data-disco-root="1"]'));
      if (!roots.length) return;
      roots.forEach((r) => r.setAttribute("data-disco-paused", "1"));
      // Dos rAF para garantizar que pase al menos un frame completo
      let id1 = 0,
        id2 = 0;
      id1 = requestAnimationFrame(() => {
        id2 = requestAnimationFrame(() => {
          roots.forEach((r) => r.removeAttribute("data-disco-paused"));
        });
      });
      return () => {
        cancelAnimationFrame(id1);
        cancelAnimationFrame(id2);
      };
    };

    let cleanup: (() => void) | undefined;

    if (hasOverlay()) {
      cleanup = pauseOnce() || undefined;
    } else {
      // Por si el overlay se pinta un pelín más tarde (SSR/CSR)
      const t = setTimeout(() => {
        if (hasOverlay()) cleanup = pauseOnce() || undefined;
      }, 30);
      return () => clearTimeout(t);
    }

    return () => {
      cleanup && cleanup();
    };
  }, []);

  return null;
}
