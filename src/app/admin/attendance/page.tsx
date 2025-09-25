"use client";
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import StatCard from "@/app/admin/StatCard";
import { ALLOWED_AREAS } from "@/lib/areas";

type Period = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

type Metrics = {
  ok?: boolean;
  period: { name: Period; startDate: string; endDate: string };
  attendance: {
    uniquePersons: number;
    totals: { IN: number; OUT: number };
    completedDaysPct: number;
    avgDurationMin: number | null;
    heatmapByHour: Array<{ hour: number; in: number; out: number }>;
    byArea: Array<{ area: string | null; present: number; completedPct: number }>;
  };
  tasks: {
    completionRatePct: number;
    fullyCompletedPct: number;
    topIncompleteTasks: Array<{ taskId: string; label: string; missingCount: number }>;
    timeToFirstTaskMin: number | null;
    timeToLastTaskMin: number | null;
  };
  series: { byDay: Array<{ day: string; in: number; out: number; uniquePersons: number; avgDurationMin: number | null; completionRatePct: number }> };
};

type TableRow = {
  day: string;
  personCode: string;
  personName: string;
  area: string | null;
  firstIn: string | null;
  lastOut: string | null;
  durationMin: number | null;
  doneCount: number;
  totalCount: number;
  completionPct: number;
  status: string;
};

type TableResp = { ok: boolean; rows: TableRow[]; page: number; pageSize: number; total: number; totalPages: number };

// Dynamic charts (no SSR)
const TimeSeries = dynamic(() => import("@/components/charts/TimeSeries").then(m => m.TimeSeries), { ssr: false });
const HoursStackedBar = dynamic(() => import("@/components/charts/HoursStackedBar").then(m => m.HoursStackedBar), { ssr: false });
const TopIncompleteTasksBar = dynamic(() => import("@/components/charts/TopIncompleteTasksBar").then(m => m.TopIncompleteTasksBar), { ssr: false });
const MiniBar = dynamic(() => import("@/components/charts/MiniBar").then(m => m.MiniBar), { ssr: false });
const SimpleDonut = dynamic(() => import("@/components/charts/SimpleDonut").then(m => m.SimpleDonut), { ssr: false });

function formatMinutes(min: number | null | undefined) {
  if (min == null) return "-";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function pct(n: number, digits = 0) {
  return `${n.toFixed(digits)}%`;
}

export default function AdminAttendancePage() {
  const [period, setPeriod] = useState<Period>('today');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [tick, setTick] = useState(0); // refresh trigger on SSE

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [table, setTable] = useState<TableResp | null>(null);
  const [area, setArea] = useState<string>("");
  const [person, setPerson] = useState<string>("");
  // Lista compacta de IN/OUT por persona para un solo día
  const [ioRows, setIoRows] = useState<TableRow[] | null>(null);

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

  // Load metrics
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
  }, [query, tick]);

  // Load table
  useEffect(() => {
    let cancelled = false;
    const p = new URLSearchParams();
    p.set('period', period);
    if (period === 'custom') {
      if (startDate) p.set('startDate', startDate);
      if (endDate) p.set('endDate', endDate);
    }
    p.set('page', String(page));
    p.set('pageSize', String(pageSize));
    if (area) p.set('area', area);
    if (person) p.set('person', person);
    fetch(`/api/admin/attendance/table?${p.toString()}`)
      .then(r => r.json())
      .then(j => { if (cancelled) return; if (j?.ok) setTable(j as TableResp); })
      .catch(() => {})
      .finally(() => {});
    return () => { cancelled = true; };
  }, [period, startDate, endDate, page, pageSize, area, person, tick]);

  // If switching period, reset pagination
  useEffect(() => { setPage(1); }, [period, startDate, endDate, area, person]);

  // Cargar lista compacta de IN/OUT cuando el rango es de un solo día (hoy/ayer o custom 1 día)
  useEffect(() => {
    let cancelled = false;
    setIoRows(null);
    const isSingleDay = metrics && metrics.period && metrics.period.startDate === metrics.period.endDate;
    if (!isSingleDay) return;
    const p = new URLSearchParams();
    p.set('period', period);
    if (period === 'custom') {
      if (startDate) p.set('startDate', startDate);
      if (endDate) p.set('endDate', endDate);
    }
    // Traer suficientes filas para cubrir todas las personas del día
    p.set('page', '1');
    p.set('pageSize', '200');
    if (area) p.set('area', area);
    if (person) p.set('person', person);
    fetch(`/api/admin/attendance/table?${p.toString()}`)
      .then(r => r.json())
      .then(j => { if (cancelled) return; if (j?.ok) setIoRows((j.rows || []) as TableRow[]); })
      .catch(() => {})
      .finally(() => {});
    return () => { cancelled = true; };
  }, [metrics, period, startDate, endDate, area, person, tick]);

  // Live updates: listen to task status changes and refresh
  useEffect(() => {
    let es: EventSource | null = null;
    let t: any = null;
    let closed = false;
    const bump = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => { if (!closed) setTick(v => v + 1); }, 400);
    };
    try {
      es = new EventSource('/api/events/tasks');
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data || '{}');
          if (data && data.type === 'task-updated') bump();
        } catch {}
      };
      es.onerror = () => { /* ignore transient errors */ };
    } catch {}
    return () => { closed = true; if (t) clearTimeout(t); if (es) es.close(); };
  }, []);

  const compDonut = useMemo(() => {
    if (!metrics) return [] as Array<{ name: string; value: number; color?: string }>;
    const done = Math.round(metrics.tasks.completionRatePct);
    return [
      { name: 'Completado', value: done, color: '#10b981' },
      { name: 'Pendiente', value: Math.max(0, 100 - done), color: '#ef4444' },
    ];
  }, [metrics]);

  // Format HH:mm in Peru timezone for display
  const fmtHHmmLima = (v: string | Date | null | undefined): string => {
    if (!v) return '-';
    const d = v instanceof Date ? v : new Date(v);
    try {
      return new Intl.DateTimeFormat('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'America/Lima',
      }).format(d);
    } catch {
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
  <h1 className="text-2xl font-semibold">Control de Asistencia — Dashboard</h1>
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
            <StatCard label="Personas presentes" value={metrics.attendance.uniquePersons} description="Únicos con IN" />
            <StatCard label="IN" value={metrics.attendance.totals.IN} description="Total escaneos IN" />
            <StatCard label="OUT" value={metrics.attendance.totals.OUT} description="Total escaneos OUT" />
            <StatCard label="% jornadas completas" value={Number(metrics.attendance.completedDaysPct.toFixed(0))} description="IN y OUT en el día" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <StatCard label="Duración promedio" value={Number((metrics.attendance.avgDurationMin || 0).toFixed(0))} description={formatMinutes(metrics.attendance.avgDurationMin)} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <div className="text-sm font-semibold mb-2">Serie diaria</div>
              <TimeSeries data={metrics.series.byDay.map(d => ({ ...d, completionRatePct: Number(d.completionRatePct.toFixed(0)) }))} />
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <div className="text-sm font-semibold mb-2">Por área (presentes)</div>
              <MiniBar data={(metrics.attendance.byArea || []).map(a => ({ name: a.area || 'Sin área', value: a.present }))} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <div className="text-sm font-semibold mb-2">Actividad por hora (Lima)</div>
              <HoursStackedBar data={metrics.attendance.heatmapByHour} />
            </div>
            {/* Tareas separadas al dashboard de tareas */}
          </div>

          {/* Ingresos / Salidas del día (si el período es de un solo día) */}
          {metrics.period.startDate === metrics.period.endDate && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                <div className="text-sm font-semibold mb-2">Ingresos (primer IN por persona)</div>
                <div className="max-h-80 overflow-auto text-sm">
                  <div className="overflow-x-auto">
                  <table className="min-w-[1000px] w-full">
                    <thead>
                      <tr className="text-left text-xs text-slate-500">
                        <th className="py-1 px-2">Hora</th>
                        <th className="py-1 px-2">Persona</th>
                        <th className="py-1 px-2">Área</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(ioRows || [])
                        .filter(r => !!r.firstIn)
                        .sort((a, b) => new Date(a.firstIn || 0).getTime() - new Date(b.firstIn || 0).getTime())
                        .map((r, i) => (
                          <tr key={`in-${i}`} className="border-b border-slate-100 dark:border-slate-800">
                            <td className="py-1 px-2 whitespace-nowrap">{fmtHHmmLima(r.firstIn)}</td>
                            <td className="py-1 px-2 whitespace-nowrap">{r.personName} <span className="text-xs text-slate-500">({r.personCode})</span></td>
                            <td className="py-1 px-2 whitespace-nowrap">{r.area || '-'}</td>
                          </tr>
                        ))}
                      {ioRows && ioRows.filter(r => !!r.firstIn).length === 0 && (
                        <tr><td className="py-2 px-2 text-slate-500" colSpan={3}>Sin ingresos registrados</td></tr>
                      )}
                    </tbody>
                  </table>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                <div className="text-sm font-semibold mb-2">Salidas (último OUT por persona)</div>
                <div className="max-h-80 overflow-auto text-sm">
                  <div className="overflow-x-auto">
                  <table className="min-w-[1000px] w-full">
                    <thead>
                      <tr className="text-left text-xs text-slate-500">
                        <th className="py-1 px-2">Hora</th>
                        <th className="py-1 px-2">Persona</th>
                        <th className="py-1 px-2">Área</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(ioRows || [])
                        .filter(r => !!r.lastOut)
                        .sort((a, b) => new Date(b.lastOut || 0).getTime() - new Date(a.lastOut || 0).getTime())
                        .map((r, i) => (
                          <tr key={`out-${i}`} className="border-b border-slate-100 dark:border-slate-800">
                            <td className="py-1 px-2 whitespace-nowrap">{fmtHHmmLima(r.lastOut)}</td>
                            <td className="py-1 px-2 whitespace-nowrap">{r.personName} <span className="text-xs text-slate-500">({r.personCode})</span></td>
                            <td className="py-1 px-2 whitespace-nowrap">{r.area || '-'}</td>
                          </tr>
                        ))}
                      {ioRows && ioRows.filter(r => !!r.lastOut).length === 0 && (
                        <tr><td className="py-2 px-2 text-slate-500" colSpan={3}>Sin salidas registradas</td></tr>
                      )}
                    </tbody>
                  </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="p-4 flex items-center justify-between">
              <div className="text-sm font-semibold">Resumen por persona / día</div>
              <div className="flex items-center gap-2 text-xs">
                <label>Filas por página</label>
                <select className="rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1" value={pageSize} onChange={(e)=>setPageSize(Number(e.target.value)||20)}>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2 px-3">Día</th>
                    <th className="py-2 px-3">Persona</th>
                    <th className="py-2 px-3">Área</th>
                    <th className="py-2 px-3">IN</th>
                    <th className="py-2 px-3">OUT</th>
                    <th className="py-2 px-3">Duración</th>
                    <th className="py-2 px-3">Tareas</th>
                    <th className="py-2 px-3">% Cumpl.</th>
                    <th className="py-2 px-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {(table?.rows || []).map((r, i) => (
                    <tr key={`${r.day}-${r.personCode}-${i}`} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 px-3 whitespace-nowrap">{r.day}</td>
                      <td className="py-2 px-3 whitespace-nowrap">{r.personName} <span className="text-xs text-slate-500">({r.personCode})</span></td>
                      <td className="py-2 px-3 whitespace-nowrap">{r.area || '-'}</td>
                      <td className="py-2 px-3 whitespace-nowrap">{fmtHHmmLima(r.firstIn)}</td>
                      <td className="py-2 px-3 whitespace-nowrap">{fmtHHmmLima(r.lastOut)}</td>
                      <td className="py-2 px-3 whitespace-nowrap">{formatMinutes(r.durationMin)}</td>
                      <td className="py-2 px-3 whitespace-nowrap">{r.doneCount}/{r.totalCount}</td>
                      <td className="py-2 px-3 whitespace-nowrap">{pct(r.completionPct)}</td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${r.status === 'Completa' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{r.status}</span>
                      </td>
                    </tr>
                  ))}
                  {table && table.rows.length === 0 && (
                    <tr><td className="py-3 px-3 text-slate-500" colSpan={9}>Sin datos</td></tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
            <div className="p-3 flex items-center justify-between text-sm">
              <div className="text-slate-500">Página {table?.page || page} de {table?.totalPages || 1} — {table?.total || 0} filas</div>
              <div className="flex items-center gap-2">
                <button className="btn-secondary px-3 py-1 rounded disabled:opacity-50" disabled={(table?.page || page) <= 1} onClick={()=> setPage((p)=> Math.max(1, p - 1))}>Anterior</button>
                <button className="btn px-3 py-1 rounded disabled:opacity-50" disabled={(table?.page || page) >= (table?.totalPages || 1)} onClick={()=> setPage((p)=> (table?.totalPages ? Math.min(table.totalPages, p+1) : p+1))}>Siguiente</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
