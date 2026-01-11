'use client';

import { useState, useEffect } from 'react';

interface ReusablePrize {
  id: string;
  key: string;
  label: string;
  color: string | null;
  description: string | null;
  active: boolean;
  createdAt: string;
}

interface IndividualToken {
  id: string;
  qrUrl: string;
  prize: { id: string; label: string; key?: string; color?: string };
  maxUses: number;
  usedCount?: number;
  expiresAt: string;
  startTime?: string | null;
  endTime?: string | null;
  createdAt?: string;
  deliveryNote?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ReusableTokensAdmin() {
  const [prizes, setPrizes] = useState<ReusablePrize[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [individualToken, setIndividualToken] = useState<IndividualToken | null>(null);
  const [recentTokens, setRecentTokens] = useState<IndividualToken[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [prizesDropdownOpen, setPrizesDropdownOpen] = useState(false);
  const [prizeForm, setPrizeForm] = useState({
    label: '',
    key: '',
    color: '',
    description: ''
  });
  const [editingPrize, setEditingPrize] = useState<ReusablePrize | null>(null);
  const [individualForm, setIndividualForm] = useState({
    prizeId: '',
    maxUses: 1,
    description: '',
    validityMode: 'byDays' as 'byDays' | 'expires_at' | 'time_window',
    expirationDays: 30,
    expiresAt: '',
    startTime: '18:00',
    endTime: '24:00'
  });

  useEffect(() => {
    fetchPrizes();
    fetchRecentTokens(currentPage);
    // Limpiar localStorage ya que ahora usamos la API de tokens recientes
    localStorage.removeItem('lastGeneratedToken');
  }, [currentPage]);

  // Cerrar desplegable de premios al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.prizes-dropdown')) {
        setPrizesDropdownOpen(false);
      }
    };

    if (prizesDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [prizesDropdownOpen]);

  const fetchPrizes = async () => {
    const res = await fetch('/api/admin/reusable-prizes');
    if (res.ok) {
      const data = await res.json();
      setPrizes(data);
    }
    setLoading(false);
  };

  const fetchRecentTokens = async (page: number = 1) => {
    try {
      const res = await fetch(`/api/admin/reusable-tokens/recent?page=${page}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setRecentTokens(data.tokens || []);
        setPagination(data.pagination);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error fetching recent tokens:', error);
    }
  };

  const savePrize = async () => {
    if (!prizeForm.label.trim() || !prizeForm.key.trim()) {
      alert('Label y key son requeridos');
      return;
    }

    const body = {
      label: prizeForm.label.trim(),
      key: prizeForm.key.trim(),
      color: prizeForm.color || null,
      description: prizeForm.description?.trim() || null
    };

    const res = await fetch('/api/admin/reusable-prizes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (res.ok) {
      alert('Premio creado exitosamente');
      setPrizeForm({ label: '', key: '', color: '', description: '' });
      fetchPrizes();
    } else {
      const error = await res.json();
      alert(error.error || 'Error creando premio');
    }
  };

  const editPrize = (prize: ReusablePrize) => {
    setEditingPrize(prize);
    setPrizeForm({
      label: prize.label,
      key: prize.key,
      color: prize.color || '',
      description: prize.description || ''
    });
  };

  const updatePrize = async () => {
    if (!editingPrize) return;
    if (!prizeForm.label.trim() || !prizeForm.key.trim()) {
      alert('Label y key son requeridos');
      return;
    }

    const body = {
      label: prizeForm.label.trim(),
      key: prizeForm.key.trim(),
      color: prizeForm.color || null,
      description: prizeForm.description?.trim() || null
    };

    const res = await fetch(`/api/admin/reusable-prizes/${editingPrize.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (res.ok) {
      alert('Premio actualizado exitosamente');
      setEditingPrize(null);
      setPrizeForm({ label: '', key: '', color: '', description: '' });
      fetchPrizes();
    } else {
      const error = await res.json();
      alert(error.error || 'Error actualizando premio');
    }
  };

  const deletePrize = async (prizeId: string) => {
    const prize = prizes.find(p => p.id === prizeId);
    if (!prize) return;

    if (!confirm(`¿Eliminar el premio "${prize.label}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    const res = await fetch(`/api/admin/reusable-prizes/${prizeId}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      alert('Premio eliminado exitosamente');
      fetchPrizes();
    } else {
      const error = await res.json();
      alert(error.error || 'Error eliminando premio');
    }
  };

  const cancelEdit = () => {
    setEditingPrize(null);
    setPrizeForm({ label: '', key: '', color: '', description: '' });
  };

  const generateIndividualToken = async () => {
    if (!individualForm.prizeId) {
      alert('Selecciona un premio');
      return;
    }

    if (individualForm.validityMode === 'expires_at' && !individualForm.expiresAt) {
      alert('Selecciona fecha de expiración');
      return;
    }

    if (individualForm.validityMode === 'time_window' && (!individualForm.startTime || !individualForm.endTime)) {
      alert('Selecciona horas de inicio y fin para la ventana horaria');
      return;
    }

    setGenerating(true);
    try {
      let validity;
      if (individualForm.validityMode === 'byDays') {
        validity = { type: 'duration_days', durationDays: individualForm.expirationDays };
      } else if (individualForm.validityMode === 'expires_at') {
        validity = { type: 'expires_at', expiresAt: individualForm.expiresAt };
      } else if (individualForm.validityMode === 'time_window') {
        validity = { type: 'time_window', startTime: individualForm.startTime, endTime: individualForm.endTime };
      }

      const body = {
        prizeId: individualForm.prizeId,
        maxUses: individualForm.maxUses,
        description: individualForm.description.trim() || `Token individual generado ${new Date().toLocaleString()}`,
        validity
      };

      const res = await fetch('/api/admin/reusable-tokens/generate-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const data = await res.json();
        setIndividualToken(data.token);
        // Recargar tokens recientes
        fetchRecentTokens(currentPage);
        alert('Token individual generado exitosamente');
      } else {
        const error = await res.json();
        alert(error.error || 'Error generando token');
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Tokens Reusables Individuales</h1>
      </div>

      {/* Gestión de Premios */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Premios para Tokens Reusables</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Gestiona los premios específicos para tokens reusables</p>
        </div>
        <div className="card-body">
          {/* Formulario para crear premio */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Label *</label>
              <input
                type="text"
                className="input w-full"
                value={prizeForm.label}
                onChange={e => setPrizeForm({ ...prizeForm, label: e.target.value })}
                placeholder="Nombre del premio"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Key *</label>
              <input
                type="text"
                className="input w-full"
                value={prizeForm.key}
                onChange={e => setPrizeForm({ ...prizeForm, key: e.target.value.toUpperCase() })}
                placeholder="Identificador único"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Color</label>
              <input
                type="color"
                className="input w-full h-10"
                value={prizeForm.color}
                onChange={e => setPrizeForm({ ...prizeForm, color: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              {editingPrize ? (
                <div className="flex gap-2 w-full">
                  <button
                    onClick={updatePrize}
                    className="btn flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    Actualizar Premio
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="btn flex-1 bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={savePrize}
                  className="btn w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Crear Premio
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
            <textarea
              className="input w-full"
              value={prizeForm.description}
              onChange={e => setPrizeForm({ ...prizeForm, description: e.target.value })}
              placeholder="Descripción opcional del premio"
              rows={2}
            />
          </div>

          {/* Lista de premios */}
          <div className="mt-6">
            <div className="relative prizes-dropdown">
              <button
                onClick={() => setPrizesDropdownOpen(!prizesDropdownOpen)}
                className="w-full flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="text-md font-semibold text-slate-900 dark:text-slate-100">
                  Premios Disponibles ({prizes.length})
                </span>
                <svg
                  className={`w-5 h-5 transition-transform ${prizesDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {prizesDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                  {prizes.length === 0 ? (
                    <div className="p-4 text-slate-500 dark:text-slate-400 text-center">
                      No hay premios creados aún
                    </div>
                  ) : (
                    <div className="py-2">
                      {prizes.map(prize => (
                        <div key={prize.id} className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div
                                className="w-4 h-4 rounded-full flex-shrink-0"
                                style={{ backgroundColor: prize.color || '#666' }}
                              />
                              <div className="flex-1">
                                <div className="font-medium text-slate-900 dark:text-slate-100">{prize.label}</div>
                                <div className="text-sm text-slate-600 dark:text-slate-400">
                                  Key: <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded text-xs">{prize.key}</code>
                                </div>
                                {prize.description && (
                                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">{prize.description}</div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  editPrize(prize);
                                  setPrizesDropdownOpen(false);
                                }}
                                className="btn-sm bg-blue-600 hover:bg-blue-700 text-white"
                                title="Editar premio"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deletePrize(prize.id);
                                }}
                                className="btn-sm bg-red-600 hover:bg-red-700 text-white"
                                title="Eliminar premio"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            Estado: <span className={`font-medium ${prize.active ? 'text-green-600' : 'text-red-600'}`}>
                              {prize.active ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Generar Token Individual */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Generar Token Individual</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Crea un solo token reutilizable sin lote</p>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Premio</label>
              <select
                className="input w-full"
                value={individualForm.prizeId}
                onChange={e => setIndividualForm({ ...individualForm, prizeId: e.target.value })}
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
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Usos Máximos</label>
              <input
                type="number"
                className="input w-full"
                value={individualForm.maxUses}
                onChange={e => setIndividualForm({ ...individualForm, maxUses: Number(e.target.value) })}
                min={1}
                max={100}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción (opcional)</label>
              <input
                type="text"
                className="input w-full"
                value={individualForm.description}
                onChange={e => setIndividualForm({ ...individualForm, description: e.target.value })}
                placeholder="Descripción del token"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Modo de Validez</label>
              <div className="flex flex-wrap gap-4">
                <label>
                  <input
                    type="radio"
                    name="individualValidity"
                    value="byDays"
                    checked={individualForm.validityMode === 'byDays'}
                    onChange={() => setIndividualForm({ ...individualForm, validityMode: 'byDays' })}
                  /> Por días
                </label>
                <label>
                  <input
                    type="radio"
                    name="individualValidity"
                    value="expires_at"
                    checked={individualForm.validityMode === 'expires_at'}
                    onChange={() => setIndividualForm({ ...individualForm, validityMode: 'expires_at' })}
                  /> Fecha específica
                </label>
                <label>
                  <input
                    type="radio"
                    name="individualValidity"
                    value="time_window"
                    checked={individualForm.validityMode === 'time_window'}
                    onChange={() => setIndividualForm({ ...individualForm, validityMode: 'time_window' })}
                  /> Ventana horaria
                </label>
              </div>
            </div>

            {individualForm.validityMode === 'byDays' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Días de expiración</label>
                <input
                  type="number"
                  className="input w-full"
                  value={individualForm.expirationDays}
                  onChange={e => setIndividualForm({ ...individualForm, expirationDays: Number(e.target.value) })}
                  min={1}
                />
              </div>
            )}

            {individualForm.validityMode === 'expires_at' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha de expiración</label>
                <input
                  type="datetime-local"
                  className="input w-full"
                  value={individualForm.expiresAt}
                  onChange={e => setIndividualForm({ ...individualForm, expiresAt: e.target.value })}
                />
              </div>
            )}

            {individualForm.validityMode === 'time_window' && (
              <div className="md:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hora de inicio</label>
                    <input
                      type="time"
                      className="input w-full"
                      value={individualForm.startTime}
                      onChange={e => setIndividualForm({ ...individualForm, startTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hora de fin</label>
                    <input
                      type="time"
                      className="input w-full"
                      value={individualForm.endTime}
                      onChange={e => setIndividualForm({ ...individualForm, endTime: e.target.value })}
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  El token será válido todos los días entre estas horas (zona horaria Lima)
                </p>
              </div>
            )}

            <div className="md:col-span-2">
              <button
                onClick={generateIndividualToken}
                disabled={generating}
                className="btn w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {generating ? 'Generando...' : 'Generar Token Individual'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Token Individual Generado */}
      {individualToken && (
        <div className="card border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-green-800 dark:text-green-200">¡Token Generado Exitosamente!</h2>
            <p className="text-sm text-green-700 dark:text-green-300">El token también aparece en la lista de tokens recientes abajo</p>
          </div>
          <div className="card-body">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {individualToken.prize.color && (
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: individualToken.prize.color }}
                    />
                  )}
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {individualToken.prize.label}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      ID: {individualToken.id}
                    </div>
                  </div>
                </div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-2">
                  Usos: {individualToken.usedCount || 0}/{individualToken.maxUses}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  <strong>Expira:</strong> {new Date(individualToken.expiresAt).toLocaleString('es-ES', { timeZone: 'America/Lima' })}
                </div>
                {individualToken.startTime && individualToken.endTime && (
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    <strong>Horario válido:</strong> {new Date(individualToken.startTime).toLocaleTimeString('es-ES', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' })} - {new Date(individualToken.endTime).toLocaleTimeString('es-ES', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' })} (Lima)
                  </div>
                )}
                {individualToken.deliveryNote && (
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    <strong>Nota:</strong> {individualToken.deliveryNote}
                  </div>
                )}
                <div className="flex gap-2">
                  <a
                    href={individualToken.qrUrl}
                    target="_blank"
                    className="btn-sm bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Ver Token
                  </a>
                  <button
                    onClick={() => navigator.clipboard.writeText(individualToken.qrUrl)}
                    className="btn-sm bg-slate-600 hover:bg-slate-700 text-white"
                  >
                    Copiar URL
                  </button>
                  <button
                    onClick={() => setIndividualToken(null)}
                    className="btn-sm bg-slate-500 hover:bg-slate-600 text-white"
                  >
                    Ocultar
                  </button>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border-2 border-slate-200 dark:border-slate-600">
                <img
                  src={`/api/qr/${individualToken.id}?t=${Date.now()}`}
                  alt={`QR para token ${individualToken.id}`}
                  className="w-32 h-32"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Todos los Tokens */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Todos los Tokens</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Lista completa de tokens generados con paginación</p>
        </div>
        <div className="card-body">
          {recentTokens.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">No hay tokens generados aún</p>
          ) : (
            <div className="space-y-4">
              {recentTokens.map(token => (
                <div key={token.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Token Info */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {token.prize.color && (
                            <div
                              className="w-4 h-4 rounded-full flex-shrink-0"
                              style={{ backgroundColor: token.prize.color }}
                            />
                          )}
                          <div>
                            <div className="font-medium text-slate-900 dark:text-slate-100">
                              {token.prize.label}
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                              ID: {token.id}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-1">
                            Usos: {token.usedCount || 0}/{token.maxUses}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            Expira: {new Date(token.expiresAt).toLocaleString('es-ES', { timeZone: 'America/Lima' })}
                          </div>
                          {token.startTime && token.endTime && (
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                              Horario: {new Date(token.startTime).toLocaleTimeString('es-ES', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' })} - {new Date(token.endTime).toLocaleTimeString('es-ES', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                      </div>
                      {token.deliveryNote && (
                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                          Nota: {token.deliveryNote}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <a
                          href={token.qrUrl}
                          target="_blank"
                          className="btn-sm bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Ver Token
                        </a>
                        <button
                          onClick={() => navigator.clipboard.writeText(token.qrUrl)}
                          className="btn-sm bg-slate-600 hover:bg-slate-700 text-white"
                        >
                          Copiar URL
                        </button>
                      </div>
                    </div>

                    {/* QR Preview */}
                    <div className="flex-shrink-0">
                      <div className="bg-white p-2 rounded-lg border border-slate-200 dark:border-slate-600">
                        <img
                          src={`/api/qr/${token.id}?t=${Date.now()}`}
                          alt={`QR para ${token.prize.label}`}
                          className="w-20 h-20 object-contain"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Mostrando {recentTokens.length} de {pagination.total} tokens
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchRecentTokens(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="btn-sm bg-slate-600 hover:bg-slate-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white"
                >
                  Anterior
                </button>
                <span className="text-sm text-slate-600 dark:text-slate-400 px-3">
                  Página {currentPage} de {pagination.totalPages}
                </span>
                <button
                  onClick={() => fetchRecentTokens(currentPage + 1)}
                  disabled={currentPage >= pagination.totalPages}
                  className="btn-sm bg-slate-600 hover:bg-slate-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-amber-600 dark:text-amber-400">Nota Importante</h2>
        </div>
        <div className="card-body">
          <p className="text-slate-600 dark:text-slate-400">
            La funcionalidad anterior de lotes ha sido eliminada. Ahora solo se generan tokens individuales.
            Los tokens existentes siguen funcionando normalmente.
          </p>
        </div>
      </div>
    </div>
  );
}