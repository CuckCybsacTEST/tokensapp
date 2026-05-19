'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type WeeklyOperationalStat = {
  weekStart: string;
  weekEnd: string;
  label: string;
  completeRecords: number;
  incompleteShifts: number;
  missingExitCount: number;
  totalRecords: number;
  incidentCount: number;
  incidentDays: Array<{ businessDay: string; comment: string }>;
};

type WeeklyQrStat = {
  weekStart: string;
  weekEnd: string;
  label: string;
  reusableScans: number;
  totalQrSales: number;
  braceletsRedeemed: number;
  braceletsIssued: number;
};

type WeeklyBirthdayStat = {
  weekStart: string;
  weekEnd: string;
  label: string;
  reservations: number;
  arrived: number;
  noShow: number;
};

type WeeklyRatingStat = {
  weekStart: string;
  weekEnd: string;
  label: string;
  maloCnt: number;
  regularCnt: number;
  buenoCnt: number;
  muyBuenoCnt: number;
  daysRated: number;
};

type WeeklyProductSeries = {
  weekStart: string;
  weekEnd: string;
  label: string;
  total: number;
  products: Record<string, number>;
};

type ProductSeriesResponse = {
  weeks: WeeklyProductSeries[];
  productKeys: string[];
  historicalTotal?: number;
};

type CollaboratorIncidentRankingItem = {
  personId: string;
  collaborator: string;
  area: string | null;
  incidents: number;
  previousIncidents: number;
  trend: number;
  reasons: string[];
};

type AlertItem = {
  type: 'incident' | 'product-growth' | 'roll-banner' | 'birthday' | 'bracelets';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
};

type WeeklyDashboardData = {
  kpiWeek: {
    weekStart: string;
    weekEnd: string;
    label: string;
  };
  kpis: {
    completeRecords: number;
    incompleteShifts: number;
    missingExitCount: number;
    reusableScans: number;
    braceletsRedeemed: number;
    birthdaysArrived: number;
    braceletsIssued: number;
  };
  operationalStats: WeeklyOperationalStat[];
  qrStats: WeeklyQrStat[];
  barProducts: ProductSeriesResponse;
  rollBannerProducts: ProductSeriesResponse;
  domingoProducts: ProductSeriesResponse;
  pulserasCanjeadas: ProductSeriesResponse;
  birthdayStats: WeeklyBirthdayStat[];
  ratingStats: WeeklyRatingStat[];
  collaboratorIncidentRanking: CollaboratorIncidentRankingItem[];
  alerts: AlertItem[];
  notes: {
    pulserasCanjeadas: string;
  };
};

type SeriesConfig = {
  key: string;
  name: string;
  color: string;
};

const PRODUCT_COLORS = [
  '#0f766e', '#2563eb', '#db2777', '#7c3aed', '#ea580c', '#16a34a',
  '#b45309', '#0891b2', '#6d28d9', '#be123c', '#15803d', '#1d4ed8',
  '#92400e', '#065f46', '#7e22ce', '#0369a1', '#991b1b', '#166534',
];

function ExactTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  // Only show series that have a non-zero value for this week.
  const visibleItems: any[] = payload.filter((item: any) => (item.value ?? 0) > 0);
  if (!visibleItems.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-1 font-semibold text-slate-700 dark:text-slate-200">{label}</div>
      <div className="space-y-1">
        {visibleItems.map((item: any) => (
          <div key={item.dataKey} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              {item.name}
            </span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        {subtitle ? <span className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</span> : null}
      </div>
      {children}
    </div>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</div>
      <div className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</div>
      {sub ? <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{sub}</div> : null}
    </div>
  );
}

function MultiLineChartCard({
  title,
  subtitle,
  data,
  series,
  keyTotals,
  activeWeekCount,
  totalSeriesKey,
  historicalTotal,
}: {
  title: string;
  subtitle?: string;
  data: Array<Record<string, string | number>>;
  series: SeriesConfig[];
  keyTotals?: Record<string, number>;
  activeWeekCount?: number;
  /** Key de la serie que representa el gran total — su chip recibe estilo de acento. */
  totalSeriesKey?: string;
  /** Suma histórica de usedCount (incluye escaneos pre-tracking sin fecha). */
  historicalTotal?: number;
}) {
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  function toggleKey(key: string) {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function showAll() {
    setHiddenKeys(new Set());
  }

  return (
    <DashboardCard title={title} subtitle={subtitle}>
      {data.length === 0 ? (
        <div className="text-sm text-slate-500 dark:text-slate-400">Sin datos suficientes.</div>
      ) : (
        <>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.25} />
                <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} width={30} />
                <Tooltip content={<ExactTooltip />} />
                {series.map((item) => (
                  <Line
                    key={item.key}
                    type="monotone"
                    dataKey={item.key}
                    name={item.name}
                    stroke={item.color}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    hide={hiddenKeys.has(item.key)}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Leyenda interactiva: clic para mostrar/ocultar · conteos acumulados del periodo */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {series.map((item) => {
              const hidden = hiddenKeys.has(item.key);
              const count = keyTotals?.[item.key];
              const isTotal = item.key === totalSeriesKey;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleKey(item.key)}
                  title={hidden ? `Mostrar: ${item.name}` : `Ocultar: ${item.name}`}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] transition-all ${
                    hidden
                      ? isTotal
                        ? 'border-cyan-200 bg-cyan-50 text-cyan-400 line-through opacity-50 dark:border-cyan-800 dark:bg-cyan-900/10 dark:text-cyan-600'
                        : 'border-slate-200 bg-slate-100 text-slate-400 line-through opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500'
                      : isTotal
                        ? 'border-cyan-300 bg-cyan-50 font-semibold text-cyan-800 hover:bg-cyan-100 dark:border-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 dark:hover:bg-cyan-900/50'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:border-slate-500'
                  }`}
                >
                  <span
                    className="h-2 w-2 flex-shrink-0 rounded-full transition-colors"
                    style={{ backgroundColor: hidden ? '#94a3b8' : item.color }}
                  />
                  {item.name}
                  {count !== undefined && (
                    isTotal
                      ? <span className="text-sm font-black tabular-nums leading-none">{count}</span>
                      : <span className="font-bold tabular-nums">{count}</span>
                  )}
                </button>
              );
            })}
            {hiddenKeys.size > 0 && (
              <button
                type="button"
                onClick={showAll}
                className="ml-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40"
              >
                Mostrar todos
              </button>
            )}
            {historicalTotal !== undefined && historicalTotal > 0 && (
              <span
                title="Suma de usedCount de todos los tokens del grupo, incluyendo escaneos anteriores al sistema de rastreo (pre-14 mar 2026)"
                className="inline-flex cursor-help items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] text-violet-700 dark:border-violet-700 dark:bg-violet-900/20 dark:text-violet-300"
              >
                Total histórico
                <span className="text-sm font-black tabular-nums leading-none">{historicalTotal}</span>
              </span>
            )}
          </div>
          {activeWeekCount !== undefined && activeWeekCount > 0 && (
            <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
              Conteos acumulados en {activeWeekCount} {activeWeekCount === 1 ? 'semana' : 'semanas'} con actividad
            </p>
          )}
        </>
      )}
    </DashboardCard>
  );
}

function IncidentChartCard({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle?: string;
  data: Array<{ label: string; incidentCount: number; comments: Array<{ businessDay: string; comment: string }> }>;
}) {
  return (
    <DashboardCard title={title} subtitle={subtitle}>
      {data.length === 0 ? (
        <div className="text-sm text-slate-500 dark:text-slate-400">Sin datos suficientes.</div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.25} />
              <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} width={30} />
              <Tooltip
                content={({ active, payload, label }: any) => {
                  if (!active || !payload?.length) return null;
                  const v = payload[0]?.value as number | undefined;
                  const comments = payload[0]?.payload?.comments as Array<{ businessDay: string; comment: string }> | undefined;
                  if (!v) return null;
                  return (
                    <div className="max-w-sm rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
                      <div className="mb-1.5 font-semibold text-slate-700 dark:text-slate-200">{label}</div>
                      <div className="mb-2 flex items-center gap-1.5">
                        <span className="h-2 w-2 flex-shrink-0 rounded-full bg-red-600" />
                        <span className="text-slate-600 dark:text-slate-300">Jornadas con incidencias:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{v}</span>
                      </div>
                      {comments && comments.length > 0 && (
                        <div className="space-y-2">
                          {comments.map((c) => (
                            <div key={c.businessDay} className="rounded border-l-2 border-red-400 pl-2 dark:border-red-600">
                              <div className="mb-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">{c.businessDay}</div>
                              <div className="whitespace-pre-wrap leading-snug text-slate-700 dark:text-slate-300">{c.comment}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="incidentCount"
                name="Incidencias"
                stroke="#dc2626"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </DashboardCard>
  );
}

const RATING_SCORE_LABELS: Record<number, string> = { 1: 'Malo', 2: 'Regular', 3: 'Bueno', 4: 'Muy bueno' };
function scoreToRatingLabel(v: number): string {
  return RATING_SCORE_LABELS[Math.round(v)] ?? v.toFixed(1);
}

function RatingChartCard({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle?: string;
  data: Array<{ label: string; avgScore: number | null }>;
}) {
  const hasData = data.some((d) => d.avgScore !== null);
  return (
    <DashboardCard title={title} subtitle={subtitle}>
      {!hasData ? (
        <div className="text-sm text-slate-500 dark:text-slate-400">Sin calificaciones registradas en el periodo.</div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.25} />
              <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                domain={[0.5, 4.5]}
                ticks={[1, 2, 3, 4]}
                tickFormatter={(v: number) => scoreToRatingLabel(v)}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={62}
              />
              <Tooltip
                content={({ active, payload, label }: any) => {
                  if (!active || !payload?.length) return null;
                  const v = payload[0]?.value as number | null | undefined;
                  if (v == null) return null;
                  return (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
                      <div className="mb-1 font-semibold text-slate-700 dark:text-slate-200">{label}</div>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: '#7c3aed' }} />
                        <span className="text-slate-600 dark:text-slate-300">Calificación</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{scoreToRatingLabel(v)}</span>
                      </div>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="avgScore"
                name="Calificación"
                stroke="#7c3aed"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </DashboardCard>
  );
}

function productSeriesToChartData(input: ProductSeriesResponse) {
  const productKeys = input.productKeys;
  const activeWeeks = input.weeks.filter((w) => w.total > 0);
  const keyTotals: Record<string, number> = {};
  keyTotals['total'] = activeWeeks.reduce((s, w) => s + w.total, 0);
  for (const p of productKeys) {
    keyTotals[p] = activeWeeks.reduce((s, w) => s + (w.products[p] || 0), 0);
  }
  return {
    data: input.weeks.map((week) => {
      const row: Record<string, string | number> = {
        label: week.label,
        total: week.total,
      };
      for (const product of productKeys) {
        row[product] = week.products[product] || 0;
      }
      return row;
    }),
    productKeys,
    keyTotals,
    activeWeekCount: activeWeeks.length,
    historicalTotal: input.historicalTotal,
  };
}



export default function WeeklyJourneyDashboard({
  selectedDay,
  weekCount = 8,
  dayCount,
  granularity = 'week',
}: {
  selectedDay: string;
  weekCount?: number;
  dayCount?: number;
  granularity?: 'week' | 'day';
}) {
  const [data, setData] = useState<WeeklyDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!selectedDay) return;
      setLoading(true);
      setError(null);
      try {
        const url =
          granularity === 'day'
            ? `/api/admin/daily-evaluation/weekly-dashboard?day=${selectedDay}&days=${dayCount ?? 7}&granularity=day`
            : `/api/admin/daily-evaluation/weekly-dashboard?day=${selectedDay}&weeks=${weekCount}`;
        const response = await fetch(url);
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.error || 'No se pudo cargar el dashboard evolutivo.');
        }
        if (!cancelled) setData(body);
      } catch (fetchError: any) {
        if (!cancelled) setError(fetchError?.message || 'Error cargando dashboard evolutivo.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [selectedDay, weekCount, dayCount, granularity]);

  const operationalChart = useMemo(() => {
    if (!data) return [];
    return data.operationalStats.map((week) => ({
      label: week.label,
      incompleteShifts: week.incompleteShifts,
      completeRecords: week.completeRecords,
      totalRecords: week.totalRecords,
    }));
  }, [data]);

  const incidentChart = useMemo(() => {
    if (!data) return [];
    return data.operationalStats.map((week) => ({
      label: week.label,
      incidentCount: week.incidentCount,
      comments: week.incidentDays,
    }));
  }, [data]);

  const ratingChart = useMemo(() => {
    if (!data) return [];
    return data.ratingStats.map((week) => ({
      label: week.label,
      avgScore:
        week.daysRated > 0
          ? Math.round(
              ((week.maloCnt * 1 + week.regularCnt * 2 + week.buenoCnt * 3 + week.muyBuenoCnt * 4) / week.daysRated) * 10,
            ) / 10
          : null,
    }));
  }, [data]);

  const birthdayChart = useMemo(() => {
    if (!data) return [];
    return data.birthdayStats.map((week) => ({
      label: week.label,
      reservations: week.reservations,
      arrived: week.arrived,
      noShow: week.noShow,
    }));
  }, [data]);

  const barProductsChart = useMemo(() => productSeriesToChartData(data?.barProducts || { weeks: [], productKeys: [] }), [data]);
  const rollBannerChart = useMemo(() => productSeriesToChartData(data?.rollBannerProducts || { weeks: [], productKeys: [] }), [data]);
  const domingoChart = useMemo(() => productSeriesToChartData(data?.domingoProducts || { weeks: [], productKeys: [] }), [data]);
  const pulserasChart = useMemo(() => productSeriesToChartData(data?.pulserasCanjeadas || { weeks: [], productKeys: [] }), [data]);

  const periodKpis = useMemo(() => {
    if (!data) return null;
    return {
      completeRecords: data.operationalStats.reduce((s, w) => s + w.completeRecords, 0),
      incompleteShifts: data.operationalStats.reduce((s, w) => s + w.incompleteShifts, 0),
      missingExitCount: data.operationalStats.reduce((s, w) => s + w.missingExitCount, 0),
      reusableScans: data.qrStats.reduce((s, w) => s + w.reusableScans, 0),
      braceletsRedeemed: data.qrStats.reduce((s, w) => s + w.braceletsRedeemed, 0),
      braceletsIssued: data.qrStats.reduce((s, w) => s + w.braceletsIssued, 0),
      birthdaysArrived: data.birthdayStats.reduce((s, w) => s + w.arrived, 0),
    };
  }, [data]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="animate-pulse text-sm text-slate-500 dark:text-slate-400">Cargando dashboard evolutivo semanal...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
        {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Resumen Evolutivo</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Totales acumulados en el periodo seleccionado. Tendencia semanal en los gráficos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard label="Registros completos" value={periodKpis?.completeRecords ?? 0} />
        <KpiCard label="Jornadas incompletas" value={periodKpis?.incompleteShifts ?? 0} sub={`${periodKpis?.missingExitCount ?? 0} sin salida`} />
        <KpiCard label="Escaneos reutilizables" value={periodKpis?.reusableScans ?? 0} />
        <KpiCard label="Pulseras canjeadas" value={periodKpis?.braceletsRedeemed ?? 0} sub={`${periodKpis?.braceletsIssued ?? 0} en lotes`} />
        <KpiCard label="Cumpleaños que llegaron" value={periodKpis?.birthdaysArrived ?? 0} />
      </div>

      <MultiLineChartCard
        title="Jornadas del personal"
        subtitle="Evolucion semanal de jornadas completas e incompletas"
        data={operationalChart}
        series={[
          { key: 'incompleteShifts', name: 'Jornadas incompletas', color: '#dc2626' },
          { key: 'completeRecords', name: 'Registros completos', color: '#16a34a' },
          { key: 'totalRecords', name: 'Total registros', color: '#2563eb' },
        ]}
      />

      <IncidentChartCard
        title="Incidencias de Personal"
        subtitle="Días con comentario en el cierre de jornada"
        data={incidentChart}
      />

      <RatingChartCard
        title="Calificación de Jornada"
        subtitle="Evolución del nivel de calificación por periodo (Malo → Regular → Bueno → Muy bueno)"
        data={ratingChart}
      />

      <MultiLineChartCard
        title="Pulseras canjeadas"
        subtitle="Premios canjeados renombrados visualmente como pulseras canjeadas"
        data={pulserasChart.data}
        series={[
          { key: 'total', name: 'Total pulseras canjeadas', color: '#b45309' },
          ...pulserasChart.productKeys.map((product, index) => ({
            key: product,
            name: product,
            color: PRODUCT_COLORS[index % PRODUCT_COLORS.length],
          })),
        ]}
        keyTotals={pulserasChart.keyTotals}
        activeWeekCount={pulserasChart.activeWeekCount}
        totalSeriesKey="total"
      />

      <MultiLineChartCard
        title="Cumpleaños"
        subtitle="Reservas, llegaron y no llegaron"
        data={birthdayChart}
        series={[
          { key: 'reservations', name: 'Reservas', color: '#db2777' },
          { key: 'arrived', name: 'Llegaron', color: '#16a34a' },
          { key: 'noShow', name: 'No llegaron', color: '#dc2626' },
        ]}
      />

      <MultiLineChartCard
        title="Promos Qr's barra"
        subtitle="Serie semanal por producto y total de Promos Barra"
        data={barProductsChart.data}
        series={[
          { key: 'total', name: 'Total semanal Promos Barra', color: '#0891b2' },
          ...barProductsChart.productKeys.map((product, index) => ({
            key: product,
            name: product,
            color: PRODUCT_COLORS[index % PRODUCT_COLORS.length],
          })),
        ]}
        keyTotals={barProductsChart.keyTotals}
        activeWeekCount={barProductsChart.activeWeekCount}
        totalSeriesKey="total"
        historicalTotal={barProductsChart.historicalTotal}
      />

      <MultiLineChartCard
        title="Qr's Roll Banner's"
        subtitle="Serie semanal independiente para activaciones de roll banner"
        data={rollBannerChart.data}
        series={[
          { key: 'total', name: 'Total semanal Roll Banner', color: '#0284c7' },
          ...rollBannerChart.productKeys.map((product, index) => ({
            key: product,
            name: product,
            color: PRODUCT_COLORS[index % PRODUCT_COLORS.length],
          })),
        ]}
        keyTotals={rollBannerChart.keyTotals}
        activeWeekCount={rollBannerChart.activeWeekCount}
        totalSeriesKey="total"
      />

      <MultiLineChartCard
        title="Tokens Domingo"
        subtitle="Serie semanal de canjes del grupo Tokens Domingo"
        data={domingoChart.data}
        series={[
          { key: 'total', name: 'Total semanal Domingo', color: '#7c3aed' },
          ...domingoChart.productKeys.map((product, index) => ({
            key: product,
            name: product,
            color: PRODUCT_COLORS[index % PRODUCT_COLORS.length],
          })),
        ]}
        keyTotals={domingoChart.keyTotals}
        activeWeekCount={domingoChart.activeWeekCount}
        totalSeriesKey="total"
        historicalTotal={domingoChart.historicalTotal}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <DashboardCard title="Ranking de incidencias" subtitle="Incidencias detectadas desde comentarios de cierre">
          {data.collaboratorIncidentRanking.length === 0 ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">Sin incidencias detectadas en la ventana analizada.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    <th className="py-2 pr-3">Colaborador</th>
                    <th className="py-2 pr-3">Area</th>
                    <th className="py-2 pr-3 text-center">Incidencias</th>
                    <th className="py-2 text-center">Tendencia</th>
                  </tr>
                </thead>
                <tbody>
                  {data.collaboratorIncidentRanking.map((item) => (
                    <tr key={item.personId} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 pr-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{item.collaborator}</div>
                        {item.reasons.length > 0 ? (
                          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{item.reasons.join(' · ')}</div>
                        ) : null}
                      </td>
                      <td className="py-2 pr-3 text-slate-600 dark:text-slate-300">{item.area || 'Sin area'}</td>
                      <td className="py-2 pr-3 text-center font-semibold text-slate-900 dark:text-slate-100">{item.incidents}</td>
                      <td className="py-2 text-center">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            item.trend > 0
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                              : item.trend < 0
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {item.trend > 0 ? `+${item.trend}` : item.trend}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashboardCard>

        <DashboardCard title="Alertas inteligentes" subtitle="Reglas simples sobre la semana actual">
          {data.alerts.length === 0 ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">Sin alertas activas para la semana actual.</div>
          ) : (
            <div className="space-y-2">
              {data.alerts.map((alert, index) => (
                <div
                  key={`${alert.type}-${index}`}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    alert.severity === 'critical'
                      ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300'
                      : alert.severity === 'warning'
                        ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300'
                        : 'border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-300'
                  }`}
                >
                  <div className="font-semibold">{alert.title}</div>
                  <div className="mt-1 text-xs">{alert.message}</div>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>
      </div>
    </section>
  );
}