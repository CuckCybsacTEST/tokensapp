import React from 'react';
// Nota: este layout de marketing es independiente del root y no participa en theme dark/light global.
import { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';

// Metadata específica para la landing page
export const metadata: Metadata = {
  title: "Go Lounge! - Experiencias que prenden la noche",
  description: "Un espacio donde tecnología y ambiente social se combinan para vivir algo distinto en Lima. Eventos temáticos, experiencias con tokens y música seleccionada.",
  // Metadatos para SEO
  keywords: "Go Lounge, eventos Lima, discoteca interactiva, tokens premios, fiestas temáticas, reservaciones online",
  authors: [{ name: "Go Lounge Team" }],
  creator: "Go Lounge!",
  publisher: "Go Lounge!",
  // Base para resolver URLs absolutas en OpenGraph/Twitter
  metadataBase: new URL('https://golounge.pe'),
  // Configuración de robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // Configuración OpenGraph para compartir en redes sociales
  openGraph: {
    type: 'website',
    locale: 'es_PE',
  url: 'https://golounge.pe/marketing',
  title: 'Go Lounge! - Experiencias interactivas',
  description: 'Un espacio donde tecnología y ambiente social se combinan para vivir algo distinto.',
  siteName: 'Go Lounge!',
    images: [
      {
        url: '/icons-golounge/web/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Go Lounge! - Experiencias interactivas',
      }
    ],
  },
  // Configuración Twitter Card
  twitter: {
    card: 'summary_large_image',
  title: 'Go Lounge! - Experiencias interactivas',
  description: 'Un espacio donde tecnología y ambiente social se combinan para vivir algo distinto.',
  images: ['/icons-golounge/web/twitter-image.jpg'],
  },
  // Aseguramos que los motores de búsqueda entienden que esta es una página independiente
  alternates: {
  canonical: 'https://golounge.pe/marketing'
  },
};

// Fuentes modernas: Inter (texto) y Poppins (títulos)
const inter = Inter({ subsets: ['latin'], variable: '--font-text', display: 'swap' });
const poppins = Poppins({ subsets: ['latin'], weight: ['400','600','800'], variable: '--font-display', display: 'swap' });

// Layout completamente independiente para marketing
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`min-h-full antialiased ${inter.variable} ${poppins.variable}`} style={{ fontFamily: 'var(--font-text)' }}>
        {/* Estilos críticos para carga inicial (inline) */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                --font-family-primary: 'Inter', system-ui, -apple-system, sans-serif;
                --primary-color: #F035A5;
                --secondary-color: #3D2EFF;
                --accent-color: #7000FF;
                --dark-color-a: #0E0606;
                --dark-color-b: #07070C;
              }
              html, body { background: var(--dark-color-a); color: white; margin:0; padding:0; min-height:100%; font-family: var(--font-family-primary); scroll-behavior:smooth; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
              body { background: linear-gradient(180deg, var(--dark-color-a), var(--dark-color-b)); }
              header.admin-header { display: none !important; }
              ::-webkit-scrollbar { width: 8px; height: 8px; }
              ::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
              ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
              ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
              .page-transition-enter { opacity: 0; }
              .page-transition-enter-active { opacity: 1; transition: opacity 300ms; }
              .page-transition-exit { opacity: 1; }
              .page-transition-exit-active { opacity: 0; transition: opacity 300ms; }
            `
          }}
        />
        {/* Script de precarga: evitar parpadeos. Quitar tipos TS (as any) que rompen en runtime */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try{
                var d=document;var h=d.documentElement;
                h.style.background='#0E0606'; h.style.color='white';
                // GTM/GA placeholder (no-op si no se configura ID real)
                window.dataLayer=window.dataLayer||[]; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config','G-XXXXXXXXXX');
                // Suprimir transiciones breves al volver de bfcache o visibilidad
                var SUPPRESS_CLASS='transition-hold';
                var suppress=function(){ h.classList.add(SUPPRESS_CLASS); clearTimeout(suppress._t); suppress._t=setTimeout(function(){ h.classList.remove(SUPPRESS_CLASS); },140); };
                window.addEventListener('pageshow',function(ev){ if(ev && ev.persisted) suppress(); });
                document.addEventListener('visibilitychange',function(){ if(!document.hidden) suppress(); });
              }catch(e){}
            `
          }}
        />
        {/* Elemento para inyectar el ID de Google Tag Manager */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          ></iframe>
        </noscript>
        
        {/* Contenedor principal */}
        <main className="page-transition-enter-active">
          {children}
        </main>
        
        {/* Script para habilitar PWA (gateado por NEXT_PUBLIC_PWA=1) para evitar duplicado con root layout */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Registra service worker sólo si está activo NEXT_PUBLIC_PWA
              (function(){
                var pwaFlag = (typeof window !== 'undefined' && (window['NEXT_PUBLIC_PWA']==='1')) || (typeof window !== 'undefined' && window.process && window.process.env && window.process.env.NEXT_PUBLIC_PWA==='1');
                if ('serviceWorker' in navigator && pwaFlag) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful');
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
                }
              })();
            `
          }}
        />
      </div>
  );
}
