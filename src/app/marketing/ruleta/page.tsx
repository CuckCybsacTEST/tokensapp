import React from 'react';
import { Metadata } from 'next';
import RouletteClientPage from './RouletteClientPage';
import SectionContainer from '../components/ui/SectionContainer';
import { SectionTitle } from '../components/ui/SectionTitle';
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
      
      <div className="py-24 min-h-screen" style={{ 
        background: 'linear-gradient(180deg, #0E0606, #07070C)' 
      }}>
        <SectionContainer className="px-4">
          <SectionTitle
            kicker="Premios exclusivos"
            title="Ruleta de Premios"
            subtitle="Gira la ruleta y descubre qué premio te ha tocado"
          />
          
          <div className="mt-16 flex items-center justify-center">
            <RouletteClientPage tokenId={tokenId} />
          </div>
        </SectionContainer>
      </div>
      
      <footer className="py-8 bg-black/30 text-center text-white/50 text-xs">
        <p>© {new Date().getFullYear()} QR Platform. Todos los derechos reservados.</p>
      </footer>
    </>
  );
}
