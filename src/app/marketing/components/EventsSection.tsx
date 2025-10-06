import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { brand } from "../styles/brand";
import { SectionTitle } from "./ui/SectionTitle";
import { ScrollX } from "./ui/ScrollX";

// Propiedades para el componente EventsSection
interface EventItem {
  id: number;
  date: string;
  title: string;
  tag: string;
  img?: string; // Gradiente legacy o color
  poster?: string; // Imagen (4:5 o 9:16)
  aspect?: "4:5" | "9:16";
}

interface EventsSectionProps {
  events: EventItem[];
}

export function EventsSection({ events }: EventsSectionProps) {
  return (
    <section
      id="shows"
      className="relative py-14 md:py-20 overflow-hidden"
      style={{ minHeight: "100vh" }}
    >
      {/* Fondo decorativo con motion */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0.3 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="absolute bottom-0 left-0 w-1/2 h-3/4 bg-no-repeat bg-contain opacity-10"
        style={{
          backgroundImage: "url(/img/pattern-circles.svg)",
          backgroundPosition: "-5% 100%",
          zIndex: -1,
        }}
      />

      <div className="container mx-auto max-w-7xl px-4 md:px-8 relative z-10">
        {/* Título de sección: foco en sábados estelares */}
        <SectionTitle
          kicker="Próximos Sábados"
          title="Estelares y shows temáticos"
          subtitle="Headliners, temáticos y especiales: los sábados son la noche grande con afiches 1080×1920."
        />

        {/* Grid fijo en desktop para ver 4 en una fila */}
        <div className="mt-10 hidden lg:grid grid-cols-4 gap-6 md:gap-8">
          {events.map((event) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: event.id * 0.1 }}
              viewport={{ once: true }}
              className={`${event.aspect === "9:16" ? "aspect-[9/16]" : "aspect-[4/5]"} rounded-xl p-4 flex flex-col justify-between overflow-hidden relative group shadow-lg`}
              style={{
                backgroundImage: event.img ?? "linear-gradient(135deg,#351010,#5a1717)",
                backgroundSize: "cover",
                backgroundPosition: "center",
                boxShadow: `0 12px 32px -12px ${brand.primary}80`,
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {/* Poster con object-contain para evitar cortes */}
              {event.poster && (
                <Image
                  src={event.poster}
                  alt={event.title}
                  fill
                  className="object-contain pointer-events-none select-none"
                  sizes="(min-width: 1024px) 25vw, 60vw"
                  priority={false}
                />
              )}
              {/* Overlay sutil permanente + énfasis al hover para legibilidad del texto */}
              <motion.div
                className="absolute inset-0 opacity-30 group-hover:opacity-60 transition-opacity duration-500"
                style={{
                  background: `linear-gradient(to top, ${brand.primary}70, transparent 70%)`,
                  backdropFilter: "blur(2px)",
                }}
                initial={false}
              />

              <div className="relative z-10 flex flex-col gap-2">
                <span
                  className="inline-block rounded-full text-xs px-2.5 py-1 backdrop-blur-md mb-1 self-start"
                  style={{
                    background: "rgba(0,0,0,0.18)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  {event.date}
                </span>
                <h3 className="text-lg font-bold mb-1 leading-tight">{event.title}</h3>
                <p className="text-xs opacity-80 font-medium mb-2">{event.tag}</p>
                <div className="flex justify-between items-center mt-2 gap-2">
                  <div className="bg-white/10 backdrop-blur-sm rounded-full py-1 px-3 text-xs font-medium transition-all group-hover:bg-white/20">
                    Ver detalles
                  </div>
                  <a
                    href="/marketing/cumpleanos"
                    className="rounded-full py-1 px-3 text-xs font-medium transition-all transform group-hover:scale-105"
                    style={{
                      background: `${brand.primary}CC`,
                      boxShadow: `0 4px 12px -6px ${brand.primary}`,
                    }}
                  >
                    Reserva cumple
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Contenedor horizontal para mobile/tablet */}
        <div className="mt-10 lg:hidden">
          <ScrollX className="pb-6 md:pb-2 gap-6 md:gap-8">
            {events.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: event.id * 0.1 }}
                viewport={{ once: true }}
                className={`${event.aspect === "9:16" ? "min-w-[180px] sm:min-w-[220px] aspect-[9/16]" : "min-w-[220px] sm:min-w-[260px] aspect-[4/5]"} rounded-xl p-0 md:p-4 flex flex-col justify-between snap-start first:ml-0 overflow-hidden relative group shadow-lg`}
                style={{
                  backgroundImage: event.img ?? "linear-gradient(135deg,#351010,#5a1717)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  boxShadow: `0 12px 32px -12px ${brand.primary}80`,
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                {event.poster && (
                  <Image
                    src={event.poster}
                    alt={event.title}
                    fill
                    className="object-contain object-center pointer-events-none select-none"
                    sizes="(max-width: 1024px) 50vw, 25vw"
                    priority={false}
                  />
                )}
                <motion.div
                  className="absolute inset-0 opacity-10 md:opacity-30 group-hover:opacity-60 transition-opacity duration-500"
                  style={{
                    background: `linear-gradient(to top, ${brand.primary}70, transparent 70%)`,
                    backdropFilter: "blur(2px)",
                  }}
                  initial={false}
                />

                <div className="relative z-10 flex flex-col gap-2">
                  <span
                    className="inline-block rounded-full text-xs px-2.5 py-1 backdrop-blur-md mb-1 self-start"
                    style={{
                      background: "rgba(0,0,0,0.18)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    {event.date}
                  </span>
                  <h3 className="text-lg font-bold mb-1 leading-tight">{event.title}</h3>
                  <p className="text-xs opacity-80 font-medium mb-2">{event.tag}</p>
                  <div className="flex justify-between items-center mt-2 gap-2">
                    <div className="bg-white/10 backdrop-blur-sm rounded-full py-1 px-3 text-xs font-medium transition-all group-hover:bg-white/20">
                      Ver detalles
                    </div>
                    <a
                      href="/marketing/cumpleanos"
                      className="rounded-full py-1 px-3 text-xs font-medium transition-all transform group-hover:scale-105"
                      style={{
                        background: `${brand.primary}CC`,
                        boxShadow: `0 4px 12px -6px ${brand.primary}`,
                      }}
                    >
                      Reserva cumple
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </ScrollX>
        </div>

        {/* Botón "Ver calendario de sábados" eliminado a petición */}
      </div>
    </section>
  );
}
