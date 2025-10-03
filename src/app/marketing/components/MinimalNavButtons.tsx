import React from 'react';
import { motion } from 'framer-motion';

export function MinimalNavButtons() {
  const sections = [
    'hero',
    'shows',
    'cumple',
    'por-que-elegirnos',
    'spotify',
    'galeria',
    'faq',
    'blog',
    'mapa',
  ];

  const scrollToSection = (direction: 'up' | 'down') => {
    if (typeof window !== 'undefined') {
      const currentIndex = sections.findIndex((section) => {
        const element = document.querySelector(`#${section}`);
        return (
          element &&
          element.getBoundingClientRect().top < window.innerHeight / 2 &&
          element.getBoundingClientRect().bottom > window.innerHeight / 2
        );
      });

      if (currentIndex === -1) return; // Evitar errores si no se encuentra la sección actual

      let targetIndex;
      if (direction === 'up') {
        targetIndex = currentIndex - 1;
        while (targetIndex >= 0) {
          const targetElement = document.querySelector(`#${sections[targetIndex]}`);
          if (targetElement) break;
          targetIndex--;
        }
      } else {
        targetIndex = currentIndex + 1;
        while (targetIndex < sections.length) {
          const targetElement = document.querySelector(`#${sections[targetIndex]}`);
          if (targetElement) break;
          targetIndex++;
        }
      }

      if (targetIndex >= 0 && targetIndex < sections.length) {
        const targetSection = document.querySelector(`#${sections[targetIndex]}`);
        if (targetSection) {
          targetSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  };

  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-4">
      {/* Botón hacia arriba */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => scrollToSection('up')}
        className="h-10 w-10 border-2 border-white rounded-full flex items-center justify-center"
        aria-label="Scroll Up"
      >
        <span className="text-white">↑</span>
      </motion.button>

      {/* Botón hacia abajo */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => scrollToSection('down')}
        className="h-10 w-10 border-2 border-white rounded-full flex items-center justify-center"
        aria-label="Scroll Down"
      >
        <span className="text-white">↓</span>
      </motion.button>
    </div>
  );
}

export default MinimalNavButtons;