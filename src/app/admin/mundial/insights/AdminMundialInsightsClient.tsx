"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type InsightsPayload = {
  campaign: {
    slug: string;
    name: string;
    status: string;
    timezone: string;
    startsAt: string | null;
    endsAt: string | null;
  };
  generatedAt: string;
  summary: {
    participantsTotal: number;
    predictionsTotal: number;
    matchesTotal: number;
    settledMatchesTotal: number;
    prizeCatalogTotal: number;
    activePrizeCatalogTotal: number;
    wonTotal: number;
    lostTotal: number;
    voidTotal: number;
    expiredPredictionTotal: number;
    assignedPredictionsTotal: number;
    winnersWithoutPrizeTotal: number;
    availableTotal: number;
    redeemedTotal: number;
    expiredClaimTotal: number;
    blockedClaimTotal: number;
    rejectedClaimTotal: number;
    winRate: number;
    redemptionRate: number;
  };
  funnel: Array<{
    label: string;
    value: number;
  }>;
  participants: Array<{
    id: string;
    name: string;
    whatsappNormalized: string;
    createdAt: string;
    totalPredictions: number;
    won: number;
    lost: number;
    available: number;
    redeemed: number;
    expired: number;
    lastPredictionAt: string | null;
  }>;
  matches: Array<{
    id: string;
    stage: string | null;
    homeTeam: string;
    awayTeam: string;
    startsAt: string;
    status: string;
    result: string | null;
    settledAt: string | null;
    totalPredictions: number;
    winners: number;
    losers: number;
    available: number;
    redeemed: number;
    expired: number;
    assigned: number;
    winRate: number;
    redemptionRate: number;
  }>;
  predictions: Array<{
    id: string;
    qrCode: string;
    detailPath: string;
    participant: {
      id: string;
      name: string;
      whatsappNormalized: string;
    };
    match: {
      id: string;
      stage: string | null;
      homeTeam: string;
      awayTeam: string;
      startsAt: string;
      result: string | null;
      status: string;
    };
    pick: "HOME" | "DRAW" | "AWAY";
    status: string;
    claimStatus: string;
    isCorrect: boolean;
    createdAt: string;
    availableAt: string | null;
    claimExpiresAt: string | null;
    redeemedAt: string | null;
    assignedPrize: {
      id: string;
      label: string;
      color: string | null;
    } | null;
  }>;
  prizes: Array<{
    id: string;
    key: string;
    label: string;
    description: string | null;
    color: string | null;
    active: boolean;
    priority: number;
    stockTotal: number | null;
    stockReserved: number;
    stockClaimed: number;
    remainingStock: number | null;
    assignedMatches: number;
    assignedPredictions: number;
    winners: number;
    available: number;
    redeemed: number;
    expired: number;
    redemptionRate: number;
  }>;
  redemption: {
    results: Array<{
      key: string;
      total: number;
    }>;
    operators: Array<{
      userId: string;
      name: string;
      redemptionsOk: number;
      attempts: number;
      invalid: number;
    }>;
  };
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatPick(pick: "HOME" | "DRAW" | "AWAY", homeTeam: string, awayTeam: string) {
  if (pick === "HOME") return homeTeam;
  if (pick === "AWAY") return awayTeam;
  return "Empate";
}

function formatPredictionStatus(status: string) {
  if (status === "WON") return "Acertó";
  if (status === "LOST") return "Falló";
  if (status === "VOID") return "Nulo";
  if (status === "EXPIRED") return "Vencido";
  return "Pendiente";
}

function formatMatchWinner(result: string | null, homeTeam: string, awayTeam: string) {
  if (result === "HOME") return homeTeam;
  if (result === "AWAY") return awayTeam;
  if (result === "DRAW") return "Empate";
  return "Pendiente";
}

function formatClaimStatus(status: string) {
  if (status === "AVAILABLE") return "Disponible";
  if (status === "REDEEMED") return "Canjeado";
  if (status === "EXPIRED") return "Vencido";
  if (status === "REJECTED") return "Rechazado";
  return "Bloqueado";
}

function statusBadgeClass(status: string) {
  if (status === "WON") return "bg-emerald-500/12 text-emerald-700 ring-emerald-300 dark:text-emerald-300 dark:ring-emerald-700";
  if (status === "LOST") return "bg-rose-500/12 text-rose-700 ring-rose-300 dark:text-rose-300 dark:ring-rose-700";
  if (status === "VOID") return "bg-amber-500/12 text-amber-700 ring-amber-300 dark:text-amber-300 dark:ring-amber-700";
  if (status === "EXPIRED") return "bg-orange-500/12 text-orange-700 ring-orange-300 dark:text-orange-300 dark:ring-orange-700";
  return "bg-slate-500/12 text-slate-700 ring-slate-300 dark:text-slate-300 dark:ring-slate-700";
}

function claimBadgeClass(status: string) {
  if (status === "AVAILABLE") return "bg-sky-500/12 text-sky-700 ring-sky-300 dark:text-sky-300 dark:ring-sky-700";
  if (status === "REDEEMED") return "bg-emerald-500/12 text-emerald-700 ring-emerald-300 dark:text-emerald-300 dark:ring-emerald-700";
  if (status === "EXPIRED") return "bg-orange-500/12 text-orange-700 ring-orange-300 dark:text-orange-300 dark:ring-orange-700";
  if (status === "REJECTED") return "bg-rose-500/12 text-rose-700 ring-rose-300 dark:text-rose-300 dark:ring-rose-700";
  return "bg-slate-500/12 text-slate-700 ring-slate-300 dark:text-slate-300 dark:ring-slate-700";
}

function MetricCard(props: { title: string; value: string | number; hint: string; tone?: "neutral" | "green" | "amber" | "blue" | "rose" }) {
  const toneClass =
    props.tone === "green"
      ? "bg-emerald-500/12 text-emerald-700 ring-emerald-200 dark:text-emerald-300 dark:ring-emerald-700"
      : props.tone === "amber"
        ? "bg-amber-500/12 text-amber-700 ring-amber-200 dark:text-amber-300 dark:ring-amber-700"
        : props.tone === "blue"
          ? "bg-sky-500/12 text-sky-700 ring-sky-200 dark:text-sky-300 dark:ring-sky-700"
          : props.tone === "rose"
            ? "bg-rose-500/12 text-rose-700 ring-rose-200 dark:text-rose-300 dark:ring-rose-700"
            : "bg-slate-500/12 text-slate-700 ring-slate-200 dark:text-slate-300 dark:ring-slate-700";

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/50">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{props.title}</div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">{props.value}</div>
        <div className={["rounded-full px-3 py-1 text-xs font-semibold ring-1", toneClass].join(" ")}>{props.hint}</div>
      </div>
    </div>
  );
}

type PredictionFilter = "ALL" | "WON" | "LOST" | "VOID" | "EXPIRED" | "PENDING";

export default function AdminMundialInsightsClient() {
  const [data, setData] = useState<InsightsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [predictionFilter, setPredictionFilter] = useState<PredictionFilter>("ALL");

  useEffect(() => {
    async function loadInsights() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/admin/mundial2026/insights", { credentials: "include", cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.message || "No se pudieron cargar los insights.");
        }
        setData(payload);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los insights.");
      } finally {
        setLoading(false);
      }
    }

    void loadInsights();
  }, []);

  const predictionRows = useMemo(() => {
    if (!data) return [];
    return data.predictions.filter((prediction) => {
      if (predictionFilter === "ALL") return true;
      if (predictionFilter === "PENDING") return prediction.status === "PENDING";
      return prediction.status === predictionFilter;
    });
  }, [data, predictionFilter]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-slate-50/90 p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/50">
        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Mundial 2026</div>
        <div className="mt-3 text-3xl font-black text-slate-900 dark:text-slate-100">Cargando insights...</div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Estamos preparando las métricas operativas y de resultados.</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-rose-200 bg-rose-50/80 p-8 shadow-sm dark:border-rose-800 dark:bg-rose-950/30">
        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-600">Mundial 2026</div>
        <div className="mt-3 text-3xl font-black text-slate-900 dark:text-slate-100">No se pudieron cargar los insights</div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{error || "No se pudo consultar la capa analítica."}</p>
        <div className="mt-6">
          <Link href="/admin/mundial2026" className="inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
            Volver a Mundial 2026
          </Link>
        </div>
      </div>
    );
  }

  const predictionFilterOptions: Array<{ value: PredictionFilter; label: string }> = [
    { value: "ALL", label: "Todas" },
    { value: "WON", label: "Acertó" },
    { value: "LOST", label: "Falló" },
    { value: "VOID", label: "Nulo" },
    { value: "EXPIRED", label: "Vencido" },
    { value: "PENDING", label: "Pendiente" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-slate-900 dark:text-slate-100">
      <section className="rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.16),_transparent_28%),linear-gradient(180deg,_rgba(248,250,252,0.96)_0%,_rgba(241,245,249,0.92)_100%)] p-6 shadow-sm dark:border-slate-700 dark:bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.18),_transparent_28%),linear-gradient(180deg,_rgba(15,23,42,0.92)_0%,_rgba(2,6,23,0.88)_100%)] sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">/admin/mundial/insights</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">Insights Mundial 2026</h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
              Vista consolidada para seguimiento de participación, resultados, canje y performance de premios del módulo Mundial 2026.
            </p>
          </div>

          <div className="flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-300 sm:text-right">
            <div>
              Campaña: <span className="font-semibold text-slate-900 dark:text-slate-100">{data.campaign.name}</span>
            </div>
            <div>
              Actualizado: <span className="font-semibold text-slate-900 dark:text-slate-100">{formatDate(data.generatedAt)}</span>
            </div>
            <div>
              Estado: <span className="font-semibold text-slate-900 dark:text-slate-100">{data.campaign.status}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/admin/mundial2026" className="inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
            Volver a premios y liquidación
          </Link>
          <Link href="/mundial2026" className="inline-flex rounded-full border border-slate-300 bg-slate-50/90 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-slate-50">
            Abrir página pública
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Participantes" value={data.summary.participantsTotal} hint={`${data.summary.predictionsTotal} jugadas`} tone="neutral" />
        <MetricCard title="Ganadores" value={data.summary.wonTotal} hint={`${data.summary.winRate}% acierto`} tone="green" />
        <MetricCard title="Premios entregados" value={data.summary.redeemedTotal} hint={`${data.summary.redemptionRate}% redención`} tone="blue" />
        <MetricCard title="Premios vencidos" value={data.summary.expiredClaimTotal} hint={`${data.summary.winnersWithoutPrizeTotal} sin premio`} tone="rose" />
        <MetricCard title="Premios disponibles" value={data.summary.availableTotal} hint={`${data.summary.blockedClaimTotal} bloqueados`} tone="amber" />
        <MetricCard title="Predicciones perdidas" value={data.summary.lostTotal} hint={`${data.summary.voidTotal} void`} tone="neutral" />
        <MetricCard title="Partidos liquidados" value={`${data.summary.settledMatchesTotal}/${data.summary.matchesTotal}`} hint="avance de fixture" tone="blue" />
        <MetricCard title="Catálogo de premios" value={data.summary.prizeCatalogTotal} hint={`${data.summary.activePrizeCatalogTotal} activos`} tone="neutral" />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-slate-50/90 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/50 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Embudo operativo</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">Conversión desde participación hasta entrega o vencimiento del premio.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {data.funnel.map((item) => (
            <div key={item.label} className="rounded-2xl bg-white/70 p-4 ring-1 ring-slate-200 dark:bg-slate-950/40 dark:ring-slate-700">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{item.label}</div>
              <div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">{item.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-slate-50/90 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/50 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Resultados de canje</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Auditoría de intentos y resultados sobre la ruta de canje.</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {data.redemption.results.map((item) => (
            <div key={item.key} className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3 ring-1 ring-slate-200 dark:bg-slate-950/40 dark:ring-slate-700">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item.key}</div>
              <div className="text-lg font-black text-slate-900 dark:text-slate-100">{item.total}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-slate-50/90 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/50 sm:p-6">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Operadores</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Top usuarios que registraron canjes exitosos.</p>
        </div>

        <div className="mt-5 space-y-3">
          {data.redemption.operators.length ? (
            data.redemption.operators.map((operator) => (
              <div key={operator.userId} className="rounded-2xl bg-white/70 px-4 py-3 ring-1 ring-slate-200 dark:bg-slate-950/40 dark:ring-slate-700">
                <div className="font-semibold text-slate-900 dark:text-slate-100">{operator.name}</div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800">OK {operator.redemptionsOk}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">Intentos {operator.attempts}</span>
                  <span className="rounded-full bg-rose-50 px-2.5 py-1 font-semibold text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:ring-rose-800">Inválidos {operator.invalid}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl bg-white/70 px-4 py-4 text-sm text-slate-600 ring-1 ring-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:ring-slate-700">Todavía no hay actividad operativa registrada.</div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-slate-50/90 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/50 sm:p-6">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Jugadas detalladas</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">Cada apuesta relacionada con su participante, partido, pronóstico y resultado final en una sola tabla.</p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {predictionFilterOptions.map((option) => {
            const active = predictionFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setPredictionFilter(option.value)}
                className={[
                  "inline-flex items-center rounded-full border px-4 py-2 text-xs font-semibold transition",
                  active
                    ? "border-sky-500 bg-sky-500 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-100",
                ].join(" ")}
              >
                {option.label}
              </button>
            );
          })}
          <div className="flex items-center pl-2 text-xs text-slate-500 dark:text-slate-400">
            Mostrando {predictionRows.length} de {data.predictions.length}
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              <tr>
                <th className="pb-3 pr-4 font-semibold">Apostó</th>
                <th className="pb-3 pr-4 font-semibold">Ver token</th>
                <th className="pb-3 pr-4 font-semibold">Partido</th>
                <th className="pb-3 pr-4 font-semibold">Pronóstico</th>
                <th className="pb-3 pr-4 font-semibold">¿Acertó?</th>
                <th className="pb-3 pr-4 font-semibold">Premio</th>
                <th className="pb-3 pr-4 font-semibold">Vencimiento</th>
                <th className="pb-3 pr-4 font-semibold">Canje</th>
                <th className="pb-3 pr-4 font-semibold">Registrado</th>
              </tr>
            </thead>
            <tbody>
              {predictionRows.map((prediction) => (
                <tr key={prediction.id} className="border-t border-slate-100 align-top dark:border-slate-800">
                  <td className="py-3 pr-4">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{prediction.participant.name}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{prediction.participant.whatsappNormalized}</div>
                  </td>
                  <td className="py-3 pr-4">
                    <Link
                      href={prediction.detailPath}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:border-sky-500/50 hover:bg-sky-500/15 dark:text-sky-300"
                    >
                      Ver token
                    </Link>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {prediction.match.homeTeam} vs {prediction.match.awayTeam}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {prediction.match.stage || "Partido"} · {formatDate(prediction.match.startsAt)}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatMatchWinner(prediction.match.result, prediction.match.homeTeam, prediction.match.awayTeam)}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={["inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1", statusBadgeClass(prediction.status)].join(" ")}>
                      {formatPredictionStatus(prediction.status)}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    {prediction.assignedPrize ? (
                      <div>
                        <div className="font-semibold" style={prediction.assignedPrize.color ? { color: prediction.assignedPrize.color } : undefined}>
                          {prediction.assignedPrize.label}
                        </div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Asignado</div>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-500 dark:text-slate-400">Sin premio asignado</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    {prediction.claimExpiresAt ? (
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{formatDate(prediction.claimExpiresAt)}</div>
                    ) : (
                      <span className="text-sm text-slate-500 dark:text-slate-400">Sin vencimiento</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-col gap-2">
                      <span className={["inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ring-1", claimBadgeClass(prediction.claimStatus)].join(" ")}>
                        {formatClaimStatus(prediction.claimStatus)}
                      </span>
                      {prediction.redeemedAt ? <span className="text-xs text-slate-500 dark:text-slate-400">Canjeado {formatDate(prediction.redeemedAt)}</span> : null}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{formatDate(prediction.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-slate-50/90 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/50 sm:p-6">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Participantes</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">Listado de participantes con su WhatsApp y estado general dentro de la campaña.</p>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              <tr>
                <th className="pb-3 pr-4 font-semibold">Participante</th>
                <th className="pb-3 pr-4 font-semibold">WhatsApp</th>
                <th className="pb-3 pr-4 font-semibold">Jugadas</th>
                <th className="pb-3 pr-4 font-semibold">Ganó</th>
                <th className="pb-3 pr-4 font-semibold">Disponible</th>
                <th className="pb-3 pr-4 font-semibold">Canjeó</th>
                <th className="pb-3 pr-4 font-semibold">Última jugada</th>
              </tr>
            </thead>
            <tbody>
              {data.participants.map((participant) => (
                <tr key={participant.id} className="border-t border-slate-100 align-top dark:border-slate-800">
                  <td className="py-3 pr-4">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{participant.name}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Registro {formatDate(participant.createdAt)}</div>
                  </td>
                  <td className="py-3 pr-4 font-medium text-slate-700 dark:text-slate-200">{participant.whatsappNormalized}</td>
                  <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-slate-100">{participant.totalPredictions}</td>
                  <td className="py-3 pr-4 font-semibold text-emerald-700">{participant.won}</td>
                  <td className="py-3 pr-4 font-semibold text-amber-700">{participant.available}</td>
                  <td className="py-3 pr-4 font-semibold text-sky-700">{participant.redeemed}</td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{formatDate(participant.lastPredictionAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
