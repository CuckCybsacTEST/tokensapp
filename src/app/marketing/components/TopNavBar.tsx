"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { brand } from "../styles/brand";

/**
 * Barra superior fija para la landing marketing.
 * Contiene (por ahora) solo el acceso a Intranet, pero puede ampliarse.
 */
export function TopNavBar() {
  const [inHero, setInHero] = useState(true);
  useEffect(() => {
    let obs: IntersectionObserver | null = null;
    let mo: MutationObserver | null = null;
    let observedEl: Element | null = null;
    let cancelled = false;
    let raf = 0;

    const computeInitial = (el: Element | null) => {
      if (!el) return;
      try {
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight || 1;
        const visible = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
        setInHero(visible > 0.5);
      } catch {}
    };

    const computeHeroVisible = () => {
      const el = document.getElementById("hero");
      if (!el) return;
      try {
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight || 1;
        const visible = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
        const ratio = visible / Math.max(1, r.height);
        const next = ratio > 0.01; // cualquier solape
        setInHero((prev) => (prev === next ? prev : next));
      } catch {}
    };

    const attachObserver = (el: Element) => {
      if (obs) {
        try { if (observedEl) obs.unobserve(observedEl); } catch {}
        obs.disconnect();
      }
      // Umbral muy sensible para considerar "en hero" cualquier solapamiento
      obs = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.target === el) {
              const ratio = e.intersectionRatio || 0;
              setInHero(!!e.isIntersecting && ratio > 0.001);
            }
          }
        },
        { threshold: [0, 0.001, 0.01, 0.05, 0.1, 0.5, 1] }
      );
      obs.observe(el);
      observedEl = el;
      computeInitial(el);
    };

    const ensureObserved = (attempt = 0) => {
      if (cancelled) return;
      const el = document.getElementById("hero");
      if (!el) {
        if (attempt < 20) {
          // Reintentar durante ~1.6s para soportar montajes diferidos
          setTimeout(() => ensureObserved(attempt + 1), 80);
        } else {
          // Fallback: si estamos prácticamente arriba, asumimos hero visible
          try {
            setInHero((window.scrollY || 0) < 40);
          } catch {
            setInHero(false);
          }
        }
        return;
      }
      if (el !== observedEl) {
        attachObserver(el);
      } else {
        computeInitial(el);
      }
    };

    // Primera conexión
    ensureObserved();

    // Vigilar cambios en el DOM (el #hero cambia de lugar entre mobile/desktop en el primer render)
    try {
      mo = new MutationObserver(() => {
        const el = document.getElementById("hero");
        if (el && el !== observedEl) {
          attachObserver(el);
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
    } catch {}

    // Recalcular en resize/orientation por cambios de layout
    const onResize = () => {
      const el = document.getElementById("hero");
      if (el && el !== observedEl) {
        attachObserver(el);
      } else if (el) {
        computeInitial(el);
      } else {
        ensureObserved(1);
      }
      // Recalcular de inmediato visibilidad
      computeHeroVisible();
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(computeHeroVisible);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.removeEventListener("scroll", onScroll as any);
      cancelAnimationFrame(raf);
      if (obs) obs.disconnect();
      if (mo) mo.disconnect();
    };
  }, []);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
  animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
  className={`fixed top-0 inset-x-0 z-50 flex items-center justify-between px-3 md:px-6 h-12 md:h-14 select-none`}
      style={{
        background: inHero
          ? "linear-gradient(180deg, rgba(10,10,15,0.85), rgba(10,10,15,0.55) 70%, rgba(10,10,15,0))"
          : "linear-gradient(180deg, rgba(10,10,15,0.96), rgba(10,10,15,0.78) 70%, rgba(10,10,15,0.4))",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: inHero ? `0 2px 10px -4px ${brand.primary}55` : `0 4px 18px -8px ${brand.primary}88`,
      }}
      aria-label="Barra superior"
    >
      {/* Marca lado izquierdo */}
      <a
        href="#hero"
        className="group flex items-center gap-2 md:gap-3 focus:outline-none"
        aria-label="Ir al inicio"
      >
        <span
          className="inline-block h-7 w-7 md:h-8 md:w-8 rounded-md shadow relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${brand.primary}, ${brand.secondary})`,
            boxShadow: `0 0 0 1px rgba(255,255,255,0.15), 0 4px 14px -4px ${brand.primary}aa`,
          }}
        >
          <span
            className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity"
            style={{ background: "#ffffff" }}
          />
        </span>
        <span className="text-sm md:text-base font-extrabold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Go Lounge</span>
      </a>
      {/* Acciones derechas: en Hero = Login/Register/Staff/Admin; fuera = Carta/Ofertas */}
      {inHero ? (
        <div className="flex items-center gap-2 md:gap-3">
          <a
            href="/login"
            className="group inline-flex items-center rounded-sm px-1.5 py-1 text-[11px] md:text-[12px] font-medium tracking-normal focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-[--ring-color]"
            style={{
              color: "#ffffffd0",
              ["--ring-color" as unknown as string]: `${brand.primary}60`,
            }}
            aria-label="Iniciar sesión cliente"
          >
            <span className="opacity-80 group-hover:opacity-100 transition-opacity">Login</span>
          </a>
          <a
            href="/register"
            className="group inline-flex items-center rounded-sm px-1.5 py-1 text-[11px] md:text-[12px] font-medium tracking-normal focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-[--ring-color]"
            style={{
              color: "#ffffffc0",
              ["--ring-color" as unknown as string]: `${brand.primary}50`,
            }}
            aria-label="Registrarse como cliente"
          >
            <span className="opacity-70 group-hover:opacity-100 transition-opacity">Register</span>
          </a>
          <a
            href="/u/login"
            className="group inline-flex items-center rounded-sm px-1.5 py-1 text-[11px] md:text-[12px] font-medium tracking-normal focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-[--ring-color]"
            style={{
              color: "#ffffffb0",
              ["--ring-color" as unknown as string]: `${brand.primary}55`,
            }}
            aria-label="Ir a login usuarios"
          >
            <span className="opacity-70 group-hover:opacity-100 transition-opacity">Staff</span>
          </a>
          <a
            href="/admin"
            className="group inline-flex items-center rounded-sm px-1.5 py-1 text-[11px] md:text-[12px] font-medium tracking-normal focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-[--ring-color]"
            style={{
              color: "#ffffff80",
              ["--ring-color" as unknown as string]: `${brand.primary}40`,
            }}
            aria-label="Ir a panel admin"
          >
            <span className="opacity-60 group-hover:opacity-100 transition-opacity">Admin</span>
          </a>
        </div>
      ) : (
        <div className="flex items-center gap-2 md:gap-3">
          <a
            href="/login"
            className="group inline-flex items-center rounded-sm px-2 py-1 text-[11px] md:text-[12px] font-medium tracking-normal focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0"
            style={{
              color: "#ffffffd0",
              ["--ring-color" as unknown as string]: `${brand.primary}60`,
            }}
            aria-label="Iniciar sesión cliente"
          >
            <span className="opacity-80 group-hover:opacity-100 transition-opacity">Login</span>
          </a>
          <a
            href="/register"
            className="group inline-flex items-center rounded-sm px-2 py-1 text-[11px] md:text-[12px] font-medium tracking-normal focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0"
            style={{
              color: "#ffffffc0",
              ["--ring-color" as unknown as string]: `${brand.primary}50`,
            }}
            aria-label="Registrarse como cliente"
          >
            <span className="opacity-70 group-hover:opacity-100 transition-opacity">Register</span>
          </a>
          {/* Carta: botón fantasma con borde sutil */}
          <a
            href="/menu"
            className="inline-flex items-center rounded-full px-3 py-1 text-[11px] md:text-[12px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0"
            style={{
              color: "#ffffffd0",
              border: "1px solid rgba(255,255,255,0.22)",
              background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
              boxShadow: `0 6px 16px -12px ${brand.primary}66`,
            }}
            aria-label="Ver carta"
          >
            Carta
          </a>
          {/* Ofertas destacado: gradiente de marca + animación sutil */}
          <a
            href="/marketing/ofertas"
            className="offer-cta inline-flex items-center rounded-full px-3.5 py-1.5 text-[11px] md:text-[12px] font-bold tracking-wide shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0"
            style={{
              background: `linear-gradient(135deg, ${brand.primary}, ${brand.secondary})`,
              color: "#fff",
              boxShadow: `0 10px 24px -12px ${brand.primary}AA`,
            }}
            aria-label="Ver ofertas"
          >
            ¡Ofertas!
          </a>
        </div>
      )}
      {/* Línea inferior sutil */}
      <div
        aria-hidden
        className="absolute bottom-0 inset-x-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${brand.primary}66, transparent)`,
        }}
      />
      <style jsx>{`
      /* Animación sutil para invitar al clic: respiración de glow + leve bounce */
      .offer-cta {
        position: relative;
        animation: offer-glow 3.6s ease-in-out infinite;
        transform-origin: center;
      }
      .offer-cta:hover {
        animation-play-state: paused; /* Evitar distracción cuando el usuario ya está encima */
      }
      .offer-cta:focus-visible {
        box-shadow: 0 0 0 3px rgba(255,255,255,0.25), 0 0 0 6px ${brand.primary}55;
      }
      @keyframes offer-glow {
        0% { box-shadow: 0 10px 24px -12px ${brand.primary}AA; transform: translateY(0); }
        35% { box-shadow: 0 14px 28px -12px ${brand.primary}CC; transform: translateY(-1px); }
        70% { box-shadow: 0 10px 24px -12px ${brand.primary}AA; transform: translateY(0); }
        85% { transform: translateY(-0.5px); }
        100% { transform: translateY(0); }
      }
      `}</style>
    </motion.nav>
  );
}

export default TopNavBar;
