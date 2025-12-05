'use client';

import { useState, useEffect } from 'react';

interface Batch {
  id: string;
  description: string;
  createdAt: string;
  tokens: {
    id: string;
    expiresAt: string;
    maxUses: number | null;
    usedCount: number;
    disabled: boolean;
    prize: { key: string; label: string };
  }[];
  _count: { tokens: number };
}

interface Prize {
  id: string;
  key: string;
  label: string;
  color: string | null;
  stock: number | null;
  active: boolean;
  emittedTotal: number;
}

interface Token {
  id: string;
  expiresAt: string;
  maxUses: number | null;
  usedCount: number;
  disabled: boolean;
  prize: { key: string; label: string; color?: string };
}

export default function ReusableTokensAdmin() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [prizeForm, setPrizeForm] = useState({
    label: '',
    color: '',
    stock: '',
    editingId: null as string | null
  });
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [form, setForm] = useState({
    description: '',
    prizeId: '',
    maxUses: 15,
    count: 10,
    validityMode: 'byDays' as 'byDays' | 'singleDay' | 'singleHour',
    expirationDays: 7,
    singleDayDate: '',
    hourDate: '',
    hourTime: '12:00',
    durationMinutes: 60
  });

  useEffect(() => {
    fetchBatches();
    fetchPrizes();
  }, []);

  const fetchBatches = async () => {
    const res = await fetch('/api/admin/reusable-tokens');
    if (res.ok) {
      const data = await res.json();
      setBatches(data);
    }
    setLoading(false);
  };

  const fetchPrizes = async () => {
    const res = await fetch('/api/admin/reusable-prizes');
    if (res.ok) {
      const data = await res.json();
      setPrizes(data);
    }
  };

  const savePrize = async () => {
    if (!prizeForm.label.trim()) {
      alert('Label requerido');
      return;
    }

    const body = {
      label: prizeForm.label.trim(),
      color: prizeForm.color || null,
      stock: prizeForm.stock ? Number(prizeForm.stock) : null
    };

    const url = prizeForm.editingId ? `/api/admin/reusable-prizes/${prizeForm.editingId}` : '/api/admin/reusable-prizes';
    const method = prizeForm.editingId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (res.ok) {
      fetchPrizes();
      setPrizeForm({ label: '', color: '', stock: '', editingId: null });
    } else {
      const error = await res.json();
      alert(error.error || 'Error guardando premio');
    }
  };

  const editPrize = (prize: Prize) => {
    setPrizeForm({
      label: prize.label,
      color: prize.color || '',
      stock: prize.stock?.toString() || '',
      editingId: prize.id
    });
  };

  const deletePrize = async (id: string) => {
    if (!confirm('¿Eliminar premio?')) return;

    const res = await fetch(`/api/admin/reusable-prizes/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchPrizes();
    } else {
      const error = await res.json();
      alert(error.error || 'Error eliminando premio');
    }
  };

  const generateBatch = async () => {
    if (!form.prizeId || !form.description.trim()) {
      alert('Selecciona premio y descripción');
      return;
    }

    if (form.validityMode === 'singleDay' && !form.singleDayDate) {
      alert('Selecciona fecha para día específico');
      return;
    }
    if (form.validityMode === 'singleHour' && (!form.hourDate || !form.hourTime)) {
      alert('Selecciona fecha y hora para ventana horaria');
      return;
    }

    setGenerating(true);
    try {
      let validity;
      if (form.validityMode === 'byDays') {
        validity = { mode: 'byDays', expirationDays: form.expirationDays };
      } else if (form.validityMode === 'singleDay') {
        validity = { mode: 'singleDay', date: form.singleDayDate };
      } else if (form.validityMode === 'singleHour') {
        validity = { mode: 'singleHour', date: form.hourDate, hour: form.hourTime, durationMinutes: form.durationMinutes };
      }

      const body = {
        prizeId: form.prizeId,
        maxUses: form.maxUses,
        count: form.count,
        description: form.description,
        validity
      };

      const res = await fetch('/api/admin/reusable-tokens/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        // Download ZIP
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reusable_batch_${Date.now()}.zip`;
        a.click();
        URL.revokeObjectURL(url);

        fetchBatches(); // Refresh list
        setForm({ ...form, description: '', prizeId: '' });
      } else {
        const error = await res.json();
        alert(error.error || 'Error generando lote');
      }
    } catch (error) {
      alert('Error de red');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="text-slate-900 dark:text-slate-100">Cargando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Tokens Reutilizables</h1>

      {/* Formulario de Generación */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Generar Nuevo Lote</h2>
        </div>
        <div className="card-body grid gap-4 grid-cols-1 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
            <input
              type="text"
              className="input w-full"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Ej: Campaña Navidad"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Premio</label>
            <select
              className="input w-full"
              value={form.prizeId}
              onChange={e => setForm({ ...form, prizeId: e.target.value })}
            >
              <option value="">Seleccionar Premio</option>
              {prizes.filter(p => p.active).map(prize => (
                <option key={prize.id} value={prize.id}>
                  {prize.label} ({prize.key})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Usos Máximos por Token</label>
            <input
              type="number"
              className="input w-full"
              value={form.maxUses}
              onChange={e => setForm({ ...form, maxUses: Number(e.target.value) })}
              min={1}
              max={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cantidad de Tokens</label>
            <input
              type="number"
              className="input w-full"
              value={form.count}
              onChange={e => setForm({ ...form, count: Number(e.target.value) })}
              min={1}
              max={100}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Modo de Validez</label>
            <div className="flex gap-4">
              <label>
                <input
                  type="radio"
                  name="validity"
                  value="byDays"
                  checked={form.validityMode === 'byDays'}
                  onChange={() => setForm({ ...form, validityMode: 'byDays' })}
                /> Por días
              </label>
              <label>
                <input
                  type="radio"
                  name="validity"
                  value="singleDay"
                  checked={form.validityMode === 'singleDay'}
                  onChange={() => setForm({ ...form, validityMode: 'singleDay' })}
                /> Día específico
              </label>
              <label>
                <input
                  type="radio"
                  name="validity"
                  value="singleHour"
                  checked={form.validityMode === 'singleHour'}
                  onChange={() => setForm({ ...form, validityMode: 'singleHour' })}
                /> Ventana horaria
              </label>
            </div>
          </div>

          {form.validityMode === 'byDays' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Días de expiración</label>
              <input
                type="number"
                className="input w-full"
                value={form.expirationDays}
                onChange={e => setForm({ ...form, expirationDays: Number(e.target.value) })}
                min={1}
              />
            </div>
          )}

          {form.validityMode === 'singleDay' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha</label>
              <input
                type="date"
                className="input w-full"
                value={form.singleDayDate}
                onChange={e => setForm({ ...form, singleDayDate: e.target.value })}
              />
            </div>
          )}

          {form.validityMode === 'singleHour' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha</label>
                <input
                  type="date"
                  className="input w-full"
                  value={form.hourDate}
                  onChange={e => setForm({ ...form, hourDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hora inicio</label>
                <input
                  type="time"
                  className="input w-full"
                  value={form.hourTime}
                  onChange={e => setForm({ ...form, hourTime: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Duración (min)</label>
                <input
                  type="number"
                  className="input w-full"
                  value={form.durationMinutes}
                  onChange={e => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                  min={15}
                />
              </div>
            </>
          )}

          <div className="md:col-span-2">
            <button
              onClick={generateBatch}
              disabled={generating}
              className="btn w-full"
            >
              {generating ? 'Generando...' : 'Generar Lote Reutilizable'}
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Lotes */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Lotes Existentes</h2>
        </div>
        <div className="card-body">
          {batches.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">No hay lotes reutilizables</p>
          ) : (
            <div className="space-y-4">
              {batches.map(batch => (
                <div key={batch.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{batch.description}</h3>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {new Date(batch.createdAt).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    {batch._count.tokens} tokens
                  </p>
                  <details className="group">
                    <summary className="cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                      Ver Tokens
                    </summary>
                    <div className="mt-2 space-y-1">
                      {batch.tokens.map(token => (
                        <div key={token.id} className="text-xs bg-slate-50 dark:bg-slate-700 p-2 rounded flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <img
                              src={`/api/qr/${token.id}`}
                              alt="QR Code"
                              className="w-12 h-12 border border-slate-300 dark:border-slate-600 cursor-pointer hover:scale-105 transition-transform"
                              onClick={() => setSelectedToken(token)}
                            />
                            <div className="text-slate-900 dark:text-slate-100">
                              <div><code className="text-slate-600 dark:text-slate-400">{token.id.slice(-8)}</code></div>
                              <div className="font-medium">{token.prize.label}</div>
                              <div className="text-slate-500 dark:text-slate-400">Usos: {token.usedCount}/{token.maxUses || '∞'}</div>
                              <div className="text-slate-500 dark:text-slate-400">Expira: {new Date(token.expiresAt).toLocaleDateString('es-ES')}</div>
                            </div>
                          </div>
                          <a href={`/reusable/${token.id}`} target="_blank" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 ml-2 transition-colors">
                            Ver Token
                          </a>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Gestión de Premios */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Premios Reutilizables</h2>
        </div>
        <div className="card-body">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Label</label>
              <input
                type="text"
                className="input w-full"
                value={prizeForm.label}
                onChange={e => setPrizeForm({ ...prizeForm, label: e.target.value })}
                placeholder="Nombre del premio"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Color (opcional)</label>
              <input
                type="text"
                className="input w-full"
                value={prizeForm.color}
                onChange={e => setPrizeForm({ ...prizeForm, color: e.target.value })}
                placeholder="#FF0000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Stock (opcional)</label>
              <input
                type="number"
                className="input w-full"
                value={prizeForm.stock}
                onChange={e => setPrizeForm({ ...prizeForm, stock: e.target.value })}
                min={0}
              />
            </div>
          </div>
          <div className="flex gap-2 mb-6">
            <button onClick={savePrize} className="btn">
              {prizeForm.editingId ? 'Actualizar Premio' : 'Crear Premio'}
            </button>
            {prizeForm.editingId && (
              <button
                onClick={() => setPrizeForm({ label: '', color: '', stock: '', editingId: null })}
                className="btn-secondary"
              >
                Cancelar
              </button>
            )}
          </div>

          {/* Lista de Premios */}
          {prizes.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">No hay premios reutilizables</p>
          ) : (
            <div className="space-y-2">
              {prizes.map(prize => (
                <div key={prize.id} className="flex justify-between items-center border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-800">
                  <div className="text-slate-900 dark:text-slate-100">
                    <span className="font-semibold">{prize.label}</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400 ml-2">({prize.key})</span>
                    {prize.color && <span className="ml-2 text-xs" style={{ color: prize.color }}>●</span>}
                    {prize.stock !== null && <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">Stock: {prize.stock}</span>}
                    <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">Emitidos: {prize.emittedTotal}</span>
                    {!prize.active && <span className="ml-2 text-red-500 dark:text-red-400 text-sm">Inactivo</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => editPrize(prize)} className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
                      Editar
                    </button>
                    <button onClick={() => deletePrize(prize.id)} className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors">
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Preview QR */}
      {selectedToken && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-lg">Vista Previa QR</h3>
              <button
                onClick={() => setSelectedToken(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 flex flex-col items-center gap-4">
              <div className="text-center">
                <div className="text-sm font-mono text-slate-500 dark:text-slate-400 mb-2">
                  Token: {selectedToken.id}
                </div>
                <div className="flex flex-col items-center gap-3 mb-4 p-4 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-700 rounded-lg shadow-md">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-5 h-5 rounded-full shadow-lg ring-2 ring-white dark:ring-slate-600"
                      style={{ backgroundColor: selectedToken.prize?.color || '#666' }}
                    ></div>
                  </div>
                  <span className="text-slate-900 dark:text-white font-bold text-center leading-tight break-words hyphens-auto max-w-full text-lg uppercase tracking-wide">
                    {selectedToken.prize?.label}
                  </span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border-2 border-slate-200 dark:border-slate-600">
                <img
                  src={`/api/qr/${selectedToken.id}`}
                  alt={`QR para token ${selectedToken.id}`}
                  className="w-48 h-48"
                />
              </div>

              <div className="text-center text-sm text-slate-600 dark:text-slate-400 mb-4">
                <div>Escanea este código QR para acceder al token reutilizable</div>
                <div className="font-mono text-xs mt-1 break-all">
                  {window.location.origin}/reusable/{selectedToken.id}
                </div>
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = `/api/qr/${selectedToken.id}`;
                    link.download = `qr-${selectedToken.id}.png`;
                    link.click();
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  📥 Descargar
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/reusable/${selectedToken.id}`);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  📋 Copiar enlace
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}