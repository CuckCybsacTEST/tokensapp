import React from 'react';
import { Metadata } from 'next';
import { OffersSection } from '@/app/marketing/components/OffersSection';

export const metadata: Metadata = {
  title: 'Ofertas Especiales | Go Lounge',
  description: 'Descubre nuestras ofertas especiales y promociones temporales en Go Lounge',
};

export default function OffersPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 app-container py-16 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Ofertas Especiales
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Descubre nuestras promociones exclusivas y ofertas temporales.
            ¡Aprovecha antes de que se acaben!
          </p>
        </div>
      </div>

      {/* Offers Section */}
      <div className="app-container py-16">
        <OffersSection />
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/20 backdrop-blur">
        <div className="app-container py-8 text-center">
          <p className="text-white/60">
            © 2025 Go Lounge. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}