import React from 'react';
import { motion } from 'framer-motion';
import { brand } from '../styles/brand';

export function Hero() {
  return (
  <section id="hero" className="relative overflow-hidden flex items-center justify-center w-full pt-24 md:pt-32" style={{ minHeight: 'var(--app-vh,100vh)' }}>
      <motion.div 
        aria-hidden 
        initial={{ rotate: 0 }} 
        animate={{ rotate: 360 }} 
        transition={{ duration: 40, ease: "linear", repeat: Infinity }} 
        style={{ 
          position: "absolute", 
          inset: "-20%", 
          background: `conic-gradient(from 90deg at 50% 50%, ${brand.primary}33, ${brand.secondary}33, ${brand.accent}22, ${brand.primary}33)`, 
          filter: "blur(70px)", 
          zIndex: 0 
        }} 
      />
      <div className="container mx-auto max-w-6xl px-4 md:px-8 py-10 md:py-16 relative z-10 w-full">
        <div className="flex flex-col items-center justify-center text-center gap-4 md:gap-6">
          {/* Título principal EL LOUNGE + byline responsive */}
          <div className="mt-4 md:mt-6 flex flex-col md:flex-row items-center justify-center gap-1.5 md:gap-3">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.6, delay: 0.3 }} 
              className="text-[40px] md:text-[72px] font-black leading-[0.95] tracking-tight"
              style={{ color: brand.primary, textShadow: `0 0 14px ${brand.primary}70, 0 0 28px ${brand.secondary}40`, fontFamily: 'var(--font-display)' }}
            >
              EL LOUNGE
            </motion.h1>
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="text-sm md:text-base font-medium opacity-80"
              style={{ color: `#FFFFFFB8`, fontFamily: 'var(--font-text)' }}
            >
              by ktdral
            </motion.span>
          </div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-3 max-w-xl mx-auto text-base md:text-lg opacity-90"
            style={{ color: "#FFFFFFDD", fontFamily: 'var(--font-text)' }}
          >
            Un espacio donde tecnología y ambiente social se combinan para vivir algo distinto.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="mt-10 flex flex-col sm:flex-row gap-4 w-full max-w-md mx-auto sm:w-auto justify-center"
          >
            <a 
              href="#shows" 
              className="rounded-full px-4 py-2.5 font-semibold text-sm transition-all duration-300 w-full sm:w-auto text-center flex-1 shadow-md"
              style={{ 
                background: `linear-gradient(135deg, ${brand.primary}, ${brand.primary}ee)`,
                boxShadow: `0 6px 16px -6px ${brand.primary}60`,
                border: "1px solid rgba(255,255,255,0.12)"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
            >
              Próximos Estelares
            </a>
            <a 
              href="#cumple" 
              className="rounded-full px-4 py-2.5 font-semibold text-sm transition-all duration-300 w-full sm:w-auto text-center flex-1 shadow"
              style={{ 
                background: "rgba(255,255,255,0.07)", 
                boxShadow: "0 0 0 1px rgba(255,255,255,0.10) inset",
                backdropFilter: "blur(8px)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.background = "rgba(255,255,255,0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.background = "rgba(255,255,255,0.07)";
              }}
            >
              Celebra tu cumple
            </a>
          </motion.div>
        </div>
      </div>
      {/* Separador anclado al final del hero */}
      <div
        className="pointer-events-none absolute bottom-0 inset-x-0 z-10 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${brand.primary}80, transparent)`,
          boxShadow: `0 0 20px ${brand.primary}40`
        }}
      />
    </section>
  );
}
