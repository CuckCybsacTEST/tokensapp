import React from 'react';
import { motion } from 'framer-motion';

// Importar identificadores centralizados
import { SECTIONS } from '../constants/sections';

export function MinimalNavButtons() {
  // Reemplazar la definición local de "sections" con la importación
  const sections = SECTIONS.map((section) => section.id);

  // Función auxiliar para buscar una sección por su índice
  const getSectionElement = (index: number) => {
    const sectionId = sections[index];
    return sectionId ? document.querySelector(`#${sectionId}`) : null;
  };

  const scrollToSection = (direction: 'up' | 'down') => {
    if (typeof window === 'undefined') return;

    const currentIndex = sections.findIndex((section) => {
      const element = document.querySelector(`#${section}`);
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return rect.top < window.innerHeight / 2 && rect.bottom > window.innerHeight / 2;
    });

    if (currentIndex === -1) return;

    const targetIndex =
      direction === 'up' ? Math.max(0, currentIndex - 1) : Math.min(sections.length - 1, currentIndex + 1);

    const targetElement = getSectionElement(targetIndex);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const buttonStyles = "h-10 w-10 border-2 border-white rounded-full flex items-center justify-center";

  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-4">
      {/* Botón hacia arriba */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => scrollToSection('up')}
        className={buttonStyles}
        aria-label="Scroll Up"
      >
        <span className="text-white">↑</span>
      </motion.button>

      {/* Botón hacia abajo */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => scrollToSection('down')}
        className={buttonStyles}
        aria-label="Scroll Down"
      >
        <span className="text-white">↓</span>
      </motion.button>
    </div>
  );
}

export default MinimalNavButtons;