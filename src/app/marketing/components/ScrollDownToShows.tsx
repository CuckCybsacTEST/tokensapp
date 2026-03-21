"use client";
import React from "react";
import { motion } from "framer-motion";

export function ScrollDownToShows() {
  /** Busca la primera sección visible después del hero según lo habilitado en /admin/marketing-controls */
  const findNextSection = (): HTMLElement | null => {
    const all = Array.from(document.querySelectorAll<HTMLElement>("[data-section]"));
    const heroIdx = all.findIndex((el) => el.dataset.section === "hero");
    // Retorna la primera sección después del hero que esté en el DOM (si existe, está habilitada)
    return all[heroIdx + 1] ?? all.find((el) => el.dataset.section !== "hero") ?? null;
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      const target = findNextSection();
      if (!target) return;
      const sectionId = target.dataset.section || target.id;
      const isMobile =
        typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;

      if (isMobile) {
        const pager = document.getElementById("mobile-pager") as HTMLElement | null;
        if (pager && target) {
          pager.scrollTo({ left: target.offsetLeft, behavior: "smooth" });
          if (sectionId) history.replaceState(null, "", `#${sectionId}`);
        }
      } else {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        if (sectionId) history.replaceState(null, "", `#${sectionId}`);
      }
    } catch {}
  };

  return (
    <motion.button
      onClick={handleClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 1.0 }}
      className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white/90 hover:text-white backdrop-blur-md border border-white/15 hover:border-white/30 transition-all duration-300 cursor-pointer"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
        boxShadow: "0 8px 24px -8px rgba(0,0,0,0.4)",
      }}
      aria-label="Explorar más secciones"
    >
      Explorar más
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
      </svg>
    </motion.button>
  );
}

export default ScrollDownToShows;
