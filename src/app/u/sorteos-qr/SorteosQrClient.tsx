"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
  thumbnailUrl: string | null;
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

// Componente para mostrar el QR code
function QrDisplay({ code, size = 64 }: { code: string; size?: number }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateQr = async () => {
      try {
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

// Componente para mostrar un QR individual (solo lectura)
function QrCard({ qr }: { qr: CustomQr }) {
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-2 sm:p-3 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow max-w-full overflow-hidden">
      <div className="flex flex-col space-y-2 sm:space-y-3">
        {/* Header con estado */}
        <div className="flex items-center justify-between">
          <span className={`text-xs px-1 sm:px-2 py-1 rounded-full ${
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
          <QrDisplay code={qr.code} size={64} />
        </div>

        {/* Información del cliente */}
        <div className="text-center space-y-1">
          <div className="font-medium text-xs sm:text-sm truncate max-w-full" title={qr.customerName}>
            {qr.customerName}
          </div>
          <div className="text-xs text-slate-500 truncate max-w-full" title={qr.customerWhatsapp}>
            {qr.customerWhatsapp}
          </div>
          {qr.customerDni && (
            <div className="text-xs text-slate-600 dark:text-slate-400">
              DNI: {qr.customerDni}
            </div>
          )}
          <div className="text-xs font-mono bg-slate-100 dark:bg-slate-700 px-1 sm:px-2 py-1 rounded max-w-full truncate" title={qr.code}>
            {qr.code}
          </div>
        </div>

        {/* Miniatura de imagen si existe */}
        {qr.imageUrl && (
          <div className="flex flex-col items-center gap-1">
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded overflow-hidden border border-slate-200 dark:border-slate-700">
              <img
                src={(qr.thumbnailUrl || qr.imageUrl).startsWith('/uploads/') ? (qr.thumbnailUrl || qr.imageUrl).replace('/uploads/', '/api/images/') : (qr.thumbnailUrl || qr.imageUrl)}
                alt="Imagen subida"
                className="w-full h-full object-cover"
                loading="lazy"
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
            <button
              onClick={() => {
                const imageToShow = qr.originalImageUrl || qr.imageUrl;
                if (!imageToShow) return;
                const originalUrl = imageToShow.startsWith('/uploads/')
                  ? imageToShow.replace('/uploads/', '/api/images/')
                  : imageToShow;
                window.open(originalUrl, '_blank');
              }}
              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
              title="Ver imagen original"
            >
              Ver original
            </button>
          </div>
        )}

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

export default function SorteosQrClient() {
  const [qrs, setQrs] = useState<CustomQr[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const searchParams = useSearchParams();
  const tab = searchParams?.get('tab') || 'batches';

  useEffect(() => {
    if (tab === 'batches') {
      loadData();
    }
  }, [tab]);

  const loadData = async (page = 1) => {
    console.log('[u/sorteos-qr] loadData triggered');
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/user/custom-qrs?page=${page}&limit=20`, { credentials: 'include' });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ QRs loaded:', data.qrs?.length || 0);
        if (page === 1) {
          setQrs(data.qrs || []);
        } else {
          setQrs(prev => [...prev, ...(data.qrs || [])]);
        }
        setHasMore(data.pagination?.hasMore || false);
        setCurrentPage(page);
      } else {
        const errorText = await response.text().catch(() => 'Error desconocido');
        console.error('❌ QRs fetch failed:', response.status, errorText);
        setError(`Error al cargar QR: ${response.status}`);
      }
    } catch (error) {
      console.error('Error loading QRs:', error);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      loadData(currentPage + 1);
    }
  };

  if (loading && qrs.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--color-accent)]"></div>
        <p className="mt-4 text-sm text-slate-500">Cargando QR personalizados...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-500 mb-4">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-lg font-medium">Error al cargar datos</p>
          <p className="text-sm">{error}</p>
        </div>
        <button
          onClick={() => loadData(1)}
          className="btn"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">QR Personalizados</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Vista de tokens QR organizados por lotes
          </p>
        </div>
      </div>

      {/* Lista de QR */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Tokens QR ({qrs.length})</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {qrs.map((qr) => (
            <QrCard key={qr.id} qr={qr} />
          ))}
        </div>

        {loading && qrs.length > 0 && (
          <div className="text-center py-4">
            <div className="inline-block w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
            <span className="ml-2 text-sm text-slate-500">Cargando más...</span>
          </div>
        )}

        {hasMore && !loading && (
          <div className="text-center py-4">
            <button
              onClick={loadMore}
              className="btn-secondary"
              disabled={loading}
            >
              📄 Cargar más QR
            </button>
          </div>
        )}

        {!hasMore && qrs.length > 0 && (
          <div className="text-center py-4 text-sm text-slate-500">
            ✅ Todos los QR cargados ({qrs.length} total)
          </div>
        )}
      </div>
    </div>
  );
}