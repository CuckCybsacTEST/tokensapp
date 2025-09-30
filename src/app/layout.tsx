import React from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { DynamicTitle } from "@/components/seo/DynamicTitle";
// Inicia servicios de servidor (scheduler de tokens) al cargar el layout en el servidor
import "@/server/start";

// Nota: Este es un layout de respaldo, ahora cada sección tiene su propio layout
// Este layout no debería usarse normalmente ya que tenemos layouts específicos para:
// - /admin/** -> usa src/app/admin/layout.tsx
// - /marketing/** y / -> usa src/app/(marketing)/layout.tsx

export const metadata = {
  title: {
    default: 'Go Lounge!',
    template: '%s · Go Lounge!'
  },
  description: "Go Lounge! experiencias y tokens",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full" suppressHydrationWarning>
      <head>
        <style>{`html{background:#ffffff;color-scheme:light}`}</style>
        <ThemeScript />
        <link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" />
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/logo.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/logo.png" />
        <meta name="application-name" content="Tokens" />
        <meta name="apple-mobile-web-app-title" content="Tokens" />
        <meta name="description" content="Gestión de tokens, premios y lotes" />
      </head>
      <body className="min-h-full w-full antialiased transition-colors duration-150">
        <script dangerouslySetInnerHTML={{__html:`document.documentElement.classList.add('theme-hydrated');document.body.classList.add('theme-hydrated');`}} />
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <DynamicTitle />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{const sw='/sw.js';navigator.serviceWorker.getRegistrations().then(r=>{const has=r.some(x=>x.active && x.active.scriptURL.endsWith(sw));if(!has) navigator.serviceWorker.register(sw).catch(()=>{});});});}`
          }}
        />
      </body>
    </html>
  );
}
