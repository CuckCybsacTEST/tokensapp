"use client";
import React, { useEffect, useRef, useState } from 'react';
import { SectionIconNav } from './SectionIconNav';

export function BottomIconBar() {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement|null>(null);

  useEffect(() => {
    const hero = document.getElementById('hero');
    if (!hero) { setShow(true); return; }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => setShow(!e.isIntersecting));
    }, { threshold: 0.25 });
    obs.observe(hero);
    return () => obs.disconnect();
  }, []);

  // Exponer altura en variable CSS --bottom-bar-h
  useEffect(() => {
    const updateVar = () => {
      const el = ref.current;
      if (!el) return;
      const h = el.offsetHeight || 0;
      document.documentElement.style.setProperty('--bottom-bar-h', h + 'px');
    };
    updateVar();
    const ro = new ResizeObserver(() => updateVar());
    if (ref.current) ro.observe(ref.current);
    window.addEventListener('resize', updateVar);
    window.addEventListener('orientationchange', updateVar);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateVar);
      window.removeEventListener('orientationchange', updateVar);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`fixed inset-x-0 bottom-0 z-50 md:hidden transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      style={{
        background: 'linear-gradient(0deg, rgba(10,10,15,0.86), rgba(10,10,15,0.6) 60%, rgba(10,10,15,0))',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)'
      }}
      aria-label="Barra inferior de navegación por secciones (móvil)"
    >
      <div className="px-2 py-2">
        <SectionIconNav />
      </div>
      {/* Safe area bottom */}
      <div aria-hidden className="h-[calc(env(safe-area-inset-bottom,0px))]" />
    </div>
  );
}

export default BottomIconBar;
