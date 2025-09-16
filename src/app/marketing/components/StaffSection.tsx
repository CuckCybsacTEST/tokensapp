import React from 'react';
import { motion } from 'framer-motion';
import { brand } from '../styles/brand';
import { SectionTitle } from './ui/SectionTitle';

interface StaffSectionProps {
  staff: {
    name: string;
    role: string;
    img: string;
  }[];
}

export function StaffSection({ staff }: StaffSectionProps) {
  return (
    <section id="staff" className="py-16 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 z-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle at 80% 10%, ${brand.primary}33 0%, transparent 40%), 
                           radial-gradient(circle at 20% 80%, ${brand.secondary}22 0%, transparent 35%)`,
        }}
      />
      
  <div className="container mx-auto max-w-7xl px-4 md:px-8 relative z-10">
        <SectionTitle
          kicker="Nuestro equipo"
          title="Conoce al staff que hace la magia"
          subtitle="Un grupo de profesionales apasionados por crear experiencias únicas cada noche"
        />
        
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {staff.map((member, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              viewport={{ once: true }}
              className="flex flex-col items-center"
            >
              {/* Imagen del staff */}
              <div className="w-48 h-48 rounded-xl overflow-hidden relative mb-4">
                <div 
                  className="absolute inset-0 bg-gradient-to-br"
                  style={{ 
                    background: `linear-gradient(135deg, ${brand.primary}33, ${brand.secondary}22)`,
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  {/* Aquí iría la imagen real - usando placeholder por ahora */}
                  <div className="flex items-center justify-center h-full text-4xl">
                    {index === 0 ? '🎧' : index === 1 ? '📱' : '🍸'}
                  </div>
                </div>
              </div>
              
              {/* Nombre y rol */}
              <h3 className="text-xl font-bold">{member.name}</h3>
              <p style={{ color: brand.text.secondary }}>{member.role}</p>
              
              {/* Redes sociales */}
              <div className="flex gap-3 mt-3">
                {['instagram', 'facebook', 'twitter'].map((social, idx) => (
                  <a 
                    key={idx}
                    href="#" 
                    className="h-8 w-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
                    style={{ 
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    <span className="text-xs opacity-70">
                      {social === 'instagram' ? 'IG' : social === 'facebook' ? 'FB' : 'TW'}
                    </span>
                  </a>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Mensaje para unirse al equipo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <p className="mb-4" style={{ color: brand.text.secondary }}>
            ¿Quieres formar parte del equipo?
          </p>
          <a 
            href="#" 
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold transition" 
            style={{ 
              background: `${brand.primary}22`,
              border: `1px solid ${brand.primary}33`,
              boxShadow: `0 8px 20px -10px ${brand.primary}66`
            }}
          >
            Envíanos tu CV
          </a>
        </motion.div>
      </div>
    </section>
  );
}
