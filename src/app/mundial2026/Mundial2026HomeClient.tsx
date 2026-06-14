"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Clock3, Sparkles, Star, Trophy } from "lucide-react";
import { DateTime } from "luxon";
import { useEffect, useMemo, useRef, useState } from "react";

import { generateQrPngDataUrl } from "@/lib/qr";
import { getMundial2026NameValidationError } from "@/lib/mundial2026/name";

type MatchPrize = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  color: string | null;
  assignmentMode: string;
  maxWinners: number | null;
};

type MatchItem = {
  id: string;
  externalKey: string;
  stage: string | null;
  homeTeam: string;
  awayTeam: string;
  startsAt: string;
  predictionClosesAt: string;
  status: string;
  predictionsOpen: boolean;
  prizes: MatchPrize[];
};

type PredictionResponse = {
  prediction: {
    id: string;
    qrCode: string;
    qrPayload: string;
    pick: PickValue;
    match: {
      id: string;
      homeTeam: string;
      awayTeam: string;
      startsAt: string;
    };
  };
};

type RecoveryResponse = {
  prediction: {
    id: string;
    qrCode: string;
    detailPath: string;
    match: {
      id: string;
      homeTeam: string;
      awayTeam: string;
      startsAt: string;
    };
  };
};

type SuccessState = {
  qrCode: string;
  qrImageUrl: string;
  detailPath: string;
  matchLabel: string;
  pickLabel: string;
};

type Props = {
  campaignSlug: string;
  initialMatches: MatchItem[];
  matchCardBackgrounds: string[];
  sectionTitle: string;
  sectionHint: string;
  simulatedNowIso: string | null;
};

type PickValue = "HOME" | "DRAW" | "AWAY";
type WizardStep = "match" | "pick" | "identity" | "success";

const stepOrder: Exclude<WizardStep, "success">[] = ["match", "pick", "identity"];
const DEFAULT_TIMEZONE = "America/Lima";
const MOBILE_POSTER_AUTO_ADVANCE_MS = 4500;
const MOBILE_POSTER_MANUAL_PAUSE_MS = 7000;
const MOBILE_POSTER_SCROLL_SYNC_MS = 250;
const MOBILE_POSTER_SETTLE_MS = 140;
const HERO_BACKGROUND_SRC = "/posters/mundial2026-hero.webp";
const HERO_BACKGROUND_SIZES = "(max-width: 639px) 100vw, (max-width: 1279px) 100vw, 1280px";
const HERO_DECOR_STRIPES = [
  "rotate-[38deg] bg-[linear-gradient(90deg,_rgba(14,165,233,0)_0%,_rgba(14,165,233,0.7)_42%,_rgba(125,211,252,0.1)_100%)]",
  "rotate-[38deg] bg-[linear-gradient(90deg,_rgba(250,204,21,0)_0%,_rgba(250,204,21,0.55)_52%,_rgba(250,204,21,0.06)_100%)]",
  "rotate-[38deg] bg-[linear-gradient(90deg,_rgba(59,130,246,0)_0%,_rgba(59,130,246,0.72)_52%,_rgba(59,130,246,0.06)_100%)]",
] as const;
const HERO_CONTENT = {
  eyebrow: "Modo mundialista",
  titleLines: ["Bienvenido a", "KTDRAL", "FAN ZONE."] as const,
  accentLineIndex: 2,
} as const;
const WIZARD_STEP_COPY = {
  match: {
    eyebrow: "Tu jugada",
    title: "Elige tu partido y entra a la cancha",
    description: null,
  },
  pick: {
    eyebrow: "Tu elección",
    title: "Marca tu pronóstico",
    description: null,
  },
  identity: {
    eyebrow: "Último paso",
    title: "Bien, ya casi está.",
    description: "Déjanos tu nombre y WhatsApp para guardar tu jugada y generar tu QR.",
  },
  success: {
    eyebrow: "Jugada guardada",
    title: "Tu QR ya está listo.",
    description: "Descárgalo o guárdalo para reclamar el premio si aciertas.",
  },
} as const;
const softEase = [0.22, 1, 0.36, 1] as const;
const fadeUpVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: softEase } },
};
const staggerGroupVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};
const modalStepVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.28, ease: softEase } },
  exit: { opacity: 0, y: -10, scale: 0.985, transition: { duration: 0.18, ease: softEase } },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: DEFAULT_TIMEZONE,
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}

function getLimaDate(value: string) {
  return DateTime.fromISO(value).setZone(DEFAULT_TIMEZONE).toJSDate();
}

function formatLimaDayKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";
  return `${year}-${month}-${day}`;
}

function formatMatchTime(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: DEFAULT_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(getLimaDate(value));
}

function isSameLimaDay(value: string, day: string) {
  return formatLimaDayKey(getLimaDate(value)) === day;
}

function formatLimaShortDay(value: Date) {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: DEFAULT_TIMEZONE,
    day: "2-digit",
    month: "short",
  }).format(value);
}

function formatLimaLongDay(value: Date) {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: DEFAULT_TIMEZONE,
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(value);
}

function formatMatchStageLabel(stage: string | null) {
  if (!stage) return "JORNADA · PARTIDO";

  const normalized = stage.trim();
  const match = normalized.match(/^GRUPO\s+(.+?)\s+-\s+FECHA\s+(.+)$/i);
  if (!match) {
    return normalized.replace(/\s+-\s+/g, " · ").toUpperCase();
  }

  const group = match[1]?.trim().toUpperCase();
  const round = match[2]?.trim();
  return `JORNADA ${round} · GRUPO ${group}`;
}

function getHeroMatchAccent(index: number) {
  const accents = [
    {
      cardClass: "border-sky-300/25 bg-[linear-gradient(180deg,_rgba(56,189,248,0.14),_rgba(15,23,42,0.9))]",
      chipClass: "border-sky-300/20 bg-sky-400/10 text-sky-100",
      titleClass: "text-sky-50",
    },
    {
      cardClass: "border-emerald-300/25 bg-[linear-gradient(180deg,_rgba(16,185,129,0.14),_rgba(15,23,42,0.9))]",
      chipClass: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100",
      titleClass: "text-emerald-50",
    },
    {
      cardClass: "border-amber-300/25 bg-[linear-gradient(180deg,_rgba(245,158,11,0.14),_rgba(15,23,42,0.9))]",
      chipClass: "border-amber-300/20 bg-amber-400/10 text-amber-100",
      titleClass: "text-amber-50",
    },
    {
      cardClass: "border-rose-300/25 bg-[linear-gradient(180deg,_rgba(251,113,133,0.14),_rgba(15,23,42,0.9))]",
      chipClass: "border-rose-300/20 bg-rose-400/10 text-rose-100",
      titleClass: "text-rose-50",
    },
  ] as const;

  return accents[index % accents.length];
}

function getHeroMatchState(match: MatchItem) {
  if (match.status === "SETTLED") {
    return {
      blocked: true,
      cardClass: "shadow-none saturate-[0.8] opacity-75",
      chipClass: "text-white/85",
    };
  }

  if (!match.predictionsOpen) {
    return {
      blocked: true,
      cardClass: "shadow-none saturate-[0.55] opacity-60",
      chipClass: "text-white/80",
    };
  }

  return {
    blocked: false,
    cardClass: "shadow-[0_12px_30px_rgba(15,23,42,0.18)]",
    chipClass: "text-white",
  };
}

function getPosterStatusChip(match: MatchItem) {
  if (match.status === "SETTLED" || match.status === "FINISHED") {
    return "Partido ya jugado";
  }

  return null;
}

function getWizardMatchStatusChip(match: MatchItem) {
  if (match.status === "SETTLED") {
    return "Jugada liquidada";
  }
  if (match.status === "FINISHED") {
    return "Partido finalizado";
  }
  if (!match.predictionsOpen) {
    return "Jugada cerrada";
  }
  return "Jugada abierta";
}

function MatchPosterCard({ match, index, backgroundSrc }: { match: MatchItem; index: number; backgroundSrc: string }) {
  const accent = getHeroMatchAccent(index);
  const state = getHeroMatchState(match);
  const mainPrize = match.prizes[0] || null;
  const statusChip = getPosterStatusChip(match);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUpVariants}
      whileTap={{ scale: 0.992 }}
      whileHover={state.blocked ? undefined : { y: -4, transition: { duration: 0.18 } }}
      className={[
        "relative min-w-0 overflow-hidden rounded-[20px] border px-3.5 py-3.5 transition-all duration-200 sm:rounded-[22px] sm:px-5 sm:py-5 [@media(max-height:820px)]:px-3 [@media(max-height:820px)]:py-3",
        accent.cardClass,
        state.cardClass,
        state.blocked ? "" : "md:hover:-translate-y-1",
      ].join(" ")}
    >
      {backgroundSrc ? (
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-no-repeat"
          style={{
            backgroundImage: `url(${backgroundSrc})`,
            backgroundPosition: "center 92%",
            backgroundSize: "155% auto",
          }}
        />
      ) : null}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,_rgba(3,8,20,0.82)_0%,_rgba(4,9,21,0.7)_18%,_rgba(4,9,20,0.42)_56%,_rgba(3,8,19,0.76)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[44%] bg-[linear-gradient(180deg,_rgba(34,197,94,0)_0%,_rgba(34,197,94,0.12)_24%,_rgba(34,197,94,0.2)_56%,_rgba(20,83,45,0.3)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-white/10" />

      <div className="relative z-10">
      {statusChip ? (
        <div className="pointer-events-none absolute right-0 top-0 z-20 flex justify-end">
          <span
            className={[
              "rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] sm:px-3 sm:text-[10px] sm:tracking-[0.22em]",
              accent.chipClass,
              state.chipClass,
            ].join(" ")}
          >
            {statusChip}
          </span>
        </div>
      ) : null}

      <div className={["space-y-3 sm:mt-0", statusChip ? "pt-8 sm:pt-9" : ""].join(" ")}>
        {!statusChip ? (
          <div className="flex justify-end">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-slate-950/34 px-2.5 py-1 sm:gap-2 sm:px-3.5 sm:py-1.5">
              <Clock3 className="h-3.5 w-3.5 text-slate-500/90" />
              <span className="text-[9px] uppercase tracking-[0.18em] text-slate-500/90 sm:tracking-[0.24em]">Pitazo</span>
              <span className="text-sm font-semibold text-white/92 sm:text-base">{formatMatchTime(match.startsAt)}</span>
            </div>
          </div>
        ) : null}
        <div className="min-w-0 space-y-1.5">
          <div className={["break-words text-[1.7rem] font-black leading-[0.92] sm:text-[2.2rem] lg:text-[2rem] [@media(max-height:820px)]:text-[1.45rem]", accent.titleClass].join(" ")}>
            {match.homeTeam}
          </div>
          <div className="text-[0.95rem] font-black uppercase tracking-[0.12em] text-slate-500 sm:text-[1.05rem]">vs</div>
          <div className={["break-words text-[1.7rem] font-black leading-[0.92] sm:text-[2.2rem] lg:text-[2rem] [@media(max-height:820px)]:text-[1.45rem]", accent.titleClass].join(" ")}>
            {match.awayTeam}
          </div>
        </div>
      </div>

      <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 border-t border-dashed border-white/18 pt-3 text-sm sm:mt-3.5 sm:pt-3.5 sm:text-[0.95rem]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/24 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-300 sm:text-[10px] sm:tracking-[0.24em]">
          <Trophy className="h-3.5 w-3.5" />
          Jugando por
        </span>
        <span
          className="min-w-0 basis-full break-words font-semibold leading-tight text-white/96 sm:basis-auto sm:flex-1 [@media(max-height:820px)]:text-[0.95rem]"
          style={mainPrize?.color ? { color: mainPrize.color } : undefined}
        >
          {mainPrize?.label || "Premio por confirmar"}
        </span>
      </div>
      </div>
    </motion.div>
  );
}

function getPosterItems(container: HTMLDivElement) {
  return Array.from(container.children) as HTMLElement[];
}

function getClosestPosterIndex(container: HTMLDivElement) {
  const items = getPosterItems(container);
  if (items.length === 0) return 0;

  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  items.forEach((item, index) => {
    const distance = Math.abs(item.offsetLeft - container.scrollLeft);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "No se pudo registrar tu jugada.";
}

function getPickCopy(match: { homeTeam: string; awayTeam: string }, pick: PickValue) {
  if (pick === "HOME") return `${match.homeTeam} gana`;
  if (pick === "AWAY") return `${match.awayTeam} gana`;
  return "Empate";
}

function getPickOptionClasses(option: PickValue, active: boolean) {
  const base = "min-h-[144px] rounded-[20px] border px-4 py-4 text-left transition-all duration-200 backdrop-blur-md sm:min-h-[168px] sm:rounded-[22px] sm:px-4 sm:py-5";

  if (!active) {
    return `${base} border-white/12 bg-slate-950/52 text-slate-100 hover:-translate-y-0.5 hover:border-white/24 hover:bg-slate-900/62`;
  }

  if (option === "HOME") {
    return `${base} border-emerald-300/55 bg-[linear-gradient(180deg,_rgba(16,185,129,0.2),_rgba(2,6,23,0.74))] text-white shadow-[0_14px_28px_rgba(16,185,129,0.16)]`;
  }

  if (option === "DRAW") {
    return `${base} border-amber-300/55 bg-[linear-gradient(180deg,_rgba(245,158,11,0.2),_rgba(2,6,23,0.74))] text-white shadow-[0_14px_28px_rgba(245,158,11,0.16)]`;
  }

  return `${base} border-rose-300/55 bg-[linear-gradient(180deg,_rgba(244,63,94,0.2),_rgba(2,6,23,0.74))] text-white shadow-[0_14px_28px_rgba(244,63,94,0.16)]`;
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function getStableMatchCardBackgrounds(matches: MatchItem[], sources: string[]) {
  if (sources.length === 0) {
    return matches.map(() => HERO_BACKGROUND_SRC);
  }

  const used = new Set<string>();

  return matches.map((match, index) => {
    const seed = `${match.id}|${match.externalKey}|${match.homeTeam}|${match.awayTeam}|${index}`;
    const startIndex = hashString(seed) % sources.length;

    for (let offset = 0; offset < sources.length; offset += 1) {
      const candidate = sources[(startIndex + offset) % sources.length];
      if (!used.has(candidate) || used.size >= sources.length) {
        used.add(candidate);
        return candidate;
      }
    }

    return sources[startIndex];
  });
}

function getFieldBackdropStyle(position: string = "center 88%", size: string = "cover") {
  return HERO_BACKGROUND_SRC
    ? {
        backgroundImage: `url(${HERO_BACKGROUND_SRC})`,
        backgroundPosition: position,
        backgroundSize: size,
        backgroundRepeat: "no-repeat",
      }
    : undefined;
}

export default function Mundial2026HomeClient({ campaignSlug, initialMatches, matchCardBackgrounds, sectionTitle, sectionHint, simulatedNowIso }: Props) {
  const nowLima = useMemo(() => {
    if (simulatedNowIso) {
      return DateTime.fromISO(simulatedNowIso).setZone(DEFAULT_TIMEZONE).toJSDate();
    }
    return DateTime.now().setZone(DEFAULT_TIMEZONE).toJSDate();
  }, [simulatedNowIso]);
  const displayMatches = useMemo(
    () => initialMatches.slice().sort((left, right) => Number(right.predictionsOpen) - Number(left.predictionsOpen)),
    [initialMatches]
  );
  const homeCardBackgrounds = useMemo(
    () => getStableMatchCardBackgrounds(displayMatches, matchCardBackgrounds),
    [displayMatches, matchCardBackgrounds]
  );
  const openMatches = useMemo(() => displayMatches.filter((match) => match.predictionsOpen), [displayMatches]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>(openMatches[0]?.id || "");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [pick, setPick] = useState<PickValue>("HOME");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successPath, setSuccessPath] = useState<string | null>(null);
  const [successState, setSuccessState] = useState<SuccessState | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>("match");
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [recoveryMatchId, setRecoveryMatchId] = useState(initialMatches[0]?.id || "");
  const [recoveryName, setRecoveryName] = useState("");
  const [recoveryWhatsapp, setRecoveryWhatsapp] = useState("");
  const [recoverySubmitting, setRecoverySubmitting] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [mobilePosterIndex, setMobilePosterIndex] = useState(0);
  const mobilePosterRef = useRef<HTMLDivElement | null>(null);
  const mobilePosterAutoPauseUntilRef = useRef(0);
  const mobilePosterSyncTimeoutRef = useRef<number | null>(null);
  const mobilePosterSettleTimeoutRef = useRef<number | null>(null);
  const mobilePosterGestureStartIndexRef = useRef(0);
  const mobilePosterProgrammaticScrollRef = useRef(false);
  const mobilePosterInteractingRef = useRef(false);

  const selectedMatch = useMemo(
    () => openMatches.find((match) => match.id === selectedMatchId) || openMatches[0] || null,
    [openMatches, selectedMatchId]
  );
  const wizardCopy = WIZARD_STEP_COPY[wizardStep];

  const currentStepIndex = wizardStep === "success" ? stepOrder.length : stepOrder.indexOf(wizardStep);
  const primaryActionClass =
    "inline-flex items-center justify-center rounded-full border border-sky-300/45 bg-[linear-gradient(135deg,_rgba(56,189,248,0.96),_rgba(14,165,233,0.82))] px-6 py-3 text-center text-sm font-black tracking-[0.02em] text-slate-950 shadow-[0_14px_32px_rgba(14,165,233,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(14,165,233,0.36)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:text-base";
  const secondaryActionClass =
    "inline-flex items-center justify-center rounded-full border border-white/14 bg-white/[0.05] px-6 py-3 text-center text-sm font-semibold text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300/30 hover:bg-sky-400/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:text-base";
  const successActionClass =
    "inline-flex items-center justify-center rounded-full border border-emerald-300/45 bg-[linear-gradient(135deg,_rgba(52,211,153,0.95),_rgba(16,185,129,0.82))] px-6 py-3 text-center text-sm font-black text-slate-950 shadow-[0_14px_32px_rgba(16,185,129,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(16,185,129,0.3)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";
  const recoveryActionClass =
    "inline-flex items-center justify-center rounded-full border border-amber-300/40 bg-[linear-gradient(135deg,_rgba(251,191,36,0.94),_rgba(245,158,11,0.8))] px-6 py-3 text-center text-sm font-black text-slate-950 shadow-[0_14px_30px_rgba(245,158,11,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(245,158,11,0.3)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:text-base";

  function renderHeroActions(containerClassName: string) {
    return (
      <div className={containerClassName}>
        <button className={`${primaryActionClass} w-full sm:w-auto`} type="button" onClick={openWizard} disabled={openMatches.length === 0}>
          {openMatches.length > 0 ? "Jugar ahora" : "Hoy no hay partidos disponibles"}
        </button>
        <button className={`${recoveryActionClass} w-full sm:w-auto`} type="button" onClick={openRecovery} disabled={initialMatches.length === 0}>
          Recuperar mi jugada
        </button>
        {successPath ? (
          <Link href={successPath} className={`${secondaryActionClass} hidden sm:inline-flex sm:w-auto`}>
            Ver mi último QR
          </Link>
        ) : null}
      </div>
    );
  }

  useEffect(() => {
    setMobilePosterIndex(0);
  }, [displayMatches.length]);

  useEffect(() => {
    if (displayMatches.length <= 1) return;

    const intervalId = window.setInterval(() => {
      if (Date.now() < mobilePosterAutoPauseUntilRef.current) {
        return;
      }

      setMobilePosterIndex((current) => (current + 1) % displayMatches.length);
    }, MOBILE_POSTER_AUTO_ADVANCE_MS);

    return () => window.clearInterval(intervalId);
  }, [displayMatches.length]);

  useEffect(() => {
    const container = mobilePosterRef.current;
    if (!container || displayMatches.length <= 1) return;

    const slide = container.children.item(mobilePosterIndex) as HTMLElement | null;
    if (!slide || mobilePosterInteractingRef.current) return;

    mobilePosterProgrammaticScrollRef.current = true;
    if (mobilePosterSyncTimeoutRef.current !== null) {
      window.clearTimeout(mobilePosterSyncTimeoutRef.current);
    }

    container.scrollTo({
      left: slide.offsetLeft,
      behavior: "smooth",
    });

    mobilePosterSyncTimeoutRef.current = window.setTimeout(() => {
      mobilePosterProgrammaticScrollRef.current = false;
      mobilePosterSyncTimeoutRef.current = null;
    }, MOBILE_POSTER_SCROLL_SYNC_MS);
  }, [mobilePosterIndex, displayMatches.length]);

  useEffect(() => {
    const container = mobilePosterRef.current;
    if (!container || displayMatches.length <= 1) return;

    const syncActivePoster = () => {
      const items = getPosterItems(container);
      const activeItem = items[mobilePosterIndex];
      if (!activeItem) return;

      container.scrollTo({
        left: activeItem.offsetLeft,
        behavior: "auto",
      });
    };

    syncActivePoster();
    window.addEventListener("resize", syncActivePoster);

    return () => window.removeEventListener("resize", syncActivePoster);
  }, [mobilePosterIndex, displayMatches.length]);

  useEffect(() => {
    return () => {
      if (mobilePosterSyncTimeoutRef.current !== null) {
        window.clearTimeout(mobilePosterSyncTimeoutRef.current);
      }
      if (mobilePosterSettleTimeoutRef.current !== null) {
        window.clearTimeout(mobilePosterSettleTimeoutRef.current);
      }
    };
  }, []);

  function scheduleMobilePosterSettle(container: HTMLDivElement) {
    if (mobilePosterSettleTimeoutRef.current !== null) {
      window.clearTimeout(mobilePosterSettleTimeoutRef.current);
    }

    mobilePosterSettleTimeoutRef.current = window.setTimeout(() => {
      const nextIndex = getClosestPosterIndex(container);
      mobilePosterInteractingRef.current = false;
      setMobilePosterIndex((current) => {
        const maxIndex = Math.max(0, displayMatches.length - 1);
        const startIndex = Math.max(0, Math.min(mobilePosterGestureStartIndexRef.current, maxIndex));
        const clampedByGesture = Math.max(startIndex - 1, Math.min(nextIndex, startIndex + 1));
        const boundedIndex = Math.max(0, Math.min(clampedByGesture, maxIndex));
        return current === boundedIndex ? current : boundedIndex;
      });
      mobilePosterSettleTimeoutRef.current = null;
    }, MOBILE_POSTER_SETTLE_MS);
  }

  function pauseMobilePosterAutoSlide() {
    mobilePosterAutoPauseUntilRef.current = Date.now() + MOBILE_POSTER_MANUAL_PAUSE_MS;
  }

  function startMobilePosterInteraction() {
    mobilePosterGestureStartIndexRef.current = mobilePosterIndex;
    mobilePosterInteractingRef.current = true;
    pauseMobilePosterAutoSlide();
  }

  function settleMobilePosterInteraction() {
    const container = mobilePosterRef.current;
    if (!container) {
      mobilePosterInteractingRef.current = false;
      return;
    }

    scheduleMobilePosterSettle(container);
  }

  function handleMobilePosterScroll(event: React.UIEvent<HTMLDivElement>) {
    const container = event.currentTarget;
    if (!mobilePosterProgrammaticScrollRef.current) {
      pauseMobilePosterAutoSlide();
      scheduleMobilePosterSettle(container);
    }
  }

  function openWizard() {
    if (openMatches.length === 0) return;
    setSelectedMatchId(openMatches[0].id);
    setError(null);
    setSuccessPath(null);
    setSuccessState(null);
    setWizardStep("match");
    setIsWizardOpen(true);
  }

  function closeWizard() {
    setIsWizardOpen(false);
    setError(null);
    if (wizardStep !== "success") {
      setSuccessPath(null);
      setSuccessState(null);
    }
  }

  function openRecovery() {
    if (initialMatches.length === 0) return;
    setRecoveryMatchId(selectedMatch?.id || initialMatches[0]?.id || "");
    setRecoveryName("");
    setRecoveryWhatsapp("");
    setRecoveryError(null);
    setIsRecoveryOpen(true);
  }

  function closeRecovery() {
    if (recoverySubmitting) return;
    setIsRecoveryOpen(false);
    setRecoveryError(null);
  }

  function goNextStep() {
    if (!selectedMatch) return;
    if (wizardStep === "match") {
      setWizardStep("pick");
      return;
    }
    if (wizardStep === "pick") {
      setWizardStep("identity");
    }
  }

  function goPrevStep() {
    if (wizardStep === "identity") {
      setWizardStep("pick");
      return;
    }
    if (wizardStep === "pick") {
      setWizardStep("match");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMatch) return;

    const nameError = getMundial2026NameValidationError(name);
    if (nameError) {
      setError(nameError);
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessPath(null);
    setSuccessState(null);

    try {
      const response = await fetch("/api/mundial2026/predictions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaignSlug,
          matchId: selectedMatch.id,
          name,
          whatsapp,
          pick,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "No se pudo registrar tu jugada.");
      }

      const data = payload as PredictionResponse;
      const detailPath = `/mundial2026/jugada/${encodeURIComponent(data.prediction.qrCode)}`;
      const qrImageUrl = await generateQrPngDataUrl(data.prediction.qrPayload);
      setSuccessPath(detailPath);
      setSuccessState({
        qrCode: data.prediction.qrCode,
        qrImageUrl,
        detailPath,
        matchLabel: `${data.prediction.match.homeTeam} vs ${data.prediction.match.awayTeam}`,
        pickLabel: getPickCopy(data.prediction.match, data.prediction.pick),
      });
      setWizardStep("success");
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRecoverPrediction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!recoveryMatchId) return;

    const nameError = getMundial2026NameValidationError(recoveryName);
    if (nameError) {
      setRecoveryError(nameError);
      return;
    }

    setRecoverySubmitting(true);
    setRecoveryError(null);

    try {
      const response = await fetch("/api/mundial2026/recover", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaignSlug,
          matchId: recoveryMatchId,
          name: recoveryName,
          whatsapp: recoveryWhatsapp,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "No encontramos una jugada con esos datos.");
      }

      const data = payload as RecoveryResponse;
      setSuccessPath(data.prediction.detailPath);
      setIsRecoveryOpen(false);
      if (typeof window !== "undefined") {
        window.location.assign(data.prediction.detailPath);
      }
    } catch (recoverError) {
      setRecoveryError(getErrorMessage(recoverError));
    } finally {
      setRecoverySubmitting(false);
    }
  }

  function downloadSuccessQr() {
    if (!successState || typeof document === "undefined") return;
    const link = document.createElement("a");
    link.href = successState.qrImageUrl;
    link.download = `mundial2026-${successState.qrCode}.png`;
    link.click();
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.24),_transparent_30%),radial-gradient(circle_at_85%_18%,_rgba(16,185,129,0.12),_transparent_22%),linear-gradient(180deg,_#040b16_0%,_#081220_34%,_#0a1930_100%)] text-slate-50">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-3 py-4 sm:gap-8 sm:px-6 sm:py-8 lg:px-8 [@media(max-height:820px)]:gap-3 [@media(max-height:820px)]:py-3">
        <section className="relative isolate overflow-hidden rounded-[28px] border border-white/10 bg-[#06111f]/70 shadow-[0_24px_80px_rgba(2,6,23,0.6)] sm:rounded-[36px]">
          {HERO_BACKGROUND_SRC ? (
            <div className="absolute inset-0">
              <Image
                alt="Fondo hero Mundial 2026"
                className="object-cover object-[center_20%] sm:object-[center_24%] lg:object-center"
                fill
                priority
                sizes={HERO_BACKGROUND_SIZES}
                src={HERO_BACKGROUND_SRC}
              />
            </div>
          ) : null}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,_rgba(2,6,23,0.28)_0%,_rgba(2,6,23,0.38)_18%,_rgba(2,6,23,0.7)_65%,_rgba(2,6,23,0.92)_100%)] lg:bg-[linear-gradient(90deg,_rgba(2,6,23,0.88)_0%,_rgba(2,6,23,0.74)_26%,_rgba(2,6,23,0.36)_54%,_rgba(2,6,23,0.66)_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_24%,_rgba(56,189,248,0.18),_transparent_24%),radial-gradient(circle_at_84%_20%,_rgba(250,204,21,0.1),_transparent_18%),linear-gradient(180deg,_rgba(255,255,255,0.06),_transparent_20%,_transparent_78%,_rgba(14,165,233,0.08)_100%)]" />
          <div className="pointer-events-none absolute -left-16 top-8 h-48 w-48 rounded-full bg-sky-400/12 blur-3xl sm:h-64 sm:w-64" />
          <div className="pointer-events-none absolute -right-12 bottom-8 h-44 w-44 rounded-full bg-amber-300/10 blur-3xl sm:h-60 sm:w-60" />
          <div className="pointer-events-none absolute bottom-0 right-0 hidden h-[44%] w-[28%] overflow-hidden lg:block">
            {HERO_DECOR_STRIPES.map((stripe, index) => (
              <div
                key={stripe}
                className={`absolute right-[-6%] h-4 rounded-full blur-[0.4px] ${stripe}`}
                style={{
                  bottom: `${18 + index * 6}%`,
                  width: `${64 - index * 10}%`,
                }}
              />
            ))}
          </div>
          <div className="pointer-events-none absolute inset-x-4 top-4 h-px bg-white/12 sm:inset-x-8" />

          <div className="relative z-10 grid grid-cols-[minmax(0,1fr)] gap-4 px-3.5 py-4 sm:px-6 sm:py-8 lg:min-h-[720px] lg:grid-cols-[minmax(0,0.96fr)_minmax(560px,660px)] lg:grid-rows-[1fr_auto] lg:gap-x-8 lg:gap-y-6 lg:px-10 lg:py-10 xl:grid-cols-[minmax(0,0.92fr)_minmax(620px,760px)] [@media(max-height:820px)]:px-3 [@media(max-height:820px)]:py-3.5">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerGroupVariants}
              className="min-w-0 max-w-4xl space-y-4 sm:space-y-6 lg:self-start lg:pt-4 [@media(max-height:820px)]:space-y-3"
            >
              <motion.div variants={fadeUpVariants} className="inline-flex items-center gap-2 rounded-full border border-amber-300/45 bg-[#071a34]/82 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-100 shadow-[0_0_0_1px_rgba(251,191,36,0.08),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.32em]">
                <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                <span>{HERO_CONTENT.eyebrow}</span>
              </motion.div>
              <motion.div variants={fadeUpVariants} className="min-w-0 space-y-4 [@media(max-height:820px)]:space-y-2.5">
                <h1 className="max-w-3xl text-[clamp(2.35rem,10.5vw,4.8rem)] font-black tracking-[-0.05em] leading-[0.9] text-white sm:text-5xl lg:text-[clamp(4rem,7vw,5.6rem)] [@media(max-height:820px)]:text-[clamp(2rem,9vw,3rem)]">
                  {HERO_CONTENT.titleLines.map((line, index) => (
                    <span
                      key={line}
                      className={index === HERO_CONTENT.accentLineIndex ? "block break-words text-amber-300 [text-shadow:0_2px_14px_rgba(250,204,21,0.18)]" : "block break-words text-white [text-shadow:0_2px_14px_rgba(15,23,42,0.28)]"}
                    >
                      {line}
                    </span>
                  ))}
                </h1>
                <p className="max-w-[32rem] text-sm leading-7 text-slate-100/84 sm:text-lg lg:max-w-[34rem] [@media(max-height:820px)]:leading-6">
                  {sectionHint}
                </p>
              </motion.div>

              {renderHeroActions("hidden lg:flex lg:flex-wrap lg:gap-2.5 lg:pt-6 xl:pt-8")}

            </motion.div>

            <motion.div variants={fadeUpVariants} initial="hidden" animate="visible" className="min-w-0 rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,_rgba(2,6,23,0.68),_rgba(15,23,42,0.5))] p-3.5 shadow-[0_16px_42px_rgba(2,6,23,0.42)] backdrop-blur-xl sm:rounded-[26px] sm:p-5 lg:col-start-2 lg:row-span-2 lg:self-end xl:p-6 [@media(max-height:820px)]:p-3">
                <div className="flex flex-col gap-2.5 sm:gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-1.5">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-300 sm:text-xs sm:tracking-[0.3em]">Cartelera del dia</div>
                    <div className="text-[1.65rem] font-black leading-tight text-white sm:text-2xl">{sectionTitle}</div>
                  </div>
                  <div className="inline-flex self-start rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-100 sm:text-xs sm:tracking-[0.22em]">
                    {displayMatches.length} en cartelera
                  </div>
                </div>

                {displayMatches.length > 0 ? (
                  <>
                    <div
                      ref={mobilePosterRef}
                      onScroll={handleMobilePosterScroll}
                      onPointerDown={startMobilePosterInteraction}
                      onPointerUp={settleMobilePosterInteraction}
                      onPointerCancel={settleMobilePosterInteraction}
                      onTouchStart={startMobilePosterInteraction}
                      onTouchEnd={settleMobilePosterInteraction}
                      onTouchCancel={settleMobilePosterInteraction}
                      onWheel={pauseMobilePosterAutoSlide}
                      className="mt-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 touch-pan-x overscroll-x-contain sm:hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [@media(max-height:820px)]:mt-3"
                    >
                      {displayMatches.map((match, index) => (
                        <div key={match.id} className="min-w-0 w-full max-w-full shrink-0 basis-full snap-start">
                          <MatchPosterCard match={match} index={index} backgroundSrc={homeCardBackgrounds[index] || HERO_BACKGROUND_SRC} />
                        </div>
                      ))}
                    </div>

                    {displayMatches.length > 1 ? (
                      <div className="mt-2.5 flex items-center justify-center gap-2 sm:hidden">
                        {displayMatches.map((match, index) => (
                          <button
                            key={`${match.id}-dot`}
                            type="button"
                            aria-label={`Ir al partido ${index + 1}`}
                            onClick={() => {
                              pauseMobilePosterAutoSlide();
                              setMobilePosterIndex(index);
                            }}
                            className={[
                              "h-2.5 rounded-full transition-all duration-200",
                              index === mobilePosterIndex ? "w-6 bg-sky-300" : "w-2.5 bg-white/25",
                            ].join(" ")}
                          />
                        ))}
                      </div>
                    ) : null}

                    <motion.div variants={staggerGroupVariants} initial="hidden" animate="visible" className="mt-5 hidden gap-3 sm:grid sm:grid-cols-2 xl:gap-4">
                      {displayMatches.map((match, index) => (
                        <MatchPosterCard key={match.id} match={match} index={index} backgroundSrc={homeCardBackgrounds[index] || HERO_BACKGROUND_SRC} />
                      ))}
                    </motion.div>
                  </>
                ) : (
                  <div className="mt-4 rounded-[20px] border border-dashed border-white/15 bg-white/[0.03] px-4 py-4 text-sm text-slate-300">
                    Hoy no hay partidos en cartelera.
                  </div>
                )}

              </motion.div>

            <motion.div variants={fadeUpVariants} initial="hidden" animate="visible" className="order-last lg:hidden">
              {renderHeroActions("flex flex-wrap gap-2.5 pt-1 [@media(max-height:820px)]:gap-2")}
            </motion.div>

          </div>
        </section>
      </div>

      {isWizardOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-4">
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={submitting ? undefined : closeWizard} />
          <div className="relative z-10 my-auto w-full max-w-5xl overflow-hidden rounded-[24px] border border-white/10 bg-[#091423] shadow-2xl shadow-black/40 max-h-[calc(100vh-1.5rem)] overflow-y-auto sm:max-h-[calc(100vh-2rem)] sm:rounded-[28px]">
            <div className="pointer-events-none absolute inset-0" style={getFieldBackdropStyle("center 22%", "cover")} />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,_rgba(2,6,23,0.2)_0%,_rgba(2,6,23,0.56)_18%,_rgba(2,6,23,0.82)_58%,_rgba(2,6,23,0.94)_100%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,_rgba(56,189,248,0.18),_transparent_22%),radial-gradient(circle_at_86%_18%,_rgba(250,204,21,0.12),_transparent_16%)]" />
            <div className="pointer-events-none absolute -left-12 top-10 h-48 w-48 rounded-full bg-sky-400/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-12 bottom-12 h-44 w-44 rounded-full bg-amber-300/10 blur-3xl" />

            <div className="relative z-10 border-b border-white/10 bg-[linear-gradient(180deg,_rgba(6,16,30,0.74),_rgba(6,16,30,0.5))] px-4 py-4 backdrop-blur-md sm:px-6 sm:py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/45 bg-[#071a34]/82 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-100 shadow-[0_0_0_1px_rgba(251,191,36,0.08),inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                    <span>{wizardCopy.eyebrow}</span>
                  </div>
                  <h2 className="mt-3 text-xl font-black text-white sm:text-3xl">{wizardCopy.title}</h2>
                  {wizardCopy.description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200/82">{wizardCopy.description}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={closeWizard}
                  disabled={submitting}
                  className="rounded-full border border-white/12 bg-slate-950/40 px-3 py-1 text-xs text-slate-100 transition hover:bg-white/10 disabled:opacity-40 sm:text-sm"
                >
                  Cerrar
                </button>
              </div>

              {wizardStep !== "success" ? (
                <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-5">
                  {stepOrder.map((step, index) => {
                    const active = index === currentStepIndex;
                    const passed = index < currentStepIndex;
                    return (
                      <div key={step} className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/35 px-2.5 py-2 backdrop-blur-sm sm:px-4 sm:py-3">
                        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                          <span
                            className={[
                              "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black sm:h-7 sm:w-7 sm:text-xs",
                              active || passed ? "bg-sky-300 text-slate-950" : "bg-white/10 text-slate-300",
                            ].join(" ")}
                          >
                            {index + 1}
                          </span>
                          <span className={["min-w-0 truncate", active ? "text-[11px] font-semibold text-white sm:text-sm" : "text-[11px] text-slate-400 sm:text-sm"].join(" ")}>
                            {step === "match" && "Partido"}
                            {step === "pick" && "Jugada"}
                            {step === "identity" && "WhatsApp"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="relative z-10 px-4 py-4 sm:px-6 sm:py-6 md:px-7 md:py-7">
              <AnimatePresence mode="wait" initial={false}>
              {wizardStep === "match" ? (
                <motion.div key="wizard-match" variants={modalStepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
                  <motion.div variants={staggerGroupVariants} initial="hidden" animate="visible" className="grid gap-3 xl:grid-cols-2">
                    {displayMatches.map((match) => {
                      const selected = selectedMatch?.id === match.id;
                      const mainPrize = match.prizes[0] || null;
                      const blocked = !match.predictionsOpen;
                      const statusChip = getWizardMatchStatusChip(match);
                      return (
                        <motion.button
                          key={match.id}
                          type="button"
                          onClick={() => {
                            if (blocked) return;
                            setSelectedMatchId(match.id);
                            setError(null);
                            setWizardStep("pick");
                          }}
                          variants={fadeUpVariants}
                          whileTap={{ scale: 0.992 }}
                          disabled={blocked}
                          className={[
                            "relative overflow-hidden rounded-[20px] border px-3 py-3 text-left transition sm:rounded-[24px] sm:px-5 sm:py-5",
                            blocked
                              ? "cursor-not-allowed border-white/8 bg-[linear-gradient(180deg,_rgba(148,163,184,0.06),_rgba(8,18,32,0.78))] opacity-70 grayscale saturate-0"
                              : selected
                              ? "border-sky-300/45 bg-[linear-gradient(180deg,_rgba(56,189,248,0.1),_rgba(8,18,32,0.82))] shadow-lg shadow-sky-900/20"
                              : "border-white/10 bg-[linear-gradient(180deg,_rgba(255,255,255,0.04),_rgba(8,18,32,0.82))] hover:border-white/20 hover:bg-white/[0.06]",
                          ].join(" ")}
                        >
                          <div className={["pointer-events-none absolute inset-0 opacity-35", blocked ? "grayscale blur-[2px]" : ""].join(" ")} style={getFieldBackdropStyle("center 92%", "165% auto")} />
                          <div className={["pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,_rgba(3,8,20,0.9)_0%,_rgba(4,9,21,0.76)_22%,_rgba(4,9,20,0.62)_58%,_rgba(3,8,19,0.84)_100%)]", blocked ? "bg-[linear-gradient(180deg,_rgba(15,23,42,0.94)_0%,_rgba(30,41,59,0.85)_24%,_rgba(30,41,59,0.72)_60%,_rgba(15,23,42,0.9)_100%)]" : ""].join(" ")} />
                          <div className={["pointer-events-none absolute inset-x-0 bottom-0 h-[38%] bg-[linear-gradient(180deg,_rgba(34,197,94,0)_0%,_rgba(34,197,94,0.05)_30%,_rgba(20,83,45,0.14)_100%)]", blocked ? "opacity-40" : ""].join(" ")} />
                          <div className="relative z-10 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                <span className="rounded-full border border-white/10 bg-slate-950/28 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-200">
                                  {formatMatchStageLabel(match.stage)}
                                </span>
                                <span
                                  className={[
                                    "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]",
                                    blocked ? "bg-white/10 text-slate-300" : "bg-emerald-400/18 text-emerald-100",
                                  ].join(" ")}
                                >
                                  {statusChip}
                                </span>
                              </div>
                              <div className="mt-2.5 text-xl font-black leading-[0.94] text-white sm:text-[2rem]">
                                {match.homeTeam}
                              </div>
                              <div className="text-[0.95rem] font-black uppercase tracking-[0.12em] text-slate-400">vs</div>
                              <div className="text-xl font-black leading-[0.94] text-white sm:text-[2rem]">
                                {match.awayTeam}
                              </div>
                            </div>
                            <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-slate-950/35 px-3 py-1.5 sm:rounded-[20px] sm:px-4 sm:py-2">
                              <Clock3 className="h-3.5 w-3.5 text-slate-500" />
                              <span className="text-[10px] uppercase tracking-[0.26em] text-slate-500">Pitazo</span>
                              <span className="text-base font-bold text-white sm:text-lg">{formatMatchTime(match.startsAt)}</span>
                            </div>
                          </div>

                          <div className="relative z-10 mt-3 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 border-t border-dashed border-white/18 pt-3 text-sm">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/24 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-300 sm:text-[10px] sm:tracking-[0.24em]">
                              <Sparkles className="h-3.5 w-3.5" />
                              Jugando por
                            </span>
                            <span
                              className="min-w-0 basis-full break-words font-semibold leading-tight text-white/96 sm:basis-auto sm:flex-1"
                              style={mainPrize?.color && !blocked ? { color: mainPrize.color } : undefined}
                            >
                              {mainPrize?.label || "Premio por confirmar"}
                            </span>
                          </div>

                          {selected && !blocked ? (
                            <div className="relative z-10 mt-3 inline-flex items-center gap-2 rounded-full border border-sky-300/30 bg-sky-400/12 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-100">
                              Partido seleccionado
                            </div>
                          ) : null}

                          {blocked ? (
                            <div className="relative z-10 mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                              No disponible para jugar
                            </div>
                          ) : null}
                        </motion.button>
                      );
                    })}
                  </motion.div>

                  {displayMatches.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-white/15 bg-slate-950/20 px-5 py-6 text-sm text-slate-300">
                      No hay juegos abiertos para la fecha actual de Lima. Cuando la jornada del día tenga pronósticos habilitados, aparecerán aquí.
                    </div>
                  ) : null}
                </motion.div>
              ) : null}

              {wizardStep === "pick" && selectedMatch ? (
                <motion.div key="wizard-pick" variants={modalStepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-5">
                  <motion.div variants={fadeUpVariants} className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,_rgba(6,16,30,0.72),_rgba(6,16,30,0.44))] p-3.5 shadow-[0_14px_32px_rgba(2,6,23,0.24)] backdrop-blur-md sm:rounded-[24px] sm:p-4">
                    <motion.div variants={staggerGroupVariants} initial="hidden" animate="visible" className="grid gap-3 sm:grid-cols-3">
                      {(["HOME", "DRAW", "AWAY"] as PickValue[]).map((option) => (
                        <motion.button
                          key={option}
                          type="button"
                          onClick={() => setPick(option)}
                          variants={fadeUpVariants}
                          whileTap={{ scale: 0.98 }}
                          className={getPickOptionClasses(option, pick === option)}
                        >
                          <div className={[
                            "text-xs uppercase tracking-[0.2em]",
                            pick === option
                              ? option === "HOME"
                                ? "text-emerald-100"
                                : option === "DRAW"
                                  ? "text-amber-100"
                                  : "text-rose-100"
                              : "text-slate-400",
                          ].join(" ")}>
                            {option === "HOME" ? "Local" : option === "AWAY" ? "Visita" : "Empate"}
                          </div>
                          <div className="mt-2 text-base font-bold sm:text-lg">{getPickCopy(selectedMatch, option)}</div>
                          <div className="mt-2 text-sm leading-6 text-slate-300">
                            {option === "HOME" && "Tu apuesta apunta a una victoria del local."}
                            {option === "DRAW" && "Tu jugada queda en equilibrio para un empate."}
                            {option === "AWAY" && "Tu apuesta se inclina por la visita."}
                          </div>
                        </motion.button>
                      ))}
                    </motion.div>
                  </motion.div>

                  <div className="flex flex-col gap-3">
                    <button className={`${primaryActionClass} w-full`} type="button" onClick={goNextStep} disabled={!selectedMatch}>
                      Guardar jugada
                    </button>
                    <button className={`${secondaryActionClass} w-full`} type="button" onClick={() => setWizardStep("match")}>
                      Volver a partidos de hoy
                    </button>
                    <div className="pt-1 text-xs uppercase tracking-[0.24em] text-slate-400">
                      Primer tiempo · Paso {currentStepIndex + 1} de {stepOrder.length}
                    </div>
                  </div>
                </motion.div>
              ) : null}

              {wizardStep === "identity" && selectedMatch ? (
                <motion.form key="wizard-identity" variants={modalStepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-5" onSubmit={handleSubmit}>
                  <motion.div variants={staggerGroupVariants} initial="hidden" animate="visible" className="grid gap-4 lg:grid-cols-2">
                    <motion.label variants={fadeUpVariants} className="min-w-0 space-y-2 rounded-[20px] border border-white/12 bg-slate-950/48 p-3.5 shadow-[0_10px_24px_rgba(2,6,23,0.18)] backdrop-blur-sm sm:rounded-[22px] sm:p-4">
                      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">Nombre</span>
                      <input
                        className="input h-12 w-full border-white/20 bg-slate-950/88 text-base font-semibold text-white caret-white placeholder:text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:h-14 sm:text-lg"
                        value={name}
                        onChange={(event) => {
                          setName(event.target.value);
                          if (error) setError(null);
                        }}
                        placeholder="Tu nombre"
                        required
                      />
                    </motion.label>

                    <motion.label variants={fadeUpVariants} className="min-w-0 space-y-2 rounded-[20px] border border-white/12 bg-slate-950/48 p-3.5 shadow-[0_10px_24px_rgba(2,6,23,0.18)] backdrop-blur-sm sm:rounded-[22px] sm:p-4">
                      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">WhatsApp</span>
                      <input
                        className="input h-12 w-full border-white/20 bg-slate-950/88 text-base font-semibold text-white caret-white placeholder:text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:h-14 sm:text-lg"
                        value={whatsapp}
                        onChange={(event) => {
                          setWhatsapp(event.target.value);
                          if (error) setError(null);
                        }}
                        placeholder="Tu WhatsApp"
                        required
                      />
                    </motion.label>
                  </motion.div>

                  {error ? <div className="alert alert-danger">{error}</div> : null}

                  <motion.div variants={fadeUpVariants} initial="hidden" animate="visible" className="rounded-[20px] border border-sky-300/18 bg-[linear-gradient(180deg,_rgba(56,189,248,0.09),_rgba(15,23,42,0.74))] p-3.5 text-sm text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:rounded-[22px] sm:p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs uppercase tracking-[0.24em] text-sky-200/80">Resumen</div>
                      <span className="rounded-full border border-sky-300/20 bg-sky-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-100">
                        Tu jugada
                      </span>
                    </div>
                    <div className="mt-2 break-words font-semibold leading-6 text-white">
                      {selectedMatch.homeTeam} <span className="text-slate-500">vs</span> {selectedMatch.awayTeam}
                    </div>
                    <div className="mt-2 text-slate-300">Pronóstico: {getPickCopy(selectedMatch, pick)}</div>
                    <div className="mt-2 text-slate-300">Usa un nombre que recuerdes bien: lo necesitarás para recuperar tu QR.</div>
                  </motion.div>

                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button className={`${secondaryActionClass} w-full sm:w-auto sm:min-w-[140px]`} type="button" onClick={goPrevStep} disabled={submitting}>
                      Recalcular Jugada
                    </button>
                    <button className={`${primaryActionClass} w-full sm:w-auto sm:min-w-[220px]`} disabled={submitting} type="submit">
                      {submitting ? "Guardando jugada..." : "Mandar tu jugada"}
                    </button>
                  </div>
                </motion.form>
              ) : null}

              {wizardStep === "success" ? (
                <motion.div key="wizard-success" variants={modalStepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-5">
                  {successState ? (
                    <motion.div variants={fadeUpVariants} initial="hidden" animate="visible" className="rounded-[24px] border border-white/10 bg-slate-950/35 p-4 sm:p-5">
                      <div className="space-y-5">
                        <div>
                          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">QR de tu jugada</div>
                          <motion.div variants={fadeUpVariants} initial="hidden" animate="visible" className="mt-4 flex justify-center">
                            <motion.div initial={{ opacity: 0, scale: 0.92, rotate: -2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: 0.38, ease: softEase }} className="inline-flex rounded-[20px] bg-white p-3 sm:p-4">
                              <img alt={`QR ${successState.qrCode}`} className="h-auto w-[220px] max-w-full sm:w-[260px]" src={successState.qrImageUrl} />
                            </motion.div>
                          </motion.div>
                        </div>

                        <motion.div variants={staggerGroupVariants} initial="hidden" animate="visible" className="space-y-4">
                          <div>
                            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Partido</div>
                            <div className="mt-2 text-xl font-black text-white sm:text-2xl">{successState.matchLabel}</div>
                            <div className="mt-2 text-sm text-slate-300">Pronóstico: {successState.pickLabel}</div>
                          </div>

                          <motion.div variants={fadeUpVariants} className="rounded-[20px] border border-sky-300/14 bg-[linear-gradient(180deg,_rgba(56,189,248,0.08),_rgba(15,23,42,0.7))] p-4 text-sm leading-6 text-slate-300">
                            Guarda este QR o descargalo ahora. El premio se desbloquea si aciertas.
                          </motion.div>

                          <motion.div variants={fadeUpVariants} className="grid gap-3 sm:grid-cols-2">
                            <button className={`${successActionClass} w-full`} type="button" onClick={downloadSuccessQr}>
                              Descargar QR
                            </button>
                            <button className={`${secondaryActionClass} w-full sm:col-span-2`} type="button" onClick={closeWizard}>
                              Cerrar
                            </button>
                          </motion.div>
                        </motion.div>
                      </div>
                    </motion.div>
                  ) : null}
                </motion.div>
              ) : null}
              </AnimatePresence>
            </div>

            {wizardStep !== "success" ? (
              <div className="border-t border-white/10 bg-white/[0.02] px-4 py-4 sm:px-6">
                {wizardStep === "pick" ? null : (
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                      Primer tiempo · Paso {currentStepIndex + 1} de {stepOrder.length}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {isRecoveryOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-4">
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={closeRecovery} />
          <div className="relative z-10 my-auto w-full max-w-2xl overflow-hidden rounded-[24px] border border-white/10 bg-[#091423] shadow-2xl shadow-black/40 max-h-[calc(100vh-1.5rem)] overflow-y-auto sm:max-h-[calc(100vh-2rem)] sm:rounded-[28px]">
            <div className="border-b border-white/10 bg-white/[0.03] px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-sky-200">Recuperar jugada</div>
                  <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">Busca tu QR con datos seguros</h2>
                  <p className="mt-2 text-sm text-slate-300">Ingresa el mismo WhatsApp, el partido y el nombre recordable con el que registraste tu jugada.</p>
                </div>
                <button
                  type="button"
                  onClick={closeRecovery}
                  disabled={recoverySubmitting}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-200 transition hover:bg-white/10 disabled:opacity-40"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <form className="space-y-5 px-4 py-4 sm:px-6 sm:py-6 md:px-7 md:py-7" onSubmit={handleRecoverPrediction}>
              <label className="space-y-2 rounded-[22px] border border-white/10 bg-slate-950/35 p-4">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Partido</span>
                <select
                  className="input h-12 border-white/10 bg-slate-950/65 text-sm font-semibold text-white sm:h-14 sm:text-base"
                  value={recoveryMatchId}
                  onChange={(event) => setRecoveryMatchId(event.target.value)}
                  required
                >
                  {initialMatches.map((match) => (
                    <option key={match.id} value={match.id}>
                      {match.homeTeam} vs {match.awayTeam} · {formatDate(match.startsAt)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 rounded-[22px] border border-white/10 bg-slate-950/35 p-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Nombre</span>
                  <input
                    className="input h-12 border-white/10 bg-slate-950/65 text-base font-semibold text-white placeholder:text-slate-500 sm:h-14 sm:text-lg"
                    value={recoveryName}
                    onChange={(event) => {
                      setRecoveryName(event.target.value);
                      if (recoveryError) setRecoveryError(null);
                    }}
                    placeholder="Tu nombre"
                    required
                  />
                </label>

                <label className="space-y-2 rounded-[22px] border border-white/10 bg-slate-950/35 p-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">WhatsApp</span>
                  <input
                    className="input h-12 border-white/10 bg-slate-950/65 text-base font-semibold text-white placeholder:text-slate-500 sm:h-14 sm:text-lg"
                    value={recoveryWhatsapp}
                    onChange={(event) => {
                      setRecoveryWhatsapp(event.target.value);
                      if (recoveryError) setRecoveryError(null);
                    }}
                    placeholder="Tu WhatsApp"
                    required
                  />
                </label>
              </div>

              {recoveryError ? <div className="alert alert-danger">{recoveryError}</div> : null}

              <div className="rounded-[22px] border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-300">
                Usa un nombre que recuerdes fácilmente. Solo recuperaremos tu jugada si coinciden partido, nombre y WhatsApp con el registro guardado.
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
                <button className={secondaryActionClass} type="button" onClick={closeRecovery} disabled={recoverySubmitting}>
                  Cancelar
                </button>
                <button className={recoveryActionClass} disabled={recoverySubmitting} type="submit">
                  {recoverySubmitting ? "Buscando jugada..." : "Buscar mi QR"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
