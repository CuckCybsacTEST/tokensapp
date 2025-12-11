'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

type BatchRow = {
  id: string;
  name: string | null;
  description: string | null;
  createdAt: string;
  totalQrs: number;
  redeemed: number;
  expired: number;
  active: number;
  distinctThemes: number;
};

type DryRunSummary = {
  qrCounts: { batchId: string; _count: { _all: number } }[];
  redeemed: { batchId: string; _count: { _all: number } }[];
  expired: { batchId: string; _count: { _all: number } }[];
};

interface DryRunResponse { ok: true; dryRun: true; batchIds: string[]; summary: DryRunSummary }
interface PurgeResult { ok: true; batchIds: string[]; deleted: any }

export default function PurgeCustomQrsClient() {
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState<DryRunResponse | null>(null);
  const [result, setResult] = useState<PurgeResult | null>(null);
  const [force, setForce] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const redeemedMap = useMemo(() => {
    const m = new Map<string, number>();
    if (dryRun && Array.isArray(dryRun.summary.redeemed)) {
      for (const r of dryRun.summary.redeemed) m.set(r.batchId, r._count._all);
    }
    return m;
  }, [dryRun]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch('/api/admin/custom-qrs/purge', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.message || 'Error');
      const rows: BatchRow[] = j.batches.map((b: any) => ({ ...b, createdAt: b.createdAt }));
      setBatches(rows);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggle(id: string) {
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  const selectNone = useCallback(() => { setSelected(new Set()); }, []);
  const selectAll = useCallback(() => { setSelected(new Set(batches.map(b => b.id))); }, [batches]);
  const selectLatest = useCallback((n: number) => { setSelected(new Set(batches.slice(0, n).map(b => b.id))); }, [batches]);

  async function runDry() {
    if (!selected.size) return;
    setDryRun(null); setResult(null); setError(null);
    try {
      const body = { batchIds: Array.from(selected), options: { dryRun: true } };
      const r = await fetch('/api/admin/custom-qrs/purge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.message || 'Error dry-run');
      setDryRun(j);
    } catch (e: any) { setError(e.message || String(e)); }
  }

  const anyRedeemed = useMemo(() => dryRun && Array.isArray(dryRun.summary.redeemed) ? dryRun.summary.redeemed.some(r => r._count._all > 0) : false, [dryRun]);

  async function executePurge() {
    if (!dryRun) return;
    if (anyRedeemed && !force) { setError('Hay QR redimidos. Marca FORCE para continuar.'); return; }
    if (confirmText !== 'PURGE') { setError('Debes escribir PURGE para confirmar.'); return; }
    setError(null);
    try {
      const body = { batchIds: dryRun.batchIds, options: { dryRun: false } };
      const r = await fetch('/api/admin/custom-qrs/purge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.message || 'Error purge');
      setResult(j);
      load(); // recargar lista
    } catch (e: any) { setError(e.message || String(e)); }
  }

  return (
    <div className="space-y-6">
      {error && <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">{error}</div>}

      <div className="flex gap-2 flex-wrap">
        <button onClick={selectNone} className="btn-outline text-sm" disabled={loading}>Ninguno</button>
        <button onClick={selectAll} className="btn-outline text-sm" disabled={loading}>Todos</button>
        <button onClick={() => selectLatest(5)} className="btn-outline text-sm" disabled={loading}>Últimos 5</button>
        <button onClick={() => selectLatest(10)} className="btn-outline text-sm" disabled={loading}>Últimos 10</button>
        <button onClick={() => selectLatest(20)} className="btn-outline text-sm" disabled={loading}>Últimos 20</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-slate-200 dark:border-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="border border-slate-200 dark:border-slate-700 p-2 text-left">
                <input type="checkbox" checked={selected.size === batches.length && batches.length > 0} onChange={selectAll} />
              </th>
              <th className="border border-slate-200 dark:border-slate-700 p-2 text-left">Lote</th>
              <th className="border border-slate-200 dark:border-slate-700 p-2 text-left">Creado</th>
              <th className="border border-slate-200 dark:border-slate-700 p-2 text-right">Total QR</th>
              <th className="border border-slate-200 dark:border-slate-700 p-2 text-right">Redimidos</th>
              <th className="border border-slate-200 dark:border-slate-700 p-2 text-right">Expirados</th>
              <th className="border border-slate-200 dark:border-slate-700 p-2 text-right">Activos</th>
              <th className="border border-slate-200 dark:border-slate-700 p-2 text-right">Temas</th>
            </tr>
          </thead>
          <tbody>
            {batches.map(b => (
              <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="border border-slate-200 dark:border-slate-700 p-2">
                  <input type="checkbox" checked={selected.has(b.id)} onChange={() => toggle(b.id)} />
                </td>
                <td className="border border-slate-200 dark:border-slate-700 p-2">
                  <div className="font-medium">{b.name || `Lote ${b.id.slice(0, 8)}`}</div>
                  {b.description && <div className="text-sm text-slate-500">{b.description}</div>}
                </td>
                <td className="border border-slate-200 dark:border-slate-700 p-2 text-sm">
                  {new Date(b.createdAt).toLocaleDateString('es-PE')}
                </td>
                <td className="border border-slate-200 dark:border-slate-700 p-2 text-right">{b.totalQrs}</td>
                <td className="border border-slate-200 dark:border-slate-700 p-2 text-right">{b.redeemed}</td>
                <td className="border border-slate-200 dark:border-slate-700 p-2 text-right">{b.expired}</td>
                <td className="border border-slate-200 dark:border-slate-700 p-2 text-right">{b.active}</td>
                <td className="border border-slate-200 dark:border-slate-700 p-2 text-right">{b.distinctThemes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected.size > 0 && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center justify-between">
            <span>{selected.size} lote(s) seleccionado(s)</span>
            <button onClick={runDry} className="btn-primary" disabled={loading}>
              {loading ? 'Cargando...' : 'Ejecutar Dry-Run'}
            </button>
          </div>
        </div>
      )}

      {dryRun && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <h3 className="font-semibold mb-2">Resultado del Dry-Run</h3>
          <div className="space-y-2 text-sm">
            <div>Lotes a purgar: {dryRun.batchIds.length}</div>
            <div>QR totales: {dryRun.summary.qrCounts.reduce((sum, c) => sum + c._count._all, 0)}</div>
            <div>QR redimidos: {dryRun.summary.redeemed.reduce((sum, r) => sum + r._count._all, 0)}</div>
            <div>QR expirados: {dryRun.summary.expired.reduce((sum, e) => sum + e._count._all, 0)}</div>
          </div>

          {anyRedeemed && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={force} onChange={e => setForce(e.target.checked)} />
                <span className="text-red-700 dark:text-red-400 font-medium">FORCE: Permitir purgar lotes con QR redimidos</span>
              </label>
            </div>
          )}

          <div className="mt-4 space-y-2">
            <label className="block text-sm font-medium">
              Escribe "PURGE" para confirmar:
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                placeholder="PURGE"
              />
            </label>
            <button
              onClick={executePurge}
              className="btn-danger"
              disabled={confirmText !== 'PURGE' || (anyRedeemed && !force)}
            >
              Ejecutar Purga Real
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <h3 className="font-semibold mb-2">Purga Completada</h3>
          <div className="space-y-1 text-sm">
            <div>Lotes eliminados: {result.batchIds.length}</div>
            {result.deleted && Object.entries(result.deleted).map(([key, value]) => (
              <div key={key}>{key}: {Array.isArray(value) ? value.length : String(value)}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}