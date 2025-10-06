"use client";

import React, { useEffect } from "react";
import { brand } from "./styles/brand";

// Importamos los componentes UI reutilizables (no usados por ahora)

// Importamos los componentes de sección
import { TopNavBar } from "./components/TopNavBar";
import { Hero } from "./components/Hero";
import { DynamicShowsSection } from "./components/DynamicShowsSection";
import { BirthdaySection } from "./components/BirthdaySection";
// QrSection removido temporalmente
import { GallerySection } from "./components/GallerySection";
import { SpotifySection } from "./components/SpotifySection";
// Otros módulos deshabilitados en marketing
import { FaqSection } from "./components/FaqSection";
import { MapSection } from "./components/MapSection";
import { BlogSection } from "./components/BlogSection";
import { Footer } from "./components/Footer";
import { SectionDivider } from "./components/SectionDivider";
import { BackToTop } from "./components/BackToTop";
import { UpDownDots } from "./components/UpDownDots";
import { MobilePagerIndicator } from "./components/MobilePagerIndicator";
// import { MobilePagerIndicator } from './components/MobilePagerIndicator';
// navegación móvil por iconos eliminada

// Importar identificadores centralizados
import { SECTIONS } from "./constants/sections";

// Datos estructurados para la landing page
// -----------------------------------------

// Galería de imágenes
const gallery = [
  { src: "#", alt: "Ambiente" },
  { src: "#", alt: "Luces" },
  { src: "#", alt: "Pista" },
  { src: "#", alt: "Bar" },
  { src: "#", alt: "Escenario" },
  { src: "#", alt: "Experiencia QR" },
];

// Posts del blog
const blogPosts = [
  { id: 1, title: "Cómo elegir tu cóctel según tu mood", tag: "Coctelería", read: "4 min" },
  { id: 2, title: "Detrás de cabina: setlists que prenden", tag: "DJs", read: "5 min" },
  {
    id: 3,
    title: "Códigos que encienden la fiesta: el poder de los QR",
    tag: "Experiencia",
    read: "3 min",
  },
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
  // Fuerza ocultar scrollbar en mobile (algunos navegadores aún muestran una barra tenue)
  useEffect(() => {
    const apply = () => {
      if (window.innerWidth < 768) {
        document.documentElement.classList.add("mobile-no-scrollbar");
        document.body.classList.add("mobile-no-scrollbar");
      } else {
        document.documentElement.classList.remove("mobile-no-scrollbar");
        document.body.classList.remove("mobile-no-scrollbar");
      }
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);
  // Nota: Se eliminó el formulario de reservas de la landing

  const [showNavButtons, setShowNavButtons] = React.useState(false);
  const [currentSection, setCurrentSection] = React.useState("");
  const [isDesktop, setIsDesktop] = React.useState(false);
  const didInitHashScroll = React.useRef(false);

  React.useEffect(() => {
    const update = () => {
      try {
        const mq = window.matchMedia("(min-width: 768px)");
        setIsDesktop(mq.matches);
      } catch {
        setIsDesktop((window.innerWidth || 0) >= 768);
      }
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  React.useEffect(() => {
    const hero = document.getElementById("hero");
    if (!hero) return;

    // Estado inicial: si ya hay scroll, mostrar los dots
    try {
      setShowNavButtons(window.scrollY > 8);
    } catch {}

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
    const sections = document.querySelectorAll("[data-section]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setCurrentSection(entry.target.getAttribute("data-section") || "");
          }
        });
      },
      { threshold: 0.5 }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  // Móvil: al cargar con hash (#id) o si cambia el hash, desplazar el pager horizontal
  React.useEffect(() => {
    const applyHash = () => {
      try {
        const isMobile = window.matchMedia && window.matchMedia("(max-width: 767px)").matches;
        if (!isMobile) return;
        const hash = (window.location.hash || "").replace("#", "");
        if (!hash) return;
        const pager = document.getElementById("mobile-pager");
        const target = hash ? document.getElementById(hash) : null;
        if (pager && target) {
          const pagerRect = pager.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();
          const left = targetRect.left - pagerRect.left + (pager as HTMLElement).scrollLeft;
          const behavior: ScrollBehavior = didInitHashScroll.current ? "smooth" : "auto";
          (pager as HTMLElement).scrollTo({ left, behavior });
          if (!didInitHashScroll.current) didInitHashScroll.current = true;
        }
      } catch {}
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
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
  :root { --top-bar-h: 48px; --bottom-indicator-h: 56px; }
  @media (min-width: 768px){ :root { --top-bar-h: 56px; } }
        /* Ocultar scrollbars en mobile para el contenedor principal */
        @media (max-width: 767px) {
          .marketing-scroll {
            -ms-overflow-style: none;
            scrollbar-width: none;
            overflow-y: hidden;
          }
          .marketing-scroll::-webkit-scrollbar {
            width: 0;
            height: 0;
            display: none;
          }
          html.mobile-no-scrollbar,
          body.mobile-no-scrollbar {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          html.mobile-no-scrollbar::-webkit-scrollbar,
          body.mobile-no-scrollbar::-webkit-scrollbar {
            width: 0;
            height: 0;
            display: none;
          }
          body.mobile-no-scrollbar {
            overscroll-behavior: contain;
          }
        }
        /* Desktop: scroll vertical con snap Y */
        @media (min-width: 768px) {
          .marketing-scroll {
            scroll-snap-type: y mandatory;
            scroll-padding-top: calc(8px + var(--top-bar-h, 0px));
          }
          .snap-section {
            scroll-snap-align: start;
            scroll-snap-stop: always;
            min-height: 100vh;
            scroll-margin-top: calc(8px + var(--top-bar-h, 0px));
          }
        }
        @supports (height: 1svh) {
          .snap-section {
            min-height: 100svh;
          }
        }
        @media (min-width: 768px) {
          .marketing-scroll {
            scroll-padding-top: calc(12px + var(--top-bar-h, 0px));
          }
          .snap-section {
            scroll-margin-top: calc(12px + var(--top-bar-h, 0px));
          }
        }
        /* Mobile: pager horizontal */
        @media (max-width: 767px) {
          #mobile-pager {
            display: flex;
            flex-direction: row;
            overflow-x: auto;
            overflow-y: hidden;
            height: 100vh;
            scroll-snap-type: x mandatory;
            scroll-behavior: smooth;
            -webkit-overflow-scrolling: touch;
            overscroll-behavior-x: contain;
          }
          /* Ocultar scrollbar del pager (WebKit/Chromium/Gecko/Trident) */
          #mobile-pager {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          #mobile-pager::-webkit-scrollbar {
            width: 0;
            height: 0;
            display: none;
            background: transparent;
          }
          #mobile-pager::-webkit-scrollbar-thumb {
            background: transparent;
            border: none;
          }
          #mobile-pager::-webkit-scrollbar-track {
            background: transparent;
          }
          @supports (height: 1svh) {
            #mobile-pager { height: 100svh; }
          }
          @supports (height: 1dvh) {
            #mobile-pager { height: 100dvh; }
          }
          #mobile-pager > .snap-section {
            flex: 0 0 100%;
            scroll-snap-align: start;
            scroll-snap-stop: always;
            overflow-y: hidden; /* Bloquear scroll vertical dentro del slide */
            overscroll-behavior-y: contain;
            touch-action: pan-x; /* Priorizar desplazamiento horizontal */
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          #mobile-pager > .snap-section::-webkit-scrollbar {
            width: 0;
            height: 0;
            display: none;
          }
          /* Evitar que el contenido quede bajo la barra superior y la barra inferior de indicadores */
          #mobile-pager > .snap-section {
            /* Altura previa: no compensar con la barra superior en mobile */
            padding-top: 8px;
            /* Evitar doble conteo: var(--bottom-indicator-h) ya incluye safe-area cuando se mide */
            padding-bottom: calc(8px + var(--bottom-indicator-h, 56px));
          }
          /* Hero: pantalla completa real, sin rellenos adicionales */
          #mobile-pager > #hero.snap-section {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
          /* Hero: que ocupe el alto completo sin padding extra del slide */
          #mobile-pager > #hero.snap-section {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
          /* Ocultar divisores entre slides en móvil para evitar "huecos" horizontales */
          #mobile-pager .section-divider {
            display: none !important;
          }
        }
      `}</style>
      {/* Patrón sutil */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)`,
          backgroundSize: "36px 36px",
        }}
      />
      {/* Navegación flotante de secciones (dots) y barra superior fija */}
      <TopNavBar />
      {/* Hero: en desktop se muestra como portada vertical; en móvil vive dentro del pager horizontal */}
      {isDesktop && <Hero />}

      {/* Componentes de secciones principales */}
      <div id="mobile-pager">
        {/* Mobile: incluir hero como primer slide del pager horizontal */}
        {!isDesktop && (
          <div
            id="hero"
            data-section="hero"
            tabIndex={-1}
            role="region"
            aria-label="Inicio"
            className="snap-section"
          >
            <Hero />
          </div>
        )}
        {/* Sección dinámica de shows (reemplaza la sección estática eliminada) */}
        <div
          id="shows"
          data-section="shows"
          tabIndex={-1}
          role="region"
          aria-label="Estelares"
          className="snap-section"
        >
          <DynamicShowsSection />
        </div>
        {isDesktop && <SectionDivider className="my-10 sm:my-14" />}
        <div
          id="cumple"
          data-section="cumple"
          tabIndex={-1}
          role="region"
          aria-label="Cumpleaños"
          className="snap-section"
        >
          <BirthdaySection />
        </div>
        {isDesktop && <SectionDivider className="my-10 sm:my-14" />}
        <div
          id="spotify"
          data-section="spotify"
          tabIndex={-1}
          role="region"
          aria-label="Spotify"
          className="snap-section"
        >
          <SpotifySection />
        </div>
        {isDesktop && <SectionDivider className="my-12 sm:my-16" />}
        <div
          id="galeria"
          data-section="galeria"
          tabIndex={-1}
          role="region"
          aria-label="Galería"
          className="snap-section"
        >
          <GallerySection gallery={gallery} />
        </div>
        {isDesktop && <SectionDivider className="my-12 sm:my-16 z-30" />}
        <div
          id="faq"
          data-section="faq"
          tabIndex={-1}
          role="region"
          aria-label="Preguntas frecuentes"
          className="snap-section"
        >
          <FaqSection faq={faq} />
        </div>
        {isDesktop && <SectionDivider className="my-10 sm:my-14" />}
        <div
          id="blog"
          data-section="blog"
          tabIndex={-1}
          role="region"
          aria-label="Blog"
          className="snap-section"
        >
          <BlogSection blogPosts={blogPosts} />
        </div>
        {isDesktop && <SectionDivider className="my-10 sm:my-14" />}
        <div
          id="mapa"
          data-section="mapa"
          tabIndex={-1}
          role="region"
          aria-label="Mapa"
          className="snap-section"
        >
          <MapSection />
        </div>
      </div>

  {/* Indicador de sección fijo abajo (solo móvil) */}
  {!isDesktop && <MobileIndicatorDock />}

      {/* Footer Component: solo desktop */}
      {isDesktop && <Footer />}
      {/* Floating Back to Top button */}
      <BackToTop />
      {/* Mantener dots sólo en desktop/tablet; en móvil usamos la barra de iconos */}
      {showNavButtons && isDesktop && <UpDownDots />}
      {/* Navegación por iconos móvil eliminada para dejar scroll intuitivo */}
    </div>
  );
}

function MobileIndicatorDock() {
  const [inHero, setInHero] = React.useState(true);

  // Detectar si el hero está visible para ocultar completamente el dock
  React.useEffect(() => {
    const hero = document.getElementById("hero");
    if (!hero) {
      setInHero(false);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => setInHero(e.isIntersecting)),
      { threshold: 0.6 }
    );
    obs.observe(hero);
    return () => obs.disconnect();
  }, []);

  React.useEffect(() => {
    const apply = () => {
      const el = document.getElementById("mobile-indicator-dock");
      const h = el ? el.offsetHeight : 0;
      document.documentElement.style.setProperty("--bottom-indicator-h", `${h}px`);
    };
    const raf = requestAnimationFrame(apply);
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
    };
  }, []);

  // No renderizar el dock cuando el hero está en pantalla para evitar el hueco
  if (inHero) return null;

  return (
    <div
      id="mobile-indicator-dock"
      className="md:hidden fixed inset-x-0 bottom-0 z-50"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        background: "linear-gradient(0deg, rgba(10,10,15,0.9), rgba(10,10,15,0.6))",
        WebkitBackdropFilter: "blur(12px)",
        backdropFilter: "blur(12px)",
        minHeight: "var(--bottom-indicator-h, 56px)",
      }}
    >
      {/* En el dock, renderizamos el indicador completo, sin ocultarlo en el Hero */}
      <MobilePagerIndicator />
    </div>
  );
}
