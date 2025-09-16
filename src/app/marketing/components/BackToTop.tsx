"use client";
import React, { useEffect, useState } from 'react';
import { brand } from '../styles/brand';

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      setVisible(y > 400);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      aria-label="Volver arriba"
      onClick={handleClick}
      className={`fixed bottom-5 right-5 z-50 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
      style={{
        background: brand.primary,
        color: '#fff',
        boxShadow: `0 8px 24px -10px ${brand.primary}`,
        border: '1px solid rgba(255,255,255,0.15)'
      }}
    >
      <span className="block px-4 py-3 text-sm font-semibold">Arriba</span>
    </button>
  );
}
