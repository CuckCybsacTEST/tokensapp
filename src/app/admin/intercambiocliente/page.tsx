'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

// ── Types ─────────────────────────────────────────────────────────────

interface Exchange {
  id: string;
  customerName: string;
  customerWhatsapp: string;
  customerDni: string | null;
  exchangeType: string;
  customerText: string | null;
  triviaSessionId: string | null;
  rewardTokenId: string | null;
  rewardDelivered: boolean;
  batchId: string | null;
  status: string;
  ipAddress: string | null;
  createdAt: string;
  completedAt: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  media: ExchangeMedia[];
  batch?: { id: string; name: string } | null;
}

interface ExchangeMedia {
  id: string;
  mediaType: string;
  imageUrl: string | null;
  originalImageUrl: string | null;
  thumbnailUrl: string | null;
}

interface Batch {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  rewardPrizeId: string | null;
  rewardGroupId: string | null;
  exchangeTypes: string;
  triviaQuestionSetId: string | null;
  maxExchanges: number | null;
  policyId: string | null;
  createdAt: string;
  _count?: { exchanges: number };
}

interface Policy {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  allowPhoto: boolean;
  allowVideo: boolean;
  allowText: boolean;
  allowTrivia: boolean;
  requireWhatsapp: boolean;
  requireDni: boolean;
  maxMediaSize: number;
  allowedMediaFormats: string;
  mediaQuality: number;
  maxMediaWidth: number;
  maxMediaHeight: number;
  maxVideoSize: number;
  allowedVideoFormats: string;
  rateLimitPerHour: number | null;
  maxExchangesPerUser: number | null;
  autoReward: boolean;
  triviaSetId: string | null;
  createdAt: string;
}

interface ReusablePrizeOption {
  id: string;
  key: string;
  label: string;
  color: string | null;
  description: string | null;
  active: boolean;
}

interface Stats {
  totalExchanges: number;
  pendingExchanges: number;
  approvedExchanges: number;
  rejectedExchanges: number;
  todayExchanges: number;
  activeBatches: number;
  typeBreakdown: Record<string, number>;
  recentExchanges: Exchange[];
}

interface TriviaSet {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  _count: { questions: number; sessions: number };
}

interface TriviaQuestion {
  id: string;
  question: string;
  order: number;
  active: boolean;
  pointsForCorrect: number;
  pointsForIncorrect: number;
  answers: TriviaAnswer[];
}

interface TriviaAnswer {
  id: string;
  answer: string;
  isCorrect: boolean;
  order: number;
}

// ── Helper formatting ─────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  };
  const labels: Record<string, string> = { pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado' };
  return `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`;
}

function typeBadge(type: string) {
  const icons: Record<string, string> = { photo: '📷', video: '🎥', text: '✍️', trivia: '🧠' };
  return `${icons[type] || '❓'} ${type}`;
}

// ── Main Page ─────────────────────────────────────────────────────────

export default function IntercambioClientePage() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams?.get('tab') as string) || 'intercambios';

  const [activeTab, setActiveTab] = useState<'intercambios' | 'lotes' | 'politicas' | 'trivia' | 'stats'>(
    ['intercambios', 'lotes', 'politicas', 'trivia', 'stats'].includes(initialTab) ? initialTab as any : 'intercambios'
  );

  // Trivia sets (for batch form selector + trivia tab)
  const [triviaSets, setTriviaSets] = useState<TriviaSet[]>([]);

  // Data
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [exchangeTotal, setExchangeTotal] = useState(0);
  const [exchangePage, setExchangePage] = useState(1);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterBatchId, setFilterBatchId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  // Forms
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);

  // Expanded exchange detail
  const [expandedExchange, setExpandedExchange] = useState<string | null>(null);

  // ── Fetch functions ─────────────────────────────────────────────

  const fetchExchanges = useCallback(async (page = 1) => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (filterBatchId) params.set('batchId', filterBatchId);
      if (filterStatus) params.set('status', filterStatus);
      if (filterType) params.set('exchangeType', filterType);
      const res = await fetch(`/api/admin/intercambio?${params}`);
      const data = await res.json();
      setExchanges(data.exchanges || []);
      setExchangeTotal(data.total || 0);
      setExchangePage(page);
    } catch (e) {
      console.error('Error fetching exchanges:', e);
    }
  }, [filterBatchId, filterStatus, filterType]);

  const fetchBatches = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/intercambio/batch');
      const data = await res.json();
      setBatches(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error fetching batches:', e);
    }
  }, []);

  const fetchPolicies = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/intercambio/policy');
      const data = await res.json();
      setPolicies(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error fetching policies:', e);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/intercambio/stats');
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error('Error fetching stats:', e);
    }
  }, []);

  const fetchTriviaSets = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/intercambio/trivia-sets');
      const data = await res.json();
      setTriviaSets(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error fetching trivia sets:', e);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchExchanges(), fetchBatches(), fetchPolicies(), fetchStats(), fetchTriviaSets()])
      .finally(() => setLoading(false));
  }, [fetchExchanges, fetchBatches, fetchPolicies, fetchStats, fetchTriviaSets]);

  useEffect(() => {
    fetchExchanges(1);
  }, [filterBatchId, filterStatus, filterType, fetchExchanges]);

  // ── CRUD: Review exchange ───────────────────────────────────────

  const reviewExchange = async (id: string, action: 'approve' | 'reject') => {
    const note = action === 'reject' ? prompt('Razón del rechazo (opcional):') : null;
    if (action === 'reject' && note === null) return; // cancelled

    try {
      const res = await fetch(`/api/admin/intercambio/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reviewNote: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Error'); return; }
      alert(data.message);
      fetchExchanges(exchangePage);
      fetchStats();
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  // ── CRUD: Batch ─────────────────────────────────────────────────

  const saveBatch = async (formData: any) => {
    try {
      const url = editingBatch
        ? `/api/admin/intercambio/batch/${editingBatch.id}`
        : '/api/admin/intercambio/batch';
      const method = editingBatch ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Error');
        return;
      }
      alert(editingBatch ? 'Lote actualizado' : 'Lote creado');
      setShowBatchForm(false);
      setEditingBatch(null);
      fetchBatches();
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const deleteBatch = async (id: string) => {
    if (!confirm('¿Eliminar este lote y todos sus intercambios?')) return;
    try {
      const res = await fetch(`/api/admin/intercambio/batch/${id}`, { method: 'DELETE' });
      if (!res.ok) { alert('Error eliminando'); return; }
      alert('Lote eliminado');
      fetchBatches();
      fetchExchanges(1);
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  // ── CRUD: Policy ────────────────────────────────────────────────

  const savePolicy = async (formData: any) => {
    try {
      const url = editingPolicy
        ? `/api/admin/intercambio/policy/${editingPolicy.id}`
        : '/api/admin/intercambio/policy';
      const method = editingPolicy ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Error');
        return;
      }
      alert(editingPolicy ? 'Política actualizada' : 'Política creada');
      setShowPolicyForm(false);
      setEditingPolicy(null);
      fetchPolicies();
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const deletePolicy = async (id: string) => {
    if (!confirm('¿Eliminar esta política?')) return;
    try {
      const res = await fetch(`/api/admin/intercambio/policy/${id}`, { method: 'DELETE' });
      if (!res.ok) { alert('Error eliminando'); return; }
      alert('Política eliminada');
      fetchPolicies();
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  // ── Loading ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500 dark:text-slate-400">Cargando...</p>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
          🔄 Intercambio Cliente
        </h1>
        <a
          href="/intercambio"
          target="_blank"
          className="btn btn-secondary text-sm"
        >
          🔗 Ver página pública
        </a>
      </div>

      {/* Tab bar */}
      <nav className="flex space-x-1 border-b border-gray-200 dark:border-slate-700">
        {[
          { key: 'intercambios', label: '📋 Intercambios' },
          { key: 'lotes', label: '📦 Lotes' },
          { key: 'politicas', label: '⚙️ Políticas' },
          { key: 'trivia', label: '🧠 Trivia' },
          { key: 'stats', label: '📊 Estadísticas' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      {activeTab === 'intercambios' && (
        <ExchangesTab
          exchanges={exchanges}
          total={exchangeTotal}
          page={exchangePage}
          batches={batches}
          filterBatchId={filterBatchId}
          filterStatus={filterStatus}
          filterType={filterType}
          onFilterBatch={setFilterBatchId}
          onFilterStatus={setFilterStatus}
          onFilterType={setFilterType}
          onPageChange={(p) => fetchExchanges(p)}
          onReview={reviewExchange}
          expandedExchange={expandedExchange}
          onToggleExpand={(id) => setExpandedExchange(expandedExchange === id ? null : id)}
        />
      )}

      {activeTab === 'lotes' && (
        <BatchesTab
          batches={batches}
          policies={policies}
          triviaSets={triviaSets}
          showForm={showBatchForm}
          editing={editingBatch}
          onShowForm={() => { setEditingBatch(null); setShowBatchForm(true); }}
          onEdit={(b) => { setEditingBatch(b); setShowBatchForm(true); }}
          onCancel={() => { setShowBatchForm(false); setEditingBatch(null); }}
          onSave={saveBatch}
          onDelete={deleteBatch}
        />
      )}

      {activeTab === 'politicas' && (
        <PoliciesTab
          policies={policies}
          triviaSets={triviaSets}
          showForm={showPolicyForm}
          editing={editingPolicy}
          onShowForm={() => { setEditingPolicy(null); setShowPolicyForm(true); }}
          onEdit={(p) => { setEditingPolicy(p); setShowPolicyForm(true); }}
          onCancel={() => { setShowPolicyForm(false); setEditingPolicy(null); }}
          onSave={savePolicy}
          onDelete={deletePolicy}
        />
      )}

      {activeTab === 'trivia' && (
        <TriviaTab triviaSets={triviaSets} onRefresh={fetchTriviaSets} />
      )}

      {activeTab === 'stats' && (
        <StatsTab stats={stats} onRefresh={fetchStats} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// ── Exchanges Tab ────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════

function ExchangesTab({
  exchanges, total, page, batches,
  filterBatchId, filterStatus, filterType,
  onFilterBatch, onFilterStatus, onFilterType,
  onPageChange, onReview, expandedExchange, onToggleExpand,
}: {
  exchanges: Exchange[]; total: number; page: number; batches: Batch[];
  filterBatchId: string; filterStatus: string; filterType: string;
  onFilterBatch: (v: string) => void; onFilterStatus: (v: string) => void; onFilterType: (v: string) => void;
  onPageChange: (p: number) => void;
  onReview: (id: string, action: 'approve' | 'reject') => void;
  expandedExchange: string | null;
  onToggleExpand: (id: string) => void;
}) {
  const pages = Math.ceil(total / 50);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Lote</label>
              <select
                className="input w-full"
                value={filterBatchId}
                onChange={e => onFilterBatch(e.target.value)}
              >
                <option value="">Todos los lotes</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Estado</label>
              <select
                className="input w-full"
                value={filterStatus}
                onChange={e => onFilterStatus(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="pending">Pendiente</option>
                <option value="approved">Aprobado</option>
                <option value="rejected">Rechazado</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Tipo</label>
              <select
                className="input w-full"
                value={filterType}
                onChange={e => onFilterType(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="photo">📷 Foto</option>
                <option value="video">🎥 Video</option>
                <option value="text">✍️ Texto</option>
                <option value="trivia">🧠 Trivia</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-500 dark:text-slate-400">
        {total} intercambio{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
      </p>

      {/* Exchange list */}
      <div className="space-y-3">
        {exchanges.map(ex => (
          <div key={ex.id} className="card">
            <div className="card-body">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 dark:text-slate-100">{ex.customerName}</span>
                    <span className={statusBadge(ex.status)}>{ex.status === 'pending' ? 'Pendiente' : ex.status === 'approved' ? 'Aprobado' : 'Rechazado'}</span>
                    <span className="text-xs bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{typeBadge(ex.exchangeType)}</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-slate-400 mt-1 space-x-3">
                    <span>📱 {ex.customerWhatsapp || '—'}</span>
                    {ex.batch && <span>📦 {ex.batch.name}</span>}
                    <span>🕐 {formatDate(ex.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {ex.status === 'pending' && (
                    <>
                      <button
                        onClick={() => onReview(ex.id, 'approve')}
                        className="btn btn-sm bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1 rounded"
                      >
                        ✅ Aprobar
                      </button>
                      <button
                        onClick={() => onReview(ex.id, 'reject')}
                        className="btn btn-sm bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded"
                      >
                        ❌ Rechazar
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => onToggleExpand(ex.id)}
                    className="btn btn-sm btn-secondary text-xs px-2 py-1 rounded"
                  >
                    {expandedExchange === ex.id ? '▲' : '▼'}
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {expandedExchange === ex.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 space-y-3">
                  {/* Text content */}
                  {ex.customerText && (
                    <div>
                      <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Texto:</span>
                      <p className="text-sm text-gray-700 dark:text-slate-300 mt-1 bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
                        {ex.customerText}
                      </p>
                    </div>
                  )}

                  {/* Media */}
                  {ex.media && ex.media.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Media:</span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                        {ex.media.map(m => (
                          <div key={m.id} className="rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700">
                            {m.mediaType === 'video' ? (
                              <video src={m.imageUrl || ''} controls className="w-full h-32 object-cover" />
                            ) : (
                              <a href={m.originalImageUrl || m.imageUrl || '#'} target="_blank" rel="noopener">
                                <img
                                  src={m.thumbnailUrl || m.imageUrl || ''}
                                  alt="Media"
                                  className="w-full h-32 object-cover hover:opacity-80 transition-opacity"
                                />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Extra info */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-slate-400">
                    {ex.customerDni && <div>🪪 DNI: {ex.customerDni}</div>}
                    {ex.rewardTokenId && <div>🎁 Token: {ex.rewardTokenId}</div>}
                    {ex.rewardDelivered && <div>✅ Premio entregado</div>}
                    {ex.reviewedBy && <div>👤 Revisado por: {ex.reviewedBy}</div>}
                    {ex.reviewNote && <div>📝 Nota: {ex.reviewNote}</div>}
                    {ex.completedAt && <div>✅ Completado: {formatDate(ex.completedAt)}</div>}
                    {ex.ipAddress && <div>🌐 IP: {ex.ipAddress}</div>}
                    <div>🆔 {ex.id}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            className="btn btn-sm btn-secondary"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            ← Anterior
          </button>
          <span className="text-sm text-gray-500 dark:text-slate-400">
            Página {page} de {pages}
          </span>
          <button
            className="btn btn-sm btn-secondary"
            disabled={page >= pages}
            onClick={() => onPageChange(page + 1)}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// ── Batches Tab ──────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════

function BatchesTab({
  batches, policies, triviaSets, showForm, editing,
  onShowForm, onEdit, onCancel, onSave, onDelete
}: {
  batches: Batch[]; policies: Policy[]; triviaSets: TriviaSet[];
  showForm: boolean; editing: Batch | null;
  onShowForm: () => void; onEdit: (b: Batch) => void;
  onCancel: () => void;
  onSave: (data: any) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-slate-400">{batches.length} lote{batches.length !== 1 ? 's' : ''}</p>
        <button onClick={onShowForm} className="btn btn-primary text-sm">
          ➕ Nuevo Lote
        </button>
      </div>

      {showForm && (
        <BatchForm
          initial={editing}
          policies={policies}
          triviaSets={triviaSets}
          onSave={onSave}
          onCancel={onCancel}
        />
      )}

      <div className="space-y-3">
        {batches.map(b => (
          <div key={b.id} className="card">
            <div className="card-body">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 dark:text-slate-100">{b.name}</h3>
                    {b.isActive ? (
                      <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 px-2 py-0.5 rounded-full">Activo</span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400 px-2 py-0.5 rounded-full">Inactivo</span>
                    )}
                  </div>
                  {b.description && <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{b.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-slate-400">
                    <span>📋 {b._count?.exchanges || 0} intercambios</span>
                    {b.maxExchanges && <span>📊 Máx: {b.maxExchanges}</span>}
                    {b.rewardPrizeId && <span>🎁 Premio: {b.rewardPrizeId.slice(0, 8)}...</span>}
                    {b.rewardGroupId && <span>👥 Grupo: {b.rewardGroupId.slice(0, 8)}...</span>}
                    <span>🕐 {formatDate(b.createdAt)}</span>
                  </div>
                  <div className="mt-2">
                    <code className="text-xs bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded select-all">
                      /intercambio?batchId={b.id}
                    </code>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => onEdit(b)} className="btn btn-sm btn-secondary text-xs">✏️</button>
                  <button onClick={() => onDelete(b.id)} className="btn btn-sm btn-danger text-xs">🗑️</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BatchForm({ initial, policies, triviaSets, onSave, onCancel }: {
  initial: Batch | null; policies: Policy[]; triviaSets: TriviaSet[];
  onSave: (data: any) => void; onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [rewardPrizeId, setRewardPrizeId] = useState(initial?.rewardPrizeId || '');
  const [rewardGroupId, setRewardGroupId] = useState(initial?.rewardGroupId || '');
  const [triviaQuestionSetId, setTriviaQuestionSetId] = useState(initial?.triviaQuestionSetId || '');
  const [maxExchanges, setMaxExchanges] = useState(initial?.maxExchanges?.toString() || '');
  const [policyId, setPolicyId] = useState(initial?.policyId || '');
  const [prizes, setPrizes] = useState<ReusablePrizeOption[]>([]);

  const loadPrizes = async () => {
    try {
      const res = await fetch('/api/admin/reusable-prizes');
      if (!res.ok) { console.error('Error fetching reusable prizes:', res.status); return; }
      const data: ReusablePrizeOption[] = await res.json();
      setPrizes(data.filter(p => p.active));
    } catch (err) {
      console.error('Error loading reusable prizes:', err);
    }
  };

  useEffect(() => {
    loadPrizes();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      description: description || null,
      isActive,
      rewardPrizeId: rewardPrizeId || null,
      rewardGroupId: rewardGroupId || null,
      triviaQuestionSetId: triviaQuestionSetId || null,
      maxExchanges: maxExchanges ? parseInt(maxExchanges) : null,
      policyId: policyId || null,
    });
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="font-medium">{initial ? '✏️ Editar Lote' : '➕ Nuevo Lote'}</h3>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre *</label>
              <input type="text" className="input w-full" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <input type="text" className="input w-full" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Máximo intercambios</label>
              <input type="number" className="input w-full" value={maxExchanges} onChange={e => setMaxExchanges(e.target.value)} placeholder="Sin límite" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Premio Reutilizable</label>
              <select className="input w-full" value={rewardPrizeId} onChange={e => setRewardPrizeId(e.target.value)}>
                <option value="">Sin premio reutilizable</option>
                {prizes.map(prize => (
                  <option key={prize.id} value={prize.id}>
                    {prize.label} ({prize.key})
                  </option>
                ))}
              </select>
              {prizes.length === 0 && (
                <p className="text-xs text-amber-500 mt-1">No hay premios reutilizables. Crea uno en Reusable Tokens.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ID Grupo (TokenGroup)</label>
              <input type="text" className="input w-full" value={rewardGroupId} onChange={e => setRewardGroupId(e.target.value)} placeholder="Opcional" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Set de Trivia</label>
              <select className="input w-full" value={triviaQuestionSetId} onChange={e => setTriviaQuestionSetId(e.target.value)}>
                <option value="">Sin trivia</option>
                {triviaSets.filter(s => s.active).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s._count.questions} preguntas)
                  </option>
                ))}
              </select>
              {triviaSets.filter(s => s.active).length === 0 && (
                <p className="text-xs text-amber-500 mt-1">No hay sets de trivia. Crea uno en la pestaña Trivia.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Política</label>
              <select className="input w-full" value={policyId} onChange={e => setPolicyId(e.target.value)}>
                <option value="">Política por defecto</option>
                {policies.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="batch-active" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
            <label htmlFor="batch-active" className="text-sm">Activo</label>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary text-sm">
              {initial ? 'Guardar cambios' : 'Crear lote'}
            </button>
            <button type="button" onClick={onCancel} className="btn btn-secondary text-sm">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// ── Policies Tab ─────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════

function PoliciesTab({
  policies, triviaSets, showForm, editing,
  onShowForm, onEdit, onCancel, onSave, onDelete
}: {
  policies: Policy[];
  triviaSets: TriviaSet[];
  showForm: boolean; editing: Policy | null;
  onShowForm: () => void; onEdit: (p: Policy) => void;
  onCancel: () => void;
  onSave: (data: any) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-slate-400">{policies.length} política{policies.length !== 1 ? 's' : ''}</p>
        <button onClick={onShowForm} className="btn btn-primary text-sm">
          ➕ Nueva Política
        </button>
      </div>

      {showForm && (
        <PolicyForm
          initial={editing}
          triviaSets={triviaSets}
          onSave={onSave}
          onCancel={onCancel}
        />
      )}

      <div className="space-y-3">
        {policies.map(p => (
          <div key={p.id} className="card">
            <div className="card-body">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 dark:text-slate-100">{p.name}</h3>
                    {p.isActive && <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 px-2 py-0.5 rounded-full">Activa</span>}
                    {p.isDefault && <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 px-2 py-0.5 rounded-full">Default</span>}
                  </div>
                  {p.description && <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{p.description}</p>}
                  <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500 dark:text-slate-400">
                    {p.allowPhoto && <span>📷 Foto</span>}
                    {p.allowVideo && <span>🎥 Video</span>}
                    {p.allowText && <span>✍️ Texto</span>}
                    {p.allowTrivia && <span>🧠 Trivia</span>}
                    <span>| 📐 {p.maxMediaWidth}×{p.maxMediaHeight}</span>
                    <span>| 🗜️ Q{p.mediaQuality}</span>
                    <span>| 📏 {Math.round(p.maxMediaSize / 1048576)}MB img</span>
                    <span>| 📏 {Math.round(p.maxVideoSize / 1048576)}MB vid</span>
                    {p.autoReward && <span>| 🤖 Auto-premio</span>}
                    {p.triviaSetId && <span>| 🧠 Trivia default</span>}
                    {p.requireWhatsapp && <span>| 📱 WA requerido</span>}
                    {p.requireDni && <span>| 🪪 DNI requerido</span>}
                    {p.rateLimitPerHour && <span>| ⏱️ {p.rateLimitPerHour}/h</span>}
                    {p.maxExchangesPerUser && <span>| 👤 Max {p.maxExchangesPerUser}/user</span>}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => onEdit(p)} className="btn btn-sm btn-secondary text-xs">✏️</button>
                  <button onClick={() => onDelete(p.id)} className="btn btn-sm btn-danger text-xs">🗑️</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PolicyForm({ initial, triviaSets, onSave, onCancel }: {
  initial: Policy | null;
  triviaSets: TriviaSet[];
  onSave: (data: any) => void; onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [allowPhoto, setAllowPhoto] = useState(initial?.allowPhoto ?? true);
  const [allowVideo, setAllowVideo] = useState(initial?.allowVideo ?? false);
  const [allowText, setAllowText] = useState(initial?.allowText ?? true);
  const [allowTrivia, setAllowTrivia] = useState(initial?.allowTrivia ?? false);
  const [requireWhatsapp, setRequireWhatsapp] = useState(initial?.requireWhatsapp ?? true);
  const [requireDni, setRequireDni] = useState(initial?.requireDni ?? false);
  const [maxMediaSize, setMaxMediaSize] = useState(String(initial?.maxMediaSize ?? 5242880));
  const [allowedMediaFormats, setAllowedMediaFormats] = useState(initial?.allowedMediaFormats || 'jpg,jpeg,png,webp');
  const [mediaQuality, setMediaQuality] = useState(String(initial?.mediaQuality ?? 80));
  const [maxMediaWidth, setMaxMediaWidth] = useState(String(initial?.maxMediaWidth ?? 1200));
  const [maxMediaHeight, setMaxMediaHeight] = useState(String(initial?.maxMediaHeight ?? 1200));
  const [maxVideoSize, setMaxVideoSize] = useState(String(initial?.maxVideoSize ?? 31457280));
  const [allowedVideoFormats, setAllowedVideoFormats] = useState(initial?.allowedVideoFormats || 'mp4,webm,mov');
  const [rateLimitPerHour, setRateLimitPerHour] = useState(initial?.rateLimitPerHour?.toString() || '');
  const [maxExchangesPerUser, setMaxExchangesPerUser] = useState(initial?.maxExchangesPerUser?.toString() || '');
  const [autoReward, setAutoReward] = useState(initial?.autoReward ?? true);
  const [triviaSetId, setTriviaSetId] = useState(initial?.triviaSetId || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      description: description || null,
      isDefault,
      isActive,
      allowPhoto, allowVideo, allowText, allowTrivia,
      requireWhatsapp, requireDni,
      maxMediaSize: parseInt(maxMediaSize),
      allowedMediaFormats,
      mediaQuality: parseInt(mediaQuality),
      maxMediaWidth: parseInt(maxMediaWidth),
      maxMediaHeight: parseInt(maxMediaHeight),
      maxVideoSize: parseInt(maxVideoSize),
      allowedVideoFormats,
      rateLimitPerHour: rateLimitPerHour ? parseInt(rateLimitPerHour) : null,
      maxExchangesPerUser: maxExchangesPerUser ? parseInt(maxExchangesPerUser) : null,
      autoReward,
      triviaSetId: triviaSetId || null,
    });
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="font-medium">{initial ? '✏️ Editar Política' : '➕ Nueva Política'}</h3>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre *</label>
              <input type="text" className="input w-full" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <input type="text" className="input w-full" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
          </div>

          {/* Allowed types */}
          <div>
            <label className="block text-sm font-medium mb-2">Tipos permitidos</label>
            <div className="flex flex-wrap gap-4">
              {[
                { key: 'allowPhoto', label: '📷 Foto', value: allowPhoto, set: setAllowPhoto },
                { key: 'allowVideo', label: '🎥 Video', value: allowVideo, set: setAllowVideo },
                { key: 'allowText', label: '✍️ Texto', value: allowText, set: setAllowText },
                { key: 'allowTrivia', label: '🧠 Trivia', value: allowTrivia, set: setAllowTrivia },
              ].map(t => (
                <label key={t.key} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={t.value} onChange={e => t.set(e.target.checked)} />
                  {t.label}
                </label>
              ))}
            </div>
          </div>

          {/* Requirements */}
          <div>
            <label className="block text-sm font-medium mb-2">Campos requeridos</label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={requireWhatsapp} onChange={e => setRequireWhatsapp(e.target.checked)} />
                📱 WhatsApp
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={requireDni} onChange={e => setRequireDni(e.target.checked)} />
                🪪 DNI
              </label>
            </div>
          </div>

          {/* Image settings */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Máx. imagen (bytes)</label>
              <input type="number" className="input w-full text-sm" value={maxMediaSize} onChange={e => setMaxMediaSize(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Formatos imagen</label>
              <input type="text" className="input w-full text-sm" value={allowedMediaFormats} onChange={e => setAllowedMediaFormats(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Calidad</label>
              <input type="number" className="input w-full text-sm" min="1" max="100" value={mediaQuality} onChange={e => setMediaQuality(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Ancho máx.</label>
              <input type="number" className="input w-full text-sm" value={maxMediaWidth} onChange={e => setMaxMediaWidth(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Alto máx.</label>
              <input type="number" className="input w-full text-sm" value={maxMediaHeight} onChange={e => setMaxMediaHeight(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Máx. video (bytes)</label>
              <input type="number" className="input w-full text-sm" value={maxVideoSize} onChange={e => setMaxVideoSize(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Formatos video</label>
              <input type="text" className="input w-full text-sm" value={allowedVideoFormats} onChange={e => setAllowedVideoFormats(e.target.value)} />
            </div>
          </div>

          {/* Limits */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Rate limit/hora</label>
              <input type="number" className="input w-full text-sm" value={rateLimitPerHour} onChange={e => setRateLimitPerHour(e.target.value)} placeholder="Sin límite" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Máx por usuario</label>
              <input type="number" className="input w-full text-sm" value={maxExchangesPerUser} onChange={e => setMaxExchangesPerUser(e.target.value)} placeholder="Sin límite" />
            </div>
          </div>

          {/* Flags */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              Activa
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} />
              Default
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={autoReward} onChange={e => setAutoReward(e.target.checked)} />
              🤖 Auto-premio
            </label>
          </div>

          {/* Trivia set default */}
          {allowTrivia && (
            <div>
              <label className="block text-sm font-medium mb-1">Set de Trivia por defecto</label>
              <select className="input w-full" value={triviaSetId} onChange={e => setTriviaSetId(e.target.value)}>
                <option value="">Sin trivia por defecto</option>
                {triviaSets.filter(s => s.active).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s._count.questions} preguntas)
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">Los lotes pueden sobreescribir este set con uno propio</p>
            </div>
          )}

          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary text-sm">
              {initial ? 'Guardar cambios' : 'Crear política'}
            </button>
            <button type="button" onClick={onCancel} className="btn btn-secondary text-sm">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// ── Trivia Tab ───────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════

function TriviaTab({ triviaSets, onRefresh }: { triviaSets: TriviaSet[]; onRefresh: () => void }) {
  const [showSetForm, setShowSetForm] = useState(false);
  const [editingSet, setEditingSet] = useState<TriviaSet | null>(null);
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null);
  const [setDetail, setSetDetail] = useState<(TriviaSet & { questions: TriviaQuestion[] }) | null>(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<TriviaQuestion | null>(null);

  // ── Set CRUD ────────────────────────────────────────────────────

  const saveSet = async (data: { name: string; description: string; active: boolean }) => {
    try {
      const url = editingSet
        ? `/api/admin/intercambio/trivia-sets/${editingSet.id}`
        : '/api/admin/intercambio/trivia-sets';
      const method = editingSet ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) { const d = await res.json(); alert(d.error || 'Error'); return; }
      alert(editingSet ? 'Set actualizado' : 'Set creado');
      setShowSetForm(false);
      setEditingSet(null);
      onRefresh();
    } catch (e: any) { alert('Error: ' + e.message); }
  };

  const deleteSet = async (id: string) => {
    if (!confirm('¿Eliminar este set de trivia?')) return;
    try {
      const res = await fetch(`/api/admin/intercambio/trivia-sets/${id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); alert(d.error || 'Error'); return; }
      alert('Set eliminado');
      if (expandedSetId === id) { setExpandedSetId(null); setSetDetail(null); }
      onRefresh();
    } catch (e: any) { alert('Error: ' + e.message); }
  };

  const loadSetDetail = async (id: string) => {
    if (expandedSetId === id) { setExpandedSetId(null); setSetDetail(null); return; }
    try {
      const res = await fetch(`/api/admin/intercambio/trivia-sets/${id}`);
      const data = await res.json();
      setSetDetail(data);
      setExpandedSetId(id);
      setShowQuestionForm(false);
      setEditingQuestion(null);
    } catch { alert('Error cargando detalle'); }
  };

  // ── Question CRUD ───────────────────────────────────────────────

  const saveQuestion = async (qData: { question: string; order: number; pointsForCorrect: number; answers: { answer: string; isCorrect: boolean }[] }) => {
    if (!expandedSetId) return;
    try {
      const url = editingQuestion
        ? `/api/admin/intercambio/trivia-sets/${expandedSetId}/questions/${editingQuestion.id}`
        : `/api/admin/intercambio/trivia-sets/${expandedSetId}/questions`;
      const method = editingQuestion ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(qData) });
      if (!res.ok) { const d = await res.json(); alert(d.error || 'Error'); return; }
      alert(editingQuestion ? 'Pregunta actualizada' : 'Pregunta creada');
      setShowQuestionForm(false);
      setEditingQuestion(null);
      // Reload detail
      const r2 = await fetch(`/api/admin/intercambio/trivia-sets/${expandedSetId}`);
      setSetDetail(await r2.json());
      onRefresh();
    } catch (e: any) { alert('Error: ' + e.message); }
  };

  const deleteQuestion = async (questionId: string) => {
    if (!expandedSetId || !confirm('¿Eliminar esta pregunta?')) return;
    try {
      const res = await fetch(`/api/admin/intercambio/trivia-sets/${expandedSetId}/questions/${questionId}`, { method: 'DELETE' });
      if (!res.ok) { alert('Error eliminando'); return; }
      const r2 = await fetch(`/api/admin/intercambio/trivia-sets/${expandedSetId}`);
      setSetDetail(await r2.json());
      onRefresh();
    } catch (e: any) { alert('Error: ' + e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-slate-400">{triviaSets.length} set{triviaSets.length !== 1 ? 's' : ''} de trivia</p>
        <div className="flex gap-2">
          <button onClick={onRefresh} className="btn btn-secondary text-sm">🔄</button>
          <button onClick={() => { setEditingSet(null); setShowSetForm(true); }} className="btn btn-primary text-sm">
            ➕ Nuevo Set
          </button>
        </div>
      </div>

      {/* Set form */}
      {showSetForm && (
        <TriviaSetForm
          initial={editingSet}
          onSave={saveSet}
          onCancel={() => { setShowSetForm(false); setEditingSet(null); }}
        />
      )}

      {/* Sets list */}
      <div className="space-y-3">
        {triviaSets.map(s => (
          <div key={s.id} className="card">
            <div className="card-body">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 cursor-pointer" onClick={() => loadSetDetail(s.id)}>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 dark:text-slate-100">{s.name}</h3>
                    {s.active ? (
                      <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 px-2 py-0.5 rounded-full">Activo</span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400 px-2 py-0.5 rounded-full">Inactivo</span>
                    )}
                  </div>
                  {s.description && <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{s.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-slate-400">
                    <span>❓ {s._count.questions} preguntas</span>
                    <span>🎮 {s._count.sessions} sesiones</span>
                    <span>🕐 {formatDate(s.createdAt)}</span>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => loadSetDetail(s.id)} className="btn btn-sm btn-secondary text-xs">
                    {expandedSetId === s.id ? '▲' : '▼'}
                  </button>
                  <button onClick={() => { setEditingSet(s); setShowSetForm(true); }} className="btn btn-sm btn-secondary text-xs">✏️</button>
                  <button onClick={() => deleteSet(s.id)} className="btn btn-sm btn-danger text-xs">🗑️</button>
                </div>
              </div>

              {/* Expanded: questions */}
              {expandedSetId === s.id && setDetail && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Preguntas ({setDetail.questions.length})</p>
                    <button
                      onClick={() => { setEditingQuestion(null); setShowQuestionForm(true); }}
                      className="btn btn-sm btn-primary text-xs"
                    >
                      ➕ Agregar pregunta
                    </button>
                  </div>

                  {showQuestionForm && (
                    <QuestionForm
                      initial={editingQuestion}
                      onSave={saveQuestion}
                      onCancel={() => { setShowQuestionForm(false); setEditingQuestion(null); }}
                    />
                  )}

                  {setDetail.questions.length === 0 && (
                    <p className="text-sm text-gray-400 dark:text-slate-500 italic">Sin preguntas aún. Agrega al menos 1 para que funcione la trivia.</p>
                  )}

                  {setDetail.questions.map((q, qi) => (
                    <div key={q.id} className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            <span className="text-gray-400 mr-2">#{qi + 1}</span>
                            {q.question}
                            {!q.active && <span className="ml-2 text-xs text-red-400">(inactiva)</span>}
                          </p>
                          <div className="mt-2 space-y-1">
                            {q.answers.map(a => (
                              <div key={a.id} className={`text-xs px-2 py-1 rounded ${a.isCorrect ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium' : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-slate-400'}`}>
                                {a.isCorrect ? '✅' : '○'} {a.answer}
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">+{q.pointsForCorrect} pts correcta / {q.pointsForIncorrect} pts incorrecta</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => { setEditingQuestion(q); setShowQuestionForm(true); }} className="btn btn-sm btn-secondary text-xs">✏️</button>
                          <button onClick={() => deleteQuestion(q.id)} className="btn btn-sm btn-danger text-xs">🗑️</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── TriviaSetForm ─────────────────────────────────────────────────

function TriviaSetForm({ initial, onSave, onCancel }: {
  initial: TriviaSet | null;
  onSave: (data: { name: string; description: string; active: boolean }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [active, setActive] = useState(initial?.active ?? true);

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="font-medium">{initial ? '✏️ Editar Set' : '➕ Nuevo Set de Trivia'}</h3>
      </div>
      <div className="card-body">
        <form onSubmit={e => { e.preventDefault(); onSave({ name, description, active }); }} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre *</label>
              <input type="text" className="input w-full" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <input type="text" className="input w-full" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
            Activo
          </label>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary text-sm">{initial ? 'Guardar' : 'Crear'}</button>
            <button type="button" onClick={onCancel} className="btn btn-secondary text-sm">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── QuestionForm ──────────────────────────────────────────────────

function QuestionForm({ initial, onSave, onCancel }: {
  initial: TriviaQuestion | null;
  onSave: (data: { question: string; order: number; pointsForCorrect: number; answers: { answer: string; isCorrect: boolean }[] }) => void;
  onCancel: () => void;
}) {
  const [question, setQuestion] = useState(initial?.question || '');
  const [order, setOrder] = useState(initial?.order ?? 0);
  const [pointsForCorrect, setPointsForCorrect] = useState(initial?.pointsForCorrect ?? 10);
  const [answers, setAnswers] = useState<{ answer: string; isCorrect: boolean }[]>(
    initial?.answers?.map(a => ({ answer: a.answer, isCorrect: a.isCorrect })) || [
      { answer: '', isCorrect: true },
      { answer: '', isCorrect: false },
    ]
  );

  const addAnswer = () => {
    if (answers.length >= 4) return;
    setAnswers([...answers, { answer: '', isCorrect: false }]);
  };

  const removeAnswer = (i: number) => {
    if (answers.length <= 2) return;
    setAnswers(answers.filter((_, idx) => idx !== i));
  };

  const updateAnswer = (i: number, field: 'answer' | 'isCorrect', value: any) => {
    const copy = [...answers];
    if (field === 'isCorrect' && value) {
      // Only one correct
      copy.forEach((a, idx) => { a.isCorrect = idx === i; });
    } else {
      (copy[i] as any)[field] = value;
    }
    setAnswers(copy);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) { alert('La pregunta es requerida'); return; }
    if (answers.some(a => !a.answer.trim())) { alert('Todas las respuestas deben tener texto'); return; }
    if (answers.filter(a => a.isCorrect).length !== 1) { alert('Debe haber exactamente 1 respuesta correcta'); return; }
    onSave({ question, order, pointsForCorrect, answers });
  };

  return (
    <div className="card border-blue-200 dark:border-blue-800">
      <div className="card-header">
        <h4 className="font-medium text-sm">{initial ? '✏️ Editar Pregunta' : '➕ Nueva Pregunta'}</h4>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Pregunta *</label>
            <input type="text" className="input w-full" value={question} onChange={e => setQuestion(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Orden</label>
              <input type="number" className="input w-full" value={order} onChange={e => setOrder(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Puntos (correcta)</label>
              <input type="number" className="input w-full" value={pointsForCorrect} onChange={e => setPointsForCorrect(Number(e.target.value))} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Respuestas ({answers.length}/4)</label>
              {answers.length < 4 && (
                <button type="button" onClick={addAnswer} className="text-xs text-blue-500 hover:text-blue-600">+ Agregar</button>
              )}
            </div>
            <div className="space-y-2">
              {answers.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct"
                    checked={a.isCorrect}
                    onChange={() => updateAnswer(i, 'isCorrect', true)}
                    title="Marcar como correcta"
                  />
                  <input
                    type="text"
                    className="input flex-1"
                    value={a.answer}
                    onChange={e => updateAnswer(i, 'answer', e.target.value)}
                    placeholder={`Respuesta ${i + 1}`}
                    required
                  />
                  {answers.length > 2 && (
                    <button type="button" onClick={() => removeAnswer(i)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">Selecciona el radio button de la respuesta correcta</p>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary text-sm">{initial ? 'Guardar' : 'Crear pregunta'}</button>
            <button type="button" onClick={onCancel} className="btn btn-secondary text-sm">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// ── Stats Tab ────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════

function StatsTab({ stats, onRefresh }: { stats: Stats | null; onRefresh: () => void }) {
  if (!stats) return <p className="text-gray-500 dark:text-slate-400">Sin estadísticas</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={onRefresh} className="btn btn-secondary text-sm">🔄 Actualizar</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: stats.totalExchanges, emoji: '📋' },
          { label: 'Pendientes', value: stats.pendingExchanges, emoji: '⏳' },
          { label: 'Aprobados', value: stats.approvedExchanges, emoji: '✅' },
          { label: 'Rechazados', value: stats.rejectedExchanges, emoji: '❌' },
          { label: 'Hoy', value: stats.todayExchanges, emoji: '📆' },
          { label: 'Lotes activos', value: stats.activeBatches, emoji: '📦' },
        ].map(s => (
          <div key={s.label} className="card">
            <div className="card-body text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">{s.emoji} {s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Type breakdown */}
      {Object.keys(stats.typeBreakdown).length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="font-medium">Por tipo</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(stats.typeBreakdown).map(([type, count]) => (
                <div key={type} className="text-center p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-lg font-semibold">{count}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{typeBadge(type)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent exchanges */}
      {stats.recentExchanges.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="font-medium">Últimos intercambios</h3>
          </div>
          <div className="card-body">
            <div className="space-y-2">
              {stats.recentExchanges.map(ex => (
                <div key={ex.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-slate-700 last:border-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className={statusBadge(ex.status)}>{ex.status === 'pending' ? '⏳' : ex.status === 'approved' ? '✅' : '❌'}</span>
                    <span className="font-medium">{ex.customerName}</span>
                    <span className="text-gray-400">{typeBadge(ex.exchangeType)}</span>
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(ex.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
