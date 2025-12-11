"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { QR_THEMES } from "@/lib/qr-custom";
import QRCode from 'qrcode';

interface CustomQr {
  id: string;
  code: string;
  customerName: string;
  customerWhatsapp: string;
  customerDni: string | null;
  customerPhrase: string | null;
  customData: string | null;
  theme: string;
  imageUrl: string | null;
  originalImageUrl: string | null;
  imageMetadata: any | null;
  isActive: boolean;
  expiresAt: string | null;
  redeemedAt: string | null;
  redeemedBy: string | null;
  createdAt: string;
  campaignName: string | null;
  batchId: string | null;
  extendedCount: number;
  lastExtendedAt: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  revokeReason: string | null;
}

interface Stats {
  totalCreated: number;
  totalRedeemed: number;
  totalActive: number;
  totalExpired: number;
  createdToday: number;
  redeemedToday: number;
  byTheme: Record<string, number>;
  byCampaign: Record<string, number>;
}

// Componente para mostrar el QR code
function QrDisplay({ code, size = 64 }: { code: string; size?: number }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateQr = async () => {
      try {
        // Generar el redeem URL
        const redeemUrl = `${window.location.origin}/sorteos-qr/${code}`;
        const dataUrl = await QRCode.toDataURL(redeemUrl, {
          width: size,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrDataUrl(dataUrl);
      } catch (error) {
        console.error('Error generating QR:', error);
      } finally {
        setLoading(false);
      }
    };

    generateQr();
  }, [code, size]);

  if (loading) {
    return (
      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!qrDataUrl) {
    return (
      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center text-xs text-slate-400">
        Error
      </div>
    );
  }

  return (
    <img
      src={qrDataUrl}
      alt={`QR Code ${code}`}
      className="w-16 h-16 rounded border border-slate-200 dark:border-slate-700"
    />
  );
}

export default function CustomQrsAdminPage() {
  const searchParams = useSearchParams();
  const [qrs, setQrs] = useState<CustomQr[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'redeemed' | 'expired'>('all');
  const [search, setSearch] = useState('');
  const [selectedQrs, setSelectedQrs] = useState<Set<string>>(new Set());
  const [showStats, setShowStats] = useState(false);
  const [showBatchManager, setShowBatchManager] = useState(false);
  const [showPolicyManager, setShowPolicyManager] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);

  useEffect(() => {
    // Check URL parameters to show specific sections
    const tab = searchParams?.get('tab');
    if (tab === 'stats') {
      setShowStats(true);
    } else if (tab === 'batches') {
      setShowBatchManager(true);
    } else if (tab === 'policies') {
      setShowPolicyManager(true);
    }
    
    loadData();
  }, [searchParams]);

  const loadData = async () => {
    try {
      const [qrsResponse, statsResponse, batchesResponse, policiesResponse] = await Promise.all([
        fetch('/api/admin/custom-qrs'),
        fetch('/api/admin/custom-qrs/stats'),
        fetch('/api/admin/custom-qrs/batch'),
        fetch('/api/admin/custom-qrs/policy')
      ]);

      if (qrsResponse.ok) {
        const qrsData = await qrsResponse.json();
        setQrs(qrsData.qrs || []);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      if (batchesResponse.ok) {
        const batchesData = await batchesResponse.json();
        setBatches(batchesData);
      }

      if (policiesResponse.ok) {
        const policiesData = await policiesResponse.json();
        setPolicies(policiesData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (qrId: string) => {
    if (!confirm('¿Estás seguro de marcar este QR como redimido?')) return;

    try {
      const response = await fetch(`/api/admin/custom-qrs/${qrId}/redeem`, {
        method: 'POST'
      });

      if (response.ok) {
        await loadData(); // Recargar datos
      } else {
        alert('Error al redimir QR');
      }
    } catch (error) {
      console.error('Error redeeming QR:', error);
      alert('Error al redimir QR');
    }
  };

  const handleBulkRedeem = async () => {
    if (selectedQrs.size === 0) return;
    if (!confirm(`¿Redimir ${selectedQrs.size} QR(s) seleccionados?`)) return;

    try {
      const promises = Array.from(selectedQrs).map(qrId =>
        fetch(`/api/admin/custom-qrs/${qrId}/redeem`, { method: 'POST' })
      );

      await Promise.all(promises);
      setSelectedQrs(new Set());
      await loadData();
    } catch (error) {
      console.error('Error redeeming QR:', error);
      alert('Error al redimir QR');
    }
  };

  const handleExtendExpiry = async (days: number, reason?: string) => {
    if (selectedQrs.size === 0) return;
    if (!confirm(`¿Extender ${selectedQrs.size} QR(s) por ${days} días?`)) return;

    try {
      const response = await fetch('/api/admin/custom-qrs/extend-expiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrIds: Array.from(selectedQrs),
          days,
          reason: reason || 'Extensión administrativa'
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        setSelectedQrs(new Set());
        await loadData();
      } else {
        alert('Error al extender expiración');
      }
    } catch (error) {
      console.error('Error extending expiry:', error);
      alert('Error al extender expiración');
    }
  };

  const handleRevokeQrs = async (reason: string) => {
    if (selectedQrs.size === 0) return;
    if (!confirm(`¿Revocar ${selectedQrs.size} QR(s) seleccionados?`)) return;

    try {
      const response = await fetch('/api/admin/custom-qrs/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrIds: Array.from(selectedQrs),
          reason
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        setSelectedQrs(new Set());
        await loadData();
      } else {
        alert('Error al revocar QR');
      }
    } catch (error) {
      console.error('Error revoking QR:', error);
      alert('Error al revocar QR');
    }
  };

  const handleExportCsv = async () => {
    try {
      const response = await fetch('/api/admin/custom-qrs/export-csv');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `custom-qrs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Error al exportar CSV');
    }
  };

  const filteredQrs = qrs.filter(qr => {
    const matchesFilter = filter === 'all' ||
      (filter === 'active' && qr.isActive && !qr.redeemedAt && !qr.revokedAt && (!qr.expiresAt || new Date(qr.expiresAt) > new Date())) ||
      (filter === 'redeemed' && qr.redeemedAt) ||
      (filter === 'expired' && ((!qr.expiresAt || new Date(qr.expiresAt) < new Date()) || qr.revokedAt));

    const matchesSearch = !search ||
      qr.customerName.toLowerCase().includes(search.toLowerCase()) ||
      qr.code.toLowerCase().includes(search.toLowerCase()) ||
      qr.customerWhatsapp.includes(search);

    return matchesFilter && matchesSearch;
  });

  // Agrupar QR por lote
  const qrsByBatch = React.useMemo(() => {
    const grouped: Record<string, CustomQr[]> = {};
    const withoutBatch: CustomQr[] = [];

    filteredQrs.forEach(qr => {
      if (qr.batchId) {
        if (!grouped[qr.batchId]) {
          grouped[qr.batchId] = [];
        }
        grouped[qr.batchId].push(qr);
      } else {
        withoutBatch.push(qr);
      }
    });

    return { grouped, withoutBatch };
  }, [filteredQrs]);

  // Estado para controlar qué lotes están expandidos
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());

  const toggleBatchExpansion = (batchId: string) => {
    const newExpanded = new Set(expandedBatches);
    if (newExpanded.has(batchId)) {
      newExpanded.delete(batchId);
    } else {
      newExpanded.add(batchId);
    }
    setExpandedBatches(newExpanded);
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--color-accent)]"></div>
        <p className="mt-4 text-sm text-slate-500">Cargando QR personalizados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">QR Personalizados por Lotes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gestiona códigos QR organizados por lotes y campañas
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowStats(!showStats)}
            className="btn-secondary"
          >
            📊 {showStats ? 'Ocultar' : 'Mostrar'} Estadísticas
          </button>
          <button
            onClick={() => setShowBatchManager(!showBatchManager)}
            className="btn-secondary"
          >
            📦 Lotes
          </button>
          <button
            onClick={() => setShowPolicyManager(!showPolicyManager)}
            className="btn-secondary"
          >
            ⚙️ Políticas
          </button>
          <a
            href="/admin/custom-qrs/purge"
            className="btn-danger !px-3 !py-1.5 text-sm"
          >
            🗑️ Purgar Lotes
          </a>
          <button
            onClick={handleExportCsv}
            className="btn-secondary"
          >
            📥 Exportar CSV
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      {showStats && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalCreated}</div>
            <div className="text-sm text-slate-500">Total Creados</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-green-600">{stats.totalRedeemed}</div>
            <div className="text-sm text-slate-500">Redimidos</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.totalActive}</div>
            <div className="text-sm text-slate-500">Activos</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-red-600">{stats.totalExpired}</div>
            <div className="text-sm text-slate-500">Expirados</div>
          </div>
        </div>
      )}

      {/* Filtros y búsqueda */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar por nombre, código o WhatsApp..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input w-full"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="input"
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="redeemed">Redimidos</option>
            <option value="expired">Expirados</option>
          </select>
          {selectedQrs.size > 0 && (
            <div className="flex gap-2">
              <button
                onClick={handleBulkRedeem}
                className="btn"
              >
                ✅ Redimir {selectedQrs.size}
              </button>
              <button
                onClick={() => handleExtendExpiry(30)}
                className="btn-secondary"
              >
                ⏰ Extender 30 días
              </button>
              <button
                onClick={() => handleExtendExpiry(7)}
                className="btn-secondary"
              >
                ⏰ Extender 7 días
              </button>
              <button
                onClick={() => {
                  const reason = prompt('Razón para revocar:');
                  if (reason) handleRevokeQrs(reason);
                }}
                className="btn-danger"
              >
                🚫 Revocar {selectedQrs.size}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lista de Lotes y QR */}
      <div className="space-y-6">
        {/* QR sin lote asignado */}
        {qrsByBatch.withoutBatch.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                  <span className="text-lg">📄</span>
                </div>
                <div>
                  <h3 className="font-semibold">QR Sin Lote Asignado</h3>
                  <p className="text-sm text-slate-500">{qrsByBatch.withoutBatch.length} QR</p>
                </div>
              </div>
              <button
                onClick={() => toggleBatchExpansion('unassigned')}
                className="btn-secondary text-sm"
              >
                {expandedBatches.has('unassigned') ? '🔽 Ocultar' : '▶️ Mostrar'} {qrsByBatch.withoutBatch.length}
              </button>
            </div>

            {expandedBatches.has('unassigned') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 border-t pt-4">
                {qrsByBatch.withoutBatch.map(qr => (
                  <QrCard key={qr.id} qr={qr} batches={batches} selectedQrs={selectedQrs} setSelectedQrs={setSelectedQrs} onRedeem={handleRedeem} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lotes con QR */}
        {Object.entries(qrsByBatch.grouped).map(([batchId, batchQrs]) => {
          const batch = batches.find(b => b.id === batchId);
          return (
            <div key={batchId} className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <span className="text-lg">📦</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">{batch?.name || `Lote ${batchId.slice(0, 8)}`}</h3>
                    <p className="text-sm text-slate-500">
                      {batchQrs.length} QR
                      {batch?.description && ` • ${batch.description}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleBatchExpansion(batchId)}
                  className="btn-secondary text-sm"
                >
                  {expandedBatches.has(batchId) ? '🔽 Ocultar' : '▶️ Mostrar'} {batchQrs.length}
                </button>
              </div>

              {expandedBatches.has(batchId) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 border-t pt-4">
                  {batchQrs.map(qr => (
                    <QrCard key={qr.id} qr={qr} batches={batches} selectedQrs={selectedQrs} setSelectedQrs={setSelectedQrs} onRedeem={handleRedeem} />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filteredQrs.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            No se encontraron QR personalizados
          </div>
        )}
      </div>

      {/* Gestor de Lotes */}
      {showBatchManager && (
        <BatchManager
          batches={batches}
          onClose={() => setShowBatchManager(false)}
          onRefresh={loadData}
        />
      )}

      {/* Gestor de Políticas */}
      {showPolicyManager && (
        <PolicyManager
          policies={policies}
          batches={batches}
          onClose={() => setShowPolicyManager(false)}
          onRefresh={loadData}
        />
      )}
    </div>
  );
}

// Componente para mostrar un QR individual
function QrCard({ qr, batches, selectedQrs, setSelectedQrs, onRedeem }: {
  qr: CustomQr;
  batches: any[];
  selectedQrs: Set<string>;
  setSelectedQrs: (selected: Set<string>) => void;
  onRedeem: (id: string) => void;
}) {
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
      <div className="flex flex-col space-y-3">
        {/* Header con checkbox y estado */}
        <div className="flex items-center justify-between">
          <input
            type="checkbox"
            checked={selectedQrs.has(qr.id)}
            onChange={(e) => {
              const newSelected = new Set(selectedQrs);
              if (e.target.checked) {
                newSelected.add(qr.id);
              } else {
                newSelected.delete(qr.id);
              }
              setSelectedQrs(newSelected);
            }}
            className="rounded"
          />
          <span className={`text-xs px-2 py-1 rounded-full ${
            qr.redeemedAt
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : qr.isActive && (!qr.expiresAt || new Date(qr.expiresAt) > new Date())
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            {qr.redeemedAt ? 'Redimido' : qr.isActive && (!qr.expiresAt || new Date(qr.expiresAt) > new Date()) ? 'Activo' : 'Expirado'}
          </span>
        </div>

        {/* QR Code */}
        <div className="flex justify-center">
          <QrDisplay code={qr.code} size={80} />
        </div>

        {/* Información del cliente */}
        <div className="text-center space-y-1">
          <div className="font-medium text-sm truncate" title={qr.customerName}>
            {qr.customerName}
          </div>
          <div className="text-xs text-slate-500 truncate" title={qr.customerWhatsapp}>
            {qr.customerWhatsapp}
          </div>
          {qr.customerDni && (
            <div className="text-xs text-slate-600 dark:text-slate-400">
              DNI: {qr.customerDni}
            </div>
          )}
          <div className="text-xs font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
            {qr.code}
          </div>
        </div>

        {/* Miniatura de imagen si existe */}
        {qr.imageUrl && (
          <div className="flex justify-center">
            <div className="relative w-12 h-12 rounded overflow-hidden border border-slate-200 dark:border-slate-700">
              <img
                src={qr.imageUrl.startsWith('/uploads/') ? qr.imageUrl.replace('/uploads/', '/api/images/') : qr.imageUrl}
                alt="Imagen subida"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  console.error('Image load error for QR:', qr.id, 'URL:', img.src, 'Original URL:', qr.imageUrl);
                  const container = img.parentElement;
                  if (container) {
                    let errorDiv = container.querySelector('.image-error') as HTMLElement;
                    if (!errorDiv) {
                      errorDiv = document.createElement('div');
                      errorDiv.className = 'image-error absolute inset-0 flex items-center justify-center text-xs text-slate-400 bg-slate-100 dark:bg-slate-800';
                      errorDiv.innerHTML = '<span>⚠️</span>';
                      container.appendChild(errorDiv);
                    }
                    img.style.display = 'none';
                    errorDiv.style.display = 'flex';
                  }
                }}
                onLoad={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  const container = img.parentElement;
                  if (container) {
                    const errorDiv = container.querySelector('.image-error') as HTMLElement;
                    if (errorDiv) {
                      errorDiv.style.display = 'none';
                    }
                    img.style.display = 'block';
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex gap-1">
          {!qr.redeemedAt && qr.isActive && (
            <button
              onClick={() => onRedeem(qr.id)}
              className="flex-1 btn-secondary text-xs py-1"
            >
              ✅ Redimir
            </button>
          )}
        </div>

        {/* Información adicional compacta */}
        <div className="text-xs text-slate-400 space-y-1">
          {qr.extendedCount > 0 && (
            <div className="text-center">🔄 Extendido {qr.extendedCount}x</div>
          )}
          {qr.redeemedAt && (
            <div className="text-center text-green-600">
              {new Date(qr.redeemedAt).toLocaleDateString('es-PE')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente para gestionar lotes
function BatchManager({ batches, onClose, onRefresh }: { batches: any[], onClose: () => void, onRefresh: () => void }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBatch, setEditingBatch] = useState<any>(null);

  const handleCreateBatch = async (data: any) => {
    try {
      const response = await fetch('/api/admin/custom-qrs/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        onRefresh();
        setShowCreateForm(false);
      } else {
        alert('Error al crear lote');
      }
    } catch (error) {
      console.error('Error creating batch:', error);
      alert('Error al crear lote');
    }
  };

  const handleUpdateBatch = async (id: string, data: any) => {
    try {
      const response = await fetch(`/api/admin/custom-qrs/batch/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        onRefresh();
        setEditingBatch(null);
      } else {
        alert('Error al actualizar lote');
      }
    } catch (error) {
      console.error('Error updating batch:', error);
      alert('Error al actualizar lote');
    }
  };

  const handleDeleteBatch = async (id: string) => {
    if (!confirm('¿Eliminar este lote?')) return;

    try {
      const response = await fetch(`/api/admin/custom-qrs/batch/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        onRefresh();
      } else {
        alert('Error al eliminar lote');
      }
    } catch (error) {
      console.error('Error deleting batch:', error);
      alert('Error al eliminar lote');
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Gestión de Lotes</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-secondary"
          >
            ➕ Nuevo Lote
          </button>
          <button onClick={onClose} className="btn-secondary">✕ Cerrar</button>
        </div>
      </div>

      {showCreateForm && (
        <BatchForm
          onSubmit={handleCreateBatch}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {editingBatch && (
        <BatchForm
          initialData={editingBatch}
          onSubmit={(data) => handleUpdateBatch(editingBatch.id, data)}
          onCancel={() => setEditingBatch(null)}
        />
      )}

      <div className="space-y-2">
        {batches.map(batch => (
          <div key={batch.id} className="flex items-center justify-between p-3 border rounded">
            <div>
              <span className="font-medium">{batch.name}</span>
              <span className="text-sm text-slate-500 ml-2">({batch._count?.qrs || 0} QR)</span>
              {batch.description && <p className="text-sm text-slate-500">{batch.description}</p>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingBatch(batch)}
                className="btn-secondary text-sm"
              >
                ✏️ Editar
              </button>
              <button
                onClick={() => handleDeleteBatch(batch.id)}
                className="btn-danger text-sm"
              >
                🗑️ Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Componente para gestionar políticas
function PolicyManager({ policies, batches, onClose, onRefresh }: { policies: any[], batches: any[], onClose: () => void, onRefresh: () => void }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);

  const activePolicy = policies.find(p => p.isActive);

  const handleCreatePolicy = async (data: any) => {
    try {
      const response = await fetch('/api/admin/custom-qrs/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        onRefresh();
        setShowCreateForm(false);
      } else {
        alert('Error al crear política');
      }
    } catch (error) {
      console.error('Error creating policy:', error);
      alert('Error al crear política');
    }
  };

  const handleUpdatePolicy = async (id: string, data: any) => {
    try {
      const response = await fetch(`/api/admin/custom-qrs/policy/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        onRefresh();
        setEditingPolicy(null);
      } else {
        alert('Error al actualizar política');
      }
    } catch (error) {
      console.error('Error updating policy:', error);
      alert('Error al actualizar política');
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Gestión de Políticas</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-secondary"
          >
            ➕ Nueva Política
          </button>
          <button onClick={onClose} className="btn-secondary">✕ Cerrar</button>
        </div>
      </div>

      {/* Indicador de política activa */}
      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded">
        <div className="flex items-center gap-2">
          <span className="text-amber-600">🎯</span>
          <span className="text-sm font-medium text-amber-800">
            Política activa: {activePolicy ? activePolicy.name : 'Ninguna'}
          </span>
        </div>
        {activePolicy && (
          <p className="text-xs text-amber-600 mt-1">
            Los nuevos QR se generarán con esta política
          </p>
        )}
      </div>

      {showCreateForm && (
        <PolicyForm
          batches={batches}
          onSubmit={handleCreatePolicy}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {editingPolicy && (
        <PolicyForm
          batches={batches}
          initialData={editingPolicy}
          onSubmit={(data) => handleUpdatePolicy(editingPolicy.id, data)}
          onCancel={() => setEditingPolicy(null)}
        />
      )}

      <div className="space-y-2">
        {policies.map(policy => (
          <div key={policy.id} className={`p-3 border rounded ${policy.isActive ? 'border-green-200 bg-green-50' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">{policy.name}</span>
                <div className="flex gap-2 mt-1">
                  {policy.isActive && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">✅ Activa</span>}
                  {policy.isDefault && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Por defecto</span>}
                </div>
              </div>
              <button
                onClick={() => setEditingPolicy(policy)}
                className="btn-secondary text-sm"
              >
                ✏️ Editar
              </button>
            </div>
            {policy.description && <p className="text-sm text-slate-500 mt-1">{policy.description}</p>}
            <div className="text-xs text-slate-400 mt-2">
              Expira en {policy.defaultExpiryDays || 0} días • Máx {policy.maxExtensions} extensiones
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Formulario para lotes
function BatchForm({ initialData, onSubmit, onCancel }: { initialData?: any, onSubmit: (data: any) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    theme: initialData?.theme || 'default',
    isActive: initialData?.isActive ?? true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="border rounded p-4 mb-4 bg-slate-50 dark:bg-slate-800">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nombre *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="input"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tema</label>
          <select
            value={formData.theme}
            onChange={(e) => setFormData({...formData, theme: e.target.value})}
            className="input"
          >
            <option value="default">Por defecto</option>
            <option value="birthday">Cumpleaños</option>
            <option value="corporate">Corporativo</option>
            <option value="event">Evento</option>
          </select>
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Descripción</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          className="input"
          rows={3}
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn">
          {initialData ? 'Actualizar' : 'Crear'} Lote
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancelar
        </button>
      </div>
    </form>
  );
}

// Formulario para políticas
function PolicyForm({ batches, initialData, onSubmit, onCancel }: { batches: any[], initialData?: any, onSubmit: (data: any) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    defaultExpiryDays: initialData?.defaultExpiryDays || 30,
    maxExtensions: initialData?.maxExtensions || 1,
    extensionDays: initialData?.extensionDays || 30,
    allowCustomData: initialData?.allowCustomData ?? true,
    allowCustomPhrase: initialData?.allowCustomPhrase ?? true,
    allowCustomColors: initialData?.allowCustomColors ?? true,
    allowDni: initialData?.allowDni ?? false,
    requireWhatsapp: initialData?.requireWhatsapp ?? true,
    requireDni: initialData?.requireDni ?? false,
    requireUniqueDni: initialData?.requireUniqueDni ?? false,
    defaultTheme: initialData?.defaultTheme || 'default',
    defaultBatchId: initialData?.defaultBatchId || null,
    allowImageUpload: initialData?.allowImageUpload ?? true,
    maxImageSize: initialData?.maxImageSize || 5242880,
    allowedImageFormats: initialData?.allowedImageFormats || 'jpg,jpeg,png,webp',
    imageQuality: initialData?.imageQuality || 80,
    maxImageWidth: initialData?.maxImageWidth || 1200,
    maxImageHeight: initialData?.maxImageHeight || 1200,
    rateLimitPerHour: initialData?.rateLimitPerHour || '',
    maxQrsPerUser: initialData?.maxQrsPerUser || '',
    requireApproval: initialData?.requireApproval ?? false,
    isDefault: initialData?.isDefault ?? false,
    isActive: initialData?.isActive ?? true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      rateLimitPerHour: formData.rateLimitPerHour ? Number(formData.rateLimitPerHour) : null,
      maxQrsPerUser: formData.maxQrsPerUser ? Number(formData.maxQrsPerUser) : null
    };
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="border rounded p-4 mb-4 bg-slate-50 dark:bg-slate-800">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nombre *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="input"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Días de expiración por defecto</label>
          <input
            type="number"
            value={formData.defaultExpiryDays}
            onChange={(e) => setFormData({...formData, defaultExpiryDays: Number(e.target.value)})}
            className="input"
            min="1"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Máx extensiones</label>
          <input
            type="number"
            value={formData.maxExtensions}
            onChange={(e) => setFormData({...formData, maxExtensions: Number(e.target.value)})}
            className="input"
            min="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Días por extensión</label>
          <input
            type="number"
            value={formData.extensionDays}
            onChange={(e) => setFormData({...formData, extensionDays: Number(e.target.value)})}
            className="input"
            min="1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Límite por hora</label>
          <input
            type="number"
            value={formData.rateLimitPerHour}
            onChange={(e) => setFormData({...formData, rateLimitPerHour: e.target.value})}
            className="input"
            placeholder="Sin límite"
          />
        </div>
      </div>

      {/* Selector de lote por defecto */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Lote por defecto</label>
        <select
          value={formData.defaultBatchId || ''}
          onChange={(e) => setFormData({...formData, defaultBatchId: e.target.value || null})}
          className="input"
        >
          <option value="">Sin lote por defecto</option>
          {batches?.map((batch: any) => (
            <option key={batch.id} value={batch.id}>
              {batch.name} ({batch._count?.qrs || 0} QR)
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500 mt-1">
          Los QR generados con esta política se asignarán automáticamente a este lote
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.allowCustomData}
              onChange={(e) => setFormData({...formData, allowCustomData: e.target.checked})}
            />
            Permitir datos personalizados
          </label>
        </div>
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.allowCustomPhrase}
              onChange={(e) => setFormData({...formData, allowCustomPhrase: e.target.checked})}
            />
            Permitir frase personalizada
          </label>
        </div>
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.allowCustomColors}
              onChange={(e) => setFormData({...formData, allowCustomColors: e.target.checked})}
            />
            Permitir colores personalizados
          </label>
        </div>
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.allowDni}
              onChange={(e) => setFormData({...formData, allowDni: e.target.checked})}
            />
            Permitir campo DNI
          </label>
        </div>
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.requireWhatsapp}
              onChange={(e) => setFormData({...formData, requireWhatsapp: e.target.checked})}
            />
            WhatsApp obligatorio
          </label>
        </div>
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.requireDni}
              onChange={(e) => setFormData({...formData, requireDni: e.target.checked})}
              disabled={!formData.allowDni}
            />
            DNI obligatorio (solo si está permitido)
          </label>
        </div>
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.requireUniqueDni}
              onChange={(e) => setFormData({...formData, requireUniqueDni: e.target.checked})}
              disabled={!formData.allowDni}
            />
            DNI único por usuario (solo si está permitido)
          </label>
          <p className="text-xs text-blue-600 mt-1">
            🔒 Evita que el mismo DNI genere múltiples QR activos
          </p>
        </div>
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.allowImageUpload}
              onChange={(e) => setFormData({...formData, allowImageUpload: e.target.checked})}
            />
            Permitir subida de imágenes
          </label>
        </div>
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.requireApproval}
              onChange={(e) => setFormData({...formData, requireApproval: e.target.checked})}
            />
            Requiere aprobación
          </label>
        </div>
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isDefault}
              onChange={(e) => setFormData({...formData, isDefault: e.target.checked})}
            />
            Política por defecto
          </label>
        </div>
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
            />
            Política activa
          </label>
          <p className="text-xs text-amber-600 mt-1">
            ⚠️ Solo una política puede estar activa a la vez
          </p>
        </div>
      </div>

      {/* Configuración de imágenes */}
      {formData.allowImageUpload && (
        <div className="border-t pt-4 mt-4">
          <h4 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Configuración de Imágenes</h4>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tamaño máximo (MB)</label>
              <input
                type="number"
                value={formData.maxImageSize / 1024 / 1024}
                onChange={(e) => setFormData({...formData, maxImageSize: Number(e.target.value) * 1024 * 1024})}
                className="input"
                min="1"
                max="50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Formatos permitidos</label>
              <input
                type="text"
                value={formData.allowedImageFormats}
                onChange={(e) => setFormData({...formData, allowedImageFormats: e.target.value})}
                className="input"
                placeholder="jpg,jpeg,png,webp"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Calidad (%)</label>
              <input
                type="number"
                value={formData.imageQuality}
                onChange={(e) => setFormData({...formData, imageQuality: Number(e.target.value)})}
                className="input"
                min="10"
                max="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ancho máximo (px)</label>
              <input
                type="number"
                value={formData.maxImageWidth}
                onChange={(e) => setFormData({...formData, maxImageWidth: Number(e.target.value)})}
                className="input"
                min="100"
                max="2000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Alto máximo (px)</label>
              <input
                type="number"
                value={formData.maxImageHeight}
                onChange={(e) => setFormData({...formData, maxImageHeight: Number(e.target.value)})}
                className="input"
                min="100"
                max="2000"
              />
            </div>
          </div>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Descripción</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          className="input"
          rows={2}
        />
      </div>

      <div className="flex gap-2">
        <button type="submit" className="btn">
          {initialData ? 'Actualizar' : 'Crear'} Política
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancelar
        </button>
      </div>
    </form>
  );
}