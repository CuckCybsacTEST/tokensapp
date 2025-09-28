"use client";
import { useState, useEffect } from 'react';
import StatCard from './StatCard';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Legend, Bar, LineChart, Line, CartesianGrid } from 'recharts';

function todayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth()+1).padStart(2,'0');
  const d = String(now.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}

export default function DailyTokenMetricsClient() {
  const [day, setDay] = useState(todayISO());
  const [data, setData] = useState<any|null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  async function load(selectedDay: string) {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`/api/admin/daily-tokens?day=${selectedDay}`);
      const j = await r.json();
      if(!r.ok) throw new Error(j.message||'Error');
      setData(j);
    } catch(e:any) {
      setError(e.message||String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ load(day); },[]); // eslint-disable-line

  const metrics = data?.metrics || { created:0, delivered:0, available:0, expired:0, rouletteSpins:0, breakdown:{active:0, revealedPending:0}, timeline:{hours:[], peakRevealHour:null, peakDeliveredHour:null}, globalHistorical:{ createdAll:0, expiredAll:0, rouletteSpinsAll:0, undeliveredAll:0 } } as any;
  const timeline = metrics.timeline?.hours || [];
  const gh = metrics.globalHistorical || { createdAll:0, expiredAll:0, rouletteSpinsAll:0, undeliveredAll:0 };

  return (
    <>
    {/* Métricas del Día */}
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-100 dark:border-slate-700 mb-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-bold flex items-center">
            <span className="mr-2 p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2v-9a2 2 0 00-2-2H5a2 2 0 00-2 2v9a2 2 0 002 2z"/></svg>
            </span>
            Métricas del Día (functionalDate)
          </h2>
          {data && <div className="text-xs opacity-70 mt-1">Día: {day} | base: {data.basis}</div>}
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={day} onChange={e=>{ setDay(e.target.value); load(e.target.value); }} className="input !h-9" />
          <button onClick={()=>load(day)} disabled={loading} className="btn-outline !px-3 !py-1 text-sm">{loading? '...' : 'Refrescar'}</button>
        </div>
      </div>
      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Tokens Creados" value={metrics.created} description="Total emitidos para el día" compact icon={<svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5 text-slate-400' viewBox='0 0 24 24' fill='none' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 6v12m6-6H6'/></svg>} />
        <StatCard label="Tokens Entregados" value={metrics.delivered} description="Con entregadoAt" compact color="text-emerald-600" icon={<svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5 text-emerald-500' viewBox='0 0 24 24' fill='none' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7'/></svg>} />
        <StatCard label="Tokens Sin Entregar" value={metrics.available} description="Revelados pendientes y activos" compact color="text-indigo-600" icon={<svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5 text-indigo-500' viewBox='0 0 24 24' fill='none' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'/></svg>} />
        <StatCard label="Tokens Expirados" value={metrics.expired} description="Expirados antes de entregar" compact color="text-amber-600" icon={<svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5 text-amber-500' viewBox='0 0 24 24' fill='none' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'/></svg>} />
        <StatCard label="Giros Ruleta" value={metrics.rouletteSpins} description="Total revelados (entregados + pendientes)" compact color="text-fuchsia-600" icon={<svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5 text-fuchsia-500' viewBox='0 0 24 24' fill='none' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v2m6 6h2M4 12H2m15.07 4.93l1.42 1.42M6.51 6.51L5.09 5.09m12.02 0l1.42 1.42M6.51 17.49l-1.42 1.42M12 8a4 4 0 100 8 4 4 0 000-8z' /></svg>} />
      </div>
      {data?.batches?.length ? (
        <div className="mt-6">
          <h3 className="text-sm font-semibold mb-2">Lotes del día</h3>
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/40">
                <tr>
                  <th className="px-3 py-2 text-left">Batch</th>
                  <th className="px-3 py-2 text-left">Descripción</th>
                  <th className="px-3 py-2 text-right">Tokens</th>
                </tr>
              </thead>
              <tbody>
                {data.batches.map((b:any)=>(
                  <tr key={b.batchId} className="border-t border-slate-100 dark:border-slate-700/50">
                    <td className="px-3 py-1 font-mono text-xs">{b.batchId.slice(0,8)}</td>
                    <td className="px-3 py-1 max-w-[240px] truncate" title={b.description||''}>{b.description||'-'}</td>
                    <td className="px-3 py-1 text-right">{b.totalTokens}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-xs text-slate-500 mt-6">No hay lotes para este día.</div>
      )}
    </div>

    {/* Históricos */}
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-100 dark:border-slate-700 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <span className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18"/></svg>
          </span>
          Históricos (Acumulados)
        </h2>
        <div className="text-xs text-slate-500">Fecha base seleccionada: {day}</div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex flex-col p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30">
          <div className="text-[11px] font-medium text-slate-500 mb-0.5">Creados (Histórico)</div>
          <div className="text-base font-bold">{gh.createdAll}</div>
        </div>
        <div className="flex flex-col p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30">
          <div className="text-[11px] font-medium text-slate-500 mb-0.5">Expirados (Histórico)</div>
          <div className="text-base font-bold text-amber-600">{gh.expiredAll}</div>
        </div>
        <div className="flex flex-col p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30">
          <div className="text-[11px] font-medium text-slate-500 mb-0.5">Giros Ruleta (Histórico)</div>
          <div className="text-base font-bold text-fuchsia-600">{gh.rouletteSpinsAll}</div>
        </div>
        <div className="flex flex-col p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30">
          <div className="text-[11px] font-medium text-slate-500 mb-0.5">Sin Entregar (Histórico)</div>
          <div className="text-base font-bold text-indigo-600">{gh.undeliveredAll}</div>
        </div>
      </div>
    </div>
    {/* Evolución Horaria */}
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-100 dark:border-slate-700">
      <h3 className="text-sm font-semibold mb-4 flex flex-wrap items-center gap-3">Evolución Horaria (Lima)
        {metrics.timeline?.peakRevealHour && <span className="text-xs font-normal text-slate-500">Pico revelados: {metrics.timeline.peakRevealHour}h</span>}
        {metrics.timeline?.peakDeliveredHour && <span className="text-xs font-normal text-slate-500">| Pico entregados: {metrics.timeline.peakDeliveredHour}h</span>}
      </h3>
      {timeline.length ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                <XAxis dataKey="hour" fontSize={10} />
                <YAxis fontSize={10} allowDecimals={false} />
                <Tooltip formatter={(v:any)=>v} labelFormatter={(l)=>`Hora ${l}:00`} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="revealed" name="Revelados" fill="#6366f1" stackId="a" />
                <Bar dataKey="delivered" name="Entregados" fill="#10b981" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="h-64 bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                <XAxis dataKey="hour" fontSize={10} />
                <YAxis fontSize={10} allowDecimals={false} />
                <Tooltip formatter={(v:any)=>v} labelFormatter={(l)=>`Hora ${l}:00`} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="cumulativeRevealed" name="Acum. Revelados" stroke="#6366f1" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cumulativeDelivered" name="Acum. Entregados" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="text-xs text-slate-500">Sin eventos para graficar.</div>
      )}
    </div>
    </>
  );
}
