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
      // Seleccionar por defecto el último batch disponible (en vez de 'Todos') la primera vez
      if (j.batches && j.batches.length > 0) {
        const last = j.batches[j.batches.length - 1];
        setActiveBatch(last.batchId);
        onBatchChange?.(last.batchId);
      } else {
        onBatchChange?.('ALL');
      }
    } catch (e: any) { setError(e.message || String(e)); }
    finally { setLoading(false); }
  }

  if (error) return <div className="text-xs text-red-600">{error}</div>;
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
      <div className="border rounded-lg overflow-hidden">
        <div className="px-4 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[10px] opacity-60">{list.length} premios</span>
        </div>
        {list.length === 0 ? (
          <div className="p-4 text-[11px] text-slate-500">{empty}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-[11px]">
              <thead className="bg-slate-50 dark:bg-slate-700/40 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="text-left p-2">Key</th>
                  <th className="text-left p-2">Label</th>
                  <th className="text-left p-2">Color</th>
                  <th className="text-left p-2">Lote</th>
                  <th className="text-left p-2">Emitidos</th>
                  <th className="text-left p-2">Revelados</th>
                  <th className="text-left p-2">Consumidos</th>
                  <th className="text-left p-2">Activo</th>
                </tr>
              </thead>
              <tbody>
                {list.map(p=>{
                  return (
                    <tr key={p.id} className="border-t border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="font-mono p-2">{p.key}</td>
                      <td className="p-2 font-semibold uppercase tracking-wide">{p.label}</td>
                      <td className="p-2">{p.color && (
                        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded border" style={{background:p.color}} /> <span className="text-[10px] text-slate-500">{p.color}</span></span>
                      )}</td>
                      <td className="p-2 text-[10px] font-mono">{p.lastBatch ? (p.lastBatch.name.length>14? p.lastBatch.name.slice(0,14)+'…': p.lastBatch.name): '—'}</td>
                      <td className="p-2"><span className="badge-small bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">{p.emittedTotal}</span></td>
                      <td className="p-2"><span className="badge-small bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">{p.revealedCount}</span></td>
                      <td className="p-2"><span className="badge-small bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">{p.deliveredCount}</span></td>
                      <td className="p-2"><span className={`badge-small ${p.active? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200':'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200'}`}>{p.active? 'Sí':'No'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-2">
      {pending.length>0 && table(pending, 'Pendientes / Disponibles', 'No hay premios disponibles')}
      <div className="space-y-3">
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
