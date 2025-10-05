"use client";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SECTIONS } from '../constants/sections';
import {
  IconStar,
  IconCake,
  IconBrandSpotify,
  IconPhoto,
  IconHelpCircle,
  IconNews,
  IconMap,
  IconCircleDot,
} from '@tabler/icons-react';
import { brand } from '../styles/brand';

type SectionItem = { id: string; label: string };

function IconById({ id }: { id: string }) {
  const props = { size: 22, stroke: 1.9, className: 'text-white opacity-95' } as const;
  switch (id) {
    case 'shows': return <IconStar {...props} aria-hidden />;
    case 'cumple': return <IconCake {...props} aria-hidden />;
    case 'spotify': return <IconBrandSpotify {...props} aria-hidden />;
    case 'galeria': return <IconPhoto {...props} aria-hidden />;
    case 'faq': return <IconHelpCircle {...props} aria-hidden />;
    case 'blog': return <IconNews {...props} aria-hidden />;
    case 'mapa': return <IconMap {...props} aria-hidden />;
    default: return <IconCircleDot {...props} aria-hidden />;
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
              onClick={() => {
                showTip(it.id);
                const scroller = document.querySelector('.marketing-scroll') as HTMLElement | null;
                scroller?.classList.add('no-snap');
                window.setTimeout(() => { scroller?.classList.remove('no-snap'); }, 600);
              }}
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
