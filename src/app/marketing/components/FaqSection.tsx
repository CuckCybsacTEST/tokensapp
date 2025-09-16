import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { brand } from '../styles/brand';
import { SectionTitle } from './ui/SectionTitle';

interface FaqSectionProps {
  faq: {
    q: string;
    a: string;
  }[];
}

export function FaqSection({ faq }: FaqSectionProps) {
  // Estado para controlar qué pregunta está actualmente expandida
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  
  // Función para alternar la pregunta expandida
  const toggleQuestion = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };
  
  return (
    <section id="faq" className="py-16 relative overflow-hidden">
      {/* Fondo decorativo */}
      <div 
        className="absolute inset-0 z-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(135deg, ${brand.primary}11, ${brand.secondary}11)`,
        }}
      />
      
  <div className="container mx-auto max-w-7xl px-4 md:px-8 relative z-10">
        <SectionTitle
          kicker="Preguntas frecuentes"
          title="Todo lo que necesitas saber"
          subtitle="Respuestas a las dudas más comunes de nuestros visitantes"
        />
        
        <div className="mt-12 space-y-4">
          {faq.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="overflow-hidden rounded-lg"
              style={{ 
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              {/* Pregunta (siempre visible) */}
              <button
                onClick={() => toggleQuestion(index)}
                className="flex justify-between items-center w-full p-5 text-left"
              >
                <h3 className="font-medium">{item.q}</h3>
                <div 
                  className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 transition-transform"
                  style={{ 
                    background: expandedIndex === index ? brand.primary : 'rgba(255,255,255,0.1)',
                    transform: expandedIndex === index ? 'rotate(45deg)' : 'rotate(0deg)'
                  }}
                >
                  <span className="text-sm font-bold">+</span>
                </div>
              </button>
              
              {/* Respuesta (visible solo cuando está expandida) */}
              <AnimatePresence>
                {expandedIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div 
                      className="p-5 pt-0" 
                      style={{ color: brand.text.secondary }}
                    >
                      {item.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
        
        {/* Bloque de contacto removido a petición; mantenemos solo el listado de FAQ */}
      </div>
    </section>
  );
}
