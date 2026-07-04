"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { WELCOME_PLAYERS_DEFAULT_CONFIG, WELCOME_PLAYERS_FALLBACK_CONFIG } from "@/lib/welcomeplayers/config";
import type { WelcomePlayerPrize, WelcomePlayersRouletteConfig } from "@/lib/welcomeplayers/types";

type SpinResponse = {
  spinId: string;
  prize: WelcomePlayerPrize;
  prizeIndex: number;
  turns: number;
  rotation: number;
  createdAt: string;
};

type StatsResponse = {
  totalSpins: number;
  activePrizes: number;
  topPrize: null | { prizeId: string; label: string; color: string; count: number };
  lastPrize: null | { prizeId: string; label: string; color: string; createdAt: string };
  prizeCounts: Array<{ prizeId: string; label: string; color: string; count: number }>;
  recentSpins: Array<{ spinId: string; prizeId: string; label: string; color: string; createdAt: string }>;
};

const SPIN_DURATION_MS = 5600;
const VIEWBOX = 1000;
const CENTER = VIEWBOX / 2;
const RADIUS = 430;
const INNER_RADIUS = 165;
const LABEL_RADIAL_PADDING = 34;
const LABEL_FONT_FAMILY = "ui-sans-serif, system-ui, sans-serif";
let labelMeasureCanvas: HTMLCanvasElement | null = null;

function normalizeAngle(angle: number) {
  return ((angle % 360) + 360) % 360;
}

function buildSegments(prizes: WelcomePlayerPrize[]) {
  return prizes.filter((prize) => prize.status === "active").sort((a, b) => a.order - b.order);
}

function makeSegmentPath(index: number, total: number) {
  const segmentAngle = 360 / Math.max(total, 1);
  const startAngle = -90 + index * segmentAngle;
  const endAngle = startAngle + segmentAngle;
  const start = polarToCartesian(CENTER, CENTER, RADIUS, endAngle);
  const end = polarToCartesian(CENTER, CENTER, RADIUS, startAngle);
  const largeArcFlag = segmentAngle > 180 ? 1 : 0;

  return [
    `M ${CENTER} ${CENTER}`,
    `L ${start.x} ${start.y}`,
    `A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function splitLabel(label: string) {
  const clean = label.trim().replace(/\s+/g, " ");
  if (!clean) return ["Premio"];

  const words = clean.split(" ");
  if (clean.length <= 10 || words.length === 1) return [clean];
  if (clean.length <= 18) {
    const mid = Math.ceil(words.length / 2);
    return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")].filter(Boolean);
  }
  if (clean.length <= 28) {
    const splitPoint = Math.ceil(words.length / 2);
    return [words.slice(0, splitPoint).join(" "), words.slice(splitPoint).join(" ")].filter(Boolean);
  }

  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > 14 && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4);
}

function getRadialTextRotation(angle: number) {
  const normalized = ((angle % 360) + 360) % 360;
  const flip = normalized > 90 && normalized < 270;
  return angle - 90 + (flip ? 180 : 0);
}

function getSegmentLabelRadius(slice: number) {
  const sliceRadians = (slice * Math.PI) / 180;
  const outerTerm = Math.pow(RADIUS, 3);
  const innerTerm = Math.pow(INNER_RADIUS, 3);
  const outerArea = Math.pow(RADIUS, 2);
  const innerArea = Math.pow(INNER_RADIUS, 2);
  const centroid = (4 * Math.sin(sliceRadians / 2) * (outerTerm - innerTerm)) / (3 * sliceRadians * (outerArea - innerArea));
  return Number.isFinite(centroid) ? centroid : (INNER_RADIUS + RADIUS) / 2;
}

function getLabelMeasureContext() {
  if (typeof document === "undefined") {
    return null;
  }

  if (!labelMeasureCanvas) {
    labelMeasureCanvas = document.createElement("canvas");
  }

  return labelMeasureCanvas.getContext("2d");
}

function measureTextWidth(text: string, fontSize: number) {
  const context = getLabelMeasureContext();
  if (!context) {
    return text.length * fontSize * 0.6;
  }

  context.font = `900 ${fontSize}px ${LABEL_FONT_FAMILY}`;
  return context.measureText(text).width;
}

function measureLabelLayout(lines: string[], fontSize: number) {
  const context = getLabelMeasureContext();
  const fallbackAscent = fontSize * 0.78;
  const fallbackDescent = fontSize * 0.22;

  if (!context) {
    return {
      widestLine: lines.reduce((max, line) => Math.max(max, measureTextWidth(line.toUpperCase(), fontSize)), 0),
      ascent: fallbackAscent,
      descent: fallbackDescent,
      lineHeight: fontSize * 1.02,
    };
  }

  context.font = `900 ${fontSize}px ${LABEL_FONT_FAMILY}`;

  let widestLine = 0;
  let ascent = 0;
  let descent = 0;

  for (const line of lines) {
    const metrics = context.measureText(line.toUpperCase());
    widestLine = Math.max(widestLine, metrics.width);
    ascent = Math.max(ascent, metrics.actualBoundingBoxAscent || fallbackAscent);
    descent = Math.max(descent, metrics.actualBoundingBoxDescent || fallbackDescent);
  }

  return {
    widestLine,
    ascent,
    descent,
    lineHeight: ascent + descent || fontSize * 1.02,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function fitSegmentLabel(lines: string[], slice: number) {
  const anglePadding = Math.max(12, (RADIUS - INNER_RADIUS) * 0.08);
  const sliceRadians = (slice * Math.PI) / 180;
  const targetRadius = getSegmentLabelRadius(slice);
  const maxFontSize = Math.min(30, Math.max(20, Math.round((RADIUS - INNER_RADIUS) * 0.11)));
  const minFontSize = Math.max(11, Math.min(16, Math.round(maxFontSize * 0.5)));

  for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize -= 1) {
    const labelLayout = measureLabelLayout(lines, fontSize);
    const lineGap = Math.max(2, Math.round(fontSize * 0.12));
    const blockWidth = labelLayout.widestLine;
    const blockHeight = labelLayout.lineHeight * lines.length + lineGap * Math.max(0, lines.length - 1);
    const minRadius = INNER_RADIUS + anglePadding + blockWidth / 2;
    const maxRadius = RADIUS - anglePadding - blockWidth / 2;
    if (minRadius > maxRadius) {
      continue;
    }

    const radius = clamp(targetRadius, minRadius, maxRadius);
    const tangentialHalfSpace = radius * Math.tan(sliceRadians / 2) - anglePadding;
    if (blockHeight / 2 > tangentialHalfSpace) {
      continue;
    }

    const totalBlockHeight = blockHeight;
    const firstLineY = -totalBlockHeight / 2 + labelLayout.ascent;
    return {
      fontSize,
      radius,
      lineStep: labelLayout.lineHeight + lineGap,
      firstLineY,
    };
  }

  const fallbackSize = minFontSize;
  const fallbackLayout = measureLabelLayout(lines, fallbackSize);
  const fallbackGap = Math.max(2, Math.round(fallbackSize * 0.12));
  return {
    fontSize: fallbackSize,
    radius: targetRadius,
    lineStep: fallbackLayout.lineHeight + fallbackGap,
    firstLineY: -(fallbackLayout.lineHeight * lines.length + fallbackGap * Math.max(0, lines.length - 1)) / 2 + fallbackLayout.ascent,
  };
}

function SegmentLabel({
  prize,
  index,
  total,
}: {
  prize: WelcomePlayerPrize;
  index: number;
  total: number;
}) {
  const segmentAngle = 360 / Math.max(total, 1);
  const startAngle = -90;
  const angle = startAngle + index * segmentAngle + segmentAngle / 2;
  const rotation = getRadialTextRotation(angle);
  const lines = splitLabel(prize.label);
  const layout = fitSegmentLabel(lines, segmentAngle);
  const position = polarToCartesian(CENTER, CENTER, layout.radius, angle);

  return (
    <g transform={`translate(${position.x}, ${position.y}) rotate(${rotation})`} style={{ pointerEvents: "none" }}>
      <text
        x={0}
        y={0}
        textAnchor="middle"
        fill="#fff"
        fontSize={layout.fontSize}
        fontWeight={900}
        letterSpacing="0"
        fontFamily={LABEL_FONT_FAMILY}
        style={{
          paintOrder: "stroke",
          stroke: "rgba(0,0,0,0.45)",
          strokeWidth: 3,
        }}
      >
        {lines.map((line, lineIndex) => (
          <tspan key={`${prize.id}-${lineIndex}`} x={0} y={layout.firstLineY + lineIndex * layout.lineStep}>
            {line.toUpperCase()}
          </tspan>
        ))}
      </text>
    </g>
  );
}

export default function WelcomePlayersClient() {
  const [config, setConfig] = useState<WelcomePlayersRouletteConfig>(WELCOME_PLAYERS_FALLBACK_CONFIG);
  const prizes = config.prizes;
  const activePrizes = useMemo(() => buildSegments(prizes), [prizes]);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [result, setResult] = useState<SpinResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loadingSpin, setLoadingSpin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setReadyHint] = useState("Toca la ruleta para comenzar");
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [viewport, setViewport] = useState({
    width: 0,
    height: 0,
    dpr: 1,
    viewportMeta: "",
    breakpoint: "unknown",
    kioskPortrait: false,
  });
  const wheelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setDebugEnabled(params.get("debug") === "1");
  }, []);

  useEffect(() => {
    const computeBreakpoint = (width: number, height: number) => {
      if (height >= 1200 && width >= 700 && height > width) return "kiosk-portrait";
      if (width >= 1280) return "xl";
      if (width >= 1024) return "lg";
      if (width >= 768) return "md";
      if (width >= 640) return "sm";
      if (width >= 480) return "xs-wide";
      if (width >= 430) return "mobile-430";
      if (width >= 390) return "mobile-390";
      return "mobile-compact";
    };

    const updateViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const viewportMeta = document.querySelector('meta[name="viewport"]')?.getAttribute("content") || "";
      const breakpoint = computeBreakpoint(width, height);
      setViewport({
        width,
        height,
        dpr: window.devicePixelRatio || 1,
        viewportMeta,
        breakpoint,
        kioskPortrait: breakpoint === "kiosk-portrait",
      });
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      try {
        const res = await fetch("/api/welcomeplayers/config", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!cancelled && data?.ok && Array.isArray(data.prizes)) {
          setConfig({
            title: data.title || WELCOME_PLAYERS_DEFAULT_CONFIG.title,
            subtitle: data.subtitle || WELCOME_PLAYERS_DEFAULT_CONFIG.subtitle,
            instructions: data.instructions || WELCOME_PLAYERS_DEFAULT_CONFIG.instructions,
            aspectRatio: data.aspectRatio || "9:16",
            prizes: data.prizes,
          });
        }
      } catch {
        if (!cancelled) setConfig(WELCOME_PLAYERS_FALLBACK_CONFIG);
      }
    };

    const loadStats = async () => {
      try {
        const res = await fetch("/api/welcomeplayers/stats", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!cancelled && data?.ok) {
          setStats(data as StatsResponse & { ok: true });
        }
      } catch {
        if (!cancelled) setStats(null);
      }
    };

    void loadConfig();
    void loadStats();
    const intervalId = window.setInterval(() => {
      void loadConfig();
      void loadStats();
    }, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const spin = async () => {
    if (spinning || loadingSpin) return;
    setError(null);
    setLoadingSpin(true);
    setReadyHint("Resolviendo premio...");

    try {
      const response = await fetch("/api/welcomeplayers/spin", { method: "POST" });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || "SPIN_FAILED");
      }

      const payload = data as SpinResponse & { ok: true };
      setResult(payload);
      setSpinning(true);
      setShowModal(false);
      const currentAngle = normalizeAngle(rotation);
      const targetAngle = normalizeAngle(payload.rotation);
      const delta = normalizeAngle(targetAngle - currentAngle);
      const fullRotation = rotation + payload.turns * 360 + delta;
      requestAnimationFrame(() => setRotation(fullRotation));

      window.setTimeout(() => {
        setSpinning(false);
        setShowModal(true);
        setReadyHint(`Premio: ${payload.prize.label}`);
        void fetch("/api/welcomeplayers/stats", { cache: "no-store" })
          .then((res) => res.json())
          .then((fresh) => {
            if (fresh?.ok) setStats(fresh as StatsResponse & { ok: true });
          })
          .catch(() => {});
      }, SPIN_DURATION_MS);
    } catch (e: any) {
      setError(e?.message || "SPIN_FAILED");
      setReadyHint("Toca la ruleta para intentar de nuevo");
    } finally {
      setLoadingSpin(false);
    }
  };

  const activePrizeCount = activePrizes.length;
  const canSpin = activePrizeCount >= 3;
  const isKioskPortrait = viewport.kioskPortrait;
  const isCompactHeight = !isKioskPortrait && viewport.height > 0 && viewport.height < 1100;

  return (
    <div
      className={[
        "relative w-full bg-[#060816] text-white",
        isKioskPortrait ? "h-[100dvh] overflow-hidden rounded-none px-8 py-8" : "min-h-[100dvh] overflow-x-hidden overflow-y-visible rounded-[2rem] px-4 py-4",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_42%),radial-gradient(circle_at_50%_0%,_rgba(236,72,153,0.12),_transparent_25%),linear-gradient(180deg,_rgba(255,255,255,0.03),_transparent_16%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:radial-gradient(rgba(255,255,255,0.45)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(180deg,black,transparent_85%)]" />

      {debugEnabled ? (
        <div className="absolute left-3 top-3 z-[9998] max-w-[min(92vw,28rem)] rounded-2xl border border-lime-400/35 bg-black/70 px-4 py-3 font-mono text-[11px] leading-5 text-lime-100 backdrop-blur-md">
          <div>window.innerWidth: {viewport.width}</div>
          <div>window.innerHeight: {viewport.height}</div>
          <div>window.devicePixelRatio: {viewport.dpr}</div>
          <div>viewport CSS actual: {viewport.viewportMeta || "(default)"}</div>
          <div>breakpoint activo: {viewport.breakpoint}</div>
        </div>
      ) : null}

      <div className={[
        "relative mx-auto flex flex-col",
        isKioskPortrait
          ? "h-full w-full max-w-none gap-6"
          : isCompactHeight
            ? "min-h-[calc(100dvh-2rem)] max-w-[34rem] gap-3 pb-6"
            : "min-h-[calc(100dvh-2rem)] max-w-[34rem] gap-4 pb-6",
      ].join(" ")}>
        <header className={[
          "flex flex-col items-center text-center",
          isKioskPortrait ? "gap-6 pt-2" : isCompactHeight ? "gap-2 pt-0.5" : "gap-4 pt-1",
        ].join(" ")}>
          <img src="/loungewhite.png" alt="Ktdral Lounge" className={isKioskPortrait ? "h-20 w-auto object-contain opacity-95" : isCompactHeight ? "h-9 w-auto object-contain opacity-95" : "h-12 w-auto object-contain opacity-95 sm:h-14"} />

          <div className={isKioskPortrait ? "max-w-[56rem]" : "max-w-[30rem]"}>
            <h1 className={[
              "font-black leading-[0.9] tracking-[-0.05em] text-white",
              isKioskPortrait ? "text-[clamp(5rem,7vw,7.4rem)]" : isCompactHeight ? "text-[clamp(2.7rem,5vw,4rem)]" : "text-[clamp(3.4rem,8vw,5.6rem)]",
            ].join(" ")}>
              Toca <span className="bg-gradient-to-r from-fuchsia-500 via-rose-500 to-amber-300 bg-clip-text text-transparent">y gana</span>
            </h1>
            <p className={[
              "mt-4 leading-relaxed text-white/88",
              isKioskPortrait ? "text-[clamp(1.45rem,2vw,2rem)]" : isCompactHeight ? "text-[clamp(0.95rem,1.5vw,1.1rem)]" : "text-[clamp(1rem,2.7vw,1.4rem)]",
            ].join(" ")}>
              Pulsa la pantalla y deja que la ruleta elija tu premio.
            </p>
          </div>
        </header>

        <div className={[
          "relative mx-auto flex w-full items-center justify-center",
          isKioskPortrait ? "max-w-none flex-1 py-3" : isCompactHeight ? "max-w-[34rem] py-1" : "max-w-[34rem] py-2",
        ].join(" ")}>
          <div className="absolute left-1/2 top-0 z-[3] -translate-x-1/2 -translate-y-[8%]" aria-hidden="true">
            <div className={[
              "h-0 w-0 border-l-transparent border-r-transparent border-t-amber-300 drop-shadow-[0_6px_16px_rgba(0,0,0,0.28)]",
              isKioskPortrait ? "border-l-[28px] border-r-[28px] border-t-[46px]" : "border-l-[18px] border-r-[18px] border-t-[30px]",
            ].join(" ")} />
          </div>

          <button
            ref={wheelRef}
            type="button"
            className={[
              "relative flex aspect-square touch-manipulation items-center justify-center overflow-visible rounded-full border border-white/10 bg-[#0A0D16] outline-none select-none ring-1 ring-white/5",
              isKioskPortrait ? "w-[min(82vw,68dvh,58rem)]" : isCompactHeight ? "w-[min(72vw,46dvh,28rem)]" : "w-[min(88vw,34rem)]",
            ].join(" ")}
            onClick={spin}
            onTouchStart={() => {
              if (!spinning && !loadingSpin) setReadyHint("Listo para girar");
            }}
            disabled={spinning || loadingSpin}
            aria-label="Girar la ruleta"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.12, 0.05, 0.14, 1)` : "none",
            }}
          >
            <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} className="absolute inset-0 h-full w-full overflow-visible">
              <defs>
                <radialGradient id="wp-inner" cx="50%" cy="45%" r="55%">
                  <stop offset="0%" stopColor="#1f2937" />
                  <stop offset="100%" stopColor="#090B12" />
                </radialGradient>
                <radialGradient id="wp-center" cx="50%" cy="45%" r="60%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#d6d8df" />
                </radialGradient>
                <filter id="wp-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="10" stdDeviation="18" floodColor="#000" floodOpacity="0.35" />
                </filter>
              </defs>

              <circle cx={CENTER} cy={CENTER} r={RADIUS + 16} fill="rgba(255,255,255,0.03)" />
              <g filter="url(#wp-shadow)">
                {activePrizes.map((prize, index) => (
                  <g key={prize.id}>
                    <path
                      d={makeSegmentPath(index, activePrizeCount)}
                      fill={prize.color}
                      stroke="rgba(255,255,255,0.22)"
                      strokeWidth={4}
                    />
                  </g>
                ))}
              </g>

              <circle cx={CENTER} cy={CENTER} r={INNER_RADIUS} fill="rgba(9,11,18,0.98)" stroke="rgba(255,255,255,0.08)" strokeWidth={4} />
              <circle cx={CENTER} cy={CENTER} r={INNER_RADIUS - 18} fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" strokeWidth={2} />
              <circle cx={CENTER} cy={CENTER} r={INNER_RADIUS - 55} fill="rgba(255,255,255,0.96)" stroke="rgba(255,255,255,0.22)" strokeWidth={4} />
              <circle cx={CENTER} cy={CENTER} r={INNER_RADIUS - 20} fill="none" stroke="rgba(250,204,21,0.75)" strokeWidth={2} />
              <text x={CENTER} y={CENTER + 4} textAnchor="middle" fill="#0B0E16" fontSize="38" fontWeight="900" letterSpacing="0.12em">
                GIRAR
              </text>
            </svg>

            <svg className="pointer-events-none absolute inset-0 z-[2] h-full w-full overflow-visible" viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
              {activePrizes.map((prize, index) => (
                <SegmentLabel key={`label-${prize.id}`} prize={prize} index={index} total={activePrizeCount} />
              ))}
            </svg>
          </button>
        </div>

        {!canSpin && (
          <section className="rounded-[1.25rem] border border-amber-400/25 bg-amber-400/10 px-4 py-4 text-center text-sm leading-relaxed text-amber-100">
            Necesitamos al menos <span className="font-semibold">3 premios activos</span> para activar la ruleta.
            Agrega más premios desde coordinación y vuelve a intentarlo.
          </section>
        )}

        <button
          type="button"
          onClick={spin}
          disabled={spinning || loadingSpin || !canSpin}
          className={[
            "w-full rounded-[1.65rem] border border-white/10 bg-gradient-to-r from-fuchsia-600 via-pink-500 to-amber-400 text-center font-black uppercase tracking-[0.24em] text-white shadow-[0_16px_32px_rgba(236,72,153,0.18)] transition-transform active:scale-[0.99] disabled:opacity-70",
            isKioskPortrait ? "px-6 py-6 text-[1.35rem]" : isCompactHeight ? "px-5 py-4 text-[0.95rem]" : "px-5 py-5 text-[1.05rem]",
          ].join(" ")}
        >
          {canSpin ? "TOCA PARA GIRAR" : "AGREGA MÁS PREMIOS"}
        </button>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="GIROS" value={stats?.totalSpins ?? 0} />
          <StatCard label="PREMIOS" value={stats?.activePrizes ?? activePrizeCount} />
        </div>

        {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>}

        {stats?.lastPrize && (
          <section className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/74 backdrop-blur-sm">
            Último premio entregado: <span className="font-semibold text-amber-300">{stats.lastPrize.label}</span>
          </section>
        )}

        <footer className={[
          "text-center text-white/45",
          isKioskPortrait ? "pb-2 pt-2 text-[1.1rem]" : isCompactHeight ? "pb-1 pt-0 text-[0.8rem]" : "pb-1 pt-1 text-[0.9rem]",
        ].join(" ")}>
          <span className="inline-flex items-center gap-4">
            <span className="h-px w-12 bg-white/15" />
            <span>Un giro por grupo de cinco</span>
            <span className="h-px w-12 bg-white/15" />
          </span>
        </footer>
      </div>

      {showModal && result && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/78 backdrop-blur-md"
            aria-label="Cerrar modal"
            onClick={() => setShowModal(false)}
          />
          <div className={[
            "relative z-[1] w-full rounded-[2rem] border border-white/10 bg-[#070A12] text-center shadow-[0_28px_80px_rgba(0,0,0,0.45)]",
            isKioskPortrait ? "max-w-2xl p-10" : "max-w-md p-6",
          ].join(" ")}>
            <div className="mx-auto h-1 w-24 rounded-full bg-gradient-to-r from-fuchsia-500 via-rose-400 to-amber-300" />
            <p className="mt-5 text-[0.72rem] font-semibold uppercase tracking-[0.38em] text-amber-300">¡GANASTE!</p>
            <h3 className={[
              "mt-3 font-black leading-none tracking-[-0.05em] text-white",
              isKioskPortrait ? "text-[clamp(3.5rem,5vw,5rem)]" : "text-[clamp(2.2rem,6.4vw,3.5rem)]",
            ].join(" ")}>
              {result.prize.label}
            </h3>
            <p className={[
              "mx-auto mt-4 leading-relaxed text-white/78",
              isKioskPortrait ? "max-w-xl text-[1.35rem]" : "max-w-sm text-[1rem]",
            ].join(" ")}>
              Disfruta tu recompensa y vacílate en #KtdralLounge.
            </p>
            <button
              type="button"
              className={[
                "mt-6 w-full rounded-[1.15rem] border border-amber-300/30 bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-400 font-black uppercase tracking-[0.24em] text-white shadow-[0_14px_28px_rgba(244,114,182,0.18)] transition-transform active:scale-[0.99]",
                isKioskPortrait ? "px-6 py-5 text-[1.1rem]" : "px-5 py-4 text-[0.92rem]",
              ].join(" ")}
              onClick={() => setShowModal(false)}
            >
              CERRAR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/4 px-4 py-5 text-center backdrop-blur-sm">
      <div className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-white/45">{label}</div>
      <div className="mt-2 text-[clamp(2.6rem,5vw,3.4rem)] font-black leading-none text-white">{value}</div>
    </div>
  );
}
