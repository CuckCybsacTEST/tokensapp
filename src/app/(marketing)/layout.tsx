import React from 'react';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { Inter, Poppins } from 'next/font/google';
import Script from 'next/script';

// Layout base para el grupo (marketing) que es completamente independiente
export const metadata = {
  title: 'Marketing',
  description: "Experiencias que prenden la noche",
};

// Fuentes modernas: Inter (texto) y Poppins (títulos)
const inter = Inter({ subsets: ['latin'], variable: '--font-text', display: 'swap' });
const poppins = Poppins({ subsets: ['latin'], weight: ['400','600','800'], variable: '--font-display', display: 'swap' });

export default function MarketingGroupLayout({ children }: { children: React.ReactNode }) {
  // Aplicamos las variables de fuentes a un contenedor de alto nivel
  return (
  <>
      <Script src="https://checkout.culqi.com/js/v4" />
      <div className={`${inter.variable} ${poppins.variable} min-h-full`} style={{ fontFamily: 'var(--font-text)' }}>
        <div className="p-4 flex justify-end"><ThemeToggle compact /></div>
        {children}
      </div>
  </>
  );
}
