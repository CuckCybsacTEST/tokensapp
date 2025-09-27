'use client';
import React, { useEffect, useState } from 'react';

type Period = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month';

interface PeriodMetricsData {
  ok: boolean;
  period: string;
  startDay: string;
  endDay: string;
  totals: {
    total: number;          // tokens creados
    redeemed: number;       // canjeados
    revealed: number;       // revelados
  };
  spins: number;            // giros ruleta
}

export default function PeriodMetrics({ batchId }: { batchId?: string }) {
  const [period, setPeriod] = useState<Period>('today');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PeriodMetricsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(p = period, b = batchId) {
    setLoading(true); setError(null);
    try {
  const r = await fetch(`/api/system/tokens/period-metrics?period=${p}${b && b!=='ALL'?`&batchId=${encodeURIComponent(b)}`:''}` , { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.message || 'Error');
      setData(j);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ load('today', batchId); // initial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId]);

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const p = e.target.value as Period;
    setPeriod(p);
    load(p, batchId);
  }

  const totals = data?.totals;

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-100 dark:border-slate-700">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <h3 className="text-lg font-semibold">Métricas de periodo</h3>
        <div className="flex items-center gap-2 text-xs">
          <label className="flex items-center gap-1">Periodo:
            <select value={period} onChange={onChange} className="input !h-7 !text-xs">
              <option value="today">Hoy</option>
              <option value="yesterday">Ayer</option>
              <option value="this_week">Esta semana</option>
              <option value="last_week">Semana pasada</option>
              <option value="this_month">Este mes</option>
              <option value="last_month">Mes pasado</option>
            </select>
          </label>
          {data && <span className="opacity-60">{data.startDay === data.endDay ? data.startDay : `${data.startDay} → ${data.endDay}`}</span>}
          {period === 'today' || period === 'yesterday' ? (
            <span title="Usa 'business day' con corte horario (cutoff) igual que asistencia para agrupar eventos antes de la mañana en el día operativo correcto." className="inline-flex items-center rounded bg-slate-100 dark:bg-slate-700 px-2 py-1 text-[10px] font-medium text-slate-600 dark:text-slate-300">BD</span>
          ) : null}
          <button onClick={()=>load()} disabled={loading} className="btn-outline !px-2 !py-1">{loading ? '...' : 'Refrescar'}</button>
        </div>
      </div>
      {error && <div className="text-xs text-red-600 mb-3">{error}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Tokens Creados" value={totals?.total} loading={loading} icon="plus" />
        <MetricCard label="Tokens Canjeados" value={totals?.redeemed} accent="emerald" loading={loading} icon="check" />
        <MetricCard label="Tokens Revelados" value={totals?.revealed} accent="amber" loading={loading} icon="eye" />
        <MetricCard label="Giros Ruleta" value={data?.spins} accent="fuchsia" loading={loading} icon="spin" />
      </div>
    </div>
  );
}

function MetricCard({ label, value, accent, loading, icon }: { label: string; value: number | undefined; accent?: string; loading?: boolean; icon?: 'plus'|'check'|'eye'|'spin' }) {
  const color = accent ? `text-${accent}-600 dark:text-${accent}-400` : 'text-slate-900 dark:text-slate-100';
  const Icon = () => {
    switch(icon){
      case 'plus': return (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6"/></svg>);
      case 'check': return (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>);
      case 'eye': return (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>);
      case 'spin': return (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>);
      default: return null;
    }
  };
  return (
    <div className="p-4 rounded-lg border bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-600">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[11px] text-slate-500">{label}</div>
        <Icon />
      </div>
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{loading ? '···' : (value ?? 0).toLocaleString()}</div>
      <div className="text-[10px] text-slate-400 mt-1">En este período</div>
    </div>
  );
}
