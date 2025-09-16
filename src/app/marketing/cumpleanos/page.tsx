'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { brand } from '../styles/brand';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { BirthdayForm } from './components/BirthdayForm';

export default function BirthdayPage() {
  return (
    <main className="min-h-screen bg-black text-white overflow-hidden">
      {/* Background overlay con gradiente */}
      <div 
        className="fixed inset-0 z-0 bg-gradient-to-br from-black via-black to-black" 
        style={{ 
          backgroundImage: `
            radial-gradient(circle at 20% 30%, ${brand.primary}15 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, ${brand.secondary}10 0%, transparent 40%)
          `,
          opacity: 0.95
        }}
      />
      
      {/* Navbar */}
      <Navbar />
      
      {/* Hero con formulario de cumpleaños */}
      <section className="relative py-16 md:py-24">
        <div className="container mx-auto max-w-5xl px-4 md:px-8">
          <div className="flex flex-col items-center justify-center text-center mb-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight"
                style={{ 
                  background: `linear-gradient(135deg, ${brand.primary}, ${brand.secondary})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: `0 10px 30px ${brand.primary}50`
                }}
              >
                Celebra tu cumpleaños con nosotros
              </h1>
              
              <p className="text-xl md:text-2xl opacity-80 mb-8 max-w-3xl mx-auto">
                Hazlo especial en un espacio pensado para que tú y tus invitados lo disfruten al máximo
              </p>
              
              <div className="flex items-center justify-center gap-2 mb-10">
                <div className="flex items-center justify-center w-10 h-10 rounded-full"
                  style={{ background: `${brand.primary}20`, border: `1px solid ${brand.primary}30` }}
                >
                  <span className="text-lg">🎂</span>
                </div>
                <div className="flex items-center justify-center w-10 h-10 rounded-full"
                  style={{ background: `${brand.primary}20`, border: `1px solid ${brand.primary}30` }}
                >
                  <span className="text-lg">🎉</span>
                </div>
                <div className="flex items-center justify-center w-10 h-10 rounded-full"
                  style={{ background: `${brand.primary}20`, border: `1px solid ${brand.primary}30` }}
                >
                  <span className="text-lg">🎁</span>
                </div>
                <div className="flex items-center justify-center w-10 h-10 rounded-full"
                  style={{ background: `${brand.primary}20`, border: `1px solid ${brand.primary}30` }}
                >
                  <span className="text-lg">👑</span>
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* Formulario de reserva para cumpleaños */}
          <BirthdayForm />
        </div>
      </section>
      
      {/* Footer */}
      <Footer />
    </main>
  );
}
