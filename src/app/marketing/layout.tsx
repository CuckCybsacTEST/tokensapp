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
        url: 'https://qrplatform.pe/og-image.jpg',
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
    images: ['https://qrplatform.pe/twitter-image.jpg'],
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
    <>
      <head>
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        
        {/* Fuentes gestionadas via next/font para evitar FOUT/FOIT */}
        
        {/* Script de precarga para evitar parpadeos */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.documentElement.style.background = '#0E0606';
              document.documentElement.style.color = 'white';
              
              // Implementación básica de Google Tag Manager
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-XXXXXXXXXX'); // Reemplazar con ID real
            `
          }}
        />
        
        {/* Estilos críticos para carga inicial */}
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
              
              html, body {
                background: var(--dark-color-a);
                color: white;
                margin: 0;
                padding: 0;
                min-height: 100%;
                font-family: var(--font-family-primary);
                scroll-behavior: smooth;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
              }
              
              body {
                background: linear-gradient(180deg, var(--dark-color-a), var(--dark-color-b));
              }
              
              /* Oculta completamente cualquier elemento del header de admin */
              header.admin-header {
                display: none !important;
              }
              
              /* Estilos de scrollbar personalizados */
              ::-webkit-scrollbar {
                width: 8px;
                height: 8px;
              }
              
              ::-webkit-scrollbar-track {
                background: rgba(0,0,0,0.2);
              }
              
              ::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0.1);
                border-radius: 4px;
              }
              
              ::-webkit-scrollbar-thumb:hover {
                background: rgba(255,255,255,0.2);
              }
              
              /* Animación de carga */
              .page-transition-enter {
                opacity: 0;
              }
              .page-transition-enter-active {
                opacity: 1;
                transition: opacity 300ms;
              }
              .page-transition-exit {
                opacity: 1;
              }
              .page-transition-exit-active {
                opacity: 0;
                transition: opacity 300ms;
              }
            `
          }}
        />
      </head>
      <div className={`min-h-full antialiased ${inter.variable} ${poppins.variable}`} style={{ fontFamily: 'var(--font-text)' }}>
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
        
        {/* Script para habilitar página PWA */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Registra service worker para PWA si está disponible
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/service-worker.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful');
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `
          }}
        />
      </div>
    </>
  );
}
