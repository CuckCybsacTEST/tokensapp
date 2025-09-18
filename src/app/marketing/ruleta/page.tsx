import React from 'react';
import { Metadata } from 'next';
import RouletteClientPage from './RouletteClientPage';
import MarketingNavbar from '../components/MarketingNavbar';

export const metadata: Metadata = {
  title: "Ruleta de Premios | QR Platform",
  description: "Gira la ruleta y descubre tu premio en QR Platform",
};

export default function RuletaPage({ searchParams }: { searchParams: { tokenId?: string } }) {
  const tokenId = searchParams.tokenId || '';
  
  return (
    <>
      <MarketingNavbar />
      
      <div className="pt-6 sm:pt-10 pb-24 min-h-screen bg-gradient-to-b from-[#0E0606] to-[#07070C]">
        <RouletteClientPage tokenId={tokenId} />
      </div>
      
      <footer className="py-8 bg-black/30 text-center text-white/50 text-xs">
        <p>© {new Date().getFullYear()} QR Platform. Todos los derechos reservados.</p>
      </footer>
    </>
  );
}
