"use client";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { brand } from '../styles/brand';
import { SectionTitle } from './ui/SectionTitle';
import { ServicesIncluded } from './ServicesIncluded';
// ScrollX eliminado para mobile packs; implementamos slider propio centrado
import { useRouter } from 'next/navigation';

export function BirthdaySection() {
  const router = useRouter();

  // Backend-driven packs
  type Pack = { id: string; name: string; qrCount: number; bottle?: string | null; featured?: boolean; perks?: string[] };
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const res = await fetch('/api/birthdays/packs', { cache: 'no-store' });
        const j = await res.json().catch(()=>({}));
        if (!res.ok || !j?.packs) throw new Error(j?.code || j?.message || 'PACKS_LOAD_ERROR');
        if (!cancelled) setPacks(j.packs);
      } catch (e:any) {
        if (!cancelled) setError('No se pudieron cargar los Packs');
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Decorate packs with UI metadata (accent color, level label, key for tests) deterministically
  const decorated = useMemo(() => {
    const palette = ['#3BA7F0', '#F39C2D', '#E24A3A', brand.primary, brand.secondary];
    return packs.map((p, idx) => {
      // Map known names to stable colors for branding consistency
      let accent = palette[idx % palette.length];
      const nameLower = p.name.toLowerCase();
      if (nameLower.includes('chispa')) accent = '#3BA7F0';
      else if (nameLower.includes('fuego')) accent = '#F39C2D';
      else if (nameLower.includes('estrella')) accent = '#E24A3A';

      const level = idx === 0 ? 'Básico' : idx === 1 ? 'Recomendado' : idx === 2 ? 'Premium' : 'Pack';
      const key = idx === 0 ? 'basic' : idx === 1 ? 'plus' : idx === 2 ? 'elite' : `p${idx}`;
      return {
        key,
        accent,
        level,
        highlight: `${p.qrCount} invitad${p.qrCount === 1 ? 'o' : 'os'}`,
        perks: p.perks || [],
        featured: p.featured,
        bottle: p.bottle || null,
        id: p.id,
        name: p.name,
      };
    });
  }, [packs]);

  const incluidos = [
    { emoji: '🎂', label: 'Torta' },
    { emoji: '🎉', label: 'Decoración' },
    { emoji: '💳', label: 'Tarjetas de invitación QR', highlight: true },
    { emoji: '🎧', label: 'DJs + Animación' },
    { emoji: '🚕', label: 'Taxi directo sin costo', highlight: true },
  ];

  // Hint de deslizamiento (solo mobile). Auto-scroll sutil una vez por sesión.
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const [showHint, setShowHint] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  // Detect tall mobile viewports to re-center vertically (e.g., iPhone 14/15 heights)
  const [tallMobile, setTallMobile] = useState(false);
  useEffect(() => {
    const evaluate = () => {
      if (typeof window === 'undefined') return;
      const h = window.innerHeight;
      const w = window.innerWidth;
      // treat as mobile width & tall height threshold
      setTallMobile(w < 768 && h >= 780); // threshold can be tuned
    };
    evaluate();
    window.addEventListener('resize', evaluate);
    return () => window.removeEventListener('resize', evaluate);
  }, []);
  useEffect(() => {
    const key = 'birthdayPacksSliderHintShown';
    const el = sliderRef.current;
    if (!el || window.innerWidth >= 640) { setShowHint(false); return; }
    let cancelled = false;
    const hide = () => { if (!cancelled) setShowHint(false); };
    const syncActive = () => {
      const slides = Array.from(el.querySelectorAll('[data-pack-slide]')) as HTMLElement[];
      const center = el.scrollLeft + el.clientWidth / 2;
      let best = 0; let dist = Infinity;
      slides.forEach((s,i)=>{
        const c = s.offsetLeft + s.offsetWidth/2; const d = Math.abs(center - c); if (d < dist) { dist = d; best = i; }
      });
      setActiveIdx(best);
    };
    const onInteract = () => { hide(); };
    el.addEventListener('scroll', syncActive, { passive: true });
    el.addEventListener('scroll', onInteract, { passive: true });
    el.addEventListener('touchstart', onInteract, { passive: true });
    if (!localStorage.getItem(key)) {
      const t1 = setTimeout(() => {
        if (el.scrollWidth > el.clientWidth + 40) {
          el.scrollTo({ left: el.clientWidth * 0.95, behavior: 'smooth' });
          const t2 = setTimeout(() => {
            el.scrollTo({ left: 0, behavior: 'smooth' });
            localStorage.setItem(key, '1');
            const t3 = setTimeout(() => hide(), 1600); (el as any)._t3 = t3;
          }, 1100); (el as any)._t2 = t2;
        } else hide();
      }, 800); (el as any)._t1 = t1;
    } else {
      const t0 = setTimeout(() => hide(), 2000); (el as any)._t0 = t0;
    }
    return () => {
      cancelled = true;
      ['_t0','_t1','_t2','_t3'].forEach(k => { const id = (el as any)[k]; if (id) clearTimeout(id); });
      el.removeEventListener('scroll', syncActive);
      el.removeEventListener('scroll', onInteract);
      el.removeEventListener('touchstart', onInteract);
    };
  }, []);

  return (
    <section
      id="cumple"
      className={`relative overflow-hidden flex flex-col ${tallMobile ? 'justify-center pt-8' : 'justify-start pt-6'} md:justify-center pb-14 md:pt-14 md:pb-20 transition-[justify-content,padding] duration-300`}
      style={{ minHeight: 'var(--app-vh,100vh)' }}
    >
      {/* Background decorativo */}
      <div
        className="absolute inset-0 z-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle at 12% 88%, ${brand.secondary}33 0%, transparent 40%),
                           radial-gradient(circle at 88% 18%, ${brand.primary}22 0%, transparent 30%)`,
        }}
      />

  <div className="container mx-auto max-w-7xl px-4 md:px-8 pt-1 md:pt-5 pb-5 md:pb-9 relative z-10 w-full">
        {/* Versión adaptativa del subtítulo: corta en mobile, completa en md+ */}
        <SectionTitle
          kicker="CON EL TÍO LOUNGE..."
            title="Celebra tu cumple en grande"
            compact
            dense
            subtitle={
              <>
                <span className="hidden md:inline">Elige tu Pack con botella de cortesía y extras; incluye taxi directo a la disco sin costo.</span>
                <span className="inline md:hidden text-sm whitespace-nowrap">Botella, extras y taxi incluido.</span>
              </>
            }
        />

        {/* Contenido principal: combos + servicios + CTAs (sin póster) */}
  <div className="mt-3 md:mt-5 flex flex-col gap-6">
            {/* Slider horizontal en mobile, grid en >= sm */}
            <div className="sm:hidden -mx-4 px-6 relative">
              <div
                ref={sliderRef}
                className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide scroll-smooth gap-6 pb-4"
                style={{ scrollPadding: '0 24px' }}
              >
                {(loading && packs.length === 0) && [0,1,2].map(i => (
                  <div key={`skeleton-m-${i}`} data-pack-slide className="w-full flex-shrink-0 snap-center">
                    <div className="max-w-[340px] mx-auto rounded-xl p-4 flex flex-col border border-white/10 bg-white/5 animate-pulse h-full" />
                  </div>
                ))}
                {!loading && decorated.map((c, i) => {
                  const active = i === activeIdx;
                  return (
                    <div key={c.key} data-pack-slide className="w-full flex-shrink-0 snap-center">
                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        animate={active ? { scale: 1, opacity: 1 } : { scale: 0.93, opacity: 0.82 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                        className={`max-w-[340px] mx-auto rounded-xl p-4 flex flex-col border backdrop-blur-sm ${c.featured ? 'bg-white/12 border-white/20 shadow-[0_16px_48px_-18px_rgba(255,255,255,0.25)]' : 'bg-white/6 border-white/10'}`}
                        style={{ boxShadow: active ? `0 14px 42px -18px ${brand.primary}90` : `0 8px 26px -16px ${brand.primary}55` }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-[11px] uppercase tracking-wide opacity-70">Pack</div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full border opacity-80" style={{ borderColor: 'rgba(255,255,255,0.18)' }}>{c.level}</span>
                        </div>
                        <div className="mt-1 text-base font-extrabold" style={{ color: c.accent }}>{c.name}</div>
                        <div className="text-[13px] font-semibold mt-1">{c.highlight}</div>
                        <div className="inline-flex items-center gap-2 mt-2 px-2 py-1 rounded-full text-[10px] font-semibold border" style={{ background: `${c.accent}22`, borderColor: 'rgba(255,255,255,0.18)' }}>
                          <span>🍾</span>
                          <span>{c.bottle}</span>
                        </div>
                        <ul className="mt-3 space-y-1.5 text-[12px] opacity-90">
                          {c.perks.slice(0,4).map(p => (
                            <li key={p} className="flex items-start gap-2">
                              <span className="mt-0.5 text-[9px]" style={{ color: c.accent }}>●</span>
                              <span className="truncate">{p}</span>
                            </li>
                          ))}
                          {c.perks.length > 4 && <li className="text-[11px] opacity-70">+{c.perks.length - 4} más…</li>}
                        </ul>
                        <div className="mt-auto pt-3">
                          <button
                            data-testid={`birthday-pack-cta-${c.key}`}
                            type="button"
                            onClick={() => router.push(`/marketing/birthdays/reservar?packId=${encodeURIComponent(c.id)}#form`)}
                            className="w-full rounded-full px-4 py-2 text-[11px] font-semibold"
                            style={{ background: `${c.accent}30`, border: '1px solid rgba(255,255,255,0.12)', boxShadow: `0 6px 16px -10px ${c.accent}` }}
                          >
                            Reservar
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  );
                })}
              </div>
              {!loading && decorated.length > 1 && (
                <div className="mt-3 flex justify-center gap-2">
                  {decorated.map((_, i) => {
                    const active = i === activeIdx;
                    return (
                      <button
                        key={i}
                        aria-label={`Ver pack ${i+1}`}
                        onClick={() => {
                          const el = sliderRef.current; if (!el) return;
                          const target = el.querySelectorAll('[data-pack-slide]')[i] as HTMLElement;
                          if (target) {
                            el.scrollTo({ left: target.offsetLeft - (el.clientWidth - target.clientWidth)/2, behavior: 'smooth' });
                          }
                        }}
                        className={`relative h-3 w-3 rounded-full transition-all ${active ? 'scale-110' : 'opacity-60 hover:opacity-90'}`}
                        style={{ background: active ? brand.primary : 'rgba(255,255,255,0.35)', boxShadow: active ? `0 0 0 4px ${brand.primary}22` : undefined }}
                      />
                    );
                  })}
                </div>
              )}
              {showHint && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[10px] font-medium text-white/70 backdrop-blur-sm bg-white/5 px-2.5 py-1.5 rounded-full shadow-sm border border-white/10 animate-pulse">
                  <span>Desliza</span>
                  <svg viewBox="0 0 24 24" className="h-3 w-3"><path fill="currentColor" d="M8.12 4.47 6.7 5.88 13.82 13l-7.12 7.12 1.41 1.41L16.64 13 8.12 4.47Z"/></svg>
                </div>
              )}
            </div>
            <div className="hidden sm:grid grid-cols-3 gap-4 md:gap-6">
              {(loading && packs.length === 0) && [0,1,2].map(i => (
                <div key={`skeleton-${i}`} className="rounded-xl p-4 md:p-5 flex flex-col h-full border border-white/10 bg-white/5 animate-pulse" />
              ))}
              {!loading && decorated.map((c, i) => (
                <motion.div
                  key={c.key}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  viewport={{ once: true }}
                  className={`rounded-xl p-4 md:p-5 flex flex-col h-full border backdrop-blur-sm ${
                    c.featured ? 'bg-white/12 border-white/20 shadow-[0_20px_60px_-20px_rgba(255,255,255,0.25)] scale-[1.02]' : 'bg-white/6 border-white/10'
                  }`}
                  style={{ boxShadow: `0 12px 32px -16px ${brand.primary}70` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs uppercase tracking-wide opacity-75">Pack</div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border opacity-80" style={{ borderColor: 'rgba(255,255,255,0.18)' }}>
                      {c.level}
                    </span>
                  </div>
                  <div className="mt-1 text-lg font-extrabold" style={{ color: c.accent }}>{c.name}</div>
                  <div className="text-sm font-semibold mt-1">{c.highlight}</div>
                  <div
                    className="inline-flex items-center gap-2 mt-2 px-2.5 py-1 rounded-full text-[11px] font-semibold border"
                    style={{ background: `${c.accent}22`, borderColor: 'rgba(255,255,255,0.18)' }}
                  >
                    <span>🍾</span>
                    <span>Botella de cortesía: {c.bottle}</span>
                  </div>
                  <ul className="mt-3 space-y-1.5 text-[13px] opacity-90">
                    {c.perks.map((p) => {
                      const isBottle = p.toLowerCase().startsWith('botella de cortesía');
                      return (
                        <li key={p} className="flex items-start gap-2">
                          <span className="mt-0.5 text-[10px]" style={{ color: c.accent }}>●</span>
                          <span className={isBottle ? 'font-semibold' : ''}>{p}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-auto pt-4">
                    <button
                      data-testid={`birthday-pack-cta-${c.key}`}
                      type="button"
                      onClick={() => router.push(`/marketing/birthdays/reservar?packId=${encodeURIComponent(c.id)}#form`)}
                      className="inline-block rounded-full px-4 py-2 text-xs font-semibold mr-2"
                      style={{
                        background: `${c.accent}22`,
                        border: '1px solid rgba(255,255,255,0.12)',
                        boxShadow: `0 6px 16px -8px ${c.accent}`,
                      }}
                    >
                      Reservar este Pack
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
            {error && (
              <div className="text-xs text-amber-300">
                {error} — mostrando versión estática.
              </div>
            )}

            {/* Servicios incluidos */}
            <div className="mt-2">
              <div className="text-sm font-semibold mb-3 opacity-90 hidden md:block">Servicios incluidos</div>
              <ServicesIncluded items={incluidos} />
            </div>

            {/* CTA principal (centrado) */}
            <div className="mt-2 w-full flex justify-center gap-3">
              <Link
                href="/marketing/cumpleanos"
                className="rounded-lg px-5 py-2.5 font-semibold text-sm"
                style={{ background: `${brand.primary}AA`, boxShadow: `0 6px 16px -6px ${brand.primary}` }}
              >
                Personalizar mi Pack
              </Link>
            </div>
          </div>
        </div>
    </section>
  );
}
