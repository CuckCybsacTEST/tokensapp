import React from 'react';
import '../globals.css';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import ThemeToggle from '@/components/theme/ThemeToggle';
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
    <html lang="es" className={`${inter.variable} ${poppins.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: `(()=>{try{const k='app-theme';const s=localStorage.getItem(k)||'system';const m=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';const t=s==='system'?m:(s==='dark'?'dark':'light');document.documentElement.classList.add(t);}catch{}})();` }}
        />
      </head>
      <body className="min-h-full antialiased" style={{ fontFamily: 'var(--font-text)' }}>
        <ThemeProvider>
          <div className="p-4 flex justify-end"><ThemeToggle compact /></div>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
