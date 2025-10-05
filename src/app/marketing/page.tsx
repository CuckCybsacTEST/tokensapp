'use client';

import React, { useEffect } from 'react';
import { brand } from './styles/brand';

// Importamos los componentes UI reutilizables
// import { SectionTitle } from './components/ui/SectionTitle';

// Importamos los componentes de sección
import { TopNavBar } from './components/TopNavBar';
import { Hero } from './components/Hero';
import { DynamicShowsSection } from './components/DynamicShowsSection';
import { BirthdaySection } from './components/BirthdaySection';
// import { QrSection } from './components/QrSection';
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
import { UpDownDots } from './components/UpDownDots';

// Importar identificadores centralizados
import { SECTIONS } from './constants/sections';

// Datos estructurados para la landing page
// -----------------------------------------

// Galería de imágenes
const gallery = [
  { src: '#', alt: 'Ambiente' },
  { src: '#', alt: 'Luces' },
  { src: '#', alt: 'Pista' },
  { src: '#', alt: 'Bar' },
  { src: '#', alt: 'Escenario' },
  { src: '#', alt: 'Experiencia QR' },
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

  const [showNavButtons, setShowNavButtons] = React.useState(false);
  const [currentSection, setCurrentSection] = React.useState('');

  React.useEffect(() => {
    const hero = document.getElementById('hero');
    if (!hero) return;

    // Estado inicial: si ya hay scroll, mostrar los dots
    try { setShowNavButtons(window.scrollY > 8); } catch {}

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Mostrar dots cuando el hero deja de cubrir casi toda la pantalla
          const ratio = entry.intersectionRatio ?? 0;
          setShowNavButtons(ratio < 0.96);
        });
      },
      { threshold: [0, 0.01, 0.05, 0.1, 0.2, 0.3, 0.5, 0.7, 0.9, 0.96] }
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const sections = document.querySelectorAll('[data-section]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setCurrentSection(entry.target.getAttribute('data-section') || '');
          }
        });
      },
      { threshold: 0.5 }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

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
        /* Scroll snap para que cada sección llene el viewport y quede alineada */
        .marketing-scroll{ scroll-snap-type: y mandatory; }
        .snap-section{ scroll-snap-align: start; min-height: var(--app-vh, 100svh); }
      `}</style>
      {/* Patrón sutil */}
      <div aria-hidden className="pointer-events-none fixed inset-0 opacity-[0.07]" style={{
        backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)`,
        backgroundSize: '36px 36px'
      }} />
  {/* Navegación flotante de secciones (dots) y barra superior fija */}
  <TopNavBar />
      {/* Hero ocupa todo el viewport (ajustado por --app-vh) y ninguna otra sección se ve en primer pantallazo */}
      <Hero />
      
      {/* Componentes de secciones principales */}
  {/* Sección dinámica de shows (reemplaza la sección estática eliminada) */}
  <div id="shows" data-section="shows" tabIndex={-1} role="region" aria-label="Estelares" className="snap-section">
        <DynamicShowsSection />
      </div>
      <SectionDivider className="my-10 sm:my-14" />
  <div id="cumple" data-section="cumple" tabIndex={-1} role="region" aria-label="Cumpleaños" className="snap-section">
        <BirthdaySection />
      </div>
      <SectionDivider className="my-10 sm:my-14" />
  <div id="spotify" data-section="spotify" tabIndex={-1} role="region" aria-label="Spotify" className="snap-section">
        <SpotifySection />
      </div>
      <SectionDivider className="my-12 sm:my-16" />
  <div id="galeria" data-section="galeria" tabIndex={-1} role="region" aria-label="Galería" className="snap-section">
        <GallerySection gallery={gallery} />
      </div>
      <SectionDivider className="my-12 sm:my-16 z-30" />
  <div id="faq" data-section="faq" tabIndex={-1} role="region" aria-label="Preguntas frecuentes" className="snap-section">
        <FaqSection faq={faq} />
      </div>
      <SectionDivider className="my-10 sm:my-14" />
  <div id="blog" data-section="blog" tabIndex={-1} role="region" aria-label="Blog" className="snap-section">
        <BlogSection blogPosts={blogPosts} />
      </div>
      <SectionDivider className="my-10 sm:my-14" />
  <div id="mapa" data-section="mapa" tabIndex={-1} role="region" aria-label="Mapa" className="snap-section">
        <MapSection />
      </div>
      
      {/* Footer Component */}
      <Footer />
      {/* Floating Back to Top button */}
      <BackToTop />
  {showNavButtons && <UpDownDots />}
    </div>
  );
}
