import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { brand } from '../styles/brand';
import { SectionTitle } from './ui/SectionTitle';

interface GallerySectionProps {
  gallery: {
    src: string;
    alt: string;
  }[];
}

export function GallerySection({ gallery }: GallerySectionProps) {
  // Asegurar 8 contenedores como mínimo
  const padded = [...gallery];
  while (padded.length < 8) {
    padded.push({ src: '#', alt: 'Momento' });
  }
  const items = padded.slice(0, 8);
  return (
  <section id="galeria" className="py-14 md:py-20 relative overflow-hidden flex items-center justify-center">
      {/* Elemento decorativo de fondo */}
      <div 
        className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full opacity-20 blur-3xl"
        style={{ background: `radial-gradient(circle, ${brand.primary}44, transparent)` }}
      />
      
  <div className="container mx-auto max-w-7xl px-4 md:px-8 py-8 md:py-12 relative z-10 w-full">
        <SectionTitle 
          kicker="Galería de shows"
          title="Nuestros shows en fotos"
          subtitle="Luces inteligentes, pantallas gigantes, artistas y momentos de la noche. Mirá cómo se vive el show."
        />
        
        <div className="mt-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 w-full">
            {items.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="aspect-square rounded-md overflow-hidden relative group border"
              >
                {/* Imagen real si existe, de lo contrario degradado de placeholder */}
                {item.src && item.src !== '#' ? (
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
                    priority={false}
                  />
                ) : (
                  <div 
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ 
                      background: `linear-gradient(135deg, ${brand.primary}22, ${brand.secondary}22)`,
                    }}
                  >
                    <span className="text-4xl opacity-60">{index % 2 === 0 ? '🎧' : '🎉'}</span>
                  </div>
                )}
                
                {/* Overlay con descripción */}
                <div 
                  className="absolute inset-0 flex items-end opacity-0 group-hover:opacity-100 transition duration-300"
                  style={{ background: 'rgba(0,0,0,0.45)' }}
                >
                  <div className="p-4">
                    <h4 className="font-bold">{item.alt}</h4>
                    <p className="text-sm" style={{ color: brand.text.secondary }}>
                      Highlights del show
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        
        {/* Botón para ver más fotos */}
  <div className="flex justify-center mt-12 md:mt-14">
          <a 
            href="#" 
            className="rounded-xl px-6 py-3 font-semibold transition" 
            style={{ 
              background: `${brand.primary}22`,
              border: `1px solid ${brand.primary}33`,
              boxShadow: `0 8px 20px -10px ${brand.primary}66`
            }}
          >
            Ver más fotos del show
          </a>
        </div>
      </div>
    </section>
  );
}
