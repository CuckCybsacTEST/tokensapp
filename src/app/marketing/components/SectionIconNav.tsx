"use client";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SECTIONS } from '../constants/sections';
import { brand } from '../styles/brand';

type SectionItem = { id: string; label: string };

function IconById({ id }: { id: string }) {
  const cls = 'h-[22px] w-[22px] text-white opacity-95';
  switch (id) {
    case 'shows':
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15 9 22 9 17 14 19 22 12 18 5 22 7 14 2 9 9 9" />
        </svg>
      );
    case 'cumple':
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2c1.5 2-1 3-1 4s1 2 1 2 1-1 1-2-2-2-1-4z"/>
          <rect x="4" y="8" width="16" height="10" rx="2"/>
          <path d="M4 14h16"/>
        </svg>
      );
    case 'spotify':
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M7 9c3-1 7-1 10 1"/>
          <path d="M7 12c3-1 6-1 9 1"/>
          <path d="M7 15c2-.5 4-.5 6 .5"/>
        </svg>
      );
    case 'galeria':
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2"/>
          <path d="M3 15l4-4 5 5 3-3 3 3"/>
        </svg>
      );
    case 'faq':
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9 10a3 3 0 1 1 5 2c-.8.6-1 1-1 2"/>
          <circle cx="12" cy="17" r=".5"/>
        </svg>
      );
    case 'blog':
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16v16H4z"/>
          <path d="M7 8h10M7 12h10M7 16h6"/>
        </svg>
      );
    case 'mapa':
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21s7-4.35 7-10A7 7 0 0 0 5 11c0 5.65 7 10 7 10z"/>
          <circle cx="12" cy="11" r="2"/>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
  }
}

export function SectionIconNav() {
  const items: SectionItem[] = useMemo(() => (
    SECTIONS
      .filter(s => s.id !== 'hero')
      .map(s => ({ id: s.id, label: s.label }))
  ), []);

  const [current, setCurrent] = useState<string>('');
  const [tipFor, setTipFor] = useState<string | null>(null);
  const tipTimer = useRef<number | null>(null);
  const lastTip = useRef<{ id: string; ts: number } | null>(null);
  const initialized = useRef(false);

  // Observa la sección visible para resaltar el icono activo
  useEffect(() => {
    const sections = items
      .map(it => document.getElementById(it.id))
      .filter((el): el is HTMLElement => !!el);
    if (!sections.length) return;

    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          const id = (e.target as HTMLElement).id;
          setCurrent(id);
        }
      }
    }, { threshold: 0.5 });

    sections.forEach(s => obs.observe(s));
    return () => obs.disconnect();
  }, [items]);

  // Navegación por hash: dejamos que el navegador maneje el scroll del anchor

  const labelMap: Record<string, string> = {
    shows: 'Shows',
    cumple: 'Cumples',
    spotify: 'Música',
    galeria: 'Galería',
    faq: 'FAQs',
    blog: 'Blog',
    mapa: 'Contacto',
  };

  const showTip = (id: string) => {
    // Cancelar timer previo
    if (tipTimer.current) { window.clearTimeout(tipTimer.current); tipTimer.current = null; }
    setTipFor(id);
    lastTip.current = { id, ts: Date.now() };
    // Duración 1.5s solicitada
    tipTimer.current = window.setTimeout(() => { setTipFor(null); tipTimer.current = null; }, 1500);
  };

  useEffect(() => {
    // Tocar en cualquier parte oculta la burbuja
    const hide = () => {
      if (!tipFor) return;
      setTipFor(null);
      if (tipTimer.current) { window.clearTimeout(tipTimer.current); tipTimer.current = null; }
    };
      const opts: AddEventListenerOptions = { passive: true };
    window.addEventListener('touchstart', hide, opts);
    return () => {
      window.removeEventListener('touchstart', hide as any);
      if (tipTimer.current) window.clearTimeout(tipTimer.current);
    };
  }, [tipFor]);

  // Mostrar tip cuando cambia la sección activa por scroll/snap
  useEffect(() => {
    if (!current) return;
    if (!initialized.current) { initialized.current = true; return; }
    // Evitar duplicado inmediato si viene de un tap (damos 250ms de margen)
    const now = Date.now();
    if (lastTip.current && lastTip.current.id === current && (now - lastTip.current.ts) < 250) return;
    showTip(current);
  }, [current]);

  return (
    <nav aria-label="Navegación por secciones (iconos)" className="flex items-center justify-around w-full px-1">
      {items.map(it => {
        const active = current === it.id;
        return (
          <div key={it.id} className="relative">
            {/* Burbuja efímera */}
            {tipFor === it.id && (
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 pointer-events-none select-none z-10">
                <div
                  className="px-2.5 py-1 rounded-full text-[10px] font-semibold text-white/95 border border-white/15 shadow"
                  style={{
                    background: `linear-gradient(180deg, ${brand.primary}BB, ${brand.secondary}99)`,
                    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)'
                  }}
                  aria-hidden
                >{labelMap[it.id] ?? it.label}</div>
              </div>
            )}
            <a
              href={`#${it.id}`}
              onClick={() => { showTip(it.id); }}
              aria-label={`Ir a ${it.label}`}
              className={`h-9 w-10 flex items-center justify-center rounded-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${active ? 'bg-white/15' : 'bg-white/6 hover:bg-white/12'}`}
              style={{ backdropFilter: 'blur(6px)', touchAction: 'manipulation' }}
            >
              <IconById id={it.id} />
            </a>
          </div>
        );
      })}
    </nav>
  );
}

export default SectionIconNav;
