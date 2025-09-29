import React from 'react';
import "../../globals.css";
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import ThemeToggle from '@/components/theme/ThemeToggle';

export const metadata = {
  title: 'Login Usuario - QR Prize',
  description: 'Acceso colaboradores',
};

export default function UserLoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: `(()=>{try{const ck=document.cookie.match(/(?:^|; )theme_pref=([^;]+)/);const ckt=ck?decodeURIComponent(ck[1]):null;const k='app-theme';const ls=localStorage.getItem(k);const pref=ckt||ls||'system';const m=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';const t=pref==='system'?m:(pref==='dark'?'dark':'light');document.documentElement.classList.add(t);}catch{}})();` }}
        />
      </head>
      <body className="min-h-full antialiased bg-[var(--color-bg)] text-[var(--color-text)]">
        <ThemeProvider>
          <div className="absolute top-3 right-3 z-10">
            <ThemeToggle compact />
          </div>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
