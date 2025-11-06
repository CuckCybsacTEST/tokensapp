"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { brand } from "../styles/brand";
import { SectionTitle } from "./ui/SectionTitle";
import { ServicesIncluded } from "./ServicesIncluded";
import { useRouter } from "next/navigation";

type RawPack = {
  id: string;
  name: string;
  qrCount: number;
  bottle?: string | null;
  featured?: boolean;
  perks?: string[];
  priceSoles?: number;
};
type DecoratedPack = Omit<RawPack, "perks" | "priceSoles"> & {
  perks: string[];
  priceSoles: number;
  key: string;
  accent: string;
  level: string;
  highlight: string;
};

export function BirthdaySection() {
  const router = useRouter();
  const [packs, setPacks] = useState<RawPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/birthdays/packs", { cache: "no-store" });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j?.packs) throw new Error(j?.code || "LOAD_ERROR");
        if (!cancelled) setPacks(j.packs);
      } catch (e: any) {
        if (!cancelled) setError("No se pudieron cargar los Packs");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const decorated: DecoratedPack[] = useMemo(() => {
    const palette = ["#3BA7F0", "#F39C2D", "#E24A3A", brand.primary, brand.secondary];
    return packs.map((p, idx) => {
      let accent = palette[idx % palette.length];
      const low = p.name.toLowerCase();
      if (low.includes("chispa")) accent = "#3BA7F0";
      else if (low.includes("fuego")) accent = "#F39C2D";
      else if (low.includes("estrella")) accent = "#E24A3A";
      else if (low.includes("galaxia")) accent = "#8B5CF6";
      const level =
        idx === 0 ? "Básico" : idx === 1 ? "Recomendado" : idx === 2 ? "Premium" : "Deluxe";
      const key = idx === 0 ? "basic" : idx === 1 ? "plus" : idx === 2 ? "elite" : `p${idx}`;
      return {
        id: p.id,
        name: p.name,
        qrCount: p.qrCount,
        bottle: p.bottle,
        featured: p.featured,
        perks: p.perks ?? [],
        key,
        accent,
        level,
        highlight: `${p.qrCount} invitad${p.qrCount === 1 ? "o" : "os"}`,
        priceSoles: p.priceSoles ?? 0,
      };
    });
  }, [packs]);

  const incluidos = [
    { emoji: "🎂", label: "Torta" },
    { emoji: "🎉", label: "Decoración" },
    { emoji: "💳", label: "Tarjetas de invitación QR", highlight: true },
    { emoji: "🎧", label: "DJs + Animación" },
    { emoji: "🚕", label: "Taxi directo sin costo", highlight: true },
  ];

  // Mobile slider state
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [showHint, setShowHint] = useState(true);
  useEffect(() => {
    const el = sliderRef.current;
    if (!el) return;
    if (window.innerWidth >= 640) {
      setShowHint(false);
      return;
    }
    const sync = () => {
      const slides = Array.from(el.querySelectorAll("[data-pack-slide]")) as HTMLElement[];
      const center = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      let dist = Infinity;
      slides.forEach((s, i) => {
        const c = s.offsetLeft + s.offsetWidth / 2;
        const d = Math.abs(center - c);
        if (d < dist) {
          dist = d;
          best = i;
        }
      });
      setActiveIdx(best);
    };
    const hide = () => setShowHint(false);
    el.addEventListener("scroll", sync, { passive: true });
    el.addEventListener("touchstart", hide, { passive: true });
    const t = setTimeout(() => hide(), 2500);
    return () => {
      el.removeEventListener("scroll", sync);
      el.removeEventListener("touchstart", hide);
      clearTimeout(t);
    };
  }, []);

  return (
    <section
      id="cumple"
      className="birthday-wrap relative overflow-hidden flex flex-col justify-start pt-6 md:pt-10 pb-10 md:pb-12"
    >
      <div
        className="absolute inset-0 z-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle at 12% 88%, ${brand.secondary}33 0%, transparent 40%),radial-gradient(circle at 88% 18%, ${brand.primary}22 0%, transparent 30%)`,
        }}
      />
  <div className="birthday-inner container mx-auto max-w-7xl px-4 md:px-8 relative z-10 w-full">
        <SectionTitle
          kicker="CON EL TÍO LOUNGE..."
          title="Celebra tu cumple en grande"
          compact
          dense
          subtitle={
            <span className="text-sm md:text-base whitespace-nowrap">
              Botella, extras y taxi incluido.
            </span>
          }
        />

        <div className="mt-3 md:mt-4 flex flex-col gap-6 md:gap-6">
          {/* Mobile slider */}
          <div className="sm:hidden px-4 relative">
            <div
              ref={sliderRef}
              className="packs-slider flex overflow-x-auto snap-x snap-mandatory scroll-smooth gap-6 pb-2"
            >
              {loading &&
                packs.length === 0 &&
                [0, 1, 2].map((i) => (
                  <div
                    key={`skel-m-${i}`}
                    data-pack-slide
                    className="w-full flex-shrink-0 snap-center snap-always"
                  >
                    <div className="max-w-[340px] mx-auto rounded-xl p-4 flex flex-col border border-white/10 bg-white/5 animate-pulse h-full" />
                  </div>
                ))}
              {!loading &&
                decorated
                  .filter((pack) => pack.name.toLowerCase() !== "personalizado")
                  .map((c, i) => {
                    const active = i === activeIdx;
                    return (
                      <div key={c.key} data-pack-slide className="w-full flex-shrink-0 snap-center snap-always">
                        <motion.div
                          initial={{ opacity: 0, y: 16 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          animate={
                            active ? { scale: 1, opacity: 1 } : { scale: 0.93, opacity: 0.82 }
                          }
                          transition={{ type: "spring", stiffness: 200, damping: 22 }}
                          className={`pack-card max-w-[340px] mx-auto rounded-xl p-4 flex flex-col border backdrop-blur-sm ${c.featured ? "bg-white/12 border-white/20 shadow-[0_16px_48px_-18px_rgba(255,255,255,0.25)]" : "bg-white/6 border-white/10"}`}
                          style={{
                            boxShadow: active
                              ? `0 14px 42px -18px ${c.accent}90`
                              : `0 8px 26px -16px ${c.accent}55`,
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-[11px] uppercase tracking-wide opacity-70">
                              Pack
                            </div>
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full border opacity-80"
                              style={{ borderColor: "rgba(255,255,255,0.18)" }}
                            >
                              {c.level}
                            </span>
                          </div>
                          <div
                            className="mt-1 text-base font-extrabold"
                            style={{ color: c.accent }}
                          >
                            {c.name}
                          </div>
                          <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] font-medium opacity-80">
                            <div className="flex flex-col">
                              <span className="uppercase opacity-60">Invitados</span>
                              <span className="text-sm font-extrabold" style={{ color: c.accent }}>{c.qrCount}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="uppercase opacity-60">Precio</span>
                              <span className="text-sm font-bold" style={{ color: c.priceSoles === 0 ? '#10b981' : 'inherit' }}>{c.priceSoles > 0 ? `S/ ${c.priceSoles}` : 'Gratis'}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="uppercase opacity-60">CORTESÍA</span>
                              <span className="text-[11px] font-semibold line-clamp-2" style={{ color: c.accent }}>
                                {c.bottle}
                              </span>
                            </div>
                          </div>
                          <ul className="mt-3 space-y-1.5 text-[12px] opacity-90">
                            {c.perks.slice(0, 4).map((p) => (
                              <li key={p} className="flex items-start gap-2">
                                <span className="mt-0.5 text-[9px]" style={{ color: c.accent }}>
                                  ●
                                </span>
                                <span className="truncate">{p}</span>
                              </li>
                            ))}
                            {c.perks.length > 4 && (
                              <li className="text-[11px] opacity-70">+{c.perks.length - 4} más…</li>
                            )}
                          </ul>
                          <div className="mt-auto pt-3">
                            <button
                              data-testid={`birthday-pack-cta-${c.key}`}
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/marketing/birthdays/reservar?packId=${encodeURIComponent(c.id)}#form`
                                )
                              }
                              className="w-full rounded-full px-6 py-3 text-xs font-bold uppercase tracking-wide transition-all hover:scale-105"
                              style={{
                                background: `linear-gradient(135deg, ${c.accent}, ${c.accent}dd)`,
                                border: "1px solid rgba(255,255,255,0.3)",
                                boxShadow: `0 8px 24px -12px ${c.accent}80`,
                                color: "white",
                              }}
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
              <div className="mt-3 packs-dots flex justify-center gap-2">
                {decorated.map((_, i) => {
                  const active = i === activeIdx;
                  return (
                    <button
                      key={i}
                      aria-label={`Ver pack ${i + 1}`}
                      onClick={() => {
                        const el = sliderRef.current;
                        if (!el) return;
                        const target = el.querySelectorAll("[data-pack-slide]")[i] as HTMLElement;
                        if (target)
                          el.scrollTo({
                            left: target.offsetLeft - (el.clientWidth - target.clientWidth) / 2,
                            behavior: "smooth",
                          });
                      }}
                      className={`dot h-3 w-3 rounded-full transition-all ${active ? "scale-110" : "opacity-60 hover:opacity-90"}`}
                      style={{
                        background: active ? brand.primary : "rgba(255,255,255,0.35)",
                        boxShadow: active ? `0 0 0 4px ${brand.primary}22` : undefined,
                      }}
                    />
                  );
                })}
              </div>
            )}
            {showHint && (
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[10px] font-medium text-white/70 backdrop-blur-sm bg-white/5 px-2.5 py-1.5 rounded-full shadow-sm border border-white/10 animate-pulse pointer-events-none">
                <span>Desliza</span>
                <svg viewBox="0 0 24 24" className="h-3 w-3">
                  <path
                    fill="currentColor"
                    d="M8.12 4.47 6.7 5.88 13.82 13l-7.12 7.12 1.41 1.41L16.64 13 8.12 4.47Z"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Desktop grid 2 columns */}
          <div className="hidden sm:grid grid-cols-2 gap-5 md:gap-6">
            {loading &&
              packs.length === 0 &&
              [0, 1, 2, 3].map((i) => (
                <div
                  key={`skel-d-${i}`}
                  className="rounded-2xl p-5 flex flex-col h-full border border-white/10 bg-white/5 animate-pulse"
                />
              ))}
            {!loading &&
              decorated
                .filter((pack) => pack.name.toLowerCase() !== "personalizado")
                .map((c, i) => (
                  <motion.div
                    key={c.key}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: i * 0.05 }}
                    viewport={{ once: true }}
                    className={`relative overflow-hidden group rounded-2xl p-3 md:p-3.5 flex flex-col h-full border backdrop-blur-sm ${c.featured ? "bg-white/15 border-white/25 shadow-[0_24px_70px_-24px_rgba(255,255,255,0.30)]" : "bg-white/8 border-white/15"}`}
                    style={{
                      boxShadow: c.featured
                        ? `0 16px 46px -20px ${c.accent}AA`
                        : `0 10px 30px -18px ${c.accent}55`,
                    }}
                  >
                    <div
                      className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        background: `radial-gradient(circle at 85% 15%, ${c.accent}25, transparent 60%)`,
                      }}
                    />
                    <header className="relative z-10 mb-2 flex items-start justify-between">
                      <div>
                        <div className="text-[11px] uppercase tracking-wide opacity-70">Pack</div>
                        <h3
                          className="mt-0.5 text-[17px] font-extrabold leading-snug"
                          style={{ color: c.accent }}
                        >
                          {c.name}
                        </h3>
                      </div>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full border opacity-80"
                        style={{ borderColor: "rgba(255,255,255,0.22)" }}
                      >
                        {c.level}
                      </span>
                    </header>
                    <div className="relative z-10 grid grid-cols-3 gap-3 mb-1.5 text-[11px]">
                      <div className="flex flex-col">
                        <span className="uppercase opacity-60">Invitados</span>
                        <span className="text-[18px] font-extrabold tracking-tight" style={{ color: c.accent }}>
                          {c.qrCount}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="uppercase opacity-60">Precio</span>
                        <span className="text-[15px] font-bold" style={{ color: c.priceSoles === 0 ? '#10b981' : 'inherit' }}>{c.priceSoles > 0 ? `S/ ${c.priceSoles}` : 'Gratis'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="uppercase opacity-60">CORTESÍA</span>
                        <span className="text-sm font-semibold line-clamp-2" title={c.bottle || ""} style={{ color: c.accent }}>
                          {c.bottle}
                        </span>
                      </div>
                    </div>
                    <ul className="relative z-10 mt-0.5 space-y-1 text-[12px] opacity-90">
                      {c.perks.slice(0, 5).map((p) => (
                        <li key={p} className="flex items-start gap-2">
                          <span className="mt-0.5 text-[9px]" style={{ color: c.accent }}>
                            ●
                          </span>
                          <span
                            className={p.toLowerCase().startsWith("botella") ? "font-semibold" : ""}
                          >
                            {p}
                          </span>
                        </li>
                      ))}
                      {c.perks.length > 5 && (
                        <li className="text-[11px] opacity-70">+{c.perks.length - 5} más…</li>
                      )}
                    </ul>
                    {/* Botón Reservar (desktop) reposicionado: alineado a la derecha y más destacado */}
                    <div className="relative z-10 mt-auto pt-4 flex justify-end">
                      <button
                        data-testid={`birthday-pack-cta-${c.key}`}
                        type="button"
                        onClick={() =>
                          router.push(
                            `/marketing/birthdays/reservar?packId=${encodeURIComponent(c.id)}#form`
                          )
                        }
                        className="rounded-full px-5 py-2 text-[11px] font-bold uppercase tracking-wide transition-all hover:scale-[1.04] focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-white/50"
                        style={{
                          background: `linear-gradient(135deg, ${c.accent}, ${c.accent}dd)`,
                          border: "1px solid rgba(255,255,255,0.28)",
                          boxShadow: `0 10px 26px -12px ${c.accent}90`,
                          color: 'white'
                        }}
                      >
                        Reservar
                      </button>
                    </div>
                  </motion.div>
                ))}
          </div>

          {error && (
            <div className="text-xs text-amber-300">{error} — mostrando versión estática.</div>
          )}

          <div className="mt-1 services-inc">
            <div className="text-sm font-semibold mb-2 opacity-90 hidden md:block">
              Servicios incluidos
            </div>
            <ServicesIncluded items={incluidos} />
          </div>

          <div className="mt-1 w-full flex justify-center personalize-cta">
            <Link
              href="/marketing/cumpleanos"
              className="rounded-lg px-5 py-2 font-semibold text-sm"
              style={{
                background: `${brand.primary}AA`,
                boxShadow: `0 6px 16px -6px ${brand.primary}`,
              }}
            >
              Personalizar mi Pack
            </Link>
          </div>
        </div>
      </div>
      <style jsx>{`
        /* Asegurar centrado al hacer snap (soporte amplio) */
        @media (max-width: 767px) {
          .packs-slider { scroll-padding-left: 24px; scroll-padding-right: 24px; }
        }
        /* Alta moderada (~780px): reducción un poco mayor para asegurar que no se corte */
        @media (max-width: 767px) and (min-height: 741px) and (max-height: 780px) {
          .pack-card { transform-origin: center top; transform: scale(0.992); }
        }
        /* Packs mobile: garantizar que cada tarjeta entre completa en viewport */
        @media (max-width: 767px) {
          .pack-card {
            /* Altura máxima: alto de pantalla - barra superior - dock inferior - holguras internas aprox. */
            max-height: calc(100svh - var(--top-bar-h, 0px) - var(--bottom-indicator-h, 56px) - 120px);
            /* Seguridad por si el navegador no soporta svh */
            max-height: calc(100vh - var(--top-bar-h, 0px) - var(--bottom-indicator-h, 56px) - 120px);
          }
        }
        /* En pantallas muy bajas, escalar ligeramente para que no se corte */
        @media (max-width: 767px) and (max-height: 720px) {
          .pack-card { transform-origin: center top; transform: scale(0.98); }
        }
        @media (max-width: 767px) and (max-height: 680px) {
          .pack-card { transform-origin: center top; transform: scale(0.95); }
        }
        /* En pantallas altas, centrar verticalmente la sección de Cumple */
        @media (min-height: 740px) {
          .birthday-wrap {
            min-height: 100vh;
            justify-content: center;
            padding-top: 2.5rem;
            padding-bottom: 2.5rem;
          }
        }
        @supports (height: 1svh) {
          @media (min-height: 740px) {
            .birthday-wrap {
              min-height: 100svh;
            }
          }
        }
        /* Desktop: centrar y escalar ligeramente para dar aire arriba/abajo */
        @media (min-width: 768px) {
          .birthday-wrap { align-items: center; justify-content: center; }
          .birthday-inner { transform-origin: center center; will-change: transform; }
        }
        /* Escalado por altura en desktop: menor altura -> mayor reducción */
        @media (min-width: 768px) and (max-height: 720px) {
          .birthday-inner { transform: scale(0.82); }
        }
        @media (min-width: 768px) and (min-height: 721px) and (max-height: 820px) {
          .birthday-inner { transform: scale(0.86); }
        }
        @media (min-width: 768px) and (min-height: 821px) and (max-height: 920px) {
          .birthday-inner { transform: scale(0.90); }
        }
        @media (min-width: 768px) and (min-height: 921px) and (max-height: 1080px) {
          .birthday-inner { transform: scale(0.94); }
        }
        /* Muy alto: mantener un leve respiro */
        @media (min-width: 768px) and (min-height: 1081px) {
          .birthday-inner { transform: scale(0.98); }
        }
        /* Ajuste de padding en móviles: ya reservamos barra superior a nivel global, aquí solo dar un respiro mínimo */
        @media (max-width: 767px) {
          .birthday-wrap {
            padding-top: 0.75rem;
          }
        }
        /* Compactar en móviles de poca altura (ej. 740px) */
        @media (max-width: 767px) and (max-height: 740px) {
          .birthday-wrap {
            padding-top: 0.5rem;
            padding-bottom: 0.75rem;
          }
        }
        /* Ocultar completamente scrollbar del carrusel móvil */
        .packs-slider {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .packs-slider::-webkit-scrollbar {
          width: 0;
          height: 0;
          display: none;
        }

        /* Ajustes extra para pantallas de poca altura */
        @media (max-width: 767px) and (max-height: 740px) {
          .services-inc {
            display: none;
          }
          .packs-dots {
            margin-top: 0.25rem;
          }
          .packs-dots .dot {
            width: 0.5rem !important;
            height: 0.5rem !important;
          }
          .personalize-cta {
            margin-top: 0.4rem;
          }
        }
      `}</style>
    </section>
  );
}
