"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion, motion } from 'framer-motion';
import { SECTIONS } from '../constants/sections';

/**
 * UpDownDots: dos puntos minimalistas (arriba/abajo) para navegar entre secciones.
 * - Detección robusta de sección actual (anchor = 50% viewport)
 * - Fallback por cercanía si no cae en ninguna
 * - Respeta safe-area y reduced motion
 */
export function UpDownDots() {
  const prefersReducedMotion = useReducedMotion();
  const sections = useMemo(() => SECTIONS.map(s => s.id), []);
  const [idx, setIdx] = useState(0);
  const [atTop, setAtTop] = useState(true);
  const [heroAlmostFull, setHeroAlmostFull] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  const [atLastSection, setAtLastSection] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const getSectionElement = (index: number) => {
    if (typeof document === 'undefined') return null;
    const id = sections[index];
    return id ? (document.getElementById(id) as HTMLElement | null) : null;
  };

  const getLastPresentIndex = () => {
    if (typeof document === 'undefined') return sections.length - 1;
    for (let i = sections.length - 1; i >= 0; i--) {
      if (document.getElementById(sections[i])) return i;
    }
    return sections.length - 1;
  };

  const findNextPresentIndex = (from: number) => {
    if (typeof document === 'undefined') return Math.min(sections.length - 1, from + 1);
    for (let i = from + 1; i < sections.length; i++) {
      if (document.getElementById(sections[i])) return i;
    }
    return from;
  };

  const findPrevPresentIndex = (from: number) => {
    if (typeof document === 'undefined') return Math.max(0, from - 1);
    for (let i = from - 1; i >= 0; i--) {
      if (document.getElementById(sections[i])) return i;
    }
    return from;
  };

  function currentIndex(): number {
    if (typeof window === 'undefined') return 0;
    const present = sections.filter(id => !!document.getElementById(id));
    const anchor = window.scrollY + window.innerHeight * 0.5;
    // Intento 1: dentro del intervalo
    for (const id of present) {
      const el = document.getElementById(id)!;
      const rect = el.getBoundingClientRect();
      const top = rect.top + window.scrollY; // posición relativa a la página
      const bottom = top + rect.height;
      if (anchor >= top && anchor < bottom) return sections.indexOf(id);
    }
    // Intento 2: cercanía al centro
    let best = -1; let dist = Number.POSITIVE_INFINITY;
    for (const id of present) {
      const el = document.getElementById(id)!;
      const r = el.getBoundingClientRect();
      const center = (r.top + window.scrollY) + r.height / 2;
      const d = Math.abs(center - anchor);
      if (d < dist) { dist = d; best = sections.indexOf(id); }
    }
    return best >= 0 ? best : 0;
  }

  // Mantener índice actualizado con scroll/resize/orientationchange
  useEffect(() => {
    const update = () => {
      setIdx(currentIndex());
      try { setAtTop(window.scrollY <= 0.5); } catch {}
      // Calcular visibilidad del hero para no desactivar "up" si ya asoma la siguiente sección
      try {
        const hero = getSectionElement(0);
        if (hero) {
          const r = hero.getBoundingClientRect();
          const vh = window.innerHeight || 1;
          const visible = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
          const ratio = Math.max(0, Math.min(1, visible / Math.max(1, r.height)));
          setHeroAlmostFull(ratio >= 0.98);
        }
      } catch {}
      // Detectar si estamos en la última sección o más abajo (por footer)
      try {
        const lastIdx = getLastPresentIndex();
        const lastEl = getSectionElement(lastIdx);
        if (lastEl) {
          const lastRect = lastEl.getBoundingClientRect();
          const scrolledBottom = (window.scrollY || window.pageYOffset || 0) + (window.innerHeight || 0);
          const lastBottomAbs = (lastRect.bottom + (window.scrollY || window.pageYOffset || 0));
          // margen de tolerancia 2px
          setAtEnd(scrolledBottom >= lastBottomAbs - 2);
        } else {
          setAtEnd(false);
        }
      } catch { setAtEnd(false); }
    };
    update();
    let raf = 0;
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      cancelAnimationFrame(raf);
    };
  }, [sections.join(',')]);

  // Observa la última sección para ocultar el dot "down" cuando esté mayormente visible
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const lastIdx = getLastPresentIndex();
    const el = getSectionElement(lastIdx);
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === el) {
          // cuando la última sección está ≥60% visible, consideramos que ya no tiene sentido bajar
          setAtLastSection((e.intersectionRatio || 0) >= 0.6);
        }
      }
    }, { threshold: [0.2, 0.4, 0.6, 0.8, 1] });
    obs.observe(el);
    return () => obs.disconnect();
  }, [sections.join(',')]);

  const scrollTo = (direction: 'up' | 'down') => {
    if (typeof window === 'undefined') return;
    const cur = currentIndex();
    // Si estamos en el índice 0 pero no en el tope absoluto, subir al inicio del hero
    if (direction === 'up' && cur === 0 && window.scrollY > 0.5) {
      const hero = getSectionElement(0);
      hero?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      hero?.focus?.({ preventScroll: true });
      return;
    }
    const targetIndex = direction === 'up' ? findPrevPresentIndex(cur) : findNextPresentIndex(cur);
    const el = getSectionElement(targetIndex);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el?.focus?.({ preventScroll: true });
  };

  // Safe-area a la derecha
  const wrapStyle: React.CSSProperties = { right: `calc(0.9rem + env(safe-area-inset-right, 0px))` };

  const Dot = ({ dir, disabled }: { dir: 'up' | 'down'; disabled?: boolean }) => (
    <motion.button
      type="button"
      whileHover={prefersReducedMotion ? undefined : { scale: disabled ? 1 : 1.08 }}
      whileTap={prefersReducedMotion ? undefined : { scale: disabled ? 1 : 0.94 }}
      onClick={() => !disabled && scrollTo(dir)}
      className={`h-11 w-11 rounded-full grid place-items-center transition ${disabled ? 'opacity-40 cursor-default' : 'cursor-pointer'} border border-white/70 bg-white/5 backdrop-blur-sm`}
      aria-label={dir === 'up' ? 'Ir a la sección anterior' : 'Ir a la siguiente sección'}
      title={dir === 'up' ? 'Sección anterior' : 'Siguiente sección'}
      style={{ touchAction: 'manipulation' }}
    >
      {/* Punto minimalista */}
      <span aria-hidden className="relative inline-block h-2 w-2 rounded-full bg-white">
        {/* Indicador direccional sutil */}
        <span className={`absolute left-1/2 -translate-x-1/2 ${dir === 'up' ? '-top-2' : '-bottom-2'} h-1 w-1 rounded-full bg-white/80`} />
      </span>
    </motion.button>
  );

  // Desactivar en bordes
  const disableUp = idx <= 0 && atTop && heroAlmostFull;
  const isLast = idx >= getLastPresentIndex() || atEnd || atLastSection;

  if (!mounted) return null;
  return createPortal(
    <div
      className="fixed top-1/2 -translate-y-1/2 pointer-events-auto select-none flex flex-col items-center gap-4"
      style={{ ...wrapStyle, zIndex: 2147483647 }}
      aria-label="Navegación por secciones"
    >
  <Dot dir="up" disabled={disableUp} />
  {!isLast && <Dot dir="down" />}
    </div>,
    document.body
  );
}

export default UpDownDots;
