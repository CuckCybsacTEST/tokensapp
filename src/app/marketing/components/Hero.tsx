"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DynamicTitle } from "./DynamicTitle";
import { HeroVideo } from "./HeroVideo";
import { BirthdaySearch } from "./BirthdaySearch";
import ScrollDownToShows from "./ScrollDownToShows";

export function Hero() {
  const [showScroll, setShowScroll] = useState(true);

  useEffect(() => {
    function onScroll() {
      setShowScroll(window.scrollY <= 40);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section
      id="hero"
      className="relative overflow-hidden flex items-center justify-center w-full pt-0 md:pt-12"
      style={{ minHeight: '100vh' }}
    >
      {/* Video background with adaptive resolution + overlay */}
      <HeroVideo showOverlay overlayBlur={10} />

      <div className="container mx-auto max-w-6xl px-4 md:px-8 py-0 relative z-20 w-full">
        <div className="flex flex-col items-center justify-center text-center gap-4 md:gap-6">
          {/* Dynamic Title Component with LED effect */}
          <DynamicTitle />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-3 max-w-xl mx-auto text-base md:text-lg opacity-90"
            style={{ color: "#FFFFFFDD" }}
          >
            Un espacio donde tecnología y ambiente social se combinan para vivir algo distinto.
          </motion.p>

          {/* Public birthday search on hero */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="w-full mt-1 md:mt-2"
          >
            <BirthdaySearch />
          </motion.div>
        </div>
      </div>

      {/* Scroll-down button (componente) */}
      {showScroll && <ScrollDownToShows />}
        <style jsx>{`
          @media (max-width: 767px){
            #hero{
              /* Reservar espacio para la barra superior fija (h-12 ≈ 48px) + safe-area */
              min-height: calc(100svh - 48px - env(safe-area-inset-top, 0px));
              padding-top: calc(env(safe-area-inset-top, 0px) + 48px);
            }
          }
        `}</style>
    </section>
  );
}
