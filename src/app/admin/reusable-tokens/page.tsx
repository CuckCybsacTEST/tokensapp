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

interface TokenGroup {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  createdAt: string;
  tokens: GroupToken[];
  _count: { tokens: number };
}

interface GroupToken {
  id: string;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  startTime?: string | null;
  endTime?: string | null;
  createdAt: string;
  deliveryNote?: string | null;
  redeemedAt?: string | null;
  deliveredAt?: string | null;
  prize: { id: string; label: string; key: string; color?: string | null };
}

interface IndividualToken {
  id: string;
  qrUrl: string;
  prize: { id: string; label: string; key?: string; color?: string };
  group?: { id: string; name: string; color?: string } | null;
  maxUses: number;
  usedCount?: number;
  expiresAt: string;
  startTime?: string | null;
  endTime?: string | null;
  createdAt?: string;
  deliveryNote?: string;
  redeemedAt?: string | null;
  deliveredAt?: string | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ReusableTokensAdmin() {
  const [prizes, setPrizes] = useState<ReusablePrize[]>([]);
  const [groups, setGroups] = useState<TokenGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [individualToken, setIndividualToken] = useState<IndividualToken | null>(null);
  const [recentTokens, setRecentTokens] = useState<IndividualToken[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTokenIds, setSelectedTokenIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [prizesDropdownOpen, setPrizesDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'premios' | 'grupos' | 'tokens'>('premios');
  const [groupForm, setGroupForm] = useState({ name: '', description: '', color: '' });
  const [editingGroup, setEditingGroup] = useState<TokenGroup | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
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
    groupId: '',
    validityMode: 'byDays' as 'byDays' | 'expires_at' | 'time_window',
    expirationDays: 30,
    expiresAt: '',
    startTime: '18:00',
    endTime: '24:00'
  });

  // History modal state
  const [historyModal, setHistoryModal] = useState<{ tokenId: string; open: boolean; loading: boolean; data: any } | null>(null);

  useEffect(() => {
    fetchPrizes();
    fetchGroups();
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

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/admin/token-groups');
      if (res.ok) {
        const data = await res.json();
        console.log('[fetchGroups] Grupos recibidos:', data);
        setGroups(data);
      } else {
        console.log('[fetchGroups] Error en respuesta:', res.status);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const saveGroup = async () => {
    if (!groupForm.name.trim()) {
      alert('El nombre del grupo es requerido');
      return;
    }

    const body = {
      name: groupForm.name.trim(),
      description: groupForm.description?.trim() || null,
      color: groupForm.color || null
    };

    const res = await fetch('/api/admin/token-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (res.ok) {
      alert('Grupo creado exitosamente');
      setGroupForm({ name: '', description: '', color: '' });
      fetchGroups();
    } else {
      const error = await res.json();
      alert(error.error || 'Error creando grupo');
    }
  };

  const editGroup = (group: TokenGroup) => {
    setEditingGroup(group);
    setGroupForm({
      name: group.name,
      description: group.description || '',
      color: group.color || ''
    });
  };

  const updateGroup = async () => {
    if (!editingGroup) return;
    if (!groupForm.name.trim()) {
      alert('El nombre del grupo es requerido');
      return;
    }

    const body = {
      name: groupForm.name.trim(),
      description: groupForm.description?.trim() || null,
      color: groupForm.color || null
    };

    const res = await fetch(`/api/admin/token-groups/${editingGroup.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (res.ok) {
      alert('Grupo actualizado exitosamente');
      setEditingGroup(null);
      setGroupForm({ name: '', description: '', color: '' });
      fetchGroups();
    } else {
      const error = await res.json();
      alert(error.error || 'Error actualizando grupo');
    }
  };

  const deleteGroup = async (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    if (!confirm(`¿Eliminar el grupo "${group.name}"? Los tokens del grupo no serán eliminados.`)) {
      return;
    }

    const res = await fetch(`/api/admin/token-groups/${groupId}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      alert('Grupo eliminado exitosamente');
      fetchGroups();
    } else {
      const error = await res.json();
      alert(error.error || 'Error eliminando grupo');
    }
  };

  const cancelEditGroup = () => {
    setEditingGroup(null);
    setGroupForm({ name: '', description: '', color: '' });
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

      const body: any = {
        prizeId: individualForm.prizeId,
        maxUses: individualForm.maxUses,
        description: individualForm.description.trim() || `Token individual generado ${new Date().toLocaleString()}`,
        validity
      };
      if (individualForm.groupId) {
        body.groupId = individualForm.groupId;
      }

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

  const toggleTokenSelection = (tokenId: string) => {
    setSelectedTokenIds(prev => {
      const next = new Set(prev);
      if (next.has(tokenId)) next.delete(tokenId);
      else next.add(tokenId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedTokenIds.size === recentTokens.length) {
      setSelectedTokenIds(new Set());
    } else {
      setSelectedTokenIds(new Set(recentTokens.map(t => t.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTokenIds.size === 0) return;
    if (!confirm(`¿Eliminar ${selectedTokenIds.size} token(es) seleccionado(s)? Los tokens con canjes serán omitidos.`)) return;
    setBulkDeleting(true);
    try {
      const res = await fetch('/api/admin/reusable-tokens/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenIds: Array.from(selectedTokenIds) }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        setSelectedTokenIds(new Set());
        fetchRecentTokens(currentPage);
      } else {
        alert(data.error || 'Error al eliminar');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setBulkDeleting(false);
    }
  };

  const assignTokenToGroup = async (tokenId: string, groupId: string) => {
    try {
      const res = await fetch(`/api/admin/token-groups/${groupId}/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenIds: [tokenId] })
      });
      if (res.ok) {
        fetchRecentTokens(currentPage);
        fetchGroups();
      } else {
        const err = await res.json();
        alert(err.error || 'Error asignando token al grupo');
      }
    } catch { alert('Error de red'); }
  };

  const removeTokenFromGroup = async (tokenId: string, groupId: string) => {
    try {
      const res = await fetch(`/api/admin/token-groups/${groupId}/tokens`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenIds: [tokenId] })
      });
      if (res.ok) {
        fetchRecentTokens(currentPage);
        fetchGroups();
      } else {
        const err = await res.json();
        alert(err.error || 'Error removiendo token del grupo');
      }
    } catch { alert('Error de red'); }
  };

  const fetchHistory = async (tokenId: string) => {
    setHistoryModal({ tokenId, open: true, loading: true, data: null });
    try {
      const res = await fetch(`/api/admin/reusable-tokens/${tokenId}/history`);
      if (res.ok) {
        const data = await res.json();
        setHistoryModal({ tokenId, open: true, loading: false, data });
      } else {
        setHistoryModal({ tokenId, open: true, loading: false, data: null });
      }
    } catch {
      setHistoryModal({ tokenId, open: true, loading: false, data: null });
    }
  };

  if (loading) return <div className="text-slate-900 dark:text-slate-100">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Tokens Reusables Individuales</h1>
      </div>

      {/* Pestañas de navegación */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('premios')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'premios'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            🏆 Gestión de Premios
          </button>
          <button
            onClick={() => setActiveTab('grupos')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'grupos'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            📁 Gestión de Grupos
          </button>
          <button
            onClick={() => setActiveTab('tokens')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'tokens'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            🎫 Gestión de Tokens
          </button>
        </nav>
      </div>

      {/* ==================== PESTAÑA: GESTIÓN DE PREMIOS ==================== */}
      {activeTab === 'premios' && (
        <>
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
        </>
      )}

      {/* ==================== PESTAÑA: GESTIÓN DE GRUPOS ==================== */}
      {activeTab === 'grupos' && (
        <>
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Grupos de Tokens</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">Organiza tus tokens en grupos personalizados</p>
            </div>
            <div className="card-body">
              {/* Formulario para crear/editar grupo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre del Grupo *</label>
                  <input
                    type="text"
                    className="input w-full"
                    value={groupForm.name}
                    onChange={e => setGroupForm({ ...groupForm, name: e.target.value })}
                    placeholder="Ej: PROMOS BARRA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Color</label>
                  <input
                    type="color"
                    className="input w-full h-10"
                    value={groupForm.color || '#3b82f6'}
                    onChange={e => setGroupForm({ ...groupForm, color: e.target.value })}
                  />
                </div>
                <div className="flex items-end">
                  {editingGroup ? (
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={updateGroup}
                        className="btn flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        Actualizar
                      </button>
                      <button
                        onClick={cancelEditGroup}
                        className="btn flex-1 bg-gray-600 hover:bg-gray-700 text-white"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={saveGroup}
                      className="btn w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Crear Grupo
                    </button>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción (opcional)</label>
                <textarea
                  className="input w-full"
                  value={groupForm.description}
                  onChange={e => setGroupForm({ ...groupForm, description: e.target.value })}
                  placeholder="Descripción del grupo"
                  rows={2}
                />
              </div>

              {/* Lista de grupos */}
              <div>
                <h3 className="text-md font-semibold text-slate-900 dark:text-slate-100 mb-4">
                  Grupos Existentes ({groups.length})
                </h3>
                {groups.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    No hay grupos creados aún
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groups.map(group => {
                      const isExpanded = expandedGroups.has(group.id);
                      return (
                        <div 
                          key={group.id} 
                          className="border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 overflow-hidden"
                        >
                          {/* Header del grupo */}
                          <div className="p-4 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                            <div 
                              className="flex items-center gap-3 cursor-pointer flex-1"
                              onClick={() => {
                                const newExpanded = new Set(expandedGroups);
                                if (isExpanded) {
                                  newExpanded.delete(group.id);
                                } else {
                                  newExpanded.add(group.id);
                                }
                                setExpandedGroups(newExpanded);
                              }}
                            >
                              <svg
                                className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <div
                                className="w-4 h-4 rounded-full flex-shrink-0"
                                style={{ backgroundColor: group.color || '#3b82f6' }}
                              />
                              <div>
                                <h4 className="font-medium text-slate-900 dark:text-slate-100">{group.name}</h4>
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                  {group._count?.tokens || group.tokens?.length || 0} tokens
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => editGroup(group)}
                                className="btn-sm bg-blue-600 hover:bg-blue-700 text-white"
                                title="Editar grupo"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => deleteGroup(group.id)}
                                className="btn-sm bg-red-600 hover:bg-red-700 text-white"
                                title="Eliminar grupo"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                          
                          {/* Descripción */}
                          {group.description && (
                            <div className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                              {group.description}
                            </div>
                          )}
                          
                          {/* Lista de tokens expandible */}
                          {isExpanded && (
                            <div className="p-4">
                              {(!group.tokens || group.tokens.length === 0) ? (
                                <div className="text-center py-4 text-slate-500 dark:text-slate-400">
                                  No hay tokens en este grupo
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {group.tokens.map(token => (
                                    <div 
                                      key={token.id}
                                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div
                                          className="w-3 h-3 rounded-full flex-shrink-0"
                                          style={{ backgroundColor: token.prize.color || '#666' }}
                                        />
                                        <div>
                                          <div className="font-medium text-sm text-slate-900 dark:text-slate-100">
                                            {token.prize.label}
                                          </div>
                                          <div className="text-xs text-slate-500 dark:text-slate-400">
                                            ID: {token.id.slice(0, 8)}...
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <div className="text-right">
                                          <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                            {token.usedCount || 0}/{token.maxUses} usos
                                          </div>
                                          <div className="text-xs text-slate-500 dark:text-slate-400">
                                            Expira: {new Date(token.expiresAt).toLocaleDateString('es-ES')}
                                          </div>
                                          {(() => {
                                            const lastDate = token.deliveredAt || token.redeemedAt;
                                            if (lastDate) return (
                                              <div className="text-xs text-emerald-600 dark:text-emerald-400">
                                                Últ. canje: {new Date(lastDate).toLocaleString('es-ES', { timeZone: 'America/Lima' })}
                                              </div>
                                            );
                                            if ((token.usedCount || 0) > 0) return (
                                              <div className="text-xs text-amber-500 dark:text-amber-400 italic">
                                                {token.usedCount} canjes (sin fecha registrada)
                                              </div>
                                            );
                                            return (
                                              <div className="text-xs text-slate-400 dark:text-slate-500 italic">
                                                Sin canjes
                                              </div>
                                            );
                                          })()}
                                        </div>
                                        <a
                                          href={`/reusable/${token.id}`}
                                          target="_blank"
                                          className="btn-sm bg-slate-600 hover:bg-slate-700 text-white"
                                          title="Ver token"
                                        >
                                          👁️
                                        </a>
                                        <button
                                          onClick={() => fetchHistory(token.id)}
                                          className="btn-sm bg-indigo-600 hover:bg-indigo-700 text-white"
                                          title="Historial de canjes"
                                        >
                                          📋
                                        </button>
                                        <button
                                          onClick={() => removeTokenFromGroup(token.id, group.id)}
                                          className="btn-sm bg-amber-600 hover:bg-amber-700 text-white"
                                          title="Quitar del grupo"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ==================== PESTAÑA: GESTIÓN DE TOKENS ==================== */}
      {activeTab === 'tokens' && (
        <>
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
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Grupo (opcional)</label>
              <select
                className="input w-full"
                value={individualForm.groupId}
                onChange={e => setIndividualForm({ ...individualForm, groupId: e.target.value })}
              >
                <option value="">Sin grupo</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
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
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Todos los Tokens</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">Lista completa de tokens generados con paginación</p>
            </div>
            {recentTokens.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTokenIds.size === recentTokens.length && recentTokens.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300"
                  />
                  Seleccionar todos
                </label>
                {selectedTokenIds.size > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                    className="btn-sm bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                  >
                    {bulkDeleting ? 'Eliminando...' : `Eliminar (${selectedTokenIds.size})`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="card-body">
          {recentTokens.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">No hay tokens generados aún</p>
          ) : (
            <div className="space-y-4">
              {recentTokens.map(token => (
                <div key={token.id} className={`p-4 border rounded-lg bg-white dark:bg-slate-800 ${selectedTokenIds.has(token.id) ? 'border-blue-400 dark:border-blue-500 ring-1 ring-blue-400' : 'border-slate-200 dark:border-slate-700'}`}>
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Checkbox */}
                    <div className="flex items-start pt-1">
                      <input
                        type="checkbox"
                        checked={selectedTokenIds.has(token.id)}
                        onChange={() => toggleTokenSelection(token.id)}
                        className="rounded border-slate-300 cursor-pointer"
                      />
                    </div>
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
                            {token.group ? (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 mt-1">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: token.group.color || '#3b82f6' }} />
                                {token.group.name}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-1">
                            Usos: {token.usedCount || 0}/{token.maxUses}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            Expira: {new Date(token.expiresAt).toLocaleString('es-ES', { timeZone: 'America/Lima' })}
                          </div>
                          {(() => {
                            const lastDate = token.deliveredAt || token.redeemedAt;
                            if (lastDate) return (
                              <div className="text-sm text-emerald-600 dark:text-emerald-400">
                                Últ. canje: {new Date(lastDate).toLocaleString('es-ES', { timeZone: 'America/Lima' })}
                              </div>
                            );
                            if ((token.usedCount || 0) > 0) return (
                              <div className="text-sm text-amber-500 dark:text-amber-400 italic">
                                {token.usedCount} canjes (sin fecha registrada)
                              </div>
                            );
                            return (
                              <div className="text-sm text-slate-400 dark:text-slate-500 italic">
                                Sin canjes aún
                              </div>
                            );
                          })()}
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
                      <div className="flex flex-wrap gap-2 items-center">
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
                        {token.group ? (
                          <button
                            onClick={() => removeTokenFromGroup(token.id, token.group!.id)}
                            className="btn-sm bg-amber-600 hover:bg-amber-700 text-white"
                            title={`Quitar de grupo "${token.group.name}"`}
                          >
                            Quitar de grupo
                          </button>
                        ) : (
                          <select
                            className="text-xs border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                            value=""
                            onChange={e => { if (e.target.value) assignTokenToGroup(token.id, e.target.value); }}
                          >
                            <option value="">Asignar a grupo...</option>
                            {groups.map(g => (
                              <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                          </select>
                        )}
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
        </>
      )}

      {/* Modal Historial de Canjes */}
      {historyModal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setHistoryModal(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Historial de Canjes
              </h3>
              <button onClick={() => setHistoryModal(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xl">✕</button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {historyModal.loading ? (
                <div className="text-center py-8 text-slate-500">Cargando historial...</div>
              ) : !historyModal.data ? (
                <div className="text-center py-8 text-slate-500">Error cargando historial</div>
              ) : (
                <>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Token: <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded text-xs">{historyModal.tokenId}</code>
                    <span className="ml-3">Usos: <strong>{historyModal.data.usedCount}/{historyModal.data.maxUses}</strong></span>
                  </div>
                  {historyModal.data.redemptions.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 dark:text-slate-400 italic">
                      No hay registros de canjes aún.
                      {(historyModal.data.usedCount || 0) > 0 && (
                        <p className="mt-2 text-amber-500 text-xs">Los {historyModal.data.usedCount} canjes anteriores no tienen registro detallado (fueron antes de esta funcionalidad).</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {historyModal.data.redemptions.map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/30">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.type === 'deliver' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'}`}>
                              {r.type === 'deliver' ? 'Entrega' : 'Canje'}
                            </span>
                            {r.userId && <span className="text-xs text-slate-500 dark:text-slate-400">por {r.userId.slice(0, 8)}...</span>}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(r.createdAt).toLocaleString('es-ES', { timeZone: 'America/Lima' })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}