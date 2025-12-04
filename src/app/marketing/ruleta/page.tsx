import React from "react";
import styles from "./rouletteLayout.module.css";
import { Metadata } from "next";
import RouletteClientPage from "./RouletteClientPage";
import ShowBackground from "@/components/background/ShowBackground";
import FooterGate from "./FooterGate";
// import MarketingNavbar from '../components/MarketingNavbar';

export const metadata: Metadata = {
  title: "Ruleta de Premios",
  description: "Gira la ruleta y descubre tu premio en Go Lounge!",
};

interface RuletaSearchParams {
  tokenId?: string;
  theme?: string;
}

export default function RuletaPage({ searchParams }: { searchParams: RuletaSearchParams }) {
  const tokenId = searchParams.tokenId || "";
  const themeFromQuery = typeof searchParams.theme === "string" ? searchParams.theme : undefined;
  const theme = themeFromQuery || process.env.NEXT_PUBLIC_ROULETTE_THEME || "";

  return (
    <>
      {/** Navbar oculto temporalmente en la experiencia de la ruleta para enfoque completo en el juego.
       *  TODO: Re-evaluar si se reintroduce una variante mínima del navbar o breadcrumb.
       *  Original: <MarketingNavbar />
       */}
      {/* <MarketingNavbar /> */}

      {/*
        Estructura flex para ocupar toda la altura y evitar gran bloque vacío inferior en pantallas altas.
        - justify-start en alturas normales
        - md:justify-start para mantener en tablets
        - En pantallas muy altas (>=1000px) aplicamos justify-center para centrar el bloque principal.
        Usamos clases utilitarias y una media query inline adicional para casos extremos (>1400px).
      */}
      <div className="relative min-h-screen flex flex-col px-0 pt-6 sm:pt-10 pb-10 sm:pb-12">
        {/* Fondo compuesto reutilizable intacto: degradado base + efectos */}
        <ShowBackground intensity="medium" theme="marketing" />
        <FooterGate />
        <div
          className={`relative z-[1] flex-1 w-full max-w-5xl mx-auto flex flex-col ${styles.rouletteViewport}`}
        >
          <RouletteClientPage tokenId={tokenId} theme={theme} />
        </div>
        <footer className="relative z-[1] pt-8 text-center text-white/50 text-xs roulette-footer">
          <p>© 2025 Go Lounge!</p>
        </footer>
      </div>
      {/* Eliminado styled-jsx para mantener este Server Component puro y evitar client-only import */}
    </>
  );
}
