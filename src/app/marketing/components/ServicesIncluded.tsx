"use client";
import React from 'react';
import { brand } from '../styles/brand';

export interface ServiceItem { emoji: string; label: string; highlight?: boolean }

interface ServicesIncludedProps {
  items: ServiceItem[];
  className?: string;
}

/**
 * ServicesIncluded
 * Desktop (md+): muestra chips completos como antes.
 * Mobile (< md): muestra solo los íconos en una fila única horizontal con scroll-x sutil.
 */
export const ServicesIncluded: React.FC<ServicesIncludedProps> = ({ items, className = '' }) => {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Desktop / tablet layout */}
      <div className="hidden md:flex flex-wrap gap-2 justify-center">
        {items.map(s => {
          const isHighlight = s.highlight;
          return (
            <div
              key={s.label}
              className={`px-3 py-1.5 rounded-full text-xs border backdrop-blur-sm ${isHighlight ? 'font-semibold' : ''}`}
              style={{
                borderColor: isHighlight ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.12)',
                background: isHighlight ? `linear-gradient(135deg, ${brand.primary}44, ${brand.secondary}33)` : 'rgba(255,255,255,0.05)',
                boxShadow: isHighlight ? `0 6px 18px -10px ${brand.primary}` : undefined,
              }}
            >
              <span className="mr-1">{s.emoji}</span>
              {s.label}
            </div>
          );
        })}
      </div>

      {/* Mobile icon-only row */}
      <div className="md:hidden flex justify-center gap-3 items-center flex-wrap" role="list" aria-label="Servicios incluidos">
        {items.map(s => (
          <div
            key={s.label}
            role="listitem"
            className="h-9 w-9 rounded-full flex items-center justify-center text-base border backdrop-blur-sm"
            style={{
              border: '1px solid rgba(255,255,255,0.15)',
              background: s.highlight ? `linear-gradient(135deg, ${brand.primary}33, ${brand.secondary}22)` : 'rgba(255,255,255,0.07)',
              boxShadow: s.highlight ? `0 0 0 3px ${brand.primary}22` : undefined,
            }}
            title={s.label}
          >
            <span aria-hidden>{s.emoji}</span>
            <span className="sr-only">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServicesIncluded;
