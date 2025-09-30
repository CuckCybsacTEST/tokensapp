import React from 'react';
import Link from 'next/link';
import { brand } from '../styles/brand';

export function Navbar() {
  return (
    <header data-hero-nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b" 
      style={{ 
        background: "rgba(0,0,0,0.35)", 
        borderColor: "rgba(255,255,255,0.08)", 
        boxShadow: `0 8px 24px -12px ${brand.primary}33` 
      }}
    >
      <div className="container mx-auto max-w-6xl px-4 md:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg ring-1 ring-white/15" 
            style={{ background: `linear-gradient(135deg, ${brand.primary}, ${brand.secondary})` }} 
          />
          <span className="font-black tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Go Lounge!</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm" style={{ color: "#FFFFFFCC" }}>
          <a href="#shows" className="hover:text-white transition-colors">Estelares</a>
          <a href="#cumple" className="hover:text-white transition-colors">Cumple</a>
          <a href="#por-que-elegirnos" className="relative hover:text-white transition-colors" style={{ color: brand.primary }}>
            ¿Por qué elegirnos?
            <span aria-hidden className="absolute -right-3 -top-1 inline-flex h-2 w-2 rounded-full" 
              style={{ background: brand.primary, boxShadow: `0 0 0 0 ${brand.primary}66` }}
            />
          </a>
          <a href="#galeria" className="hover:text-white transition-colors">Galería</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          <a href="#mapa" className="hover:text-white transition-colors">Mapa</a>
          <Link href="/marketing/blog" className="hover:text-white transition-colors">Blog</Link>
          <Link href="/admin" className="hover:text-white">Admin</Link>
        </nav>
        {/* Removed top-right Reserva CTA as requested */}
      </div>
    </header>
  );
}
