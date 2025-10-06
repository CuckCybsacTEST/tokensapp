"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { brand } from "../styles/brand";

export interface PublicShow {
  id: string;
  title: string;
  slug: string;
  startsAt: string; // ISO
  imageWebpPath?: string;
  imageBlurData?: string;
  slot?: number | null; // derivado internamente; no siempre presente
  endsAt?: string | null;
  isExpired?: boolean;
}

interface ApiResp {
  ok: boolean;
  shows: PublicShow[];
}

export function DynamicShowsSection({
  limit = 8,
  className = "",
  endpoint = "/api/shows/public",
  fullscreen = true,
}: {
  limit?: number;
  className?: string;
  endpoint?: string;
  fullscreen?: boolean;
}) {
  const [shows, setShows] = useState<PublicShow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(endpoint, { cache: "no-store" });
        const j: ApiResp = await r.json();
        if (!r.ok || !j?.ok) throw new Error("Error");
        // Respetar el orden entregado por el API (ya prioriza slots y limita a 4)
        const list = [...(j.shows || [])];
        if (!cancelled) setShows(limit ? list.slice(0, limit) : list);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Fallo cargando shows");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [endpoint, limit]);

  if (loading && shows.length === 0) {
    return (
      <div className={`mt-10 text-center text-sm opacity-70 ${className}`}>Cargando shows…</div>
    );
  }
  if (error && shows.length === 0) {
    return (
      <div className={`mt-10 text-center text-danger text-sm ${className}`}>
        Error cargando shows
      </div>
    );
  }
  if (shows.length === 0) {
    return (
      <div className={`mt-10 text-center text-soft text-sm ${className}`}>
        Pronto anunciaremos nuevos shows ✨
      </div>
    );
  }

  const fullSubtitle =
    "Lineup dinámico: headliners, temáticos y experiencias especiales cada sábado. Reservas sujetas a disponibilidad.";
  const mobileSubtitle = "Headliners y temáticos cada sábado.";
  const ShowsSubtitle = () => (
    <>
      <p id="shows-subtitle" className="hidden md:block text-sm md:text-base max-w-2xl opacity-80">
        {fullSubtitle}
      </p>
      <p
        id="shows-subtitle-mobile"
        className="md:hidden text-xs max-w-xs opacity-75 leading-snug px-4"
      >
        {mobileSubtitle}
      </p>
    </>
  );

  return (
    <section
      className={`shows-wrap relative flex flex-col justify-center pt-10 md:pt-12 pb-8 md:pb-10 overflow-x-hidden ${className}`}
    >
  <div className="mx-auto w-full px-4 sm:px-6 md:px-8 max-w-[640px] sm:max-w-[680px] md:max-w-7xl">
        <div className="shows-header mb-9 md:mb-14 flex flex-col items-center text-center gap-3 md:gap-4">
          <h2
            aria-describedby="shows-subtitle shows-subtitle-mobile"
            className="text-3xl md:text-4xl font-extrabold tracking-tight"
            style={{ textShadow: "0 4px 18px rgba(255,255,255,0.15)" }}
          >
            Próximos Shows
          </h2>
          <ShowsSubtitle />
        </div>
        {/* Grid responsiva */}
  <div className="shows-grid grid gap-6 md:gap-8 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {shows.map((s, idx) => {
            const starts = new Date(s.startsAt);
            const dateHuman = starts.toLocaleDateString("es-PE", {
              weekday: "short",
              day: "2-digit",
              month: "short",
            });
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
                className="group"
              >
                <div
                  className="shows-card relative w-full overflow-hidden rounded-xl shadow-lg border border-white/10 bg-[linear-gradient(135deg,#3d0a0a,#5c1111)] group/card"
                >
                  <div className="absolute inset-0">
                    {s.imageWebpPath && (
                      <Image
                        src={`/shows/${s.imageWebpPath}`}
                        alt={s.title}
                        fill
                        placeholder={s.imageBlurData ? "blur" : undefined}
                        blurDataURL={s.imageBlurData || undefined}
                        className="object-cover object-center pointer-events-none select-none brightness-95 md:brightness-90 md:group-hover/card:brightness-105 md:group-hover/card:scale-[1.04] transition-[transform,filter] duration-700 ease-out"
                        sizes="(min-width:1024px) 25vw, (min-width:768px) 33vw, 60vw"
                      />
                    )}
                    <motion.div
                      aria-hidden
                      className="absolute inset-0 pointer-events-none md:hidden"
                      initial={{ x: "-120%", opacity: 0 }}
                      animate={{ x: ["-120%", "130%", "130%"], opacity: [0, 0.35, 0] }}
                      transition={{
                        duration: 5,
                        repeat: Infinity,
                        repeatDelay: 5,
                        ease: "easeInOut",
                      }}
                      style={{
                        background:
                          "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.22), rgba(255,255,255,0))",
                      }}
                    />
                    <div className="absolute inset-0 bg-black/10" />
                    {s.isExpired && (
                      <div className="absolute inset-0 pointer-events-none">
                        {/* Capa tenue con degradado suave */}
                        <div
                          className="absolute inset-0"
                          style={{
                            background:
                              "linear-gradient(0deg, rgba(0,0,0,0.55), rgba(0,0,0,0.25) 45%, rgba(0,0,0,0.15))",
                          }}
                        />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none transition-opacity duration-500 group-hover/card:from-black/70" />
                    {!s.isExpired ? (
                      <div className="absolute inset-0 flex flex-col justify-end p-3 md:p-4">
                        <div className="opacity-100 translate-y-0 md:translate-y-4 md:opacity-0 group-hover/card:opacity-100 group-hover/card:translate-y-0 transition-all duration-500 ease-out">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="inline-block rounded-full text-[10px] font-medium px-2 py-1 bg-black/40 backdrop-blur-sm border border-white/10 text-white shadow">
                              {dateHuman}
                            </span>
                            {s.slot && (
                              <span className="text-[10px] font-medium px-2 py-1 rounded bg-black/30 backdrop-blur-sm border border-white/10 text-white">
                                Slot {s.slot}
                              </span>
                            )}
                          </div>
                          <h3 className="text-xs sm:text-sm md:text-base font-semibold md:font-bold leading-snug mb-2 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] line-clamp-3">
                            {s.title}
                          </h3>
                          <div className="flex w-full gap-2 max-[380px]:flex-col max-[380px]:gap-1">
                            <a
                              href="/marketing/cumpleanos"
                              className="relative flex items-center justify-center gap-1 rounded-full flex-1 py-1.5 px-4 text-[11px] font-semibold text-white shadow focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-[--ring-color] overflow-hidden whitespace-nowrap tracking-wide min-w-0 max-[420px]:py-1.5 max-[360px]:px-3"
                              style={{
                                background: `${brand.primary}E6`,
                                boxShadow: `0 4px 14px -6px ${brand.primary}`,
                              }}
                            >
                              {/* Ícono ticket */}
                              <svg
                                aria-hidden
                                viewBox="0 0 24 24"
                                className="h-3.5 w-3.5 flex-shrink-0 opacity-90"
                              >
                                <path
                                  fill="currentColor"
                                  d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v2.25a.75.75 0 0 1-.75.75 2.25 2.25 0 0 0 0 4.5.75.75 0 0 1 .75.75V17a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-2.75A.75.75 0 0 1 4.75 13a2.25 2.25 0 0 0 0-4.5A.75.75 0 0 1 4 7.25V7Z"
                                />
                              </svg>
                              <span className="truncate max-[340px]:text-[10px]">Reserva</span>
                              <span className="pointer-events-none absolute inset-0 opacity-0 md:group-hover/card:opacity-0 animate-[ping_4s_linear_infinite] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.18),transparent_60%)]" />
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center p-3 md:p-4">
                        <div className="w-full max-w-[90%] sm:max-w-sm md:max-w-md text-center rounded-xl backdrop-blur-[2px] bg-black/30 border border-white/15 p-3 md:p-4 shadow">
                          <div className="mb-2 flex items-center justify-center gap-2">
                            <span className="text-[11px] md:text-xs font-semibold text-white/90 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                              {dateHuman}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded bg-white/18 text-white/95 border border-white/20">
                              <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5">
                                <path
                                  fill="currentColor"
                                  d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 5v5l4 2-.7 1.3L11 12V7h2z"
                                />
                              </svg>
                              Realizado
                            </span>
                          </div>
                          <h3 className="text-sm md:text-base font-bold leading-snug mb-3 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                            {s.title}
                          </h3>
                          <div className="flex w-full justify-center">
                            <a
                              href="#galeria"
                              className="inline-flex items-center justify-center gap-1 rounded-full py-1.5 px-5 text-[11px] font-semibold text-white shadow focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-[--ring-color]"
                              style={{
                                background: "rgba(255,255,255,0.2)",
                                boxShadow: "0 4px 14px -6px rgba(0,0,0,0.55)",
                              }}
                            >
                              <svg
                                aria-hidden
                                viewBox="0 0 24 24"
                                className="h-3.5 w-3.5 flex-shrink-0 opacity-90"
                              >
                                <path
                                  fill="currentColor"
                                  d="M4 5h16v14H4V5zm2 2v10h12V7H6zm2 8l3-4 2 3 2-3 3 4H8zm8-7a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
                                />
                              </svg>
                              Fotos
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                    {!s.isExpired && (
                      <div className="hidden md:block absolute inset-x-0 bottom-0 p-3 md:p-4 pointer-events-none select-none group-hover/card:opacity-0 transition-opacity duration-300">
                        <h3 className="text-[11px] md:text-sm font-medium text-white/90 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] line-clamp-2">
                          {s.title}
                        </h3>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      <style jsx>{`
        /* Aspect ratio base para las tarjetas */
        .shows-card {
          aspect-ratio: 1080/1920;
        }
        /* Teléfonos ~375x780: reducción proporcional extra (doble que el ajuste anterior) */
        @media (max-width: 400px) and (min-height: 741px) and (max-height: 780px) {
          .shows-grid {
            transform: scale(0.895);
            transform-origin: top center;
          }
        }
        /* Compactar en móviles de poca altura (ej. 740px) */
  @media (max-width: 767px) and (max-height: 740px) {
          .shows-wrap {
            padding-top: calc(0.75rem + var(--top-bar-h, 0px));
            padding-bottom: 0.75rem;
          }
          .shows-header {
            margin-bottom: 1rem !important;
          }
          .shows-header h2 {
            font-size: 1.5rem;
          }
          .shows-grid {
            gap: 1rem !important;
            /* Ajuste fino para 360x740 y similares */
            transform: scale(0.915);
            transform-origin: top center;
          }
          /* Mantener proporción fija 1080/1920: sin override del aspect-ratio */
        }
        /* Aún más compacto en alturas muy bajas */
        @media (max-width: 767px) and (max-height: 680px) {
          .shows-grid { transform: scale(0.89); transform-origin: top center; }
        }
        @media (max-width: 767px) and (max-height: 620px) {
          .shows-grid { transform: scale(0.81); transform-origin: top center; }
        }
        @media (max-width: 767px) and (max-height: 600px) {
          .shows-grid { transform: scale(0.80); transform-origin: top center; }
        }
        /* En móviles con más altura, aprovechar haciéndolas un poco más altas */
        @media (max-width: 767px) and (min-height: 800px) {
          .shows-card { aspect-ratio: 1080/1800; }
        }
        @media (max-width: 767px) and (min-height: 900px) {
          .shows-card { aspect-ratio: 1080/1920; }
        }
        /* En móviles, reservar espacio adicional y centrar verticalmente */
        @media (max-width: 767px) {
          .shows-wrap {
            padding-top: calc(1rem + var(--top-bar-h, 0px));
            min-height: calc(100vh - var(--top-bar-h, 0px) - var(--bottom-indicator-h, 56px));
          }
          .shows-header {
            margin-bottom: 1.25rem;
          }
          .shows-grid {
            gap: 1.25rem;
          }
        }
        @supports (height: 1svh) {
          @media (max-width: 767px) {
            .shows-wrap { min-height: calc(100svh - var(--top-bar-h, 0px) - var(--bottom-indicator-h, 56px)); }
          }
        }
        @supports (height: 1dvh) {
          @media (max-width: 767px) {
            .shows-wrap { min-height: calc(100dvh - var(--top-bar-h, 0px) - var(--bottom-indicator-h, 56px)); }
          }
        }
        /* Teléfonos muy angostos: bajar gaps para ganar aire vertical */
        @media (max-width: 380px) {
          .shows-grid { gap: 0.9rem; }
          .shows-header { margin-bottom: 0.9rem; }
          /* Sin override: mantener 1080/1920 */
        }
      `}</style>
    </section>
  );
}
