import React from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
// Inicia servicios de servidor (scheduler de tokens) al cargar el layout en el servidor
import "@/server/start";

// Nota: Este es un layout de respaldo, ahora cada sección tiene su propio layout
// Este layout no debería usarse normalmente ya que tenemos layouts específicos para:
// - /admin/** -> usa src/app/admin/layout.tsx
// - /marketing/** y / -> usa src/app/(marketing)/layout.tsx

export const metadata = {
  title: "QR Prize",
  description: "QR premios y experiencias",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <head>
        {/* Prevent FOUC: inline script sets initial theme class before React hydration */}
        <script
          dangerouslySetInnerHTML={{ __html: `(()=>{try{const ck=document.cookie.match(/(?:^|; )theme_pref=([^;]+)/);const ckt=ck?decodeURIComponent(ck[1]):null;const k='app-theme';const ls=localStorage.getItem(k);const pref=ckt||ls||'system';const m=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';const t=pref==='system'?m:(pref==='dark'?'dark':'light');document.documentElement.classList.add(t);}catch{}})();` }}
        />
      </head>
      <body className="min-h-full w-full antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
