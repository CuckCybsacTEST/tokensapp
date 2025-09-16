import React from 'react';
import { motion } from 'framer-motion';
import { brand } from '../styles/brand';
import { SectionTitle } from './ui/SectionTitle';

export function QrSection() {
  // URLs de Spotify ahora viven en SpotifySection
  // Sábados Estelares con Experiencias QR integradas
  const qrFeatures = [
    { title: 'Tecnología QR', description: 'Pulseras y mesas con QR para participar, votar, ganar rewards y desbloquear contenido en vivo.' },
    { title: 'Sábados Estelares', description: 'Nuestra noche insignia: headliners, shows temáticos y bloques especiales.' },
    { title: 'Luces inteligentes', description: 'Programación dinámica, escenas y sincronía para un ambiente envolvente.' },
    { title: 'Pantallas gigantes', description: 'Visuales y mensajes en tiempo real para amplificar la experiencia.' },
    { title: 'Experiencias inmersivas', description: 'Efectos especiales (CO₂, confetti) y dinámicas que te meten en la acción.' },
    { title: 'Cocteles de autor', description: 'Recetas pensadas para cada momento del set, con presentaciones memorables.' },
    { title: 'Artistas en escena', description: 'Performers, hosts e invitados que suben la energía de la noche.' },
    { title: 'Aforo controlado', description: 'Comodidad y seguridad cuidando la capacidad en cada bloque.' },
  ];
  
  return (
  <section id="por-que-elegirnos" className="py-14 md:py-20 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <motion.div 
        aria-hidden 
        initial={{ rotate: 0 }} 
        animate={{ rotate: -360 }} 
        transition={{ duration: 80, ease: "linear", repeat: Infinity }} 
        style={{ 
          position: "absolute", 
          right: "-20%",
          top: "10%",
          width: "40%",
          height: "40%",
          borderRadius: "50%",
          border: `1px solid ${brand.primary}22`,
          zIndex: 0,
        }} 
      />
      <motion.div 
        aria-hidden 
        initial={{ rotate: 0 }} 
        animate={{ rotate: 360 }} 
        transition={{ duration: 60, ease: "linear", repeat: Infinity }} 
        style={{ 
          position: "absolute", 
          left: "-10%",
          bottom: "10%",
          width: "30%",
          height: "30%",
          borderRadius: "50%",
          border: `1px solid ${brand.secondary}22`,
          zIndex: 0,
        }} 
      />
      
  <div className="container mx-auto max-w-7xl px-4 md:px-8 py-8 md:py-12 relative z-10 w-full">
        <SectionTitle
          kicker="¿Por qué elegirnos?"
          title="Experiencia que te elige a ti"
          subtitle="Combinamos tecnología QR, shows y ambientación para crear una noche inmersiva: sábados estelares, luces inteligentes, pantallas gigantes, cocteles de autor, artistas en escena y aforo controlado."
        />
        
  <div className="mt-8 flex flex-col md:flex-row gap-8 md:gap-10 items-center justify-center">
          {/* Columna izquierda - Características (más amplias) */}
          <div className="w-full md:w-1/2 flex flex-col items-center">
            <div className="grid grid-cols-1 gap-4 w-full max-w-md mx-auto">
              {qrFeatures.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="backdrop-blur-sm rounded-md p-3"
                  style={{ 
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: `0 0 0 1px ${brand.primary}11 inset`
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded flex items-center justify-center" 
                      style={{ background: `${brand.primary}33` }}>
                      <div className="h-3.5 w-3.5 rounded" style={{ background: `${brand.primary}` }} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm mb-0.5" style={{ fontFamily: 'var(--font-display)' }}>{feature.title}</h3>
                      <p className="text-xs opacity-80" style={{ color: brand.text.secondary, fontFamily: 'var(--font-text)' }}>{feature.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          
          {/* Columna derecha - Visualización QR (más grande y compuesta) */}
          <motion.div 
            className="w-full md:w-1/2 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="relative w-full max-w-md aspect-[4/5] rounded-2xl overflow-hidden border"
              style={{ 
                background: `linear-gradient(135deg, ${brand.primary}1f, ${brand.secondary}12)`,
                borderColor: 'rgba(255,255,255,0.08)',
                boxShadow: `0 20px 48px -18px ${brand.primary}99`
              }}
            >
              {/* Capa central con un “mock” de pulsera y un QR grande */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-lg border-2 border-dashed flex items-center justify-center mb-4"
                  style={{ borderColor: `${brand.primary}66`, background: 'rgba(0,0,0,0.25)' }}>
                  <span className="text-3xl">📱</span>
                </div>
                <h3 className="text-base font-bold mb-1">Escanea y participa</h3>
                <p className="text-xs opacity-80 text-center max-w-xs" style={{ color: brand.text.secondary }}>
                  Todo parte de tu QR: participa, vota y gana. El entorno (luces, pantallas y efectos) acompaña cada momento para que vivas la noche.
                </p>
                <a href="#" className="mt-4 rounded-md px-4 py-2 text-xs font-semibold inline-block"
                  style={{ background: `${brand.primary}`, boxShadow: `0 4px 12px -6px ${brand.primary}` }}>
                  Ver cómo funciona
                </a>
              </div>

              {/* Aros y brillos decorativos para dar sensación tech */}
              <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full" style={{ border: `1px solid ${brand.primary}22` }} />
              <div className="absolute -left-16 -bottom-16 w-52 h-52 rounded-full" style={{ border: `1px solid ${brand.secondary}22` }} />
              <div className="absolute inset-x-0 bottom-0 h-28" style={{ background: `linear-gradient(to top, rgba(0,0,0,0.55), transparent)` }} />
            </div>
          </motion.div>
        </div>
  </div>
    </section>
  );
}
