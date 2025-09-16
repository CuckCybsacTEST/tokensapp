"use client";
import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { brand } from '../styles/brand';
import { SectionTitle } from './ui/SectionTitle';
import { useRouter } from 'next/navigation';

export function BirthdaySection() {
  const router = useRouter();

  // Packs de cumpleaños (con botella de cortesía y jerarquía visual)
  const packs = [
    {
      key: 'basic',
      name: 'Pack Chispa',
      bottle: 'Russkaya',
      level: 'Básico',
      highlight: '5 invitados',
  perks: ['Botella de cortesía: Russkaya', 'Fotos', 'Collares neón'],
      accent: '#3BA7F0',
    },
    {
      key: 'plus',
      name: 'Pack Fuego',
      bottle: 'Old Times',
      level: 'Recomendado',
      highlight: '10 invitados',
  perks: ['Botella de cortesía: Old Times', 'Foto grupal impresa', 'Collares neón'],
      accent: '#F39C2D',
    },
    {
      key: 'elite',
      name: 'Pack Estrella',
      bottle: 'Red Label',
      level: 'Premium',
      highlight: '20 invitados',
  perks: ['Botella de cortesía: Red Label', '3 fotos impresas', 'Stickers VIP adhesivos', 'Collares neón'],
      accent: '#E24A3A',
      featured: true,
    },
  ];

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
              {packs.map((c, i) => (
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
                      onClick={() => router.push(`/marketing/birthdays/reservar?packId=${encodeURIComponent(c.key)}#form`)}
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
