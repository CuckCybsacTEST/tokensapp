import React from 'react';
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
  
  return (
    <section id="mapa" className="py-16 relative overflow-hidden">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 z-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle at 70% 30%, ${brand.secondary}33 0%, transparent 50%)`,
        }}
      />
      
  <div className="container mx-auto max-w-7xl px-4 md:px-8 relative z-10">
        <SectionTitle
          kicker="Ubicación"
          title="Encuentranos fácilmente"
          subtitle="Visítanos en nuestra ubicación estratégica con múltiples opciones de acceso"
        />
        
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
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
          
          {/* Columna derecha - Mapa */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="md:col-span-2"
          >
            {/* Placeholder para el mapa - en producción usar un componente de mapa real */}
            <div 
              className="w-full h-[400px] rounded-xl overflow-hidden relative"
              style={{ 
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-4xl mb-2">🗺️</div>
                <p className="text-center px-8" style={{ color: brand.text.secondary }}>
                  Aquí se mostraría un mapa interactivo con nuestra ubicación.<br />
                  Puedes implementar Google Maps, Mapbox u otra solución de mapas.
                </p>
                <div 
                  className="absolute"
                  style={{
                    top: '40%',
                    left: '45%',
                    height: '20px',
                    width: '20px',
                    background: brand.primary,
                    borderRadius: '50%',
                    boxShadow: `0 0 0 6px ${brand.primary}44, 0 0 0 12px ${brand.primary}22`,
                    animation: 'pulse 2s infinite'
                  }}
                />
              </div>
            </div>
            
            {/* Botones de acción */}
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
