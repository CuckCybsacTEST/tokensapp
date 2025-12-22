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
  isPast?: boolean;
};

type TableResp = { ok: boolean; rows: TableRow[]; page: number; pageSize: number; total: number; totalPages: number };

type MetricsResp = {
  ok: boolean;
  summary: {
    totalShifts: number;
    completeShifts: number;
    incompleteShifts: number;
    completionRate: number;
    avgDurationMin: number;
    totalUniquePeople: number;
    totalBusinessDays: number;
  };
  topAbsences: { personCode: string; personName: string; daysAttended: number; daysMissed: number }[];
  topIncomplete: { personCode: string; personName: string; incompleteCount: number }[];
  topComplete: { personCode: string; personName: string; completeCount: number }[];
  topDuration: { personCode: string; personName: string; totalDurationMin: number; avgDurationMin: number }[];
};

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

export function AdminAttendancePage() {
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
  const [metricsData, setMetricsData] = useState<MetricsResp | null>(null);
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

  // Fetch metrics
  useEffect(() => {
    const p = new URLSearchParams();
    p.set('period', period);
    if (period === 'custom') {
      if (startDate) p.set('startDate', startDate);
      if (endDate) p.set('endDate', endDate);
    }
    fetch(`/api/admin/attendance/metrics?${p.toString()}`)
      .then(r => r.json())
      .then(j => { if (j?.ok) setMetricsData(j as MetricsResp); })
      .catch(console.error);
  }, [period, startDate, endDate, tick]);

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
  // Reemplazado por métricas de servidor
  const metrics = null; 

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
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <h1 className="text-xl sm:text-2xl font-semibold">Control de Asistencia — Tabla</h1>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">Período:</label>
            <select
              className="input px-3 py-2 text-sm w-full sm:w-auto"
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
              <div className="flex items-center gap-2">
                <label className="whitespace-nowrap">Desde</label>
                <input type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)} className="input-sm w-full sm:w-auto" />
              </div>
              <div className="flex items-center gap-2">
                <label className="whitespace-nowrap">Hasta</label>
                <input type="date" value={endDate} onChange={(e)=>setEndDate(e.target.value)} className="input-sm w-full sm:w-auto" />
              </div>
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">Área:</label>
            <select
              value={area}
              onChange={(e)=> setArea(e.target.value)}
              className="input px-3 py-2 text-sm w-full sm:w-auto"
            >
              <option value="">Todas</option>
              {ALLOWED_AREAS.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">Persona:</label>
            <input
              value={person}
              onChange={(e)=> setPerson(e.target.value)}
              placeholder="Código o id:..."
              className="input px-3 py-2 text-sm w-full sm:w-48 lg:w-56"
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">Cargando…</div>
      )}
      {error && (
        <div className="alert-danger">Error: {error}</div>
      )}

      {/* MÉTRICAS (servidor) */}
      {metricsData && !loading && !error && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-3 grid-cols-1 xs:grid-cols-2 sm:grid-cols-4">
            <SimpleCard label="Total Asistencias" value={metricsData.summary.totalShifts} suffix={` / ${metricsData.summary.totalBusinessDays} días hábiles`} />
            <SimpleCard label="Tasa Completitud" value={metricsData.summary.completionRate.toFixed(1)} suffix="%" color={metricsData.summary.completionRate < 90 ? 'text-warning' : 'text-success'} />
            <SimpleCard label="Faltas de Salida" value={metricsData.summary.incompleteShifts} color="text-danger" />
            <DurationCard label="Promedio Horas" value={metricsData.summary.avgDurationMin} />
          </div>

          {/* Rankings */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
            {/* Top Absences */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <h3 className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-200">Top Ausencias (Días faltados)</h3>
              <div className="space-y-2">
                {metricsData.topAbsences.length === 0 ? <div className="text-xs text-soft">Sin datos</div> : 
                  metricsData.topAbsences.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm border-b border-slate-100 dark:border-slate-700 pb-2 last:border-0">
                      <div>
                        <div className="font-medium">{p.personName}</div>
                        <div className="text-xs text-soft">{p.personCode}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-danger">{p.daysMissed} días</div>
                        <div className="text-xs text-soft">Asistió {p.daysAttended}</div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Top Incomplete */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <h3 className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-200">Top Sin Marcar Salida</h3>
              <div className="space-y-2">
                {metricsData.topIncomplete.length === 0 ? <div className="text-xs text-soft">Nadie olvidó marcar salida</div> : 
                  metricsData.topIncomplete.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm border-b border-slate-100 dark:border-slate-700 pb-2 last:border-0">
                      <div>
                        <div className="font-medium">{p.personName}</div>
                        <div className="text-xs text-soft">{p.personCode}</div>
                      </div>
                      <div className="font-bold text-warning">{p.incompleteCount} veces</div>
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Top Complete */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <h3 className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-200">Top Marcado Salida</h3>
              <div className="space-y-2">
                {metricsData.topComplete.length === 0 ? <div className="text-xs text-soft">Sin datos</div> : 
                  metricsData.topComplete.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm border-b border-slate-100 dark:border-slate-700 pb-2 last:border-0">
                      <div>
                        <div className="font-medium">{p.personName}</div>
                        <div className="text-xs text-soft">{p.personCode}</div>
                      </div>
                      <div className="font-bold text-success">{p.completeCount} veces</div>
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Top Duration */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <h3 className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-200">Más Horas Trabajadas</h3>
              <div className="space-y-2">
                {metricsData.topDuration.length === 0 ? <div className="text-xs text-soft">Sin datos</div> : 
                  metricsData.topDuration.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm border-b border-slate-100 dark:border-slate-700 pb-2 last:border-0">
                      <div>
                        <div className="font-medium">{p.personName}</div>
                        <div className="text-xs text-soft">{p.personCode}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-success">{formatMinutes(p.totalDurationMin)}</div>
                        <div className="text-xs text-soft">Prom: {formatMinutes(p.avgDurationMin)}</div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </div>
      )}

  {/* Desktop table */}
  <div className="hidden md:block rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="p-4 flex items-center justify-between">
              <div className="text-sm font-semibold">Resumen por persona / día</div>
              <div className="flex items-center gap-2 text-xs">
                <label>Filas por página</label>
                <select className="input-xs" value={pageSize} onChange={(e)=>setPageSize(Number(e.target.value)||20)}>
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
                    <th className="py-2 px-3">ENTRADA</th>
                    <th className="py-2 px-3">SALIDA</th>
                    <th className="py-2 px-3">Duración</th>
                    <th className="py-2 px-3">Estado</th>
                    <th className="py-2 px-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(table?.rows || []).map((r, i) => (
                    <tr key={`${r.day}-${r.personCode}-${i}`} className={`border-b border-slate-100 dark:border-slate-800 ${r.incomplete ? 'bg-danger-soft' : ''}`}>
                      <td className="py-2 px-3 whitespace-nowrap">{r.day}</td>
                      <td className="py-2 px-3 whitespace-nowrap">{r.personName} <span className="text-xs text-soft">({r.personCode})</span></td>
                      <td className="py-2 px-3 whitespace-nowrap">{r.area || '-'}</td>
                      <td className="py-2 px-3 whitespace-nowrap">{fmtHHmmLima(r.firstIn)}</td>
                      <td className="py-2 px-3 whitespace-nowrap">{fmtHHmmLima(r.lastOut)}</td>
                      <td className="py-2 px-3 whitespace-nowrap">{formatMinutes(r.durationMin)}</td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {r.incomplete ? (
                          <span title={r.isPast === false ? "Jornada en curso (sin salida aún)" : "Jornada no completada (sin salida registrada)"} className="badge-warning inline-flex items-center gap-1">
                            <span className="font-bold">!</span> {r.isPast === false ? "En curso" : "Falta salida"}
                          </span>
                        ) : (
                          <span className="text-soft text-xs">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <button
                          onClick={async () => {
                            const allow = window.confirm(`¿Reiniciar jornada de ${r.personName} (${r.personCode}) del día ${r.day}? Esta acción elimina las marcas IN/OUT de ese businessDay.`);
                            if (!allow) return;
                            try {
                              const resp = await fetch('/api/admin/attendance/reset', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ personCode: r.personCode, day: r.day })
                              });
                              const json = await resp.json();
                              if (!resp.ok || !json?.ok) {
                                alert(`Error reiniciando: ${(json && (json.message || json.code)) || resp.status}`);
                                return;
                              }
                              setTick(v => v + 1); // refrescar tabla
                            } catch (e:any) {
                              alert('Error de red al reiniciar');
                            }
                          }}
                          className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >Reiniciar</button>
                      </td>
                    </tr>
                  ))}
                  {table && table.rows.length === 0 && (
                    <tr><td className="py-3 px-3 text-soft" colSpan={10}>Sin datos</td></tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
            <div className="p-3 flex items-center justify-between text-sm">
              <div className="text-soft">Página {table?.page || page} de {table?.totalPages || 1} — {table?.total || 0} filas</div>
              <div className="flex items-center gap-2">
                <button className="btn-secondary px-3 py-1 rounded disabled:opacity-50" disabled={(table?.page || page) <= 1} onClick={()=> setPage((p)=> Math.max(1, p - 1))}>Anterior</button>
                <button className="btn px-3 py-1 rounded disabled:opacity-50" disabled={(table?.page || page) >= (table?.totalPages || 1)} onClick={()=> setPage((p)=> (table?.totalPages ? Math.min(table.totalPages, p+1) : p+1))}>Siguiente</button>
              </div>
            </div>
        </div>
        {/* Mobile card list mirroring /u/attendance */}
        <div className="md:hidden space-y-3">
          <div className="text-sm font-medium text-soft">Resumen por persona / día</div>
    {(table?.rows || []).map((r,i)=>(
            <div key={`${r.day}-${r.personCode}-m-${i}`} className={`rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm flex flex-col gap-3 ${r.incomplete ? 'ring-1 ring-warning' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-base font-semibold truncate">{r.personName}</div>
                  <div className="text-sm text-soft truncate">{r.personCode} · {r.day}</div>
                </div>
                <div>
                  {r.incomplete ? (
                    <span className="badge-warning text-xs px-2 py-1">{r.isPast === false ? "En curso" : "Falta salida"}</span>
                  ) : (
                    <span className="badge-success text-xs px-2 py-1">OK</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div><span className="text-soft">Área:</span> <span className="font-medium">{r.area || '-'}</span></div>
                <div><span className="text-soft">Duración:</span> <span className="font-medium">{formatMinutes(r.durationMin)}</span></div>
                <div className="col-span-2 grid grid-cols-2 gap-x-4 gap-y-1">
                  <div><span className="text-soft">ENTRADA:</span> <span className="font-medium">{fmtHHmmLima(r.firstIn)}</span></div>
                  <div><span className="text-soft">SALIDA:</span> <span className="font-medium">{fmtHHmmLima(r.lastOut)}</span></div>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={async () => {
                    const allow = window.confirm(`¿Reiniciar jornada de ${r.personName} (${r.personCode}) del día ${r.day}? Esta acción elimina las marcas IN/OUT de ese businessDay.`);
                    if (!allow) return;
                    try {
                      const resp = await fetch('/api/admin/attendance/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personCode: r.personCode, day: r.day }) });
                      const json = await resp.json();
                      if (!resp.ok || !json?.ok) { alert(`Error reiniciando: ${(json && (json.message || json.code)) || resp.status}`); return; }
                      setTick(v => v + 1);
                    } catch { alert('Error de red al reiniciar'); }
                  }}
                  className="w-full text-sm px-4 py-2 rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-medium"
                >Reiniciar Jornada</button>
              </div>
            </div>
          ))}
          {table && table.rows.length === 0 && (
            <div className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-xs text-soft">Sin datos</div>
          )}
          <div className="flex items-center justify-between pt-2 text-[11px] text-soft">
            <div>Pág. {table?.page || page}/{table?.totalPages || 1}</div>
            <div className="flex items-center gap-2">
              <button disabled={(table?.page||page) <= 1} onClick={()=> setPage(p=> Math.max(1,p-1))} className="h-8 w-8 sm:h-7 sm:w-7 inline-flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700" aria-label="Anterior">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <button disabled={(table?.page||page) >= (table?.totalPages||1)} onClick={()=> setPage(p=> (table?.totalPages? Math.min(table.totalPages,p+1):p+1))} className="h-8 w-8 sm:h-7 sm:w-7 inline-flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700" aria-label="Siguiente">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
  );
}
