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
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">Control de Asistencia</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <select value={period} onChange={e=>setPeriod(e.target.value as Period)} className="rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1">
              <option value="today">Hoy</option>
              <option value="yesterday">Ayer</option>
            </select>
            <input value={area} onChange={e=>setArea(e.target.value)} placeholder="Área..." className="rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1 w-32" />
            <input value={person} onChange={e=>setPerson(e.target.value)} placeholder="Código/persona" className="rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1 w-40" />
          </div>
        </div>
  <div className="text-xs text-slate-500 dark:text-slate-400">Tabla en tiempo real (solo lectura) usando el mismo origen que el panel admin. Filtra por período, área o persona.</div>
        {loading && <div className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-sm">Cargando…</div>}
        {error && <div className="rounded border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-3 text-sm text-rose-700 dark:text-rose-200">Error: {error}</div>}
        {/* Métricas eliminadas */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="p-3 text-sm font-semibold">Resumen por persona</div>
          <div className="overflow-x-auto">
            <table className="min-w-[1000px] w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-200 dark:border-slate-700 text-xs">
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
                {(table?.rows || []).map((r,i)=>(
                  <tr key={`${r.day}-${r.personCode}-${i}`} className={`border-b border-slate-100 dark:border-slate-800 ${r.incomplete ? 'bg-rose-50 dark:bg-rose-950/20' : ''}`}>
                    <td className="py-1 px-3 whitespace-nowrap">{r.day}</td>
                    <td className="py-1 px-3 whitespace-nowrap">{r.personName} <span className="text-xs text-slate-500">({r.personCode})</span></td>
                    <td className="py-1 px-3 whitespace-nowrap">{r.area || '-'}</td>
                    <td className="py-1 px-3 whitespace-nowrap">{fmtTime(r.firstIn)}</td>
                    <td className="py-1 px-3 whitespace-nowrap">{fmtTime(r.lastOut)}</td>
                    <td className="py-1 px-3 whitespace-nowrap">{formatMinutes(r.durationMin)}</td>
                    <td className="py-1 px-3 whitespace-nowrap">{r.doneCount}/{r.totalCount}</td>
                    <td className="py-1 px-3 whitespace-nowrap">{Math.round(r.completionPct)}%</td>
                    <td className="py-1 px-3 whitespace-nowrap">
                      {r.incomplete && (
                        <span title="Jornada no completada (sin salida registrada)" className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200"><span className="font-bold">!</span> Incompleta</span>
                      )}
                      {!r.incomplete && (
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${r.status === 'Completa' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{r.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {table && table.rows.length === 0 && (
                  <tr><td className="py-3 px-3 text-slate-500" colSpan={9}>Sin datos</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 flex items-center justify-between text-xs">
            <div className="text-slate-500">Página {table?.page || page} de {table?.totalPages || 1}</div>
            <div className="flex items-center gap-2">
              <button disabled={(table?.page||page) <= 1} onClick={()=> setPage(p=> Math.max(1,p-1))} className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 disabled:opacity-40">Anterior</button>
              <button disabled={(table?.page||page) >= (table?.totalPages||1)} onClick={()=> setPage(p=> (table?.totalPages? Math.min(table.totalPages,p+1):p+1))} className="px-2 py-1 rounded bg-slate-800 text-white dark:bg-blue-600 disabled:opacity-40">Siguiente</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
