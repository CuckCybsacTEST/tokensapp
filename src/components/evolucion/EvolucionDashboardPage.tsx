'use client';

import React, { useEffect, useState } from 'react';

import WeeklyJourneyDashboard from '@/app/admin/daily-evaluation/WeeklyJourneyDashboard';

function toLimaDateStr(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
}

function getBusinessDay(): string {
  const now = new Date();
  const limaHour = Number(now.toLocaleString('en-US', { timeZone: 'America/Lima', hour: 'numeric', hour12: false }));
  const ref = limaHour < 10 ? new Date(now.getTime() - 24 * 60 * 60 * 1000) : now;
  return toLimaDateStr(ref);
}

const PERIOD_OPTIONS = [
  { label: 'Última semana', granularity: 'day' as const, days: 7 },
  { label: 'Últimas 2 semanas', granularity: 'day' as const, days: 14 },
  { label: 'Último mes', granularity: 'week' as const, weeks: 5 },
  { label: 'Últimos 2 meses', granularity: 'week' as const, weeks: 9 },
  { label: 'Últimos 3 meses', granularity: 'week' as const, weeks: 13 },
  { label: 'Últimos 6 meses', granularity: 'week' as const, weeks: 26 },
  { label: 'Último año', granularity: 'week' as const, weeks: 53 },
] as const;

/** Semanas desde el lunes de la primera semana con datos (09 dic 2025) hasta hoy. */
function getHistoricalWeekCount(): number {
  const projectStart = new Date('2025-12-08T12:00:00Z');
  const days = Math.ceil((Date.now() - projectStart.getTime()) / 86_400_000);
  return Math.ceil(days / 7) + 1;
}

export default function EvolucionDashboardPage() {
  const [anchorDay, setAnchorDay] = useState('');
  const [periodIndex, setPeriodIndex] = useState(3);
  const allOptions = [
    ...PERIOD_OPTIONS,
    { label: 'Histórico', granularity: 'week' as const, weeks: getHistoricalWeekCount() },
  ];
  const selectedPeriod = allOptions[periodIndex] ?? allOptions[3];

  useEffect(() => {
    setAnchorDay(getBusinessDay());
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">Evolucion Operativa</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Tendencias semanales de jornada, QR, pulseras, productos y cumpleanos usando datos reales del repo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
          <div className="min-w-[180px]">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Ventana</div>
            <div className="text-sm text-slate-700 dark:text-slate-200">Periodo de análisis acumulado hasta la semana actual</div>
          </div>
          <select
            value={periodIndex}
            onChange={(event) => setPeriodIndex(Number(event.target.value))}
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {allOptions.map((option, index) => (
              <option key={option.label} value={index}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {anchorDay ? (
        selectedPeriod.granularity === 'day' ? (
          <WeeklyJourneyDashboard selectedDay={anchorDay} dayCount={selectedPeriod.days} granularity="day" />
        ) : (
          <WeeklyJourneyDashboard selectedDay={anchorDay} weekCount={selectedPeriod.weeks} />
        )
      ) : null}
    </div>
  );
}