import React from 'react';
import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { brand } from '../styles/brand';
import { Footer } from '../components/Footer';
import { TopNavBar } from '../components/TopNavBar';

// Importar OffersSection dinámicamente para evitar problemas de SSR con Culqi
const OffersSection = dynamic(() => import('../components/OffersSection').then(mod => ({ default: mod.OffersSection })), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center" style={{
      background: `radial-gradient(1200px 600px at 15% -10%, ${brand.primary}10, transparent),
                 radial-gradient(900px 500px at 110% 10%, ${brand.secondary}10, transparent),
                 linear-gradient(180deg, ${brand.darkA}, ${brand.darkB})`,
    }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white/70">Cargando ofertas...</p>
      </div>
    </div>
  )
});

export const metadata: Metadata = {
  title: 'Ofertas Especiales | Go Lounge',
  description: 'Descubre nuestras ofertas especiales y promociones temporales en Go Lounge',
};

export default function OffersPage() {
  return (
    <div
      className="min-h-screen w-full text-white overflow-x-hidden relative"
      style={{
        background: `radial-gradient(1200px 600px at 15% -10%, ${brand.primary}10, transparent),
                   radial-gradient(900px 500px at 110% 10%, ${brand.secondary}10, transparent),
                   linear-gradient(180deg, ${brand.darkA}, ${brand.darkB})`,
      }}
    >
      {/* Top Navigation Bar */}
      <TopNavBar />

      {/* Offers Section */}
      <div className="pt-16">
        <OffersSection />
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}