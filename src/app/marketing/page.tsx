'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { brand } from './styles/brand';

// Importamos los componentes UI reutilizables
import { SectionTitle } from './components/ui/SectionTitle';
import { ScrollX } from './components/ui/ScrollX';
import { Stars } from './components/ui/Stars';

// Importamos los componentes de sección
// Reemplazamos Navbar por OverlayNav flotante
import { OverlayNav } from './components/OverlayNav';
import { TopNavBar } from './components/TopNavBar';
import { Hero } from './components/Hero';
import { DynamicShowsSection } from './components/DynamicShowsSection';
import { BirthdaySection } from './components/BirthdaySection';
import { QrSection } from './components/QrSection';
import { GallerySection } from './components/GallerySection';
import { SpotifySection } from './components/SpotifySection';
// import { TestimonialsSection } from './components/TestimonialsSection';
// import { ReservationForm } from './components/ReservationForm';
import { FaqSection } from './components/FaqSection';
import { MapSection } from './components/MapSection';
import { BlogSection } from './components/BlogSection';
import { Footer } from './components/Footer';
import { SectionDivider } from './components/SectionDivider';
import { BackToTop } from './components/BackToTop';

// Datos estructurados para la landing page
// -----------------------------------------

// Características
const features = [
  { icon: '🔥', title: 'Experiencias únicas', description: 'Eventos temáticos que elevan cada momento.' },
  { icon: '⚡', title: 'Tecnología QR', description: 'Integramos códigos QR para interacción y dinamismo.' },
  { icon: '🎧', title: 'Música curada', description: 'Playlists y DJs seleccionados para cada ambiente.' },
  { icon: '🛰️', title: 'Conectividad', description: 'Infraestructura preparada para experiencias digitales.' },
  { icon: '💡', title: 'Innovación', description: 'A/B tests rápidos de conceptos para el público.' },
  { icon: '🛡️', title: 'Fiabilidad', description: 'Arquitectura estable y escalable.' },
];


// Cócteles
const cocktails = [
  { name: "Virgo Glow", base: "Vodka · Maracuyá", color: "#F8E16B" },
  { name: "Rugido", base: "Whisky · Ginger", color: "#E65353" },
  { name: "Big Bang Shot", base: "Tequila · Blue Curaçao", color: "#4FA6FF" },
  { name: "Cadena Perpetua", base: "Ron · Cola · Limón", color: "#9AE6B4" },
  { name: "Almas Perdidas", base: "Jäger · Energizante", color: "#B794F4" },
  { name: "Re-Bajona Mix", base: "Pisco · Fresa", color: "#FF8FA3" },
];

// Galería de imágenes
const gallery = [
  { src: '#', alt: 'Ambiente' },
  { src: '#', alt: 'Luces' },
  { src: '#', alt: 'Pista' },
  { src: '#', alt: 'Bar' },
  { src: '#', alt: 'Escenario' },
  { src: '#', alt: 'Experiencia QR' },
];

// Testimonios
const testimonials = [
  { name: "Camila", text: "La mejor vibra de Go Lounge!. Los cócteles 🔥 y la música nunca baja.", rating: 5 },
  { name: "Diego", text: "Festejé mi cumple y los QR para invitados fueron un golazo.", rating: 5 },
  { name: "Mariana", text: "Staff atento y DJs con energía. Volvería mil veces.", rating: 4 },
];

// Posts del blog
const blogPosts = [
  { id:1, title:"Cómo elegir tu cóctel según tu mood", tag:"Coctelería", read:"4 min" },
  { id:2, title:"Detrás de cabina: setlists que prenden", tag:"DJs", read:"5 min" },
  { id:3, title:"Códigos que encienden la fiesta: el poder de los QR", tag:"Experiencia", read:"3 min" },
];

// Staff section eliminada

// FAQ
const faq = [
  { q: "¿Cuál es la edad mínima?", a: "Ingreso a partir de 18 años con DNI o documento válido." },
  { q: "¿Cuál es el dress code?", a: "Casual/Fiestero. Evita sandalias y prendas deportivas." },
  { q: "¿Aceptan Yape/Plin?", a: "Sí, y pronto pagos desde el QR de tu pulsera." },
  { q: "¿Tienen zona para cumpleaños?", a: "Sí, con beneficios y pulseras QR para invitados." },
];

// Componente principal de la landing page
export default function MarketingPage() {
  // Ajuste dinámico de viewport para evitar recortes o scroll inicial mostrando la siguiente sección.
  useEffect(() => {
    const setVh = () => {
      const vh = window.innerHeight;
      document.documentElement.style.setProperty('--app-vh', vh + 'px');
    };
    setVh();
    window.addEventListener('resize', setVh);
    window.addEventListener('orientationchange', setVh);
    return () => {
      window.removeEventListener('resize', setVh);
      window.removeEventListener('orientationchange', setVh);
    };
  }, []);
  // Fuerza ocultar scrollbar en mobile (algunos navegadores aún muestran una barra tenue)
  useEffect(() => {
    const apply = () => {
      if (window.innerWidth <= 900) {
        document.documentElement.classList.add('mobile-no-scrollbar');
        document.body.classList.add('mobile-no-scrollbar');
      } else {
        document.documentElement.classList.remove('mobile-no-scrollbar');
        document.body.classList.remove('mobile-no-scrollbar');
      }
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);
  // Nota: Se eliminó el formulario de reservas de la landing

  return (
    <div
      className="min-h-screen w-full text-white overflow-x-hidden relative marketing-scroll"
      style={{
        background: `radial-gradient(1200px 600px at 15% -10%, ${brand.primary}10, transparent), 
                   radial-gradient(900px 500px at 110% 10%, ${brand.secondary}10, transparent), 
                   linear-gradient(180deg, ${brand.darkA}, ${brand.darkB})`,
      }}
    >
      <style jsx global>{`
        @media (max-width: 900px){
          .marketing-scroll{ -ms-overflow-style: none; scrollbar-width: none; }
          .marketing-scroll::-webkit-scrollbar{ width:0; height:0; display:none; }
          html.mobile-no-scrollbar, body.mobile-no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
          html.mobile-no-scrollbar::-webkit-scrollbar, body.mobile-no-scrollbar::-webkit-scrollbar { width:0; height:0; display:none; }
          body.mobile-no-scrollbar { overscroll-behavior: contain; }
        }
      `}</style>
      {/* Patrón sutil */}
      <div aria-hidden className="pointer-events-none fixed inset-0 opacity-[0.07]" style={{
        backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)`,
        backgroundSize: '36px 36px'
      }} />
  {/* Navegación flotante de secciones (dots) y barra superior fija */}
  <TopNavBar />
  <OverlayNav />
      {/* Hero ocupa todo el viewport (ajustado por --app-vh) y ninguna otra sección se ve en primer pantallazo */}
      <Hero />
      
      {/* Componentes de secciones principales */}
  {/* Sección dinámica de shows (reemplaza la sección estática eliminada) */}
  <DynamicShowsSection />
  <SectionDivider className="my-10 sm:my-14" />
    <BirthdaySection />
  <SectionDivider className="my-10 sm:my-14" />
    <QrSection />
    <SectionDivider className="my-12 sm:my-16" />
    <SpotifySection />
  <SectionDivider className="my-12 sm:my-16 z-30" />
    <GallerySection gallery={gallery} />
  <SectionDivider className="my-12 sm:my-16 z-30" />
  {/* Testimonials ocultados por ahora */}
  {/* <TestimonialsSection testimonials={testimonials} /> */}
  {/* <SectionDivider className="my-10 sm:my-14" /> */}
    <FaqSection faq={faq} />
  <SectionDivider className="my-10 sm:my-14" />
    <BlogSection blogPosts={blogPosts} />
  <SectionDivider className="my-10 sm:my-14" />
    <MapSection />
      
      {/* Footer Component */}
      <Footer />
      {/* Floating Back to Top button */}
      <BackToTop />
    </div>
  );
}
