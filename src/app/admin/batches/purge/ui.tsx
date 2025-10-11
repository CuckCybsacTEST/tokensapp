'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

type BatchRow = {
  id: string;
  description: string | null;
  createdAt: string;
  totalTokens: number;
  redeemedOrDelivered: number;
  expired: number;
  active: number;
  distinctPrizes: number;
};

type DryRunSummary = {
  tokenCounts: { batchId: string; _count: { _all: number } }[];
  rouletteSessions: number;
  spins: number;
  redeemed: { batchId: string; _count: { _all: number } }[];
  orphanPrizes?: string[]; // presente en dry-run de sólo huérfanos o cuando deleteUnusedPrizes=true
};

interface DryRunResponse { ok: true; dryRun: true; batchIds: string[]; summary: DryRunSummary }
interface PurgeResult { ok: true; batchIds: string[]; deleted: any }

export default function PurgeBatchesClient() {
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState<DryRunResponse | null>(null);
  const [result, setResult] = useState<PurgeResult | null>(null);
  const [deleteUnusedPrizes, setDeleteUnusedPrizes] = useState(false);
  const [force, setForce] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [orphanPrizes, setOrphanPrizes] = useState<Array<{ id: string; key: string; label: string; emittedTotal: number; stock: number | null; createdAt: string }>>([]);
  const [purgeOrphansOnly, setPurgeOrphansOnly] = useState(false);

  const redeemedMap = useMemo(()=>{
    const m = new Map<string, number>();
    if (dryRun && Array.isArray(dryRun.summary.redeemed)) {
      for (const r of dryRun.summary.redeemed) m.set(r.batchId, r._count._all);
    }
    return m;
  }, [dryRun]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch('/api/admin/batches/purge', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.message || 'Error');
  const rows: BatchRow[] = j.batches.map((b: any) => ({ ...b, createdAt: b.createdAt }));
  setBatches(rows);
  setOrphanPrizes(j.orphanPrizes || []);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(()=>{ load(); }, [load]);

  function toggle(id: string) {
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  
  const selectNone = useCallback(() => { setSelected(new Set()); }, []);
  const selectAll = useCallback(() => { setSelected(new Set(batches.map(b=>b.id))); }, [batches]);
  const selectLatest = useCallback((n: number) => { setSelected(new Set(batches.slice(0,n).map(b=>b.id))); }, [batches]);

  async function runDry() {
    if (!purgeOrphansOnly && !selected.size) return;
    setDryRun(null); setResult(null); setError(null);
    try {
      const body = purgeOrphansOnly 
        ? { options: { dryRun: true, deleteUnusedPrizes, purgeOrphansOnly } }
        : { batchIds: Array.from(selected), options: { dryRun: true, deleteUnusedPrizes, purgeOrphansOnly } };
      const r = await fetch('/api/admin/batches/purge', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.message || 'Error dry-run');
      setDryRun(j);
    } catch (e: any) { setError(e.message || String(e)); }
  }

  const anyRedeemed = useMemo(()=> dryRun && Array.isArray(dryRun.summary.redeemed) ? dryRun.summary.redeemed.some(r=>r._count._all>0) : false, [dryRun]);

  async function executePurge() {
    if (!dryRun) return;
    if (!purgeOrphansOnly && anyRedeemed && !force) { setError('Hay tokens redimidos/entregados. Marca FORCE para continuar.'); return; }
    if (confirmText !== 'PURGE') { setError('Debes escribir PURGE para confirmar.'); return; }
    setError(null);
    try {
      const body = purgeOrphansOnly 
        ? { options: { dryRun: false, deleteUnusedPrizes, purgeOrphansOnly } }
        : { batchIds: dryRun.batchIds, options: { dryRun: false, deleteUnusedPrizes, purgeOrphansOnly } };
      const r = await fetch('/api/admin/batches/purge', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.message || 'Error purge');
      setResult(j);
      // refresh list afterwards
      load();
    } catch (e: any) { setError(e.message || String(e)); }
  }

  function summaryLines() {
    if (!dryRun) return null;
    if (purgeOrphansOnly) {
      const ids = dryRun.summary.orphanPrizes || [];
      return (
        <div className="space-y-2 mt-4 text-xs">
          <div className="font-medium">Dry-run orphan prizes:</div>
          {ids.length === 0 && <div>No hay prizes huérfanos.</div>}
          {ids.length > 0 && (
            <ul className="list-disc pl-5 space-y-1">
              {ids.map(id => <li key={id} className="font-mono">{id}</li>)}
            </ul>
          )}
        </div>
      );
    }
    const lines = dryRun.summary.tokenCounts.map(tc => {
      const redeemed = redeemedMap.get(tc.batchId) || 0;
      return { id: tc.batchId, tokens: tc._count._all, redeemed };
    });
    return (
      <div className="space-y-2 mt-4 text-xs">
        <div className="font-medium">Dry-run summary:</div>
        <ul className="list-disc pl-5 space-y-1">
          {lines.map(l => <li key={l.id}><span className="font-mono">{l.id}</span> → tokens: {l.tokens} / redeemed+delivered: {l.redeemed}</li>)}
        </ul>
        <div>Roulette sessions: {dryRun.summary.rouletteSessions} | spins: {dryRun.summary.spins}</div>
        {anyRedeemed && !force && <div className="text-amber-600">Hay tokens redimidos/entregados — requiere marcar FORCE.</div>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 p-3 rounded text-xs">{error}</div>}
      <div className="flex flex-wrap gap-2 items-center text-xs">
        <button onClick={load} disabled={loading} className="btn-outline !px-2 !py-1">Refrescar</button>
        <button onClick={selectAll} disabled={purgeOrphansOnly || batches.length === 0} className="btn-outline !px-2 !py-1">Seleccionar todo</button>
        <button onClick={()=>selectLatest(5)} disabled={purgeOrphansOnly || batches.length === 0} className="btn-outline !px-2 !py-1">Latest 5</button>
        <button onClick={()=>selectLatest(10)} disabled={purgeOrphansOnly || batches.length === 0} className="btn-outline !px-2 !py-1">Latest 10</button>
        <button onClick={selectNone} disabled={selected.size === 0} className="btn-outline !px-2 !py-1">Limpiar selección</button>
        <label className="inline-flex items-center gap-1 cursor-pointer select-none"><input type="checkbox" checked={deleteUnusedPrizes} disabled={purgeOrphansOnly} onChange={e=>setDeleteUnusedPrizes(e.target.checked)} /> <span>Eliminar prizes huérfanos</span></label>
        <label className="inline-flex items-center gap-1 cursor-pointer select-none"><input type="checkbox" checked={purgeOrphansOnly} onChange={e=>{ setPurgeOrphansOnly(e.target.checked); setSelected(new Set()); setDryRun(null); setResult(null); }} /> <span>Solo purgar prizes huérfanos</span></label>
        <label className="inline-flex items-center gap-1 cursor-pointer select-none"><input type="checkbox" checked={force} onChange={e=>setForce(e.target.checked)} /> <span>FORCE</span></label>
      </div>
      {!purgeOrphansOnly && (
      <div className="overflow-x-auto border rounded">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
              <th className="p-2 text-left">Sel</th>
              <th className="p-2 text-left">Batch</th>
              <th className="p-2 text-left">Creado</th>
              <th className="p-2">Tokens</th>
              <th className="p-2">Activos</th>
              <th className="p-2">Redeemed</th>
              <th className="p-2">Expirados</th>
              <th className="p-2">Prizes</th>
            </tr>
          </thead>
            <tbody>
            {batches.map(b => {
              const isSel = selected.has(b.id);
              return (
                <tr key={b.id} className={`border-t hover:bg-slate-50 dark:hover:bg-slate-800/40 ${isSel ? 'bg-brand-50/60 dark:bg-brand-900/20' : ''}`}>
                  <td className="p-2"><input type="checkbox" checked={isSel} onChange={()=>toggle(b.id)} /></td>
                  <td className="p-2 font-mono max-w-[160px] truncate" title={b.id}>{b.description || b.id}</td>
                  <td className="p-2 whitespace-nowrap" title={b.createdAt}>{new Date(b.createdAt).toLocaleString()}</td>
                  <td className="p-2 text-center tabular-nums">{b.totalTokens}</td>
                  <td className="p-2 text-center tabular-nums">{b.active}</td>
                  <td className="p-2 text-center tabular-nums">{b.redeemedOrDelivered}</td>
                  <td className="p-2 text-center tabular-nums">{b.expired}</td>
                  <td className="p-2 text-center tabular-nums">{b.distinctPrizes}</td>
                </tr>
              );
            })}
            {batches.length === 0 && !loading && <tr><td colSpan={8} className="p-4 text-center text-slate-500">Sin datos</td></tr>}
            </tbody>
        </table>
      </div>
      )}
      {purgeOrphansOnly && (
        <div className="border rounded p-3 bg-slate-50 dark:bg-slate-800/30 text-[11px]">
          <div className="font-medium mb-2">Prizes huérfanos detectados ({orphanPrizes.length}):</div>
          {orphanPrizes.length === 0 && <div>No hay prizes huérfanos.</div>}
          {orphanPrizes.length > 0 && (
            <ul className="max-h-56 overflow-auto space-y-1 list-disc pl-5">
              {orphanPrizes.map(p => <li key={p.id} className="font-mono" title={p.label}>{p.key} • {p.id.slice(0,12)}… stock={p.stock ?? '-'} emitted={p.emittedTotal}</li>)}
            </ul>
          )}
          <div className="mt-2 text-xs text-slate-500">Se eliminarán únicamente prizes sin tokens ni assignedTokens.</div>
        </div>
      )}
      <div className="flex flex-col gap-3 border rounded p-4 bg-slate-50 dark:bg-slate-800/30">
        <div className="flex gap-2 flex-wrap items-center">
          <button disabled={(!purgeOrphansOnly && !selected.size)} onClick={runDry} className="btn !px-3 !py-1 text-xs">Dry-run</button>
          <div className="text-[11px] text-slate-600 dark:text-slate-400">Seleccionados: {selected.size}</div>
          {dryRun && !result && <>
            <input value={confirmText} onChange={e=>setConfirmText(e.target.value)} placeholder="Escribe PURGE" className="input !h-7 !text-[11px]" />
            <button onClick={executePurge} className="btn-danger !px-3 !py-1 text-xs">Ejecutar PURGE</button>
          </>}
          {result && <div className="text-[11px] text-green-700 dark:text-green-400">Purge completado.</div>}
        </div>
        {summaryLines()}
        {result && (
          <div className="mt-2 text-[11px] space-y-1">
            <div className="font-medium">Resultado:</div>
            <pre className="max-h-64 overflow-auto bg-black/70 text-[10px] p-2 rounded text-green-100">{JSON.stringify(result.deleted, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
