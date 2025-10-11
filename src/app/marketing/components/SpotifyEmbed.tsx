"use client";
import React, { useEffect, useRef, useState } from "react";

type Heights = {
  base: number;
  h900?: number;
  h768?: number;
  h600?: number;
  h520?: number;
  h480?: number;
  h420?: number;
  h380?: number;
  h360?: number;
};

type Props = {
  embedUrl: string;
  heights: Heights;
  className?: string;
};

export function SpotifyEmbed({ embedUrl, heights, className }: Props) {
  const [inView, setInView] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            break;
          }
        }
      },
      { rootMargin: "200px 0px", threshold: [0, 0.15, 0.3] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Safety: if the iframe delays 'load', don't keep the skeleton forever
  useEffect(() => {
    if (!inView || loaded) return;
    const id = setTimeout(() => setLoaded(true), 2500);
    return () => clearTimeout(id);
  }, [inView, loaded]);

  const h = heights;

  return (
    <div ref={ref} className={className ? `${className} sp-wrap` : "sp-wrap"}>
      {!loaded && <div className="sp-skel" aria-hidden />}
      {inView && (
        <iframe
          title="Spotify - player"
          className="sp-frame"
          style={{ border: 0, width: "100%", backgroundColor: "#121212" }}
          src={embedUrl}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          onLoad={() => setLoaded(true)}
        />
      )}
      <style jsx>{`
        .sp-wrap {
          position: relative;
          height: ${h.base}px;
          border-radius: 12px;
          overflow: hidden;
        }
        .sp-skel {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            rgba(29, 185, 84, 0.08),
            rgba(29, 185, 84, 0.15),
            rgba(29, 185, 84, 0.08)
          );
          background-size: 200% 100%;
          animation: spShine 1.2s linear infinite;
          pointer-events: none;
          border-radius: 12px;
        }
        @keyframes spShine {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
        .sp-frame {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border-radius: 12px;
          display: block;
        }
        ${h.h900 !== undefined ? `@media (max-width:900px){ .sp-wrap{height:${h.h900}px} }` : ""}
        ${h.h768 !== undefined ? `@media (max-width:768px){ .sp-wrap{height:${h.h768}px} }` : ""}
        ${h.h600 !== undefined ? `@media (max-width:600px){ .sp-wrap{height:${h.h600}px} }` : ""}
        ${h.h520 !== undefined ? `@media (max-width:520px){ .sp-wrap{height:${h.h520}px} }` : ""}
        ${h.h480 !== undefined ? `@media (max-width:480px){ .sp-wrap{height:${h.h480}px} }` : ""}
        ${h.h420 !== undefined ? `@media (max-width:420px){ .sp-wrap{height:${h.h420}px} }` : ""}
        ${h.h380 !== undefined ? `@media (max-width:380px){ .sp-wrap{height:${h.h380}px} }` : ""}
        ${h.h360 !== undefined ? `@media (max-width:360px){ .sp-wrap{height:${h.h360}px} }` : ""}

        /* Altura responsiva por altura de viewport a partir de 740px */
        /* Short screens (e.g., iPhone SE ~667px) */
        @media (max-height: 700px) {
          .sp-wrap {
            height: min(58vh, 440px);
          }
        }
        @media (min-height: 740px) {
          .sp-wrap {
            height: min(50vh, 600px);
          }
        }
        @media (min-height: 820px) {
          .sp-wrap {
            height: min(56vh, 660px);
          }
        }
        @media (min-height: 900px) {
          .sp-wrap {
            height: min(64vh, 740px);
          }
        }
        @media (min-height: 1000px) {
          .sp-wrap {
            height: min(68vh, 820px);
          }
        }
        @media (min-height: 1200px) {
          .sp-wrap {
            height: min(72vh, 900px);
          }
        }

        /* Preferir svh cuando esté disponible (viewport seguro en móviles) */
        @supports (height: 1svh) {
          @media (max-height: 700px) {
            .sp-wrap {
              height: min(60svh, 450px);
            }
          }
          @media (min-height: 740px) {
            .sp-wrap {
              height: min(50svh, 600px);
            }
          }
          @media (min-height: 820px) {
            .sp-wrap {
              height: min(56svh, 660px);
            }
          }
          @media (min-height: 900px) {
            .sp-wrap {
              height: min(64svh, 740px);
            }
          }
          @media (min-height: 1000px) {
            .sp-wrap {
              height: min(68svh, 820px);
            }
          }
          @media (min-height: 1200px) {
            .sp-wrap {
              height: min(72svh, 900px);
            }
          }
        }
      `}</style>
    </div>
  );
}

export default SpotifyEmbed;
