"use client";
import { useState, useEffect } from 'react';
import StatCard from '@/app/admin/StatCard';

// Reutiliza el endpoint /api/admin/metrics para staff/admin y /api/system/tokens/period-metrics para user session.
// Para simplificar aquí usaremos /api/admin/metrics (ya normalizado) y caeremos a system si 401.

export function PeriodMetricsPanel({ initialPeriod = 'today' }: { initialPeriod?: string }) {
  const [period, setPeriod] = useState<string>(initialPeriod);
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(p = period) {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`/api/admin/metrics?period=${p}`);
      if (r.status === 401 || r.status === 403) {
        // fallback a endpoint público staff
        const r2 = await fetch(`/api/system/tokens/period-metrics?period=${p}`);
        const j2 = await r2.json();
        if (!r2.ok) throw new Error(j2.message || 'Error');
  // Normalizar estructura (available se aproxima con activos dentro del período legacy = j2.totals.active)
  setData({ period: { name: p, tokens: j2.totals.total, redeemed: j2.totals.redeemed, rouletteSpins: j2.spins, available: j2.totals.active } });
      } else {
        const j = await r.json();
        if (!r.ok) throw new Error(j.message || 'Error');
        setData(j);
      }
    } catch (e:any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) { const p = e.target.value; setPeriod(p); load(p); }

  useEffect(() => { load('today'); // ensure default
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const metrics = data || { period: { tokens: 0, redeemed: 0, rouletteSpins: 0, available: 0, name: period } };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-100 dark:border-slate-700 mt-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="text-lg font-semibold">Métricas del período</h3>
        <div className="flex items-center gap-2 text-xs">
          <select value={period} onChange={onChange} className="input !h-8 !text-xs">
            <option value="today">Hoy</option>
            <option value="yesterday">Ayer</option>
            <option value="day_before_yesterday">Anteayer</option>
            <option value="this_week">Esta semana</option>
            <option value="last_week">Semana pasada</option>
            <option value="this_month">Este mes</option>
            <option value="last_month">Mes pasado</option>
          </select>
          <button onClick={()=>load()} className="btn-outline !px-2 !py-1" disabled={loading}>{loading? '...' : 'Refrescar'}</button>
        </div>
      </div>
      {error && <div className="text-xs text-red-600 mb-3">{error}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Tokens Creados" value={metrics.period.tokens} description="En este período" compact icon={<svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5 text-slate-400' viewBox='0 0 24 24' fill='none' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 6v12m6-6H6'/></svg>} />
        <StatCard label="Tokens Canjeados" value={metrics.period.redeemed} description="En este período" compact color="text-emerald-600" icon={<svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5 text-emerald-500' viewBox='0 0 24 24' fill='none' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7'/></svg>} />
        <StatCard label="Tokens Disponibles" value={metrics.period.available} description="Sirven dentro del período" compact color="text-indigo-600" icon={<svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5 text-indigo-500' viewBox='0 0 24 24' fill='none' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'/></svg>} />
        <StatCard label="Giros Ruleta" value={metrics.period.rouletteSpins} description="En este período" compact color="text-fuchsia-600" icon={<svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5 text-fuchsia-500' viewBox='0 0 24 24' fill='none' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'/></svg>} />
      </div>
    </div>
  );
}
