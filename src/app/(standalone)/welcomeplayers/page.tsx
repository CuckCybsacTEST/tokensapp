import { Metadata } from "next";
import ShowBackground from "@/components/background/ShowBackground";
import WelcomePlayersClient from "./WelcomePlayersClient";

export const metadata: Metadata = {
  title: "Welcome Players",
  description: "Ruleta pública táctil para premios aleatorios en formato vertical 9:16.",
};

export default function WelcomePlayersPage() {
  return (
    <main
      className="welcomeplayers-scene relative isolate m-0 h-[100vh] w-screen overflow-hidden p-0 text-white"
      style={{
        background:
          "radial-gradient(circle at top, rgba(245,158,11,0.18), transparent 28%), radial-gradient(circle at 20% 20%, rgba(96,165,250,0.12), transparent 22%), linear-gradient(180deg, #090B12 0%, #05070C 100%)",
      }}
    >
      <ShowBackground intensity="high" theme="marketing" />

      <div className="pointer-events-none absolute inset-0 z-[1]">
        <div className="wp-orb wp-orb-1" />
        <div className="wp-orb wp-orb-2" />
        <div className="wp-orb wp-orb-3" />
        <div className="wp-grid" />
        <div className="wp-vignette" />
      </div>

      <div className="relative z-[2] flex h-full w-full">
        <WelcomePlayersClient />
      </div>

      <style jsx global>{`
        .welcomeplayers-scene .wp-orb {
          position: absolute;
          border-radius: 9999px;
          filter: blur(30px);
          mix-blend-mode: screen;
          opacity: 0.55;
          animation: wpFloat 16s ease-in-out infinite;
        }

        .welcomeplayers-scene .wp-orb-1 {
          width: 18rem;
          height: 18rem;
          left: -4rem;
          top: 8vh;
          background: radial-gradient(circle, rgba(236,72,153,0.46), rgba(236,72,153,0.04) 68%, transparent 72%);
          animation-duration: 15s;
        }

        .welcomeplayers-scene .wp-orb-2 {
          width: 22rem;
          height: 22rem;
          right: -5rem;
          top: 20vh;
          background: radial-gradient(circle, rgba(245,158,11,0.42), rgba(245,158,11,0.04) 68%, transparent 72%);
          animation-duration: 19s;
          animation-delay: 1.2s;
        }

        .welcomeplayers-scene .wp-orb-3 {
          width: 24rem;
          height: 24rem;
          left: 12vw;
          bottom: -6rem;
          background: radial-gradient(circle, rgba(56,189,248,0.34), rgba(56,189,248,0.03) 68%, transparent 72%);
          animation-duration: 22s;
          animation-delay: 0.5s;
        }

        .welcomeplayers-scene .wp-grid {
          position: absolute;
          inset: 0;
          opacity: 0.12;
          background-image:
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 42px 42px;
          mask-image: linear-gradient(180deg, rgba(0,0,0,0.9), transparent 85%);
          animation: wpGridShift 20s linear infinite;
        }

        .welcomeplayers-scene .wp-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.2) 100%);
        }

        .welcomeplayers-scene button[aria-label="Girar la ruleta"] {
          position: relative;
          transform-origin: center;
          will-change: transform, box-shadow, filter;
        }

        .welcomeplayers-scene button[aria-label="Girar la ruleta"]::before {
          content: "";
          position: absolute;
          inset: -15%;
          border-radius: 9999px;
          background: conic-gradient(from 0deg, rgba(245,158,11,0.45), rgba(236,72,153,0.42), rgba(14,165,233,0.38), rgba(245,158,11,0.45));
          filter: blur(22px);
          opacity: 0.45;
          z-index: -1;
          animation: wpHalo 10s linear infinite;
        }

        .welcomeplayers-scene button[aria-label="Girar la ruleta"]::after {
          content: "";
          position: absolute;
          inset: -7%;
          border-radius: 9999px;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 0 0 1px rgba(245,158,11,0.12), 0 0 48px rgba(245,158,11,0.16);
          opacity: 0.75;
          pointer-events: none;
        }

        .welcomeplayers-scene button[aria-label="Girar la ruleta"]:not(:disabled) {
          animation: wpWheelIdle 5.5s ease-in-out infinite;
        }

        .welcomeplayers-scene button[aria-label="Girar la ruleta"]:not(:disabled)::before {
          opacity: 0.3;
        }

        .welcomeplayers-scene button[aria-label="Girar la ruleta"]:disabled {
          filter: saturate(1.05);
        }

        .welcomeplayers-scene button[aria-label="Girar la ruleta"]:disabled::before {
          opacity: 0.9;
          animation-duration: 1.6s;
        }

        .welcomeplayers-scene button[aria-label="Girar la ruleta"]:disabled::after {
          box-shadow: 0 0 0 1px rgba(245,158,11,0.24), 0 0 64px rgba(236,72,153,0.22);
        }

        @keyframes wpFloat {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(0, -16px, 0) scale(1.06); }
        }

        @keyframes wpGridShift {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(42px, 42px, 0); }
        }

        @keyframes wpHalo {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.04); }
          100% { transform: rotate(360deg) scale(1); }
        }

        @keyframes wpWheelIdle {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-2px) scale(1.012); }
        }

        @media (prefers-reduced-motion: reduce) {
          .welcomeplayers-scene .wp-orb,
          .welcomeplayers-scene .wp-grid,
          .welcomeplayers-scene button[aria-label="Girar la ruleta"],
          .welcomeplayers-scene button[aria-label="Girar la ruleta"]::before {
            animation: none !important;
          }
        }
      `}</style>
    </main>
  );
}

