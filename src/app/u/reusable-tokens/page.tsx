'use client';

import React, { useState, useEffect } from 'react';

interface GroupToken {
  id: string;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  startTime?: string | null;
  endTime?: string | null;
  prize: { id: string; label: string; key: string; color?: string | null };
}

interface TokenGroup {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  locked?: boolean;
  sortOrder?: number;
  tokens: GroupToken[];
  _count: { tokens: number };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function QRPreview({ tokenId, label }: { tokenId: string; label: string }) {
  const [imgError, setImgError] = useState(false);
  const qrSrc = `/api/qr/${tokenId}`;

  const handleDownload = async () => {
    try {
      const res = await fetch(qrSrc);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${label.replace(/\s+/g, '-')}-${tokenId.slice(0, 8)}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/reusable/${tokenId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: label, text: `Token: ${label}`, url });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(url);
    alert('Enlace copiado al portapapeles');
  };

  return (
    <div className="flex flex-col items-center gap-2 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="w-full aspect-square bg-slate-50 dark:bg-slate-900 rounded-lg flex items-center justify-center overflow-hidden">
        {imgError ? (
          <div className="text-xs text-slate-400 text-center px-2">QR no disponible</div>
        ) : (
          <img
            src={qrSrc}
            alt={`QR ${label}`}
            loading="lazy"
            className="w-full h-full object-contain p-1"
            onError={() => setImgError(true)}
          />
        )}
      </div>
      <div className="w-full text-center">
        <div className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate" title={label}>{label}</div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{tokenId.slice(0, 8)}...</div>
      </div>
      <div className="flex gap-1.5 w-full">
        <button
          onClick={handleDownload}
          className="flex-1 text-[11px] py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
          title="Descargar QR"
        >
          ⬇ Descargar
        </button>
        <a
          href={`/reusable/${tokenId}`}
          target="_blank"
          className="flex-1 text-[11px] py-1.5 rounded-lg bg-slate-600 hover:bg-slate-700 text-white font-medium text-center transition-colors"
          title="Vista previa"
        >
          👁 Ver
        </a>
        <button
          onClick={handleShare}
          className="flex-1 text-[11px] py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors"
          title="Compartir/Copiar enlace"
        >
          📤 Enviar
        </button>
      </div>
    </div>
  );
}

export default function ReusableTokensStaffPage() {
  const [groups, setGroups] = useState<TokenGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/admin/token-groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(Array.isArray(data) ? data : []);
      }
    } catch {}
    setLoading(false);
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredGroups = searchTerm.trim()
    ? groups.filter(g =>
        g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.tokens.some(t => t.prize.label.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : groups;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">Tokens Reutilizables</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Grupos de tokens con previsualización de QR</p>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Buscar grupo o premio..."
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>

      {filteredGroups.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          {searchTerm ? 'Sin resultados para la búsqueda' : 'No hay grupos creados aún'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map(group => {
            const isExpanded = expandedGroups.has(group.id);
            const tokenCount = group._count?.tokens || group.tokens?.length || 0;
            const totalUsed = (group.tokens || []).reduce((s, t) => s + (t.usedCount || 0), 0);
            const totalMax = (group.tokens || []).reduce((s, t) => s + (t.maxUses || 0), 0);

            return (
              <div
                key={group.id}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm"
              >
                {/* Group header */}
                <button
                  onClick={() => !group.locked && toggleGroup(group.id)}
                  className={`w-full p-4 flex items-center gap-3 text-left transition-colors ${group.locked ? 'cursor-not-allowed opacity-60' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                >
                  {group.locked ? (
                    <span className="text-base flex-shrink-0">🔒</span>
                  ) : (
                    <svg
                      className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                  <div
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: group.color || '#3b82f6' }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{group.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span>{tokenCount} tokens</span>
                      <span>·</span>
                      <span className={totalUsed > 0 ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}>
                        {totalUsed} de {totalMax} escaneos
                      </span>
                      {group.locked && (
                        <>
                          <span>·</span>
                          <span className="text-amber-600 dark:text-amber-400 font-medium">Bloqueado</span>
                        </>
                      )}
                    </div>
                  </div>
                </button>

                {group.description && isExpanded && (
                  <div className="px-4 pb-2 text-sm text-slate-600 dark:text-slate-400 -mt-1">
                    {group.description}
                  </div>
                )}

                {/* Token QR grid */}
                {isExpanded && (
                  <div className="p-4 pt-2 border-t border-slate-100 dark:border-slate-700">
                    {(!group.tokens || group.tokens.length === 0) ? (
                      <div className="text-center py-6 text-sm text-slate-400">
                        No hay tokens en este grupo
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {group.tokens.map(token => (
                          <div key={token.id} className="relative">
                            <QRPreview tokenId={token.id} label={token.prize.label} />
                            <div className="mt-1 text-center">
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                token.usedCount >= token.maxUses
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                  : token.usedCount > 0
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                              }`}>
                                {token.usedCount}/{token.maxUses} usos
                              </span>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Exp: {formatDate(token.expiresAt)}
                              </div>
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
  );
}
