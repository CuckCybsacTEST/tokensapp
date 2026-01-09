'use client';

import { useState, useEffect } from 'react';

interface ReusableToken {
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
  disabled?: boolean;
}

export default function ReusableTokensPurgeAdmin() {
  const [tokens, setTokens] = useState<ReusableToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUsed, setFilterUsed] = useState<'all' | 'unused' | 'used'>('all');

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    const res = await fetch('/api/admin/reusable-tokens/all');
    if (res.ok) {
      const data = await res.json();
      setTokens(data.tokens || []);
    } else {
      alert('Error cargando tokens');
    }
    setLoading(false);
  };

  const deleteToken = async (tokenId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este token? Esta acción no se puede deshacer.')) {
      return;
    }

    setDeleting(tokenId);
    try {
      const res = await fetch(`/api/admin/reusable-tokens/${tokenId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        alert('Token eliminado exitosamente');
        fetchTokens(); // Recargar la lista
      } else {
        const error = await res.json();
        alert(error.error || 'Error eliminando token');
      }
    } catch (error) {
      alert('Error de red');
    } finally {
      setDeleting(null);
    }
  };

  const filteredTokens = tokens.filter(token => {
    const matchesSearch = searchTerm === '' ||
      token.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.prize.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.prize.key?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterUsed === 'all' ||
      (filterUsed === 'unused' && (token.usedCount || 0) === 0) ||
      (filterUsed === 'used' && (token.usedCount || 0) > 0);

    return matchesSearch && matchesFilter;
  });

  if (loading) return <div className="text-slate-900 dark:text-slate-100">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Eliminar Tokens Reusables</h1>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Filtros</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Buscar</label>
              <input
                type="text"
                className="input w-full"
                placeholder="Buscar por ID, premio o key..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Estado de uso</label>
              <select
                className="input w-full"
                value={filterUsed}
                onChange={e => setFilterUsed(e.target.value as 'all' | 'unused' | 'used')}
              >
                <option value="all">Todos los tokens</option>
                <option value="unused">Solo sin usar</option>
                <option value="used">Solo usados</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Tokens */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Tokens Reusables ({filteredTokens.length})</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Solo se pueden eliminar tokens que no han sido usados</p>
        </div>
        <div className="card-body">
          {filteredTokens.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">
              {tokens.length === 0 ? 'No hay tokens generados aún' : 'No se encontraron tokens con los filtros aplicados'}
            </p>
          ) : (
            <div className="space-y-4">
              {filteredTokens.map(token => (
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
                          {token.createdAt && (
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                              Creado: {new Date(token.createdAt).toLocaleString('es-ES', { timeZone: 'America/Lima' })}
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
                        {(token.usedCount || 0) === 0 ? (
                          <button
                            onClick={() => deleteToken(token.id)}
                            disabled={deleting === token.id}
                            className="btn-sm bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                          >
                            {deleting === token.id ? 'Eliminando...' : 'Eliminar'}
                          </button>
                        ) : (
                          <span className="text-sm text-slate-500 dark:text-slate-400 italic">
                            No se puede eliminar (ya usado)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* QR Preview */}
                    <div className="flex-shrink-0">
                      <div className="bg-white p-2 rounded-lg border border-slate-200 dark:border-slate-600">
                        <img
                          src={`/api/qr/${token.id}`}
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
        </div>
      </div>

      <div className="card border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-amber-600 dark:text-amber-400">⚠️ Advertencia</h2>
        </div>
        <div className="card-body">
          <p className="text-amber-700 dark:text-amber-300">
            Solo se pueden eliminar tokens que no han sido usados aún. Una vez que un token ha sido escaneado y usado,
            no se puede eliminar para mantener la integridad del sistema de redención.
          </p>
        </div>
      </div>
    </div>
  );
}