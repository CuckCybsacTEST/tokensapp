"use client";
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { brand } from '../styles/brand';

/**
 * Barra superior fija para la landing marketing.
 * Contiene (por ahora) solo el acceso a Intranet, pero puede ampliarse.
 */
export function TopNavBar() {
  const [inHero, setInHero] = useState(true);
  useEffect(() => {
    const hero = document.getElementById('hero');
    if (!hero) { setInHero(false); return; }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => setInHero(e.isIntersecting));
    }, { threshold: 0.25 });
    obs.observe(hero);
    return () => obs.disconnect();
  }, []);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: inHero ? 1 : 0, y: inHero ? 0 : -8 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
  className={`fixed top-0 inset-x-0 z-50 flex items-center justify-between px-3 md:px-6 h-12 md:h-14 select-none ${inHero ? '' : 'pointer-events-none'}`}
      style={{
        background: 'linear-gradient(180deg, rgba(10,10,15,0.85), rgba(10,10,15,0.55) 70%, rgba(10,10,15,0))',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: `0 2px 10px -4px ${brand.primary}55`
      }}
      aria-label="Barra superior (solo en hero)"
    >
      {/* Marca lado izquierdo */}
      <a
        href="#hero"
        className="group flex items-center gap-2 md:gap-3 focus:outline-none"
        aria-label="Ir al inicio"
      >
        <span
          className="inline-block h-7 w-7 md:h-8 md:w-8 rounded-md shadow relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${brand.primary}, ${brand.secondary})`,
            boxShadow: `0 0 0 1px rgba(255,255,255,0.15), 0 4px 14px -4px ${brand.primary}aa`
          }}
        >
          <span className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity" style={{ background: '#ffffff' }} />
        </span>
        <span
          className="text-sm md:text-base font-extrabold tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
  >Go Lounge</span>
      </a>

      {/* Enlaces acceso: login y admin más sobrios */}
      <div className="flex items-center gap-2 md:gap-3">
        <a
          href="/u/login"
          className="group inline-flex items-center rounded-sm px-1.5 py-1 text-[11px] md:text-[12px] font-medium tracking-normal focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-[--ring-color]"
          style={{
            color: '#ffffffb0',
            ['--ring-color' as unknown as string]: `${brand.primary}55`
          }}
          aria-label="Ir a login usuarios"
        >
          <span className="opacity-70 group-hover:opacity-100 transition-opacity">Staff</span>
        </a>
        <a
          href="/admin"
          className="group inline-flex items-center rounded-sm px-1.5 py-1 text-[11px] md:text-[12px] font-medium tracking-normal focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-[--ring-color]"
          style={{
            color: '#ffffff80',
            ['--ring-color' as unknown as string]: `${brand.primary}40`
          }}
          aria-label="Ir a panel admin"
        >
          <span className="opacity-60 group-hover:opacity-100 transition-opacity">Admin</span>
        </a>
      </div>
      {/* Línea inferior sutil */}
      <div aria-hidden className="absolute bottom-0 inset-x-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${brand.primary}66, transparent)` }} />
    </motion.nav>
  );
}

export default TopNavBar;
