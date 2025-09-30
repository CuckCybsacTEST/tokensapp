'use client';

import React from 'react';
import { brand } from '../styles/brand';
import { motion } from 'framer-motion';

export interface FooterProps {
  // Props can be added here if needed in the future
}

export const Footer: React.FC<FooterProps> = () => {
  const currentYear = new Date().getFullYear();
  
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6 }
    }
  };

  return (
    <footer className="relative" style={{ background: "rgba(0,0,0,0.5)", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
      <motion.div 
        className="container mx-auto max-w-5xl px-4 md:px-8 py-10 grid gap-8 md:grid-cols-4"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
      >
        <motion.div variants={fadeInUp}>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg" style={{ background: `linear-gradient(135deg, ${brand.primary}, ${brand.secondary})` }} />
            <span className="font-black">Go Lounge!</span>
          </div>
          <p className="text-sm mt-3" style={{ color: "#FFFFFF99" }}>Tu noche empieza aquí.</p>
          <div className="mt-4 flex gap-3">
            {['instagram', 'facebook', 'tiktok', 'whatsapp'].map(social => (
              <a 
                key={social} 
                href={`#${social}`}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: `rgba(255,255,255,0.1)`, transition: "all 0.2s ease" }}
                onMouseEnter={(e) => e.currentTarget.style.background = `rgba(255,255,255,0.2)`}
                onMouseLeave={(e) => e.currentTarget.style.background = `rgba(255,255,255,0.1)`}
              >
                <span className="text-sm">
                  {social === 'instagram' && '📸'}
                  {social === 'facebook' && '👍'}
                  {social === 'tiktok' && '🎵'}
                  {social === 'whatsapp' && '💬'}
                </span>
              </a>
            ))}
          </div>
        </motion.div>
        
        <motion.div className="text-sm" style={{ color: "#FFFFFFB3" }} variants={fadeInUp}>
          <p className="font-semibold mb-2" style={{ color: "#fff" }}>Enlaces rápidos</p>
          <ul className="space-y-1">
            <li><a href="#galeria" className="hover:underline">📸 Galería</a></li>
            <li><a href="#testimonios" className="hover:underline">💬 Testimonios</a></li>
            <li><a href="#reservas" className="hover:underline">📅 Reservas</a></li>
            <li><a href="#mapa" className="hover:underline">📍 Ubicación</a></li>
          </ul>
        </motion.div>
        
        <motion.div className="text-sm" style={{ color: "#FFFFFFB3" }} variants={fadeInUp}>
          <p className="font-semibold mb-2" style={{ color: "#fff" }}>Comunidades</p>
          <ul className="space-y-1">
            <li><a href="#" className="hover:underline">Grupo WhatsApp</a></li>
            <li><a href="#" className="hover:underline">Facebook</a></li>
            <li><a href="#" className="hover:underline">Instagram</a></li>
            <li><a href="#" className="hover:underline">TikTok</a></li>
          </ul>
        </motion.div>
        
        <motion.div className="text-sm" style={{ color: "#FFFFFFB3" }} variants={fadeInUp}>
          <p className="font-semibold mb-2" style={{ color: "#fff" }}>Admin</p>
          <ul className="space-y-1">
            <li><a href="/admin" className="hover:underline">Panel de Control</a></li>
            <li><a href="/admin/prizes" className="hover:underline">Premios</a></li>
            <li><a href="/admin/batches" className="hover:underline">Lotes</a></li>
          </ul>
        </motion.div>
      </motion.div>
      
      <motion.div 
        className="text-center text-xs pb-8" 
        style={{ color: "#FFFFFF80" }}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1, transition: { delay: 0.5, duration: 0.6 } }}
        viewport={{ once: true }}
      >
  © {currentYear} Go Lounge!. Todos los derechos reservados.
      </motion.div>
    </footer>
  );
};
