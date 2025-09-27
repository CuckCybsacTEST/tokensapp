"use client";
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { brand } from '../styles/brand';
import { SectionTitle } from './ui/SectionTitle';
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

  return (
    <section id="cumple" className="py-20 md:py-28 relative overflow-hidden">
      {/* Background decorativo */}
      <div
        className="absolute inset-0 z-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle at 12% 88%, ${brand.secondary}33 0%, transparent 40%),
                           radial-gradient(circle at 88% 18%, ${brand.primary}22 0%, transparent 30%)`,
        }}
      />

      <div className="container mx-auto max-w-7xl px-4 md:px-8 py-8 md:py-12 relative z-10 w-full">
        <SectionTitle
          kicker="Packs de cumpleañeros"
          title="Celebra tu cumple en grande"
          subtitle="Elige tu Pack con botella de cortesía y extras; incluye taxi directo a la disco sin costo."
        />

        {/* Contenido principal: combos + servicios + CTAs (sin póster) */}
        <div className="mt-10 flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
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
                  {/* Destacado: Botella de cortesía */}
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
              <div className="text-sm font-semibold mb-3 opacity-90">Servicios incluidos</div>
              <div className="flex flex-wrap gap-2">
                {incluidos.map((s) => {
                  const isHighlight = (s as any).highlight;
                  return (
                    <div
                      key={s.label}
                      className={`px-3 py-1.5 rounded-full text-xs border backdrop-blur-sm ${isHighlight ? 'font-semibold' : ''}`}
                      style={{
                        borderColor: isHighlight ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.12)',
                        background: isHighlight ? `linear-gradient(135deg, ${brand.primary}44, ${brand.secondary}33)` : 'rgba(255,255,255,0.05)',
                        boxShadow: isHighlight ? `0 6px 18px -10px ${brand.primary}` : undefined,
                      }}
                    >
                      <span className="mr-1">{s.emoji}</span>
                      {s.label}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CTA principal */}
            <div className="mt-2 flex flex-wrap gap-3">
              <Link
                href="/marketing/cumpleanos"
                className="rounded-lg px-5 py-2.5 font-semibold text-sm"
                style={{ background: brand.secondary, boxShadow: `0 6px 16px -6px ${brand.secondary}99` }}
              >
                Reserva tu cumpleaños
              </Link>
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
