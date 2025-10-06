"use client";
import React, { useEffect, useState, useMemo } from "react";
import { brand } from "../styles/brand";
import { SECTIONS } from "../constants/sections";

// Refactor minimalista: un solo set vertical de dots siempre visible.
// Orden requerido: hero, shows, cumple, spotify, galeria, faq, blog, mapa.

interface SectionDescriptor {
  id: string;
  label: string;
}
// SECTIONS ya incluye 'hero' como primer elemento; no lo dupliquemos
const ORDERED: SectionDescriptor[] = SECTIONS;

export function OverlayNav() {
  const [active, setActive] = useState<string>("hero");
  const [hidden, setHidden] = useState(false);
  const [inHero, setInHero] = useState(true);
  const [presentSections, setPresentSections] = useState<SectionDescriptor[]>(ORDERED); // filtradas por existencia

  // Detectar existencia real de nodos para permitir que alguna sección (ej: blog) falte sin romper.
  useEffect(() => {
    const filtered = ORDERED.filter(
      (s) => typeof document !== "undefined" && document.getElementById(s.id)
    );
    if (filtered.length) setPresentSections(filtered);
  }, []);

  // Ocultar / mostrar por dirección de scroll (auto-hide en scroll descendente)
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > lastY + 22) setHidden(true);
      else if (y < lastY - 22) setHidden(false);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Hero gating: ocultar dots mientras >5% del hero visible
  useEffect(() => {
    const hero = document.getElementById("hero");
    if (!hero) {
      setInHero(false);
      return;
    }
    const thresholds: number[] = [];
    for (let t = 0; t <= 1; t += 0.05) thresholds.push(parseFloat(t.toFixed(2)));
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => setInHero(e.intersectionRatio > 0.05));
      },
      { threshold: thresholds }
    );
    obs.observe(hero);
    return () => obs.disconnect();
  }, []);

  // Observer secciones para active (incluye hero) seleccionado por mayor ratio
  useEffect(() => {
    const ratios = new Map<string, number>();
    const ids = presentSections.map((s) => s.id);
    const thresholds: number[] = [];
    for (let t = 0; t <= 1; t += 0.1) thresholds.push(parseFloat(t.toFixed(2)));
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const id = e.target.getAttribute("id");
          if (!id) return;
          ratios.set(id, e.intersectionRatio);
        });
        let bestId = "hero";
        let best = -1;
        ratios.forEach((r, id) => {
          if (r > best) {
            best = r;
            bestId = id;
          }
        });
        if (bestId !== active) setActive(bestId);
      },
      { threshold: thresholds }
    );
    ids.forEach((id) => {
      const el = typeof document !== "undefined" ? document.getElementById(id) : null;
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [presentSections, active]);

  const dots = useMemo(() => presentSections, [presentSections]);

  return (
    <div
      className={`fixed right-4 md:right-5 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center transition-all duration-300 ${inHero ? "opacity-0 pointer-events-none" : hidden ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      aria-label="Navegación de secciones"
    >
      {/* Línea guía */}
      <div
        aria-hidden
        className="absolute inset-y-0 right-[7px] w-px"
        style={{
          background:
            "linear-gradient(to bottom, transparent, rgba(255,255,255,0.20), transparent)",
        }}
      />
      <ul className="flex flex-col gap-3 m-0 p-0 list-none">
        {dots.map((s) => {
          const isActive = active === s.id;
          return (
            <li key={s.id} className="relative">
              <a
                href={`#${s.id}`}
                aria-label={s.label}
                title={s.label}
                className={`group block h-6 w-6 md:h-7 md:w-7 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 transition-all duration-300 ${isActive ? "scale-[1.08]" : "opacity-55 hover:opacity-100"}`}
                style={{
                  background: isActive ? brand.primary : "rgba(255,255,255,0.22)",
                  boxShadow: isActive
                    ? `0 0 0 1px ${brand.primary}AA, 0 0 6px -1px ${brand.primary}`
                    : "0 0 0 1px rgba(255,255,255,0.25)",
                  // Emular ring-color con box-shadow para no inyectar CSS var dinámica
                }}
              >
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-full animate-pulse"
                    style={{ boxShadow: `0 0 0 3px ${brand.primary}33` }}
                  />
                )}
                <span className="sr-only">{s.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
