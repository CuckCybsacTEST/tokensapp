"use client";
import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// Importar identificadores centralizados
import { SECTIONS } from '../constants/sections';

export function MinimalNavButtons() {
  const prefersReducedMotion = useReducedMotion();
  // Lista estable de ids (del orden definido en constants)
  const sections = useMemo(() => SECTIONS.map(s => s.id), []);

  // Función auxiliar para buscar una sección por su índice
  const getSectionElement = (index: number) => {
    if (typeof document === 'undefined') return null;
    const sectionId = sections[index];
    return sectionId ? (document.getElementById(sectionId) as HTMLElement | null) : null;
  };

  const scrollToSection = (direction: 'up' | 'down') => {
    if (typeof window === 'undefined') return;
    const presentIds = sections.filter(id => !!document.getElementById(id));
    if (!presentIds.length) return;

    // Usamos un ancla al 50% del viewport para encontrar la sección actual,
    // y si no cae dentro de ninguna, caemos al centro más cercano.
    const anchor = window.scrollY + window.innerHeight * 0.5;
    let currentIndex = -1;
    for (const id of presentIds) {
      const el = document.getElementById(id)!;
      const top = el.offsetTop;
      const bottom = top + el.offsetHeight;
      if (anchor >= top && anchor < bottom) {
        currentIndex = sections.indexOf(id);
        break;
      }
    }
    if (currentIndex === -1) {
      let bestDist = Number.POSITIVE_INFINITY;
      presentIds.forEach((id) => {
        const el = document.getElementById(id)!;
        const center = el.offsetTop + el.offsetHeight / 2;
        const d = Math.abs(center - anchor);
        if (d < bestDist) { bestDist = d; currentIndex = sections.indexOf(id); }
      });
    }
    if (currentIndex === -1) return;

    const targetIndex =
      direction === 'up' ? Math.max(0, currentIndex - 1) : Math.min(sections.length - 1, currentIndex + 1);

    const targetElement = getSectionElement(targetIndex) || getSectionElement(direction === 'down' ? currentIndex + 1 : currentIndex - 1) || getSectionElement(0);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      targetElement.focus?.({ preventScroll: true });
    }
  };

  const rightOffsetStyle: React.CSSProperties = { right: `calc(1rem + env(safe-area-inset-right, 0px))` };
  const buttonBase = "h-10 w-10 border-2 border-white rounded-full flex items-center justify-center bg-transparent text-white";

  return (
    <div className="fixed top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-4" style={rightOffsetStyle} aria-label="Controles de navegación entre secciones">
      {/* Botón hacia arriba */}
      <motion.button
        whileHover={prefersReducedMotion ? undefined : { scale: 1.06 }}
        whileTap={prefersReducedMotion ? undefined : { scale: 0.94 }}
        onClick={() => scrollToSection('up')}
        className={buttonBase}
        aria-label="Ir a la sección anterior"
        title="Sección anterior"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </motion.button>

      {/* Botón hacia abajo */}
      <motion.button
        whileHover={prefersReducedMotion ? undefined : { scale: 1.06 }}
        whileTap={prefersReducedMotion ? undefined : { scale: 0.94 }}
        onClick={() => scrollToSection('down')}
        className={buttonBase}
        aria-label="Ir a la siguiente sección"
        title="Siguiente sección"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </motion.button>
    </div>
  );
}

export default MinimalNavButtons;