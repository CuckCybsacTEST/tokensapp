"use client";
import React, { useEffect, useRef, useState } from 'react';
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
  // Mobile horizontal slider references
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [tallMobile, setTallMobile] = useState(false);

  useEffect(() => {
    const evaluate = () => {
      if (typeof window === 'undefined') return;
      const h = window.innerHeight; const w = window.innerWidth;
      setTallMobile(w < 768 && h >= 780);
    };
    evaluate();
    window.addEventListener('resize', evaluate);
    return () => window.removeEventListener('resize', evaluate);
  }, []);

  useEffect(() => {
    const el = sliderRef.current;
    if (!el) return;
    const sync = () => {
      const cards = Array.from(el.querySelectorAll('[data-blog-card]')) as HTMLElement[];
      const center = el.scrollLeft + el.clientWidth / 2;
      let best = 0; let dist = Infinity;
      cards.forEach((c, i) => {
        const mid = c.offsetLeft + c.offsetWidth / 2;
        const d = Math.abs(mid - center);
        if (d < dist) { dist = d; best = i; }
      });
      setActiveIdx(best);
    };
    el.addEventListener('scroll', sync, { passive: true });
    return () => el.removeEventListener('scroll', sync);
  }, []);

  return (
    <section
      id="blog"
      className={`relative overflow-hidden flex flex-col ${tallMobile ? 'justify-center pt-10' : 'justify-start pt-8'} md:justify-center pb-14 md:pt-14 md:pb-20 transition-[justify-content,padding] duration-300`}
  style={{ minHeight: '100vh' }}
    >
      <div
        className="absolute inset-0 z-0 opacity-10"
        style={{ backgroundImage: `radial-gradient(circle at 30% 70%, ${brand.primary}33 0%, transparent 40%)` }}
      />
      <div className="container mx-auto max-w-7xl px-4 md:px-8 pt-2 md:pt-6 pb-6 md:pb-10 relative z-10 w-full">
        <SectionTitle
          kicker="Nuestro blog"
          title="Tendencias, tips y novedades"
          compact
          dense
          subtitle={<><span className="hidden md:inline">Mixología, tecnología nocturna y experiencias interactivas.</span><span className="inline md:hidden text-sm">Mixología, tech y experiencias.</span></>}
        />
        {/* Slider móvil */}
        <div
          ref={sliderRef}
          className="mt-4 md:hidden flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {blogPosts.map((post, index) => (
            <motion.a
              data-blog-card
              key={post.id}
              href={`#blog-post-${post.id}`}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className="shrink-0 w-[74%] snap-center rounded-xl overflow-hidden group border"
              style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)' }}
            >
              <div className="h-40 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${brand.primary}22, ${brand.secondary}22)` }}>
                <div className="absolute inset-0 flex items-center justify-center text-4xl">
                  {index === 0 ? '🍸' : index === 1 ? '🎧' : '📱'}
                </div>
                <div className="absolute top-2 left-2 rounded-full px-3 py-1 text-[10px] backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.45)' }}>{post.tag}</div>
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black to-transparent opacity-70" />
              </div>
              <div className="p-4">
                <h3 className="text-base font-bold mb-2 leading-snug" style={{ color: brand.text.primary }}>{post.title}</h3>
                <div className="flex justify-between items-center">
                  <span className="text-[11px]" style={{ color: brand.text.secondary }}>{post.read}</span>
                  <span className="text-[11px] font-medium rounded-full px-2.5 py-1" style={{ background: `${brand.primary}22`, color: brand.primary }}>Leer</span>
                </div>
              </div>
            </motion.a>
          ))}
        </div>
        {/* Dots del slider */}
        <div className="md:hidden mt-3 flex justify-center gap-2">
          {blogPosts.map((_, i) => (
            <button key={i} aria-label={`Ir al post ${i+1}`}
              onClick={() => {
                const el = sliderRef.current; if (!el) return;
                const card = el.querySelectorAll('[data-blog-card]')[i] as HTMLElement | undefined;
                if (card) el.scrollTo({ left: card.offsetLeft - 16, behavior: 'smooth' });
              }}
              className={`h-2 w-2 rounded-full ${activeIdx === i ? 'scale-110' : 'opacity-50'} transition`}
              style={{ background: activeIdx === i ? brand.primary : 'rgba(255,255,255,0.4)' }}
            />
          ))}
        </div>
        {/* Grid desktop */}
        <div className="hidden md:grid mt-8 grid-cols-3 gap-6">
          {blogPosts.map((post, index) => (
            <motion.a
              key={post.id}
              href={`#blog-post-${post.id}`}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="block rounded-xl overflow-hidden group border"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="h-48 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${brand.primary}22, ${brand.secondary}22)` }}>
                <div className="absolute inset-0 flex items-center justify-center text-4xl">{index === 0 ? '🍸' : index === 1 ? '🎧' : '📱'}</div>
                <div className="absolute top-3 left-3 rounded-full px-3 py-1 text-xs" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>{post.tag}</div>
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black to-transparent opacity-70" />
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold mb-3 group-hover:text-white transition-colors" style={{ color: brand.text.primary }}>{post.title}</h3>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: brand.text.secondary }}>{post.read} de lectura</span>
                  <span className="text-xs font-medium rounded-full px-3 py-1" style={{ background: `${brand.primary}22`, color: brand.primary }}>Leer más</span>
                </div>
              </div>
            </motion.a>
          ))}
        </div>
        {/* Ver más posts (visible en ambos) */}
        <div className="mt-6 md:mt-10 text-center">
          <a href="#" className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs md:text-sm font-semibold"
             style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: `0 4px 12px -6px ${brand.primary}55` }}>Explorar todos ↗</a>
        </div>
        {/* WhatsApp CTA - formato una sola línea */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mt-8 md:mt-14"
        >
          <div
            className="w-full overflow-hidden rounded-full border backdrop-blur-sm px-4 md:px-6 h-14 flex items-center gap-4 md:gap-6 relative"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.10)',
              boxShadow: `0 8px 24px -12px ${brand.primary}66`
            }}
          >
            <span className="text-xl md:text-2xl shrink-0" aria-hidden>🟢</span>
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <strong className="text-[13px] md:text-sm tracking-tight whitespace-nowrap">Grupo WhatsApp</strong>
              <span className="text-[11px] md:text-xs opacity-70 truncate" style={{ color: brand.text.secondary }}>
                Promos, sorteos y Sábados Estelares antes que nadie
              </span>
            </div>
            <a
              href="https://wa.me/#"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-full px-3.5 py-1.5 md:px-4 md:py-2 text-[11px] md:text-xs font-semibold flex items-center gap-1"
              style={{ background: '#25D366', color: '#0B1C13', boxShadow: '0 4px 14px -6px rgba(37,211,102,0.55)' }}
              aria-label="Abrir grupo de WhatsApp"
            >
              Unirme <span aria-hidden>↗</span>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
