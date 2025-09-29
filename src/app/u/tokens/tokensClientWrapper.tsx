"use client";
import React, { useState, useEffect } from 'react';
import PrizesTableClient from './prizesTableClient';
import StatCard from '@/app/admin/StatCard';

function todayISO(){
  const n=new Date();return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
}

export default function TokensClientWrapper(){
  // batchId ya no se usa fuera de la tabla, se elimina estado superior redundante
  const [day,setDay]=useState(todayISO());
  const [data,setData]=useState<any|null>(null);
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState<string|null>(null);
  async function load(d=day){
    setLoading(true);setErr(null);
    try{ const r=await fetch(`/api/admin/daily-tokens?day=${d}`); const j=await r.json(); if(!r.ok) throw new Error(j.message||'Error'); setData(j); }catch(e:any){ setErr(e.message||String(e)); } finally{ setLoading(false);} }
  useEffect(()=>{load();},[]); // eslint-disable-line
  const m=data?.metrics || { created:0, delivered:0, available:0, expired:0, rouletteSpins:0, breakdown:{active:0,revealedPending:0}};
  return (
    <div className="space-y-6">
      {/* Métricas del día */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow border border-slate-100 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">Métricas del Día
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700">{day}</span>
          </h3>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <input type="date" value={day} onChange={e=>{setDay(e.target.value);load(e.target.value);}} className="input !h-8 !text-xs max-w-[140px]" />
            <button
              onClick={()=>load()} disabled={loading}
              aria-label="Refrescar métricas"
              title="Refrescar métricas"
              className="inline-flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 h-8 w-8 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className={`h-4 w-4 ${loading ? 'animate-spin':''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9" /><path d="M3 12a9 9 0 0 0 9 9" /><path d="M7 17l-4-5 4-5" /><path d="M17 7l4 5-4 5" /></svg>
              <span className="sr-only">Refrescar</span>
            </button>
          </div>
        </div>
        {err && <div className="text-xs text-red-600 mb-2">{err}</div>}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="Tokens Creados" value={m.created} description="Total emitidos para el día" compact />
          <StatCard label="Tokens Entregados" value={m.delivered} description="Entregados" compact color="text-emerald-600" />
            <StatCard label="Tokens Sin Entregar" value={m.available} description="Revelados pend. + activos" compact color="text-indigo-600" />
          <StatCard label="Tokens Expirados" value={m.expired} description="Expirados antes de entregar" compact color="text-amber-600" />
          <StatCard label="Giros Ruleta" value={m.rouletteSpins} description="Total revelados" compact color="text-fuchsia-600" />
        </div>
      </div>
      {/* Tabla premios/batches */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow border border-slate-100 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Premios y Batches</h3>
          <button
            onClick={()=>load()} disabled={loading}
            aria-label="Actualizar métricas"
            title="Actualizar métricas"
            className="inline-flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 h-8 w-8 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className={`h-4 w-4 ${loading ? 'animate-spin':''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9" /><path d="M3 12a9 9 0 0 0 9 9" /><path d="M7 17l-4-5 4-5" /><path d="M17 7l4 5-4 5" /></svg>
            <span className="sr-only">Actualizar</span>
          </button>
        </div>
        <PrizesTableClient />
      </div>
    </div>
  );
}