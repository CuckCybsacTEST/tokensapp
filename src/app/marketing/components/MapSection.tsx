"use client";
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { brand } from '../styles/brand';
import { SectionTitle } from './ui/SectionTitle';

export function MapSection() {
  // Datos de contacto y ubicación
  const contactInfo = {
    address: 'Jr. Columna Pasco 314, San Juan',
    city: 'Cerro de Pasco, Perú',
    reference: 'A unos pasos del Parque Srenales',
    schedule: [
      { days: 'Martes - Domingo', hours: '5:00 PM - 5:00 AM' },
    ]
  };
  
  const [tallMobile, setTallMobile] = useState(false);
  const [shouldCenter, setShouldCenter] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const evalDims = () => {
      const w = window.innerWidth; const h = window.innerHeight;
      const tall = w < 768 && h >= 780; setTallMobile(tall);
      // medir contenido
      const sec = document.getElementById('mapa');
      if (sec) {
        const inner = sec.querySelector('[data-map-inner]') as HTMLElement | null;
        if (inner) {
          const total = inner.offsetHeight + 120;
            setShouldCenter(tall && total < h);
        }
      }
    };
    evalDims();
    window.addEventListener('resize', evalDims);
    return () => window.removeEventListener('resize', evalDims);
  }, []);

  return (
    <section
      id="mapa"
      className={`relative overflow-hidden flex flex-col ${shouldCenter ? 'justify-center pt-8' : 'justify-start pt-6'} md:justify-center pb-16 md:pt-16 md:pb-20 transition-[justify-content,padding] duration-300`}
      style={{ minHeight: 'var(--app-vh,100vh)' }}
    >
      <div className="absolute inset-0 z-0 opacity-10" style={{ backgroundImage: `radial-gradient(circle at 70% 30%, ${brand.secondary}33 0%, transparent 50%)` }} />
      <div data-map-inner className="container mx-auto max-w-7xl px-4 md:px-8 relative z-10 w-full">
        <SectionTitle
          kicker="Ubicación"
          title="Encuéntranos fácilmente"
          compact
          dense
          subtitle={<><span className="hidden md:inline">Dirección, referencia y mapa para ubicarte rápido.</span><span className="inline md:hidden text-sm">Dirección y mapa rápido.</span></>}
        />
        <div className="mt-8 md:mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {/* Columna izquierda - Información de contacto */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="md:col-span-1"
          >
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold mb-2">Dirección</h3>
                <p style={{ color: brand.text.secondary }}>{contactInfo.address}</p>
                <p style={{ color: brand.text.secondary }}>{contactInfo.city}</p>
                {contactInfo.reference && (
                  <p className="mt-1 text-sm" style={{ color: brand.text.tertiary }}>Referencia: {contactInfo.reference}</p>
                )}
                {/* Mapa móvil inline (debajo de dirección) */}
                <div className="mt-5 md:hidden">
                  <div className="w-full h-60 rounded-xl overflow-hidden relative border" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}>
                    <div className="absolute inset-0">
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <div className="text-3xl mb-1 select-none">🗺️</div>
                        <p className="text-center px-4 text-[11px] leading-snug" style={{ color: brand.text.secondary }}>Pronto: mapa interactivo (Google / Mapbox).</p>
                      </div>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 rounded-full animate-pulse" style={{ background: brand.primary, boxShadow: `0 0 0 4px ${brand.primary}55, 0 0 0 10px ${brand.primary}22` }} />
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold mb-2">Horarios</h3>
                <div className="space-y-1">
                  {contactInfo.schedule.map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <span style={{ color: brand.text.secondary }}>{item.days}</span>
                      <span className="font-medium" style={{ color: brand.text.primary }}>
                        {item.hours}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold mb-2">Transporte</h3>
                <div className="space-y-2">
                  <p style={{ color: brand.text.secondary }}>
                    <span className="inline-block mr-2">🚕</span> Servicio de taxi seguro
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Columna derecha - Mapa (desktop) */}
          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="md:col-span-2 hidden md:block">
            <div className="w-full h-[380px] md:h-[420px] rounded-2xl overflow-hidden relative border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' }}>
              {/* Placeholder mejorado / embed futuro */}
              {/* Para habilitar Google Maps: sustituir el div interior por un iframe con la URL de embed, o montar un mapa (Mapbox GL / Leaflet) */}
              <div className="absolute inset-0">
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="text-4xl mb-2 select-none">🗺️</div>
                  <p className="text-center px-6 text-xs md:text-sm max-w-md" style={{ color: brand.text.secondary }}>
                    Aquí irá el mapa interactivo. Usa un iframe de Google Maps (embed) o integra Mapbox/Leaflet.
                  </p>
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 rounded-full animate-pulse" style={{ background: brand.primary, boxShadow: `0 0 0 6px ${brand.primary}55, 0 0 0 14px ${brand.primary}22` }} />
              </div>
            </div>
            <div className="mt-4 flex gap-4 flex-wrap">
              <a 
                href="#" 
                className="flex-1 rounded-lg p-3 text-center flex items-center justify-center gap-2" 
                style={{ 
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                <span className="text-lg">🚗</span>
                <span>Cómo llegar</span>
              </a>
              <a 
                href="#" 
                className="flex-1 rounded-lg p-3 text-center flex items-center justify-center gap-2" 
                style={{ 
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                <span className="text-lg">👀</span>
                <span>Ver en Google Maps</span>
              </a>
            </div>
            
            {/* Nota: removimos etiqueta de estacionamiento para simplificar */}
          </motion.div>
        </div>
      </div>
      
      {/* Estilos para la animación de pulso */}
      <style jsx global>{`
        @keyframes pulse {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 ${brand.primary}70;
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 10px ${brand.primary}00;
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 ${brand.primary}00;
          }
        }
      `}</style>
    </section>
  );
}
