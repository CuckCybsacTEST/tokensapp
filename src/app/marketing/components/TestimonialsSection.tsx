import React from 'react';
import { motion } from 'framer-motion';
import { brand } from '../styles/brand';
import { SectionTitle } from './ui/SectionTitle';
import { Stars } from './ui/Stars';

interface TestimonialsSectionProps {
  testimonials: {
    name: string;
    text: string;
    rating: number;
  }[];
}

export function TestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  return (
  <section id="testimonios" className="py-14 md:py-20 relative overflow-hidden flex items-center justify-center">
      {/* Elementos decorativos de fondo */}
      <motion.div 
        aria-hidden 
        initial={{ rotate: 0 }} 
        animate={{ rotate: 360 }} 
        transition={{ duration: 100, ease: "linear", repeat: Infinity }} 
        style={{ 
          position: "absolute", 
          left: "10%",
          top: "30%",
          width: "30%",
          height: "30%",
          borderRadius: "50%",
          border: `1px solid ${brand.secondary}22`,
          zIndex: 0,
          opacity: 0.3
        }} 
      />
      <motion.div 
        aria-hidden 
        initial={{ rotate: 0 }} 
        animate={{ rotate: -360 }} 
        transition={{ duration: 80, ease: "linear", repeat: Infinity }} 
        style={{ 
          position: "absolute", 
          right: "5%",
          bottom: "20%",
          width: "25%",
          height: "25%",
          borderRadius: "50%",
          border: `1px solid ${brand.primary}22`,
          zIndex: 0,
          opacity: 0.3
        }} 
      />
      
  <div className="container mx-auto max-w-7xl px-4 md:px-8 py-8 md:py-12 relative z-10 w-full">
        <SectionTitle 
          kicker="Testimonios"
          title="Lo que dicen nuestros clientes"
          subtitle="Experiencias reales de quienes han vivido Go Lounge!"
        />
        
  <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              viewport={{ once: true }}
              className="backdrop-blur-sm rounded-lg p-4 flex flex-col justify-between min-h-[180px]"
              style={{ 
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: `0 4px 16px -8px ${brand.primary}33`
              }}
            >
              {/* Comillas decorativas */}
              <div className="text-2xl mb-2 opacity-40 text-center" style={{ color: brand.accent }}>❝</div>
              <p className="mb-3 text-xs text-center" style={{ color: brand.text.secondary }}>
                {testimonial.text}
              </p>
              <div className="flex flex-col items-center gap-1 mt-2">
                <Stars value={testimonial.rating} />
                <p className="font-bold text-xs mt-1">{testimonial.name}</p>
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* CTA para dejar reseña */}
        <div className="mt-10 text-center">
          <a 
            href="#" 
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold transition" 
            style={{ 
              background: brand.accent,
              color: '#000',
              boxShadow: `0 12px 32px -10px ${brand.accent}99` 
            }}
          >
            <span className="text-xl">⭐</span>
            Deja tu opinión
          </a>
        </div>
      </div>
    </section>
  );
}
