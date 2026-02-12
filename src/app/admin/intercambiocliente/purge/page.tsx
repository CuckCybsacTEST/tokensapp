'use client';

import { useState, useEffect } from 'react';

interface Batch {
  id: string;
  name: string;
  isActive: boolean;
  _count?: { exchanges: number };
}

export default function IntercambioPurgePage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [purging, setPurging] = useState(false);
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [dryRunResult, setDryRunResult] = useState<any>(null);
  const [purgeResult, setPurgeResult] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/intercambio/batch')
      .then(res => res.json())
      .then(data => {
        setBatches(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggleBatch = (id: string) => {
    setSelectedBatches(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  const executePurge = async (dryRun: boolean) => {
    setPurging(true);
    setDryRunResult(null);
    setPurgeResult(null);

    try {
      const body: any = { dryRun };
      if (selectedBatches.length > 0) {
        body.batchIds = selectedBatches;
      } else {
        body.purgeOrphansOnly = true;
      }
      if (statusFilter) body.statusFilter = statusFilter;

      const res = await fetch('/api/admin/intercambio/purge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Error');
        return;
      }

      if (dryRun) {
        setDryRunResult(data);
      } else {
        setPurgeResult(data);
        // Refresh batch list
        const bRes = await fetch('/api/admin/intercambio/batch');
        const bData = await bRes.json();
        setBatches(Array.isArray(bData) ? bData : []);
        setSelectedBatches([]);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setPurging(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-slate-400">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
        🧹 Purge — Intercambio Cliente
      </h1>
      <p className="text-sm text-gray-500 dark:text-slate-400">
        Eliminar intercambios y archivos de Supabase Storage (exchange-media bucket).
      </p>

      {/* Mode selection */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-medium">Selecciona qué purgar</h2>
        </div>
        <div className="card-body space-y-4">
          {/* Status filter */}
          <div>
            <label className="block text-sm font-medium mb-1">Filtrar por estado (opcional)</label>
            <select
              className="input w-full sm:w-auto"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="pending">Solo pendientes</option>
              <option value="approved">Solo aprobados</option>
              <option value="rejected">Solo rechazados</option>
            </select>
          </div>

          {/* Batch selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Lotes a purgar (dejar vacío = solo huérfanos sin lote)
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {batches.map(b => (
                <label key={b.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={selectedBatches.includes(b.id)}
                    onChange={() => toggleBatch(b.id)}
                  />
                  <span className="text-sm">
                    {b.name}
                    <span className="text-gray-400 ml-2">
                      ({b._count?.exchanges || 0} intercambios)
                      {!b.isActive && ' — Inactivo'}
                    </span>
                  </span>
                </label>
              ))}
              {batches.length === 0 && (
                <p className="text-sm text-gray-400">No hay lotes</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => executePurge(true)}
          disabled={purging}
          className="btn btn-secondary"
        >
          {purging ? '⏳ Calculando...' : '🔍 Vista previa (Dry Run)'}
        </button>
        <button
          onClick={() => {
            if (!confirm('⚠️ ¿Estás seguro? Se eliminarán intercambios y archivos de Supabase permanentemente.')) return;
            executePurge(false);
          }}
          disabled={purging}
          className="btn btn-danger"
        >
          {purging ? '⏳ Purgando...' : '🗑️ Purgar'}
        </button>
      </div>

      {/* Dry run result */}
      {dryRunResult && (
        <div className="card border-yellow-300 dark:border-yellow-700">
          <div className="card-header bg-yellow-50 dark:bg-yellow-900/20">
            <h3 className="font-medium text-yellow-800 dark:text-yellow-200">🔍 Vista previa</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-gray-500 dark:text-slate-400">Intercambios</p>
                <p className="text-xl font-bold">{dryRunResult.exchangeCount}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-slate-400">Registros media</p>
                <p className="text-xl font-bold">{dryRunResult.mediaRecordCount}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-slate-400">Archivos en Supabase</p>
                <p className="text-xl font-bold">{dryRunResult.storageFileCount}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-slate-400">Lotes afectados</p>
                <p className="text-xl font-bold">{dryRunResult.batchesAffected}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Purge result */}
      {purgeResult && (
        <div className="card border-green-300 dark:border-green-700">
          <div className="card-header bg-green-50 dark:bg-green-900/20">
            <h3 className="font-medium text-green-800 dark:text-green-200">✅ Purga completada</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-gray-500 dark:text-slate-400">Intercambios eliminados</p>
                <p className="text-xl font-bold">{purgeResult.exchangesDeleted}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-slate-400">Media eliminados</p>
                <p className="text-xl font-bold">{purgeResult.mediaRecordsDeleted}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-slate-400">Archivos Supabase</p>
                <p className="text-xl font-bold">{purgeResult.storageFilesDeleted}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-slate-400">Lotes eliminados</p>
                <p className="text-xl font-bold">{purgeResult.batchesDeleted}</p>
              </div>
            </div>
            {purgeResult.storageErrors?.length > 0 && (
              <div className="mt-3 text-xs text-red-500">
                <p>Errores de storage:</p>
                {purgeResult.storageErrors.map((err: string, i: number) => (
                  <p key={i}>{err}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Export CSV link */}
      <div className="card">
        <div className="card-body">
          <h3 className="font-medium mb-2">📊 Exportar datos</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
            Descarga un CSV con todos los intercambios antes de purgar.
          </p>
          <a
            href="/api/admin/intercambio/export-csv"
            className="btn btn-secondary text-sm"
            download
          >
            📥 Descargar CSV
          </a>
        </div>
      </div>
    </div>
  );
}
