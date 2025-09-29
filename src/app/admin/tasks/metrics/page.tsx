"use client";
import React, { useEffect, useMemo, useState } from "react";
import { ALLOWED_AREAS } from "@/lib/areas";

type Period = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

// Métricas de tareas originales dependían del endpoint de asistencia removido.

// Componentes de gráficos eliminados temporalmente.

// Helpers de formato eliminados (ya no se usan sin métricas)

export default function TasksMetricsPage() {
  const [period, setPeriod] = useState<Period>('today');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [area, setArea] = useState<string>("");
  const [person, setPerson] = useState<string>("");
  // estado de métricas eliminado

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

  useEffect(() => { setLoading(false); }, [query]);

  // donut eliminado

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
  <h1 className="text-2xl font-semibold">Métricas de Tareas (desactivadas)</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600 dark:text-slate-300">Período:</label>
            <select
              className="input px-3 py-1 text-sm"
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
              <input type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)} className="input-sm" />
              <label>Hasta</label>
              <input type="date" value={endDate} onChange={(e)=>setEndDate(e.target.value)} className="input-sm" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600 dark:text-slate-300">Área:</label>
            <select
              value={area}
              onChange={(e)=> setArea(e.target.value)}
              className="input px-3 py-1 text-sm"
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
              className="input w-56 px-3 py-1 text-sm"
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

      <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-sm text-slate-600 dark:text-slate-300">Las métricas agregadas han sido desactivadas temporalmente.</div>
    </div>
  );
}
