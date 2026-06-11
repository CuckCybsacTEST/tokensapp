"use client";

import Link from "next/link";
import { DateTime } from "luxon";
import { useEffect, useMemo, useRef, useState } from "react";

import { generateQrPngDataUrl } from "@/lib/qr";

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

function MatchPosterCard({ match, index }: { match: MatchItem; index: number }) {
  const accent = getHeroMatchAccent(index);
  const state = getHeroMatchState(match);
  const mainPrize = match.prizes[0] || null;
  const statusChip = getPosterStatusChip(match);

  return (
    <div
      className={[
        "rounded-[22px] border px-4 py-4 transition-all duration-200 sm:px-5 sm:py-5",
        accent.cardClass,
        state.cardClass,
        state.blocked ? "" : "md:hover:-translate-y-1",
      ].join(" ")}
    >
      {statusChip ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span
            className={[
              "rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]",
              accent.chipClass,
              state.chipClass,
            ].join(" ")}
          >
            {statusChip}
          </span>
        </div>
      ) : null}

      <div className={`${statusChip ? "mt-4" : "mt-1"} flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between`}>
        <div className="min-w-0 flex-1">
          <div className={["text-xl font-black leading-tight sm:text-[2rem]", accent.titleClass].join(" ")}>
            {match.homeTeam} <span className="text-slate-500">vs</span> {match.awayTeam}
          </div>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/8 bg-slate-950/20 px-3 py-1 sm:px-3.5 sm:py-1.5">
          <span className="text-[9px] uppercase tracking-[0.24em] text-slate-500/90">Pitazo</span>
          <span className="text-sm font-semibold text-white/92 sm:text-base">{formatMatchTime(match.startsAt)}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm sm:text-[0.95rem]">
        <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Jugando por</span>
        <span className="font-medium leading-tight text-white/88" style={mainPrize?.color ? { color: mainPrize.color } : undefined}>
          {mainPrize?.label || "Premio por confirmar"}
        </span>
      </div>
    </div>
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
  const base = "rounded-[20px] border px-4 py-4 text-left transition-all duration-200 sm:rounded-[22px] sm:px-4 sm:py-5";

  if (!active) {
    return `${base} border-white/10 bg-slate-950/30 text-slate-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05]`;
  }

  if (option === "HOME") {
    return `${base} border-emerald-300/55 bg-emerald-400/15 text-white shadow-[0_14px_28px_rgba(16,185,129,0.16)]`;
  }

  if (option === "DRAW") {
    return `${base} border-amber-300/55 bg-amber-400/15 text-white shadow-[0_14px_28px_rgba(245,158,11,0.16)]`;
  }

  return `${base} border-rose-300/55 bg-rose-400/15 text-white shadow-[0_14px_28px_rgba(244,63,94,0.16)]`;
}

export default function Mundial2026HomeClient({ campaignSlug, initialMatches, sectionTitle, sectionHint, simulatedNowIso }: Props) {
  const nowLima = useMemo(() => {
    if (simulatedNowIso) {
      return DateTime.fromISO(simulatedNowIso).setZone(DEFAULT_TIMEZONE).toJSDate();
    }
    return DateTime.now().setZone(DEFAULT_TIMEZONE).toJSDate();
  }, [simulatedNowIso]);
  const todayLima = useMemo(() => formatLimaDayKey(nowLima), [nowLima]);
  const todayMatches = useMemo(() => initialMatches.filter((match) => isSameLimaDay(match.startsAt, todayLima)), [initialMatches, todayLima]);
  const openMatches = useMemo(() => todayMatches.filter((match) => match.predictionsOpen), [todayMatches]);
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
  const mobilePosterProgrammaticScrollRef = useRef(false);
  const mobilePosterInteractingRef = useRef(false);

  const selectedMatch = useMemo(
    () => openMatches.find((match) => match.id === selectedMatchId) || openMatches[0] || null,
    [openMatches, selectedMatchId]
  );

  const currentStepIndex = wizardStep === "success" ? stepOrder.length : stepOrder.indexOf(wizardStep);
  const primaryActionClass =
    "inline-flex items-center justify-center rounded-full border border-sky-300/45 bg-[linear-gradient(135deg,_rgba(56,189,248,0.96),_rgba(14,165,233,0.82))] px-6 py-3 text-center text-sm font-black tracking-[0.02em] text-slate-950 shadow-[0_14px_32px_rgba(14,165,233,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(14,165,233,0.36)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:text-base";
  const secondaryActionClass =
    "inline-flex items-center justify-center rounded-full border border-white/14 bg-white/[0.05] px-6 py-3 text-center text-sm font-semibold text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300/30 hover:bg-sky-400/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:text-base";
  const successActionClass =
    "inline-flex items-center justify-center rounded-full border border-emerald-300/45 bg-[linear-gradient(135deg,_rgba(52,211,153,0.95),_rgba(16,185,129,0.82))] px-6 py-3 text-center text-sm font-black text-slate-950 shadow-[0_14px_32px_rgba(16,185,129,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(16,185,129,0.3)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";
  const recoveryActionClass =
    "inline-flex items-center justify-center rounded-full border border-amber-300/40 bg-[linear-gradient(135deg,_rgba(251,191,36,0.94),_rgba(245,158,11,0.8))] px-6 py-3 text-center text-sm font-black text-slate-950 shadow-[0_14px_30px_rgba(245,158,11,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(245,158,11,0.3)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:text-base";

  useEffect(() => {
    setMobilePosterIndex(0);
  }, [todayMatches.length]);

  useEffect(() => {
    if (todayMatches.length <= 1) return;

    const intervalId = window.setInterval(() => {
      if (Date.now() < mobilePosterAutoPauseUntilRef.current) {
        return;
      }

      setMobilePosterIndex((current) => (current + 1) % todayMatches.length);
    }, MOBILE_POSTER_AUTO_ADVANCE_MS);

    return () => window.clearInterval(intervalId);
  }, [todayMatches.length]);

  useEffect(() => {
    const container = mobilePosterRef.current;
    if (!container || todayMatches.length <= 1) return;

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
  }, [mobilePosterIndex, todayMatches.length]);

  useEffect(() => {
    const container = mobilePosterRef.current;
    if (!container || todayMatches.length <= 1) return;

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
  }, [mobilePosterIndex, todayMatches.length]);

  useEffect(() => {
    return () => {
      if (mobilePosterSyncTimeoutRef.current !== null) {
        window.clearTimeout(mobilePosterSyncTimeoutRef.current);
      }
    };
  }, []);

  function pauseMobilePosterAutoSlide() {
    mobilePosterAutoPauseUntilRef.current = Date.now() + MOBILE_POSTER_MANUAL_PAUSE_MS;
  }

  function startMobilePosterInteraction() {
    mobilePosterInteractingRef.current = true;
    pauseMobilePosterAutoSlide();
  }

  function settleMobilePosterInteraction() {
    const container = mobilePosterRef.current;
    if (!container) {
      mobilePosterInteractingRef.current = false;
      return;
    }

    const nextIndex = getClosestPosterIndex(container);
    mobilePosterInteractingRef.current = false;
    setMobilePosterIndex(Math.max(0, Math.min(nextIndex, Math.max(0, todayMatches.length - 1))));
  }

  function handleMobilePosterScroll(event: React.UIEvent<HTMLDivElement>) {
    const container = event.currentTarget;
    if (!mobilePosterProgrammaticScrollRef.current) {
      pauseMobilePosterAutoSlide();
    }

    const nextIndex = getClosestPosterIndex(container);
    if (!mobilePosterInteractingRef.current && nextIndex !== mobilePosterIndex) {
      setMobilePosterIndex(Math.max(0, Math.min(nextIndex, Math.max(0, todayMatches.length - 1))));
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(11,95,255,0.16),_transparent_38%),linear-gradient(180deg,_#081220_0%,_#10213b_52%,_#081220_100%)] text-slate-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-8">
        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5 shadow-2xl shadow-sky-950/30 backdrop-blur sm:rounded-[32px]">
          <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
            <div className="max-w-4xl space-y-5 sm:space-y-6">
              <span className="inline-flex rounded-full border border-sky-300/30 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-sky-200">
                MODO MUNDIALISTA
              </span>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-3xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Bienvenido a KTDRAL FAN ZONE.
                </h1>
                <p className="max-w-2xl text-sm text-slate-200/85 sm:text-lg">
                  {sectionHint}
                </p>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,_rgba(2,6,23,0.56),_rgba(15,23,42,0.42))] p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-1.5">
                    <div className="text-xs uppercase tracking-[0.3em] text-slate-300">Cartelera del dia</div>
                    <div className="text-xl font-black text-white sm:text-2xl">{sectionTitle}</div>
                  </div>
                  <div className="inline-flex self-start rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-sky-100">
                    {todayMatches.length} en cartelera
                  </div>
                </div>

                {todayMatches.length > 0 ? (
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
                      className="mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 touch-pan-x overscroll-x-contain sm:hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    >
                      {todayMatches.map((match, index) => (
                        <div key={match.id} className="min-w-0 shrink-0 basis-full snap-start">
                          <MatchPosterCard match={match} index={index} />
                        </div>
                      ))}
                    </div>

                    {todayMatches.length > 1 ? (
                      <div className="mt-3 flex items-center justify-center gap-2 sm:hidden">
                        {todayMatches.map((match, index) => (
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

                    <div className="mt-5 hidden gap-3 sm:grid sm:grid-cols-2">
                      {todayMatches.map((match, index) => (
                        <MatchPosterCard key={match.id} match={match} index={index} />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="mt-4 rounded-[20px] border border-dashed border-white/15 bg-white/[0.03] px-4 py-4 text-sm text-slate-300">
                    Hoy no hay partidos en cartelera.
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <button className={`${primaryActionClass} w-full sm:w-auto`} type="button" onClick={openWizard} disabled={openMatches.length === 0}>
                  {openMatches.length > 0 ? "Jugar ahora" : "Hoy no hay partidos disponibles"}
                </button>
                <button className={`${recoveryActionClass} w-full sm:w-auto`} type="button" onClick={openRecovery} disabled={initialMatches.length === 0}>
                  Recuperar mi jugada
                </button>
                {successPath ? (
                  <Link href={successPath} className={`${secondaryActionClass} w-full sm:w-auto`}>
                    Ver mi último QR
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>

      {isWizardOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-4">
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={submitting ? undefined : closeWizard} />
          <div className="relative z-10 my-auto w-full max-w-3xl overflow-hidden rounded-[24px] border border-white/10 bg-[#091423] shadow-2xl shadow-black/40 max-h-[calc(100vh-1.5rem)] overflow-y-auto sm:max-h-[calc(100vh-2rem)] sm:rounded-[28px]">
            <div className="border-b border-white/10 bg-white/[0.03] px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-sky-200">Tu jugada</div>
                  <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">
                    {wizardStep === "match" && "Elige tu partido y entra a la cancha"}
                    {wizardStep === "pick" && "Marca tu pronóstico"}
                    {wizardStep === "identity" && "Bien, ya casi esta."}
                    {wizardStep === "success" && "Jugada guardada."}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeWizard}
                  disabled={submitting}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200 transition hover:bg-white/10 disabled:opacity-40 sm:text-sm"
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
                      <div key={step} className="rounded-2xl border border-white/10 bg-slate-950/35 px-2.5 py-2 sm:px-4 sm:py-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span
                            className={[
                              "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black sm:h-7 sm:w-7 sm:text-xs",
                              active || passed ? "bg-sky-300 text-slate-950" : "bg-white/10 text-slate-300",
                            ].join(" ")}
                          >
                            {index + 1}
                          </span>
                          <span className={active ? "text-[11px] font-semibold text-white sm:text-sm" : "text-[11px] text-slate-400 sm:text-sm"}>
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

            <div className="px-4 py-4 sm:px-6 sm:py-6 md:px-7 md:py-7">
              {wizardStep === "match" ? (
                <div className="space-y-4">
                  <p className="text-sm text-slate-300">Revisa la cartelera, elige un encuentro y haz tu jugada antes del pitazo inicial.</p>
                  <div className="grid gap-3">
                    {openMatches.map((match) => {
                      const selected = selectedMatch?.id === match.id;
                      return (
                        <button
                          key={match.id}
                          type="button"
                          onClick={() => {
                            setSelectedMatchId(match.id);
                            setError(null);
                            setWizardStep("pick");
                          }}
                          className={[
                            "rounded-[20px] border px-3 py-3 text-left transition sm:rounded-[24px] sm:px-5 sm:py-5",
                            selected
                              ? "border-sky-300/60 bg-[linear-gradient(180deg,_rgba(56,189,248,0.18),_rgba(8,18,32,0.72))] shadow-lg shadow-sky-900/20"
                              : "border-white/10 bg-[linear-gradient(180deg,_rgba(255,255,255,0.05),_rgba(8,18,32,0.75))] hover:border-white/20 hover:bg-white/[0.06]",
                          ].join(" ")}
                        >
                          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-300">
                                  {formatMatchStageLabel(match.stage)}
                                </span>
                                <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
                                  Jugada abierta
                                </span>
                              </div>
                              <div className="mt-2.5 text-lg font-bold leading-tight text-white sm:text-2xl">
                                {match.homeTeam} <span className="text-slate-500">vs</span> {match.awayTeam}
                              </div>
                            </div>
                            <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-slate-950/35 px-3 py-1.5 sm:rounded-[20px] sm:px-4 sm:py-2">
                              <span className="text-[10px] uppercase tracking-[0.26em] text-slate-500">Pitazo</span>
                              <span className="text-base font-bold text-white sm:text-lg">{formatMatchTime(match.startsAt)}</span>
                            </div>
                          </div>

                          {match.prizes.length > 0 ? (
                            <div className="mt-2.5 flex flex-wrap gap-2">
                              {match.prizes.slice(0, 3).map((prize) => (
                                <span
                                  key={prize.id}
                                  className="rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1.5 text-xs font-semibold text-sky-100"
                                  style={prize.color ? { borderColor: `${prize.color}55`, color: prize.color, backgroundColor: `${prize.color}18` } : undefined}
                                >
                                  Premio: {prize.label.charAt(0).toUpperCase() + prize.label.slice(1).toLowerCase()}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  {openMatches.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-white/15 bg-slate-950/20 px-5 py-6 text-sm text-slate-300">
                      No hay juegos abiertos para la fecha actual de Lima. Cuando la jornada del día tenga pronósticos habilitados, aparecerán aquí.
                    </div>
                  ) : null}
                </div>
              ) : null}

              {wizardStep === "pick" && selectedMatch ? (
                <div className="space-y-5">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Tu elección</div>
                    <div className="mt-2 text-xl font-black text-white sm:text-2xl">Marca tu jugada</div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      {(["HOME", "DRAW", "AWAY"] as PickValue[]).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setPick(option)}
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
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {wizardStep === "identity" && selectedMatch ? (
                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div className="rounded-[22px] border border-sky-300/15 bg-[linear-gradient(180deg,_rgba(56,189,248,0.12),_rgba(8,18,32,0.72))] p-4 text-slate-200 sm:rounded-[24px] sm:p-5">
                    <div className="text-xs uppercase tracking-[0.24em] text-sky-200/80">Último paso</div>
                    <div className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl">Bien, ya casi esta.</div>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                      Para guardar tu jugada, dejanos tu nombre y WhatsApp.
                    </p>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <label className="min-w-0 space-y-2 rounded-[20px] border border-white/10 bg-slate-950/35 p-3.5 sm:rounded-[22px] sm:p-4">
                      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Nombre</span>
                      <input
                        className="input h-12 w-full border-white/10 bg-slate-950/65 text-base font-semibold text-white placeholder:text-slate-500 sm:h-14 sm:text-lg"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Escribe tu nombre"
                        required
                      />
                    </label>

                    <label className="min-w-0 space-y-2 rounded-[20px] border border-white/10 bg-slate-950/35 p-3.5 sm:rounded-[22px] sm:p-4">
                      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">WhatsApp</span>
                      <input
                        className="input h-12 w-full border-white/10 bg-slate-950/65 text-base font-semibold text-white placeholder:text-slate-500 sm:h-14 sm:text-lg"
                        value={whatsapp}
                        onChange={(event) => setWhatsapp(event.target.value)}
                        placeholder="999 999 999 o +51..."
                        required
                      />
                    </label>
                  </div>

                  {error ? <div className="alert alert-danger">{error}</div> : null}

                  <div className="rounded-[20px] border border-sky-300/18 bg-[linear-gradient(180deg,_rgba(56,189,248,0.09),_rgba(15,23,42,0.74))] p-3.5 text-sm text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:rounded-[22px] sm:p-4">
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
                  </div>

                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button className={`${secondaryActionClass} w-full sm:w-auto sm:min-w-[140px]`} type="button" onClick={goPrevStep} disabled={submitting}>
                      Recalcular Jugada...
                    </button>
                    <button className={`${primaryActionClass} w-full sm:w-auto sm:min-w-[220px]`} disabled={submitting} type="submit">
                      {submitting ? "Guardando jugada..." : "Mandar tu jugada al arco"}
                    </button>
                  </div>
                </form>
              ) : null}

              {wizardStep === "success" ? (
                <div className="space-y-5">
                  {successState ? (
                    <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-4 sm:p-5">
                      <div className="space-y-5">
                        <div>
                          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">QR de tu jugada</div>
                          <div className="mt-4 flex justify-center">
                            <div className="inline-flex rounded-[20px] bg-white p-3 sm:p-4">
                              <img alt={`QR ${successState.qrCode}`} className="h-auto w-[220px] max-w-full sm:w-[260px]" src={successState.qrImageUrl} />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Partido</div>
                            <div className="mt-2 text-xl font-black text-white sm:text-2xl">{successState.matchLabel}</div>
                            <div className="mt-2 text-sm text-slate-300">Pronóstico: {successState.pickLabel}</div>
                          </div>

                          <div className="rounded-[20px] border border-sky-300/14 bg-[linear-gradient(180deg,_rgba(56,189,248,0.08),_rgba(15,23,42,0.7))] p-4 text-sm leading-6 text-slate-300">
                            Guarda este QR o descargalo ahora. El premio se desbloquea si aciertas.
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <button className={`${successActionClass} w-full`} type="button" onClick={downloadSuccessQr}>
                              Descargar QR
                            </button>
                            <button className={`${secondaryActionClass} w-full sm:col-span-2`} type="button" onClick={closeWizard}>
                              Cerrar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {wizardStep !== "success" ? (
              <div className="border-t border-white/10 bg-white/[0.02] px-4 py-4 sm:px-6">
                {wizardStep === "pick" ? (
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
                ) : (
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
                  <p className="mt-2 text-sm text-slate-300">Ingresa el mismo WhatsApp, el partido y el nombre con el que registraste tu jugada.</p>
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
                    onChange={(event) => setRecoveryName(event.target.value)}
                    placeholder="Tu nombre registrado"
                    required
                  />
                </label>

                <label className="space-y-2 rounded-[22px] border border-white/10 bg-slate-950/35 p-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">WhatsApp</span>
                  <input
                    className="input h-12 border-white/10 bg-slate-950/65 text-base font-semibold text-white placeholder:text-slate-500 sm:h-14 sm:text-lg"
                    value={recoveryWhatsapp}
                    onChange={(event) => setRecoveryWhatsapp(event.target.value)}
                    placeholder="999 999 999 o +51..."
                    required
                  />
                </label>
              </div>

              {recoveryError ? <div className="alert alert-danger">{recoveryError}</div> : null}

              <div className="rounded-[22px] border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-300">
                Solo recuperaremos tu jugada si coinciden partido, nombre y WhatsApp exactamente con el registro guardado.
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
