"use client";
import { useEffect, useMemo, useState } from 'react';

type Period = 'today' | 'yesterday';

interface TableRow {
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
}
interface TableResp { ok: boolean; rows: TableRow[]; page: number; pageSize: number; total: number; totalPages: number; }

function formatMinutes(min: number | null | undefined) {
  if (min == null) return '-';
  const h = Math.floor(min / 60); const m = Math.round(min % 60);
  if (h <= 0) return `${m}m`; return `${h}h ${m}m`;
}
function fmtTime(v: string | null) {
  if (!v) return '-'; const d = new Date(v); const hh = String(d.getHours()).padStart(2,'0'); const mm = String(d.getMinutes()).padStart(2,'0'); return `${hh}:${mm}`;
}

export default function StaffAttendanceLitePage() {
  const [period, setPeriod] = useState<Period>('today');
  const [loading, setLoading] = useState(false);
  // Métricas eliminadas
  const [table, setTable] = useState<TableResp | null>(null);
  const [error, setError] = useState<string|null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [area, setArea] = useState('');
  const [person, setPerson] = useState('');

  const queryTable = useMemo(()=>{
    const p = new URLSearchParams(); p.set('period', period); p.set('page', String(page)); p.set('pageSize', String(pageSize)); if (area) p.set('area', area); if (person) p.set('person', person); return p.toString();
  }, [period, page, pageSize, area, person]);

  // Eliminado fetch de métricas
  useEffect(()=>{ setLoading(false); }, [period, area, person]);
  useEffect(()=>{
    fetch(`/api/admin/attendance/table?${queryTable}`)
      .then(r=>r.json())
      .then(j=>{ if(j?.ok) setTable(j as TableResp); })
      .catch(()=>{});
  }, [queryTable]);

  useEffect(()=>{ setPage(1); }, [period, area, person]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-5">
        {/* Header & filters */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-slate-100">Control de Asistencia</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm -m-0.5">
              {/* Day navigation with arrows */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Ver día anterior"
                  onClick={()=> setPeriod(p=> p==='today' ? 'yesterday':'yesterday')}
                  disabled={period==='yesterday'}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <select
                  value={period}
                  onChange={e=>setPeriod(e.target.value as Period)}
                  className="h-8 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 min-w-[70px]"
                >
                  <option value="today">Hoy</option>
                  <option value="yesterday">Ayer</option>
                </select>
                <button
                  type="button"
                  aria-label="Ver día siguiente"
                  onClick={()=> setPeriod('today')}
                  disabled={period==='today'}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input value={area} onChange={e=>setArea(e.target.value)} placeholder="Área" className="h-8 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 w-28 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                <input value={person} onChange={e=>setPerson(e.target.value)} placeholder="Código o persona" className="h-8 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 w-36 sm:w-44 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            </div>
          </div>
          <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Vista ligera solo lectura. Usa filtros arriba. En móviles puedes deslizar la tabla horizontalmente o ver la versión compacta por tarjetas.</div>
        </div>

        {loading && <div className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-sm">Cargando…</div>}
  {error && <div className="alert alert-danger text-sm">Error: {error}</div>}

        {/* Desktop table */}
        <div className="hidden md:block rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="p-3 text-sm font-semibold flex items-center justify-between">
            <span>Resumen por persona</span>
            <span className="text-[11px] text-slate-500">{table?.total || 0} registros</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[1000px] w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-200 dark:border-slate-700 text-xs">
                  <th className="py-2 px-3">Día</th>
                  <th className="py-2 px-3">Persona</th>
                  <th className="py-2 px-3">Área</th>
                  <th className="py-2 px-3">ENTRADA</th>
                  <th className="py-2 px-3">SALIDA</th>
                  <th className="py-2 px-3">Duración</th>
                  <th className="py-2 px-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {(table?.rows || []).map((r,i)=>(
                  <tr key={`${r.day}-${r.personCode}-${i}`} className={`border-b border-slate-100 dark:border-slate-800 ${r.incomplete ? 'bg-danger-soft/70' : ''}`}>
                    <td className="py-1 px-3 whitespace-nowrap">{r.day}</td>
                    <td className="py-1 px-3 whitespace-nowrap">{r.personName} <span className="text-xs text-slate-500">({r.personCode})</span></td>
                    <td className="py-1 px-3 whitespace-nowrap">{r.area || '-'}</td>
                    <td className="py-1 px-3 whitespace-nowrap">{fmtTime(r.firstIn)}</td>
                    <td className="py-1 px-3 whitespace-nowrap">{fmtTime(r.lastOut)}</td>
                    <td className="py-1 px-3 whitespace-nowrap">{formatMinutes(r.durationMin)}</td>
                    <td className="py-1 px-3 whitespace-nowrap">
                      {r.incomplete && (
                        <span title="Jornada no completada (sin salida registrada)" className="badge-danger inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium"><span className="font-bold">!</span> Incompleta</span>
                      )}
                      {!r.incomplete && (
                        <span className="text-[10px] text-soft">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {table && table.rows.length === 0 && (
                  <tr><td className="py-3 px-3 text-slate-500" colSpan={7}>Sin datos</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 flex items-center justify-between text-xs">
            <div className="text-soft">Página {table?.page || page} de {table?.totalPages || 1}</div>
            <div className="flex items-center gap-2">
              <button disabled={(table?.page||page) <= 1} onClick={()=> setPage(p=> Math.max(1,p-1))} className="h-7 px-2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] disabled:opacity-40">Anterior</button>
              <button disabled={(table?.page||page) >= (table?.totalPages||1)} onClick={()=> setPage(p=> (table?.totalPages? Math.min(table.totalPages,p+1):p+1))} className="h-7 px-2 rounded bg-slate-800 text-white dark:bg-blue-600 text-[11px] disabled:opacity-40">Siguiente</button>
            </div>
          </div>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden space-y-3">
          <div className="text-xs font-medium text-slate-600 dark:text-slate-300">Resumen por persona</div>
          {(table?.rows || []).map((r,i)=>(
            <div key={`${r.day}-${r.personCode}-m-${i}`} className={`rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-sm flex flex-col gap-2 ${r.incomplete ? 'ring-1 ring-rose-300 dark:ring-rose-600/50' : ''}`}> 
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{r.personName}</div>
                  <div className="text-[11px] text-slate-500 truncate">{r.personCode} · {r.day}</div>
                </div>
                <div>
                  {r.incomplete ? (
                    <span className="badge-danger inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium">Incompleta</span>
                  ) : (
                    <span className="text-[10px] text-soft">—</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                <div><span className="text-slate-500">Área:</span> {r.area || '-'}</div>
                <div><span className="text-slate-500">Duración:</span> {formatMinutes(r.durationMin)}</div>
                <div><span className="text-slate-500">ENTRADA:</span> {fmtTime(r.firstIn)}</div>
                <div><span className="text-slate-500">SALIDA:</span> {fmtTime(r.lastOut)}</div>
              </div>
            </div>
          ))}
          {table && table.rows.length === 0 && (
            <div className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-xs text-slate-500">Sin datos</div>
          )}
          {/* Mobile pagination */}
          <div className="flex items-center justify-between pt-2 text-[11px] text-slate-500">
            <div>Pág. {table?.page || page}/{table?.totalPages || 1}</div>
            <div className="flex items-center gap-1">
              <button disabled={(table?.page||page) <= 1} onClick={()=> setPage(p=> Math.max(1,p-1))} className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 disabled:opacity-40" aria-label="Anterior">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <button disabled={(table?.page||page) >= (table?.totalPages||1)} onClick={()=> setPage(p=> (table?.totalPages? Math.min(table.totalPages,p+1):p+1))} className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 disabled:opacity-40" aria-label="Siguiente">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
