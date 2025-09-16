"use client";
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import StatCard from "@/app/admin/StatCard";
import { ALLOWED_AREAS } from "@/lib/areas";

type Period = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

type Metrics = {
  ok?: boolean;
  period: { name: Period; startDate: string; endDate: string };
  tasks: {
    completionRatePct: number;
    fullyCompletedPct: number;
    topIncompleteTasks: Array<{ taskId: string; label: string; missingCount: number }>;
    timeToFirstTaskMin: number | null;
    timeToLastTaskMin: number | null;
  };
};

// Dynamic charts (no SSR)
const TopIncompleteTasksBar = dynamic(() => import("@/components/charts/TopIncompleteTasksBar").then(m => m.TopIncompleteTasksBar), { ssr: false });
const SimpleDonut = dynamic(() => import("@/components/charts/SimpleDonut").then(m => m.SimpleDonut), { ssr: false });

function formatMinutes(min: number | null | undefined) {
  if (min == null) return "-";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export default function TasksMetricsPage() {
  const [period, setPeriod] = useState<Period>('today');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [area, setArea] = useState<string>("");
  const [person, setPerson] = useState<string>("");
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set('period', period);
    if (period === 'custom') {
      if (startDate) p.set('startDate', startDate);
      if (endDate) p.set('endDate', endDate);
    }
    if (area) p.set('area', area);
    if (person) p.set('person', person);
    return p.toString();
  }, [period, startDate, endDate, area, person]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/attendance/metrics?${query}`)
      .then(r => r.json())
      .then(j => {
        if (cancelled) return;
        if (!j?.ok) {
          setError(j?.message || j?.code || 'Error al cargar métricas');
          setMetrics(null);
        } else {
          setMetrics(j as Metrics);
        }
      })
      .catch(e => { if (!cancelled) setError(String(e?.message || e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query]);

  const compDonut = useMemo(() => {
    if (!metrics) return [] as Array<{ name: string; value: number; color?: string }>;
    const done = Math.round(metrics.tasks.completionRatePct);
    return [
      { name: 'Completado', value: done, color: '#10b981' },
      { name: 'Pendiente', value: Math.max(0, 100 - done), color: '#ef4444' },
    ];
  }, [metrics]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold">Métricas de Tareas — Dashboard</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600 dark:text-slate-300">Período:</label>
            <select
              className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-700"
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
            >
              <option value="today">Hoy</option>
              <option value="yesterday">Ayer</option>
              <option value="this_week">Esta semana</option>
              <option value="this_month">Este mes</option>
              <option value="last_week">Semana pasada</option>
              <option value="last_month">Mes pasado</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>
          {period === 'custom' && (
            <div className="flex items-center gap-2 text-sm">
              <label>Desde</label>
              <input type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)} className="rounded-md border border-gray-300 bg-white px-2 py-1 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-700" />
              <label>Hasta</label>
              <input type="date" value={endDate} onChange={(e)=>setEndDate(e.target.value)} className="rounded-md border border-gray-300 bg-white px-2 py-1 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-700" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600 dark:text-slate-300">Área:</label>
            <select
              value={area}
              onChange={(e)=> setArea(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-700"
            >
              <option value="">Todas</option>
              {ALLOWED_AREAS.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600 dark:text-slate-300">Persona:</label>
            <input
              value={person}
              onChange={(e)=> setPerson(e.target.value)}
              placeholder="Código o id:..."
              className="w-56 rounded-md border border-gray-300 px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-700"
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">Cargando…</div>
      )}
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200 dark:border-rose-900">Error: {error}</div>
      )}

      {metrics && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <StatCard label="% cumplimiento tareas" value={Number(metrics.tasks.completionRatePct.toFixed(0))} description="Promedio período" />
            <StatCard label="% jornadas 100% tareas" value={Number(metrics.tasks.fullyCompletedPct.toFixed(0))} description="Todas las tareas hechas" />
            <StatCard label="Primera tarea (prom.)" value={Number((metrics.tasks.timeToFirstTaskMin || 0).toFixed(0))} description={formatMinutes(metrics.tasks.timeToFirstTaskMin)} />
            <StatCard label="Última tarea (prom.)" value={Number((metrics.tasks.timeToLastTaskMin || 0).toFixed(0))} description={formatMinutes(metrics.tasks.timeToLastTaskMin)} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <div className="text-sm font-semibold mb-2">Cumplimiento global</div>
              <SimpleDonut data={compDonut} />
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <div className="text-sm font-semibold mb-2">Top tareas más omitidas</div>
              <TopIncompleteTasksBar data={metrics.tasks.topIncompleteTasks.map(t => ({ label: t.label, missingCount: t.missingCount }))} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
