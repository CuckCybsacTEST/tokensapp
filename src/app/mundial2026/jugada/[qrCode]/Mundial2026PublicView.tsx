"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Confetti from "react-confetti";
import { AnimatePresence, motion } from "framer-motion";
import { Clock3, QrCode, ShieldCheck, Sparkles, Ticket, Trophy } from "lucide-react";

import { MUNDIAL2026_CLAIM_WINDOW_HOURS } from "@/lib/mundial2026/time";

type Props = {
  publicOutcomeCopy: {
    title: string;
    description: string;
  };
  qrCode: string;
  qrImage: string;
  qrDownloadName: string;
  isClaimBlocked: boolean;
  predictionStatus: string;
  claimStatus: string;
  uiClaimState: {
    label: string;
    className: string;
  };
  matchLabel: string;
  pickLabel: string;
  globalPrize: {
    label: string;
    description: string | null;
    color: string | null;
    badge: string | null;
  };
  claimExpiresAtLabel: string | null;
};

const softEase = [0.22, 1, 0.36, 1] as const;

export default function Mundial2026PublicView(props: Props) {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const syncViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);

    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  const showWinnerCelebration = useMemo(() => {
    return props.predictionStatus === "WON" && ["AVAILABLE", "REDEEMED"].includes(props.claimStatus);
  }, [props.claimStatus, props.predictionStatus]);
  const showWinnerWithoutPrize = useMemo(() => {
    return props.predictionStatus === "WON" && props.claimStatus === "REJECTED";
  }, [props.claimStatus, props.predictionStatus]);
  const showLostOutcome = useMemo(() => {
    return props.predictionStatus === "LOST";
  }, [props.claimStatus, props.predictionStatus]);

  return (
    <section className="mx-auto w-full max-w-[26rem] lg:max-w-xl">
      <AnimatePresence>
        {showWinnerCelebration && viewport.width > 0 && viewport.height > 0 ? (
          <Confetti
            key="mundial-win-confetti"
            width={viewport.width}
            height={Math.min(viewport.height, 720)}
            numberOfPieces={150}
            recycle={false}
            gravity={0.18}
            tweenDuration={5000}
            colors={["#FF5A2F", "#FACC15", "#38BDF8", "#FFFFFF"]}
          />
        ) : null}
      </AnimatePresence>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1 sm:mb-4 sm:px-2">
        <Link href="/mundial2026" className="flex items-center gap-1.5 text-xs text-white/60 transition hover:text-white sm:gap-2 sm:text-sm">
          <span aria-hidden="true">‹</span>
          <span>Volver</span>
        </Link>
        <div className="text-xs font-bold tracking-[0.18em] text-white/45 sm:text-sm sm:tracking-[0.22em]">GO LOUNGE</div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: softEase }}
        className="relative overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.06] px-4 py-4 shadow-2xl shadow-black/35 backdrop-blur-xl sm:rounded-[32px] sm:px-7 sm:py-7"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_32%),linear-gradient(180deg,_rgba(255,255,255,0.04),_transparent_26%)]" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.34, ease: softEase }} className="mb-3 relative sm:mb-6">
            <div className="absolute inset-0 rounded-full bg-[#FF4D2E] blur-2xl opacity-20" />
            <h1 className="relative text-[clamp(1.95rem,10vw,3.4rem)] leading-[0.9] font-black tracking-tight text-white drop-shadow-sm">
              TOKEN
              <br />
              <span className="text-[#FF4D2E]">MUNDIALISTA</span>
            </h1>
          </motion.div>

          {showWinnerCelebration ? (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.36, ease: softEase, delay: 0.08 }}
              className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/14 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-100 shadow-[0_10px_24px_rgba(16,185,129,0.16)] sm:text-[11px]"
            >
              <Trophy className="h-3.5 w-3.5" />
              Jugada ganadora
            </motion.div>
          ) : null}

          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36, ease: softEase, delay: 0.04 }} className="max-w-[28rem] text-sm leading-6 text-white/80 sm:text-base sm:leading-relaxed">
            {props.publicOutcomeCopy.title}
          </motion.p>

          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36, ease: softEase, delay: 0.1 }} className="mt-2 max-w-[28rem] text-xs leading-6 text-white/60 sm:text-sm sm:leading-relaxed">
            {props.publicOutcomeCopy.description}
          </motion.p>

          {showLostOutcome ? (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1, boxShadow: "0 0 0 1px rgba(251,113,133,0.12), 0 22px 44px rgba(190,24,93,0.12)" }}
              transition={{ duration: 0.42, ease: softEase, delay: 0.14 }}
              className="mt-4 w-full rounded-[22px] border border-rose-300/20 bg-[linear-gradient(180deg,_rgba(190,24,93,0.12),_rgba(15,23,42,0.4))] px-4 py-5 text-left sm:mt-5 sm:rounded-[24px] sm:px-6 sm:py-6"
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-100/70">Resultado</div>
              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.36, ease: softEase, delay: 0.2 }}
                className="mt-3 break-words text-[clamp(1.7rem,8vw,2.2rem)] font-black leading-tight text-white"
              >
                No acertaste esta jugada.
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.36, ease: softEase, delay: 0.26 }}
                className="mt-3 max-w-[26rem] text-sm leading-7 text-rose-50/88 sm:text-base"
              >
                Esta vez no se abrió el premio. Puedes volver a intentarlo en el próximo partido.
              </motion.p>
            </motion.div>
          ) : showWinnerWithoutPrize ? (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1, boxShadow: "0 0 0 1px rgba(251,191,36,0.16), 0 22px 44px rgba(217,119,6,0.14)" }}
              transition={{ duration: 0.42, ease: softEase, delay: 0.14 }}
              className="mt-4 w-full rounded-[22px] border border-amber-300/20 bg-[linear-gradient(180deg,_rgba(245,158,11,0.12),_rgba(15,23,42,0.4))] px-4 py-5 text-left sm:mt-5 sm:rounded-[24px] sm:px-6 sm:py-6"
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-100/70">Resultado</div>
              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.36, ease: softEase, delay: 0.2 }}
                className="mt-3 break-words text-[clamp(1.7rem,8vw,2.2rem)] font-black leading-tight text-white"
              >
                Acertaste, pero esta jugada quedó sin premio.
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.36, ease: softEase, delay: 0.26 }}
                className="mt-3 max-w-[26rem] text-sm leading-7 text-amber-50/88 sm:text-base"
              >
                El resultado fue correcto, pero el premio del partido alcanzó su capacidad máxima antes de llegar a esta jugada.
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                boxShadow: showWinnerCelebration
                  ? "0 0 0 1px rgba(250,204,21,0.14), 0 22px 48px rgba(250,204,21,0.12)"
                  : "0 0 0 1px rgba(255,90,47,0.08)",
              }}
              transition={{ duration: 0.42, ease: softEase, delay: 0.14 }}
              className={[
                "mt-4 w-fit max-w-full rounded-[18px] border-2 p-2 transition-all sm:mt-5 sm:rounded-[20px] sm:p-4",
                props.isClaimBlocked
                  ? "border-slate-300/20 bg-slate-200/90"
                  : showWinnerCelebration
                    ? "border-amber-300/35 bg-[linear-gradient(180deg,_#ffffff_0%,_#fff8e8_100%)]"
                    : "border-[#FF5A2F]/25 bg-white",
              ].join(" ")}
            >
              <div className="relative">
                <motion.img
                  alt={`QR ${props.qrCode}`}
                  initial={{ opacity: 0, scale: 0.92, rotate: -1.5 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ duration: 0.42, ease: softEase, delay: 0.2 }}
                  className={[
                    "mx-auto h-auto w-full max-w-[13.4rem] transition-all sm:max-w-[16.2rem]",
                    props.isClaimBlocked ? "grayscale opacity-55 contrast-75" : "grayscale-0 opacity-100",
                  ].join(" ")}
                  src={props.qrImage}
                />

                {props.isClaimBlocked ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.24, delay: 0.24 }} className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="rounded-full border border-slate-700/15 bg-slate-900/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm sm:text-[11px]">
                      {props.uiClaimState.label}
                    </span>
                  </motion.div>
                ) : null}
              </div>

              {!props.isClaimBlocked ? (
                <motion.a
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.34, ease: softEase, delay: 0.28 }}
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#111827] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-black sm:mt-4 sm:min-h-12 sm:px-4 sm:text-sm sm:tracking-[0.18em]"
                  download={props.qrDownloadName}
                  href={props.qrImage}
                >
                  <QrCode className="h-4 w-4" />
                  Descargar QR
                </motion.a>
              ) : null}
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36, ease: softEase, delay: 0.2 }} className="mt-4 grid w-full gap-2 rounded-[18px] border border-white/10 bg-white/[0.04] px-3 py-3 text-left sm:mt-5 sm:gap-3 sm:rounded-[20px] sm:px-4.5 sm:py-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35 sm:text-[11px]">Tu jugada registrada</div>
            <div className="min-w-0 break-words text-base font-semibold leading-6 text-white/80 sm:text-[1.05rem]">{props.matchLabel}</div>
            <div className="min-w-0 break-words text-[12px] font-semibold leading-6 text-amber-200 sm:text-sm">
              <span className="inline-flex flex-wrap items-center gap-1.5">
                <Ticket className="h-3.5 w-3.5" />
                Pronóstico: {props.pickLabel}
              </span>
            </div>
            <div className={["min-w-0 text-[12px] font-medium leading-6 sm:text-sm", props.uiClaimState.className].join(" ")}>
              <span className="inline-flex flex-wrap items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Estado: {props.uiClaimState.label}
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, ease: softEase, delay: 0.28 }}
            className="mt-3 w-full rounded-[22px] border border-white/10 bg-gradient-to-b from-white/10 to-transparent px-3.5 py-3.5 text-left sm:rounded-[24px] sm:px-6 sm:py-6"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-white/60 sm:text-sm">
                {showWinnerCelebration ? <Trophy className="h-4 w-4 text-emerald-300" /> : <Sparkles className="h-4 w-4 text-amber-200" />}
                {showWinnerCelebration ? "JUGADA GANO" : "JUGANDO POR"}
              </div>
              {props.globalPrize.badge ? (
                <span className="rounded-full border border-sky-300/20 bg-sky-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-100">
                  {props.globalPrize.badge}
                </span>
              ) : null}
            </div>
            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.36, ease: softEase, delay: 0.34 }}
              className="break-words text-xl font-bold leading-tight text-white sm:text-2xl lg:text-3xl"
              style={props.globalPrize.color ? { color: props.globalPrize.color } : undefined}
            >
              {props.globalPrize.label}
            </motion.h2>
            {props.globalPrize.description ? (
              <div className="mt-3 text-xs leading-relaxed text-white/80 sm:text-sm">{props.globalPrize.description}</div>
            ) : null}
          </motion.div>

          {props.claimExpiresAtLabel ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: softEase, delay: 0.36 }} className="mt-4 grid w-full gap-2 sm:mt-5 min-[420px]:grid-cols-2">
              <div className="inline-flex w-full items-center justify-center rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-2 text-center text-xs leading-5 text-sky-200/90 sm:text-sm">
                <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5" />
                  Expira ({MUNDIAL2026_CLAIM_WINDOW_HOURS}h): {props.claimExpiresAtLabel}
                </span>
              </div>
            </motion.div>
          ) : null}
        </div>
      </motion.div>
    </section>
  );
}
