"use client";
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { brand } from '../styles/brand';

/**
 * Representa el shape del endpoint público /api/shows/public
 * (derivado de listPublic(): sólo shows PUBLISHED activos con datos de imagen ya validados en publish).
 */
export interface PublicShow {
  id: string;
  title: string;
  slug: string;
  startsAt: string; // ISO
  endsAt?: string | null;
  imageWebpPath?: string;
  imageBlurData?: string;
  width?: number;
  height?: number;
  slot?: number | null; // derivado internamente; no siempre presente
  order?: number;
  updatedAt?: string;
}

interface ApiResp { ok: boolean; shows: PublicShow[] }

/**
 * DynamicShowsSection
 * Carga shows publicados activos desde /api/shows/public (cache liviana con SWR server-side).
 * Endpoint ya filtra a PUBLISHED activos; acá sólo validamos ventana temporal (>= hoy -1d) y limit opcional.
 * Usa directamente /public/shows/* (copiado a /shows/*) para servir las imágenes optimizadas generadas.
 * Orden original del endpoint prioriza slots; aquí los reordenamos por fecha ascendente visualmente.
 * Reutilizable para otras landings / embeds.
 */
export function DynamicShowsSection({
  limit = 8,
  className = '',
  endpoint = '/api/shows/public',
  fullscreen = true
}: { limit?: number; className?: string; endpoint?: string; fullscreen?: boolean }) {
  const [shows, setShows] = useState<PublicShow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError(null);
      try {
        const r = await fetch(endpoint, { cache: 'no-store' }); // evitamos caching del lado del cliente para ver refrescos rápidos
        const j: ApiResp = await r.json();
        if (!r.ok || !j?.ok) throw new Error('Error');
        let list = [...(j.shows || [])];
        const cutoff = Date.now() - 24*60*60*1000; // tolerancia -1d
        list = list.filter(s => new Date(s.startsAt).getTime() >= cutoff);
        // Orden ascendente por startsAt (independiente del orden original orientado a slots)
        list.sort((a,b)=> new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
        if (!cancelled) setShows(limit ? list.slice(0, limit) : list);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Fallo cargando shows');
      } finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [endpoint, limit]);

  if (loading && shows.length === 0) {
    return <div className={`mt-10 text-center text-sm opacity-70 ${className}`}>Cargando shows…</div>;
  }
  if (error && shows.length === 0) {
    return <div className={`mt-10 text-center text-danger text-sm ${className}`}>Error cargando shows</div>;
  }
  if (shows.length === 0) {
    return <div className={`mt-10 text-center text-soft text-sm ${className}`}>Pronto anunciaremos nuevos shows ✨</div>;
  }

  // Subtítulos: versión completa (desktop) y versión corta (mobile) visibles según breakpoint.
  const fullSubtitle = 'Lineup dinámico: headliners, temáticos y experiencias especiales cada sábado. Reservas sujetas a disponibilidad.';
  const mobileSubtitle = 'Headliners y temáticos cada sábado.';
  const ShowsSubtitle = () => (
    <>
      <p id="shows-subtitle" className="hidden md:block text-sm md:text-base max-w-2xl opacity-80">{fullSubtitle}</p>
      <p id="shows-subtitle-mobile" className="md:hidden text-xs max-w-xs opacity-75 leading-snug px-4">{mobileSubtitle}</p>
    </>
  );

  const baseMinHeight = fullscreen ? 'var(--app-vh,100vh)' : undefined;
  return (
    <section
      id="shows"
      className={`relative flex flex-col justify-start md:justify-center pt-20 pb-14 md:py-20 ${className}`}
      style={{ minHeight: baseMinHeight }}
    >
      <div className="container mx-auto max-w-7xl px-4 md:px-8">
        <div className="mb-6 md:mb-8 flex flex-col items-center text-center gap-3 md:gap-4">
          <h2 aria-describedby="shows-subtitle shows-subtitle-mobile" className="text-3xl md:text-4xl font-extrabold tracking-tight" style={{ textShadow: '0 4px 18px rgba(255,255,255,0.15)' }}>Próximos Shows</h2>
          <ShowsSubtitle />
        </div>
        {/* Grid responsiva */}
        <div className="grid gap-6 md:gap-8 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {shows.map((s, idx) => {
            const starts = new Date(s.startsAt);
            const dateHuman = starts.toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short' });
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
                className="group"
              >
                <div className="relative w-full overflow-hidden rounded-xl shadow-lg border border-white/10 bg-[linear-gradient(135deg,#3d0a0a,#5c1111)] group/card" style={{ aspectRatio: '1080/1920' }}>
                  {/* Fallback for browsers sin soporte aspect-ratio (rare) */}
                  <div className="absolute inset-0">
                    {s.imageWebpPath && (
                      <Image
                        src={`/shows/${s.imageWebpPath}`}
                        alt={s.title}
                        fill
                        placeholder={s.imageBlurData ? 'blur' : undefined}
                        blurDataURL={s.imageBlurData || undefined}
                        className="object-cover object-center pointer-events-none select-none brightness-95 md:brightness-90 md:group-hover/card:brightness-105 md:group-hover/card:scale-[1.04] transition-[transform,filter] duration-700 ease-out will-change-transform"
                        sizes="(min-width:1024px) 25vw, 60vw"
                      />
                    )}
                    {/* Sheen anim sólo mobile para llamar atención */}
                    <motion.div
                      aria-hidden
                      className="absolute inset-0 pointer-events-none md:hidden"
                      initial={{ x: '-120%', opacity: 0 }}
                      animate={{ x: ['-120%','130%','130%'], opacity: [0,0.35,0] }}
                      transition={{ duration: 5, repeat: Infinity, repeatDelay: 5, ease: 'easeInOut' }}
                      style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.22), rgba(255,255,255,0))' }}
                    />
                    {/* Overlay minimal permanente (sutil) + gradiente inferior para legibilidad */}
                    <div className="absolute inset-0 bg-black/10" />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none transition-opacity duration-500 group-hover/card:from-black/70" />
                    {/* Contenido: visible siempre en mobile, animado en desktop */}
                    <div className="absolute inset-0 flex flex-col justify-end p-3 md:p-4">
                      <div className="opacity-100 translate-y-0 md:translate-y-4 md:opacity-0 group-hover/card:opacity-100 group-hover/card:translate-y-0 transition-all duration-500 ease-out">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="inline-block rounded-full text-[10px] font-medium px-2 py-1 bg-black/40 backdrop-blur-sm border border-white/10 text-white shadow">
                            {dateHuman}
                          </span>
                          {s.slot && <span className="text-[10px] font-medium px-2 py-1 rounded bg-black/30 backdrop-blur-sm border border-white/10 text-white">Slot {s.slot}</span>}
                        </div>
                        <h3 className="text-xs sm:text-sm md:text-base font-semibold md:font-bold leading-snug mb-2 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] line-clamp-3">
                          {s.title}
                        </h3>
                        <div className="flex w-full gap-2 max-[380px]:flex-col max-[380px]:gap-1">
                          {/* Botón Detalles oculto en móviles ultra angostos para no colisionar */}
                          <a
                            href="#"
                            className="rounded-full py-1 px-3 text-[10px] md:text-[11px] font-medium bg-white/15 hover:bg-white/30 backdrop-blur-sm transition shadow-sm focus:outline-none focus:ring-2 focus:ring-white/40 max-[420px]:hidden"
                          >
                            Detalles
                          </a>
                          <a
                            href="/marketing/cumpleanos"
                            className="relative flex items-center justify-center gap-1 rounded-full flex-1 py-1.5 px-4 text-[11px] font-semibold text-white shadow focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-[--ring-color] overflow-hidden whitespace-nowrap tracking-wide min-w-0 max-[420px]:py-1.5 max-[360px]:px-3"
                            style={{ background: `${brand.primary}E6`, boxShadow: `0 4px 14px -6px ${brand.primary}` }}
                          >
                            {/* Ícono ticket */}
                            <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 flex-shrink-0 opacity-90"><path fill="currentColor" d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v2.25a.75.75 0 0 1-.75.75 2.25 2.25 0 0 0 0 4.5.75.75 0 0 1 .75.75V17a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-2.75A.75.75 0 0 1 4.75 13a2.25 2.25 0 0 0 0-4.5A.75.75 0 0 1 4 7.25V7Z"/></svg>
                            <span className="truncate max-[340px]:text-[10px]">Reserva</span>
                            {/* Micro efecto highlight (no pulse intrusivo) */}
                            <span className="pointer-events-none absolute inset-0 opacity-0 md:group-hover/card:opacity-0 animate-[ping_4s_linear_infinite] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.18),transparent_60%)]" />
                          </a>
                        </div>
                      </div>
                    </div>
                    {/* Estado inicial sólo desktop: título reducido cuando overlay aún oculto */}
                    <div className="hidden md:block absolute inset-x-0 bottom-0 p-3 md:p-4 pointer-events-none select-none group-hover/card:opacity-0 transition-opacity duration-300">
                      <h3 className="text-[11px] md:text-sm font-medium text-white/90 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] line-clamp-2">{s.title}</h3>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
