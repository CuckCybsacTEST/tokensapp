'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { brand } from './styles/brand';

// Importamos los componentes UI reutilizables
import { SectionTitle } from './components/ui/SectionTitle';
import { ScrollX } from './components/ui/ScrollX';
import { Stars } from './components/ui/Stars';

// Importamos los componentes de sección
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { EventsSection } from './components/EventsSection';
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

// Eventos
const events: Array<{
  id: number; date: string; title: string; tag: string; poster?: string; aspect?: '4:5' | '9:16'; img?: string;
}> = [
  { id: 1, date: "Sáb 21 Sep", title: "SÁBADOS ESTELARES", tag: "Headliners · House x Reggaetón", poster: "/img/events/sabados-estelares-1080x1920.jpg", aspect: '9:16', img: "linear-gradient(135deg,#3d0a0a,#5c1111)" },
  { id: 2, date: "Sáb 28 Sep", title: "NEON NIGHT SHOW", tag: "Temático · Old vs New", poster: "/img/events/neon-night-1080x1920.jpg", aspect: '9:16', img: "linear-gradient(135deg,#4a0c0c,#7a1a1a)" },
  { id: 3, date: "Sáb 05 Oct", title: "LIVE SPECIAL GUEST", tag: "Invitado sorpresa", poster: "/img/events/special-guest-1080x1920.jpg", aspect: '9:16', img: "linear-gradient(135deg,#5c1111,#8c2323)" },
  { id: 4, date: "Sáb 12 Oct", title: "COCTELERÍA & HITS", tag: "Edición especial", poster: "/img/events/cocktails-hits-1080x1920.jpg", aspect: '9:16', img: "linear-gradient(135deg,#6e1515,#a52b2b)" },
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
  { name: "Camila", text: "La mejor vibra de QR Platform. Los cócteles 🔥 y la música nunca baja.", rating: 5 },
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
  // Nota: Se eliminó el formulario de reservas de la landing

  return (
    <div
      className="min-h-screen w-full text-white overflow-x-hidden relative"
      style={{
        background: `radial-gradient(1200px 600px at 15% -10%, ${brand.primary}10, transparent), 
                   radial-gradient(900px 500px at 110% 10%, ${brand.secondary}10, transparent), 
                   linear-gradient(180deg, ${brand.darkA}, ${brand.darkB})`,
      }}
    >
      {/* Patrón sutil */}
      <div aria-hidden className="pointer-events-none fixed inset-0 opacity-[0.07]" style={{
        backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)`,
        backgroundSize: '36px 36px'
      }} />
      {/* Componente Navbar */}
      <Navbar />
      
    {/* Componente Hero */}
    <Hero />
      
      {/* Componentes de secciones principales */}
    <EventsSection events={events} />
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
