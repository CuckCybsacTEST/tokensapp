import React from 'react';
import '../globals.css';
import { Inter, Poppins } from 'next/font/google';

// Layout base para el grupo (marketing) que es completamente independiente
export const metadata = {
  title: "QR Platform",
  description: "Experiencias que prenden la noche",
};

// Fuentes modernas: Inter (texto) y Poppins (títulos)
const inter = Inter({ subsets: ['latin'], variable: '--font-text', display: 'swap' });
const poppins = Poppins({ subsets: ['latin'], weight: ['400','600','800'], variable: '--font-display', display: 'swap' });

export default function MarketingGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`min-h-full antialiased ${inter.variable} ${poppins.variable}`}
      style={{ fontFamily: 'var(--font-text)' }}
    >
      {children}
    </div>
  );
}
