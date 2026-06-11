"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

function MetricCard(props: { title: string; value: string | number; hint: string; tone?: "neutral" | "green" | "amber" | "blue" | "rose" }) {
  const toneClass =
    props.tone === "green"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : props.tone === "amber"
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : props.tone === "blue"
          ? "bg-sky-50 text-sky-700 ring-sky-200"
          : props.tone === "rose"
            ? "bg-rose-50 text-rose-700 ring-rose-200"
            : "bg-slate-50 text-slate-700 ring-slate-200";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{props.title}</div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="text-3xl font-black tracking-tight text-slate-900">{props.value}</div>
        <div className={["rounded-full px-3 py-1 text-xs font-semibold ring-1", toneClass].join(" ")}>{props.hint}</div>
      </div>
    </div>
  );
}

export default function AdminMundialInsightsClient() {
  const [data, setData] = useState<InsightsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Mundial 2026</div>
        <div className="mt-3 text-3xl font-black text-slate-900">Cargando insights...</div>
        <p className="mt-3 text-sm text-slate-600">Estamos preparando las métricas operativas y de resultados.</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-rose-200 bg-white p-8 shadow-sm">
        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-600">Mundial 2026</div>
        <div className="mt-3 text-3xl font-black text-slate-900">No se pudieron cargar los insights</div>
        <p className="mt-3 text-sm text-slate-600">{error || "No se pudo consultar la capa analítica."}</p>
        <div className="mt-6">
          <Link href="/admin/mundial2026" className="inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
            Volver a Mundial 2026
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-slate-900">
      <section className="rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.16),_transparent_28%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">/admin/mundial/insights</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Insights Mundial 2026</h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Vista consolidada para seguimiento de participación, resultados, canje y performance de premios del módulo Mundial 2026.
            </p>
          </div>

          <div className="flex flex-col gap-2 text-sm text-slate-600 sm:text-right">
            <div>
              Campaña: <span className="font-semibold text-slate-900">{data.campaign.name}</span>
            </div>
            <div>
              Actualizado: <span className="font-semibold text-slate-900">{formatDate(data.generatedAt)}</span>
            </div>
            <div>
              Estado: <span className="font-semibold text-slate-900">{data.campaign.status}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/admin/mundial2026" className="inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
            Volver a premios y liquidación
          </Link>
          <Link href="/mundial2026" className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900">
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

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">Embudo operativo</h2>
            <p className="text-sm text-slate-600">Conversión desde participación hasta entrega o vencimiento del premio.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {data.funnel.map((item) => (
            <div key={item.label} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</div>
              <div className="mt-2 text-2xl font-black text-slate-900">{item.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="text-xl font-black text-slate-900">Partidos</h2>
            <p className="text-sm text-slate-600">Participación, ganadores y desempeño de canje por partido.</p>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="pb-3 pr-4 font-semibold">Partido</th>
                  <th className="pb-3 pr-4 font-semibold">Predicciones</th>
                  <th className="pb-3 pr-4 font-semibold">Ganaron</th>
                  <th className="pb-3 pr-4 font-semibold">Disponibles</th>
                  <th className="pb-3 pr-4 font-semibold">Canjeados</th>
                  <th className="pb-3 pr-4 font-semibold">Redención</th>
                </tr>
              </thead>
              <tbody>
                {data.matches.map((match) => (
                  <tr key={match.id} className="border-t border-slate-100 align-top">
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-slate-900">{match.homeTeam} vs {match.awayTeam}</div>
                      <div className="mt-1 text-xs text-slate-500">{match.stage || "Partido"} · {formatDate(match.startsAt)}</div>
                    </td>
                    <td className="py-3 pr-4 font-semibold text-slate-900">{match.totalPredictions}</td>
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-emerald-700">{match.winners}</div>
                      <div className="text-xs text-slate-500">{match.winRate}%</div>
                    </td>
                    <td className="py-3 pr-4 font-semibold text-amber-700">{match.available}</td>
                    <td className="py-3 pr-4 font-semibold text-sky-700">{match.redeemed}</td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                        {match.redemptionRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-black text-slate-900">Resultados de canje</h2>
            <p className="mt-1 text-sm text-slate-600">Auditoría de intentos y resultados sobre la ruta de canje.</p>

            <div className="mt-5 space-y-3">
              {data.redemption.results.map((item) => (
                <div key={item.key} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                  <div className="text-sm font-semibold text-slate-700">{item.key}</div>
                  <div className="text-lg font-black text-slate-900">{item.total}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-black text-slate-900">Operadores</h2>
            <p className="mt-1 text-sm text-slate-600">Top usuarios que registraron canjes exitosos.</p>

            <div className="mt-5 space-y-3">
              {data.redemption.operators.length ? (
                data.redemption.operators.map((operator) => (
                  <div key={operator.userId} className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                    <div className="font-semibold text-slate-900">{operator.name}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-200">OK {operator.redemptionsOk}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">Intentos {operator.attempts}</span>
                      <span className="rounded-full bg-rose-50 px-2.5 py-1 font-semibold text-rose-700 ring-1 ring-rose-200">Inválidos {operator.invalid}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-600 ring-1 ring-slate-200">Todavía no hay actividad operativa registrada.</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h2 className="text-xl font-black text-slate-900">Participantes</h2>
          <p className="text-sm text-slate-600">Listado de participantes con su WhatsApp y estado general dentro de la campaña.</p>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.16em] text-slate-500">
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
                <tr key={participant.id} className="border-t border-slate-100 align-top">
                  <td className="py-3 pr-4">
                    <div className="font-semibold text-slate-900">{participant.name}</div>
                    <div className="mt-1 text-xs text-slate-500">Registro {formatDate(participant.createdAt)}</div>
                  </td>
                  <td className="py-3 pr-4 font-medium text-slate-700">{participant.whatsappNormalized}</td>
                  <td className="py-3 pr-4 font-semibold text-slate-900">{participant.totalPredictions}</td>
                  <td className="py-3 pr-4 font-semibold text-emerald-700">{participant.won}</td>
                  <td className="py-3 pr-4 font-semibold text-amber-700">{participant.available}</td>
                  <td className="py-3 pr-4 font-semibold text-sky-700">{participant.redeemed}</td>
                  <td className="py-3 pr-4 text-slate-600">{formatDate(participant.lastPredictionAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h2 className="text-xl font-black text-slate-900">Premios</h2>
          <p className="text-sm text-slate-600">Estado del catálogo, asignación y conversión por premio.</p>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="pb-3 pr-4 font-semibold">Premio</th>
                <th className="pb-3 pr-4 font-semibold">Asignado</th>
                <th className="pb-3 pr-4 font-semibold">Disponibles</th>
                <th className="pb-3 pr-4 font-semibold">Canjeados</th>
                <th className="pb-3 pr-4 font-semibold">Vencidos</th>
                <th className="pb-3 pr-4 font-semibold">Stock</th>
                <th className="pb-3 pr-4 font-semibold">Redención</th>
              </tr>
            </thead>
            <tbody>
              {data.prizes.map((prize) => (
                <tr key={prize.id} className="border-t border-slate-100 align-top">
                  <td className="py-3 pr-4">
                    <div className="font-semibold" style={prize.color ? { color: prize.color } : undefined}>{prize.label}</div>
                    <div className="mt-1 text-xs text-slate-500">{prize.assignedMatches} partidos · prioridad {prize.priority}</div>
                  </td>
                  <td className="py-3 pr-4 font-semibold text-slate-900">{prize.assignedPredictions}</td>
                  <td className="py-3 pr-4 font-semibold text-amber-700">{prize.available}</td>
                  <td className="py-3 pr-4 font-semibold text-sky-700">{prize.redeemed}</td>
                  <td className="py-3 pr-4 font-semibold text-rose-700">{prize.expired}</td>
                  <td className="py-3 pr-4">
                    <div className="font-semibold text-slate-900">{prize.stockClaimed}/{prize.stockTotal ?? "inf"}</div>
                    <div className="text-xs text-slate-500">reservado {prize.stockReserved}{prize.remainingStock != null ? ` · libre ${prize.remainingStock}` : ""}</div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                      {prize.redemptionRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}