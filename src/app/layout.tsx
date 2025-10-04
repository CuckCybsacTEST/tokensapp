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
    <html lang="es" className="h-full theme-hydrated" suppressHydrationWarning>
      <head>
        <style>{`html{background:#ffffff;color-scheme:light}`}</style>
        <ThemeScript />
  <link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" />
  {/* Theme colors (light/dark) usando la paleta brand */}
  <meta name="theme-color" content="#FF4D2E" media="(prefers-color-scheme: light)" />
  <meta name="theme-color" content="#0E0606" media="(prefers-color-scheme: dark)" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="color-scheme" content="dark light" />
  {/* PWA Icons */}
  <link rel="apple-touch-icon" href="/icons-golounge/web/apple-touch-icon.png" />
  <link rel="icon" href="/icons-golounge/web/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" sizes="192x192" href="/icons-golounge/web/icon-192.png" />
  <link rel="icon" type="image/png" sizes="512x512" href="/icons-golounge/web/icon-512.png" />
  {/* Maskable hints */}
  <link rel="mask-icon" href="/icons-golounge/web/icon-512-maskable.png" color="#FF4D2E" />
  <meta name="application-name" content="Go Lounge" />
  <meta name="apple-mobile-web-app-title" content="Go Lounge" />
  <meta name="description" content="Experiencias con tecnología QR: shows, rewards y más." />
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
