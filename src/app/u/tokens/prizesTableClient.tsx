'use client';
import React, { useEffect, useState } from 'react';

interface PrizeRow {
  id: string;
  key: string | null;
  label: string;
  color: string | null;
  active: boolean;
  emittedTotal: number;
  revealedCount: number;
  deliveredCount: number;
  lastBatch?: { id: string; name: string } | null;
}
interface BatchTab { batchId: string; description: string | null; prizes: { prizeId: string; count: number }[] }

interface ApiResponse {
  ok: boolean;
  batches: BatchTab[];
  prizes: PrizeRow[];
}

export default function PrizesTableClient({ onBatchChange }: { onBatchChange?: (batchId:string)=>void }) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeBatch, setActiveBatch] = useState<string>('ALL'); // se ajustará al último batch tras la carga inicial

  useEffect(()=>{ load(); },[]);

  async function load() {
    setLoading(true); setError(null);
    try {
      const r = await fetch('/api/system/tokens/prizes-table', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.message || 'Error');
      setData(j);
      // Seleccionar por defecto el batch MÁS RECIENTE (primer elemento recibido en orden desc)
      if (j.batches && j.batches.length > 0) {
        const mostRecent = j.batches[0];
        setActiveBatch(mostRecent.batchId);
        onBatchChange?.(mostRecent.batchId);
      } else {
        onBatchChange?.('ALL');
      }
    } catch (e: any) { setError(e.message || String(e)); }
    finally { setLoading(false); }
  }

  if (error) return <div className="text-xs text-danger">{error}</div>;
  if (!data) return <div className="text-xs opacity-60">{loading?'Cargando…':'Sin datos'}</div>;

  // Clasificaciones similares a vista admin
  const sorted = [...data.prizes].sort((a,b)=>{
    const ak = a.key || ''; const bk = b.key || '';
    return ak.localeCompare(bk, undefined, { numeric:true });
  });
  const emitted = sorted.filter(p => (p.emittedTotal ?? 0) > 0 && (p.lastBatch));
  const pending = sorted.filter(p => p.active && (p.emittedTotal ?? 0) === 0);

  const countsByPrizePerBatch: Record<string, Record<string, number>> = {};
  for (const b of data.batches) {
    const map: Record<string, number> = {}; for (const p of b.prizes) map[p.prizeId] = p.count; countsByPrizePerBatch[b.batchId] = map;
  }
  const emittedFiltered = activeBatch==='ALL' ? emitted : emitted.filter(p => (countsByPrizePerBatch[activeBatch]||{})[p.id]);

  function table(list: PrizeRow[], label: string, empty: string) {
    return (
  <div className="border rounded-lg overflow-hidden w-full">
        <div className="px-4 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[10px] opacity-60">{list.length} premios</span>
        </div>
        {list.length === 0 ? (
          <div className="p-4 text-[11px] text-soft">{empty}</div>
        ) : (
          <>
          {/* Desktop / >= sm */}
          <div className="overflow-x-auto hidden sm:block">
            <table className="w-full text-[11px] table-fixed">
              <thead className="bg-slate-50 dark:bg-slate-700/40 text-soft">
                <tr>
                  <th className="text-left px-2 py-1 w-[38%]">Label</th>
                  <th className="text-left px-2 py-1 w-[32%]">Lote</th>
                  <th className="text-right px-2 py-1 w-[15%]">Emitidos</th>
                  <th className="text-right px-2 py-1 w-[15%]">Consumidos</th>
                </tr>
              </thead>
              <tbody>
                {list.map(p=>{
                  return (
                    <tr key={p.id} className="border-t border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-2 py-1 font-semibold uppercase tracking-wide truncate" title={p.label}>{p.label}</td>
                      <td className="px-2 py-1 text-[10px] font-mono truncate" title={p.lastBatch ? p.lastBatch.name : ''}>{p.lastBatch ? p.lastBatch.name : '—'}</td>
                      <td className="px-2 py-1 text-right"><span className="inline-block min-w-[2.5rem] text-right text-success font-semibold">{p.emittedTotal}</span></td>
                      <td className="px-2 py-1 text-right"><span className="inline-block min-w-[2.5rem] text-right text-danger font-semibold">{p.deliveredCount}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Mobile / < sm: list style */}
          <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-700/60 text-[11px]">
            {list.map(p => (
              <div key={p.id} className="py-2 px-2 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold uppercase tracking-wide leading-tight max-w-[60%] truncate" title={p.label}>{p.label}</div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-success font-semibold">{p.emittedTotal}</span>
                    <span className="text-danger font-semibold">{p.deliveredCount}</span>
                  </div>
                </div>
                <div className="mt-0.5 text-[10px] font-mono text-soft truncate" title={p.lastBatch ? p.lastBatch.name : ''}>{p.lastBatch ? p.lastBatch.name : '—'}</div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>
    );
  }

  return (
  <div className="space-y-6 mt-2 md:flex md:flex-col md:items-stretch w-full">
      {pending.length>0 && table(pending, 'Pendientes / Disponibles', 'No hay premios disponibles')}
  <div className="space-y-3 md:flex md:flex-col md:items-stretch w-full">
        {emitted.length>0 && (
          <div className="flex flex-wrap gap-2">
            <button onClick={()=>{ setActiveBatch('ALL'); onBatchChange?.('ALL'); }} className={`text-[10px] px-3 py-1 rounded border ${activeBatch==='ALL'? 'bg-indigo-600 text-white border-indigo-600':'border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>Todos</button>
            {data.batches.map(b=> (
              <button key={b.batchId} onClick={()=>{ setActiveBatch(b.batchId); onBatchChange?.(b.batchId); }} title={b.batchId} className={`text-[10px] px-3 py-1 rounded border ${activeBatch===b.batchId? 'bg-indigo-600 text-white border-indigo-600':'border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>{(b.description||b.batchId).slice(0,18)}{(b.description||b.batchId).length>18?'…':''}</button>
            ))}
          </div>
        )}
        {table(emittedFiltered, activeBatch==='ALL'? 'Emitidos (stock consumido)':'Emitidos para batch seleccionado', 'Sin premios emitidos')}
      </div>
    </div>
  );
}
