"use client";

import React from 'react';
import { brand } from '../styles/brand';
import { OverlayNav } from '../components/OverlayNav';
import { Footer } from '../components/Footer';
import { BackToTop } from '../components/BackToTop';

export default function BlogPage() {
  return (
    <div
      className="min-h-screen w-full text-white overflow-x-hidden relative"
      style={{
        background: `radial-gradient(1200px 600px at 15% -10%, ${brand.primary}10, transparent), 
                   radial-gradient(900px 500px at 110% 10%, ${brand.secondary}10, transparent), 
                   linear-gradient(180deg, ${brand.darkA}, ${brand.darkB})`,
      }}
    >
  <OverlayNav />
      <section className="relative py-24 md:py-32 px-4 md:px-8">
        <div className="container mx-auto max-w-5xl text-center">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight" style={{ textShadow: `0 0 14px ${brand.primary}55` }}>
            Blog
          </h1>
          <p className="mt-3 text-base md:text-lg opacity-85 max-w-2xl mx-auto" style={{ color: brand.text.secondary }}>
            Estamos preparando contenido con tips, historias de cabina, coctelería y experiencias QR.
          </p>

          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-8 md:p-12 max-w-3xl mx-auto">
            <div className="text-6xl mb-4">🚧</div>
            <h2 className="text-xl md:text-2xl font-extrabold mb-2">En construcción</h2>
            <p className="opacity-85" style={{ color: brand.text.secondary }}>
              Muy pronto publicaremos notas y novedades. Vuelve en unos días.
            </p>
          </div>
        </div>
      </section>
      <Footer />
      <BackToTop />
    </div>
  );
}
