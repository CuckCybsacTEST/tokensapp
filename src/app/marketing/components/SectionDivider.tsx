import React from 'react';
import { brand } from '../styles/brand';

/**
 * SectionDivider
 * Reutilizable: separador full-bleed con el mismo estilo del Hero.
 * Ocupa todo el ancho de la ventana, con margen vertical adaptable.
 */
export function SectionDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`w-full relative ${className}`}>
      <div className="relative z-20">
        <div
          aria-hidden
          className="pointer-events-none h-px w-[100vw] left-1/2 -translate-x-1/2 absolute"
          style={{
            background: `linear-gradient(90deg, transparent, ${brand.primary}80, transparent)`,
            boxShadow: `0 0 20px ${brand.primary}40`
          }}
        />
      </div>
    </div>
  );
}

export default SectionDivider;
