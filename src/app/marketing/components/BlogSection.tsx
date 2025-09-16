import React from 'react';
import { motion } from 'framer-motion';
import { brand } from '../styles/brand';
import { SectionTitle } from './ui/SectionTitle';

interface BlogSectionProps {
  blogPosts: {
    id: number;
    title: string;
    tag: string;
    read: string;
  }[];
}

export function BlogSection({ blogPosts }: BlogSectionProps) {
  return (
    <section id="blog" className="py-16 relative overflow-hidden">
      {/* Fondo decorativo */}
      <div 
        className="absolute inset-0 z-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle at 30% 70%, ${brand.primary}33 0%, transparent 40%)`,
        }}
      />
      
  <div className="container mx-auto max-w-7xl px-4 md:px-8 relative z-10">
        <SectionTitle
          kicker="Nuestro blog"
          title="Tendencias, tips y novedades"
          subtitle="Descubre información relevante sobre el mundo nocturno, mixología y experiencias interactivas"
        />
        
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {blogPosts.map((post, index) => (
            <motion.a
              href={`#blog-post-${post.id}`}
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="block rounded-xl overflow-hidden group"
              style={{ 
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              {/* Imagen del post */}
              <div 
                className="h-48 relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${brand.primary}22, ${brand.secondary}22)`,
                }}
              >
                {/* Aquí iría la imagen real - placeholder por ahora */}
                <div className="absolute inset-0 flex items-center justify-center text-4xl">
                  {index === 0 ? '🍸' : index === 1 ? '🎧' : '📱'}
                </div>
                
                {/* Etiqueta de categoría */}
                <div 
                  className="absolute top-3 left-3 rounded-full px-3 py-1 text-xs"
                  style={{ 
                    background: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(4px)'
                  }}
                >
                  {post.tag}
                </div>
                
                {/* Gradiente inferior */}
                <div 
                  className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black to-transparent opacity-70"
                />
              </div>
              
              {/* Contenido del post */}
              <div className="p-5">
                <h3 
                  className="text-lg font-bold mb-3 group-hover:text-white transition-colors"
                  style={{ color: brand.text.primary }}
                >
                  {post.title}
                </h3>
                
                {/* Tiempo de lectura y botón */}
                <div className="flex justify-between items-center">
                  <span 
                    className="text-xs"
                    style={{ color: brand.text.secondary }}
                  >
                    {post.read} de lectura
                  </span>
                  
                  <span 
                    className="text-xs font-medium rounded-full px-3 py-1 transition-colors"
                    style={{ 
                      background: `${brand.primary}22`,
                      color: brand.primary,
                    }}
                  >
                    Leer más
                  </span>
                </div>
              </div>
            </motion.a>
          ))}
        </div>
        
        {/* Ver más posts */}
        <div className="mt-10 text-center">
          <a 
            href="#" 
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold transition" 
            style={{ 
              background: `${brand.primary}22`,
              border: `1px solid ${brand.primary}33`,
              boxShadow: `0 8px 20px -10px ${brand.primary}66`
            }}
          >
            Explorar todos los artículos
          </a>
        </div>
        
        {/* WhatsApp CTA (reemplaza newsletter) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mt-16 rounded-xl p-6 md:p-8 backdrop-blur-sm"
          style={{ 
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)'
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="md:col-span-2">
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                <span className="text-2xl">🟢</span>
                Únete a nuestro grupo de WhatsApp
              </h3>
              <p style={{ color: brand.text.secondary }}>
                Entra al grupo para enterarte de promos, sorteos y los Sábados Estelares antes que nadie.
              </p>
            </div>
            <div className="md:col-span-1 flex md:justify-end">
              <a
                href="https://wa.me/#"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold"
                style={{ 
                  background: '#25D366',
                  color: '#0B1C13',
                  boxShadow: '0 8px 20px -10px rgba(37, 211, 102, 0.6)'
                }}
              >
                Abrir WhatsApp
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
