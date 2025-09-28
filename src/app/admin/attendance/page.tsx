"use client";
import React, { useEffect, useMemo, useState } from "react";
import { ALLOWED_AREAS } from "@/lib/areas";

type Period = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

// Métricas eliminadas: solo mantenemos la tabla agregada por persona/día.

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
  incomplete?: boolean;
};

type TableResp = { ok: boolean; rows: TableRow[]; page: number; pageSize: number; total: number; totalPages: number };

// (Componentes de gráficos eliminados con métricas)

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
  const [tick, setTick] = useState(0); // refresh trigger para eventos (tareas) solo para refrescar tabla

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [table, setTable] = useState<TableResp | null>(null);
  const [area, setArea] = useState<string>("");
  const [person, setPerson] = useState<string>("");
  // (Lista IN/OUT eliminada)

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

  // Eliminado fetch de métricas.
  useEffect(() => { setLoading(false); }, [query, tick]);

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

  // Lista IN/OUT eliminada junto con métricas.

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

  // Donut eliminado.

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

  // ================== Métricas derivadas (cliente) ==================
  const metrics = useMemo(() => {
    const rows = table?.rows || [];
    if (!rows.length) return null;
    // Convertir a minutos del día en zona horaria Lima para reflejar horario local real
    const tz = 'America/Lima';
    const toMinutesOfDayLocal = (iso: string): number | null => {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return null;
      try {
        const parts = new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }).formatToParts(d);
        const hh = Number(parts.find(p=>p.type==='hour')?.value || '0');
        const mm = Number(parts.find(p=>p.type==='minute')?.value || '0');
        return hh*60 + mm;
      } catch {
        // Fallback simple estimando offset local del runtime (menos preciso si server en otra TZ)
        return d.getHours()*60 + d.getMinutes();
      }
    };
    let sumFirstIn = 0, countFirstIn = 0;
    let sumLastOut = 0, countLastOut = 0;
    let sumDuration = 0, countDuration = 0;
    let incompleteCount = 0;
    let totalEntradas = 0; // número de jornadas con al menos una entrada
    let totalSalidas = 0;  // número de jornadas con al menos una salida
    for (const r of rows) {
      if (r.firstIn) {
        const m = toMinutesOfDayLocal(r.firstIn);
        if (m != null) { sumFirstIn += m; countFirstIn++; }
        totalEntradas++;
      }
      if (r.lastOut) {
        const m2 = toMinutesOfDayLocal(r.lastOut);
        if (m2 != null) { sumLastOut += m2; countLastOut++; }
        totalSalidas++;
      }
      if (typeof r.durationMin === 'number') { sumDuration += r.durationMin; countDuration++; }
      if (r.incomplete) incompleteCount++;
    }
    const avgArrMin = countFirstIn ? sumFirstIn / countFirstIn : null;
    const avgOutMin = countLastOut ? sumLastOut / countLastOut : null;
    const avgDur = countDuration ? sumDuration / countDuration : null;
    const formatAvgClock = (minutesOfDay: number | null) => {
      if (minutesOfDay == null) return '-';
      // Redondeamos a minuto más cercano y manejamos rollover (mm == 60)
      let total = Math.round(minutesOfDay);
      let hh = Math.floor(total / 60);
      let mm = total - hh * 60;
      if (mm === 60) { hh += 1; mm = 0; }
      if (hh >= 24) hh = hh % 24; // seguridad por si promedio cruza medianoche
      return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
    };
    return {
      totalRows: rows.length,
      incompleteCount,
      incompletePct: rows.length ? (100*incompleteCount)/rows.length : 0,
      avgFirstIn: formatAvgClock(avgArrMin),
      avgLastOut: formatAvgClock(avgOutMin),
      avgDurationMin: avgDur,
      totalEntradas,
      totalSalidas,
    };
  }, [table]);

  const DurationCard = ({ label, value }: { label: string; value: number | null | undefined }) => (
    <div className="p-4 rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 flex flex-col gap-1">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-xl font-bold text-slate-800 dark:text-slate-100">{value != null ? formatMinutes(value) : '—'}</div>
    </div>
  );
  const SimpleCard = ({ label, value, suffix, color }: { label: string; value: string | number; suffix?: string; color?: string }) => (
    <div className="p-4 rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 flex flex-col gap-1">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-xl font-bold ${color || 'text-slate-900 dark:text-slate-100'}`}>{value}{suffix||''}</div>
    </div>
  );

  // ================== /Métricas derivadas ==================

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
  <h1 className="text-2xl font-semibold">Control de Asistencia — Tabla</h1>
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

      {/* MÉTRICAS (derivadas en cliente) */}
      {metrics && !loading && !error && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-sm font-semibold tracking-wide text-slate-700 dark:text-slate-200">Métricas del período (derivadas)</h2>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Basado en {metrics.totalRows} fila{metrics.totalRows===1?'':'s'} visibles en la tabla</div>
          </div>
          <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-8">
            <SimpleCard label="Registros" value={metrics.totalRows} />
            <SimpleCard label="Incompletas" value={metrics.incompleteCount} />
            <SimpleCard label="% Incompletas" value={metrics.incompletePct.toFixed(1)} suffix="%" color="text-rose-600 dark:text-rose-400" />
            <SimpleCard label="Entradas" value={metrics.totalEntradas} />
            <SimpleCard label="Salidas" value={metrics.totalSalidas} />
            <SimpleCard label="Prom. Llegada" value={metrics.avgFirstIn} />
            <SimpleCard label="Prom. Salida" value={metrics.avgLastOut} />
            <DurationCard label="Prom. Duración" value={metrics.avgDurationMin ?? null} />
          </div>
          {/* Gráficos eliminados (distribución de llegadas / incompletas por área) para simplificar y corregir foco en promedios */}
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
                    <th className="py-2 px-3">Estado</th>
                    <th className="py-2 px-3">Tareas</th>
                    <th className="py-2 px-3">% Cumpl.</th>
                  </tr>
                </thead>
                <tbody>
                  {(table?.rows || []).map((r, i) => (
                    <tr key={`${r.day}-${r.personCode}-${i}`} className={`border-b border-slate-100 dark:border-slate-800 ${r.incomplete ? 'bg-rose-50 dark:bg-rose-950/20' : ''}`}>
                      <td className="py-2 px-3 whitespace-nowrap">{r.day}</td>
                      <td className="py-2 px-3 whitespace-nowrap">{r.personName} <span className="text-xs text-slate-500">({r.personCode})</span></td>
                      <td className="py-2 px-3 whitespace-nowrap">{r.area || '-'}</td>
                      <td className="py-2 px-3 whitespace-nowrap">{fmtHHmmLima(r.firstIn)}</td>
                      <td className="py-2 px-3 whitespace-nowrap">{fmtHHmmLima(r.lastOut)}</td>
                      <td className="py-2 px-3 whitespace-nowrap">{formatMinutes(r.durationMin)}</td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {r.incomplete ? (
                          <span title="Jornada no completada (sin salida registrada)" className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200">
                            <span className="font-bold">!</span> Falta salida
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">{r.doneCount}/{r.totalCount}</td>
                      <td className="py-2 px-3 whitespace-nowrap">{pct(r.completionPct)}</td>
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
      </div>
  );
}
