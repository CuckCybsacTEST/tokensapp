"use client";
import React from "react";
import { motion } from "framer-motion";

type Props = {
  className?: string;
};

export function ScrollDownToShows({ className }: Props) {
  const onMobileClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    try {
      const isMobile =
        typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
      if (!isMobile) return;
      e.preventDefault();
      const pager = document.getElementById("mobile-pager") as HTMLElement | null;
      const target = document.getElementById("shows");
      const hero = document.getElementById("hero");
      if (pager && target) {
        // Si el hero está dentro del pager, el target está a +1 slide desde hero
        const left = target.offsetLeft; // posición exacta del slide dentro del pager
        pager.scrollTo({ left, behavior: "smooth" });
        history.replaceState(null, "", "#shows");
      }
    } catch {}
  };

  const baseCls =
    className ??
    "absolute bottom-10 z-[1100] flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-md cursor-pointer hover:opacity-90 pointer-events-auto";

  return (
    <>
      {/* Desktop: flecha hacia abajo, anima en eje Y, ancla vertical */}
      <motion.a
        href="#shows"
        key="scroll-down-desktop"
        initial={{ y: 0 }}
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className={`${baseCls} hidden md:flex`}
        aria-label="Ir a Próximos Shows"
        title="Ir a Próximos Shows"
        style={{ touchAction: "manipulation" }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-6 h-6 text-gray-800"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </motion.a>

      {/* Mobile: flecha derecha minimalista, anima en eje X, desplaza pager horizontal */}
      <motion.a
        href="#shows"
        key="scroll-right-mobile"
        initial={{ x: 0 }}
        animate={{ x: [0, 10, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className={`${baseCls} md:hidden`}
        aria-label="Ir a Próximos Shows"
        title="Ir a Próximos Shows"
        onClick={onMobileClick}
        style={{ touchAction: "manipulation" }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-6 h-6 text-gray-800"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
        </svg>
      </motion.a>
    </>
  );
}

export default ScrollDownToShows;
