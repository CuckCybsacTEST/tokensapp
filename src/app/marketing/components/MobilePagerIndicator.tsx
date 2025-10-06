"use client";
import React, { useEffect, useMemo, useRef, useState } from 'react';

type Section = { id: string; label: string };

function Icon({ id, active }: { id: string; active: boolean }) {
  const cls = `h-[18px] w-[18px] ${active ? 'text-white' : 'text-white/55'}`;
  switch (id) {
    case 'hero':
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 11l9-7 9 7"/><path d="M9 21V11h6v10"/>
        </svg>
      );
    case 'shows':
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15 9 22 9 17 14 19 22 12 18 5 22 7 14 2 9 9 9" />
        </svg>
      );
    case 'cumple':
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2c1.5 2-1 3-1 4s1 2 1 2 1-1 1-2-2-2-1-4z"/>
          <rect x="4" y="8" width="16" height="10" rx="2"/>
          <path d="M4 14h16"/>
        </svg>
      );
    case 'spotify':
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M7 9c3-1 7-1 10 1"/>
          <path d="M7 12c3-1 6-1 9 1"/>
          <path d="M7 15c2-.5 4-.5 6 .5"/>
        </svg>
      );
    case 'galeria':
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2"/>
          <path d="M3 15l4-4 5 5 3-3 3 3"/>
        </svg>
      );
    case 'faq':
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9 10a3 3 0 1 1 5 2c-.8.6-1 1-1 2"/>
          <circle cx="12" cy="17" r=".5"/>
        </svg>
      );
    case 'blog':
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16v16H4z"/>
          <path d="M7 8h10M7 12h10M7 16h6"/>
        </svg>
      );
    case 'mapa':
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21s7-4.35 7-10A7 7 0 0 0 5 11c0 5.65 7 10 7 10z"/>
          <circle cx="12" cy="11" r="2"/>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
  }
}

export function MobilePagerIndicator() {
  const [ids, setIds] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const pagerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
    if (!isMobile) return;
    const pager = document.getElementById('mobile-pager') as HTMLElement | null;
    pagerRef.current = pager;
    if (!pager) return;
    const slides = Array.from(pager.querySelectorAll(':scope > .snap-section')) as HTMLElement[];
    const idsList = slides.map(s => s.id).filter(Boolean);
    setIds(idsList);

    const compute = () => {
      const w = pager.clientWidth || 1;
      const idx = Math.round((pager.scrollLeft || 0) / w);
      setActive(Math.max(0, Math.min(idsList.length - 1, idx)));
    };
    compute();
    const onScroll = () => compute();
    const onResize = () => compute();
    pager.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    let ro: ResizeObserver | null = null;
    const RZ: any = (window as any).ResizeObserver;
    if (typeof RZ === 'function') {
      ro = new RZ(() => onResize());
      if (ro && pager) ro.observe(pager);
    }
    return () => {
      pager.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      if (ro) ro.disconnect();
    };
  }, []);

  if (!ids.length) return null;

  return (
    <div
      className="md:hidden fixed top-2 left-1/2 -translate-x-1/2 z-[65] pointer-events-none select-none"
      aria-label="Indicador de sección (móvil)"
    >
      <div
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-white/10"
        style={{ background:'rgba(10,10,15,0.52)', backdropFilter:'blur(10px)' }}
      >
        {ids.map((id, i) => (
          <div key={id} className={`transition-transform ${i===active ? 'scale-110' : 'scale-100'}`}>
            <Icon id={id} active={i===active} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default MobilePagerIndicator;
