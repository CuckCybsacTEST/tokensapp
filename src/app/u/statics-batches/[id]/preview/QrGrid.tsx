'use client';

import { useState, useEffect } from 'react';
import { generateQrPngDataUrl } from '@/lib/qr';
import { IconEye, IconDownload, IconCopy, IconX } from '@tabler/icons-react';

interface Token {
  id: string;
  prizeId: string;
  prize: { key: string; label: string; color: string };
  validFrom: Date | null;
  redeemedAt: Date | null;
  revealedAt: Date | null;
  expiresAt: Date | null;
  disabled: boolean;
  createdAt: Date;
}

interface QRGridProps {
  tokens: Token[];
}

export default function QrGrid({ tokens }: QRGridProps) {
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  useEffect(() => {
    const generateQRs = async () => {
      try {
        setLoading(true);
        const qrPromises = tokens.map(async (token) => {
          const url = `${window.location.origin}/static/${token.id}`;
          const qrDataUrl = await generateQrPngDataUrl(url);
          return { tokenId: token.id, qrDataUrl };
        });

        const results = await Promise.all(qrPromises);
        const qrMap = results.reduce((acc, { tokenId, qrDataUrl }) => {
          acc[tokenId] = qrDataUrl;
          return acc;
        }, {} as Record<string, string>);

        setQrCodes(qrMap);
      } catch (err) {
        console.error('Error generating QR codes:', err);
        setError('Error al generar códigos QR');
      } finally {
        setLoading(false);
      }
    };

    if (tokens.length > 0) {
      generateQRs();
    }
  }, [tokens]);

  const downloadQR = (tokenId: string, prizeLabel: string) => {
    const qrDataUrl = qrCodes[tokenId];
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `qr-${tokenId}-${prizeLabel.replace(/\s+/g, '-').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyLink = async (tokenId: string) => {
    const url = `${window.location.origin}/static/${tokenId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(tokenId);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Error copying link:', err);
    }
  };

  const openPreview = (token: Token) => {
    setSelectedToken(token);
  };

  const closePreview = () => {
    setSelectedToken(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-slate-600 dark:text-slate-400">Generando códigos QR...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
          <h3 className="font-semibold text-base sm:text-lg">Códigos QR de los Tokens</h3>
          <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            {tokens.length} códigos QR
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
          {tokens.map((token) => {
            const qrDataUrl = qrCodes[token.id];
            const now = new Date();
            const isRedeemed = !!token.redeemedAt;
            const isRevealed = !!token.revealedAt;
            const isDisabled = token.disabled;
            const isUpcoming = token.validFrom && new Date(token.validFrom) > now;
            const isExpired = !isUpcoming && token.expiresAt && new Date(token.expiresAt) < now;

            let borderColor = 'border-green-200 dark:border-green-800';
            let bgColor = 'bg-green-100/60 dark:bg-green-900/30';
            if (isRedeemed) {
              borderColor = 'border-blue-200 dark:border-blue-800';
              bgColor = 'bg-blue-100/60 dark:bg-blue-900/30';
            } else if (isRevealed) {
              borderColor = 'border-yellow-200 dark:border-yellow-800';
              bgColor = 'bg-yellow-100/60 dark:bg-yellow-900/30';
            } else if (isDisabled) {
              borderColor = 'border-orange-200 dark:border-orange-800';
              bgColor = 'bg-orange-100/60 dark:bg-orange-900/30';
            } else if (isUpcoming) {
              borderColor = 'border-purple-200 dark:border-purple-800';
              bgColor = 'bg-purple-100/60 dark:bg-purple-900/30';
            } else if (isExpired) {
              borderColor = 'border-slate-300 dark:border-slate-600';
              bgColor = 'bg-slate-100/60 dark:bg-slate-900/30';
            }

            return (
              <div
                key={token.id}
                className={`bg-white dark:bg-slate-800 ${bgColor} rounded-lg border-2 ${borderColor} p-2 sm:p-3 flex flex-col items-center gap-2 hover:shadow-lg transition-all duration-200 min-h-[190px] sm:min-h-[210px] group`}
              >
                <div className="text-[8px] sm:text-[9px] font-mono text-slate-500 dark:text-slate-400 truncate w-full text-center leading-tight">
                  {token.id.slice(-8)}
                </div>

                {qrDataUrl && (
                  <div className="relative">
                    <img
                      src={qrDataUrl}
                      alt={`QR para token ${token.id}`}
                      className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 flex-shrink-0 rounded cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => openPreview(token)}
                    />
                    <button
                      onClick={() => openPreview(token)}
                      className="absolute -top-1 -right-1 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      title="Ver QR completo"
                    >
                      <IconEye size={12} />
                    </button>
                  </div>
                )}

                <div className="flex flex-col items-center gap-1.5 text-center min-h-[40px] sm:min-h-[44px] px-1 bg-slate-50 dark:bg-slate-800/30 rounded-md py-1.5">
                  <div className="flex items-center gap-2 mb-0.5">
                    <div
                      className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full flex-shrink-0 shadow-md ring-2 ring-white dark:ring-slate-700"
                      style={{ backgroundColor: token.prize?.color || '#666' }}
                    ></div>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-900 dark:text-white leading-tight text-center break-words hyphens-auto max-w-full uppercase tracking-wide">
                    {token.prize?.label}
                  </span>
                </div>

                <div className="flex gap-1 w-full mt-auto">
                  <button
                    onClick={() => downloadQR(token.id, token.prize?.label || 'token')}
                    className="flex-1 btn-outline !px-1 !py-1.5 text-[7px] sm:text-[8px] hover:bg-green-50 hover:border-green-300 dark:hover:bg-green-900/20 transition-colors"
                    title="Descargar QR"
                  >
                    <IconDownload size={10} className="mx-auto" />
                  </button>
                  <button
                    onClick={() => copyLink(token.id)}
                    className={`flex-1 btn-outline !px-1 !py-1.5 text-[7px] sm:text-[8px] transition-colors ${
                      copySuccess === token.id
                        ? 'bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-600'
                        : 'hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-900/20'
                    }`}
                    title={copySuccess === token.id ? '¡Copiado!' : 'Copiar enlace'}
                  >
                    <IconCopy size={10} className="mx-auto" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Preview QR */}
      {selectedToken && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-lg">Vista Previa QR</h3>
              <button
                onClick={closePreview}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <IconX size={20} />
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

              {qrCodes[selectedToken.id] && (
                <div className="bg-white p-4 rounded-lg border-2 border-slate-200 dark:border-slate-600">
                  <img
                    src={qrCodes[selectedToken.id]}
                    alt={`QR para token ${selectedToken.id}`}
                    className="w-48 h-48"
                  />
                </div>
              )}

              <div className="text-center text-sm text-slate-600 dark:text-slate-400 mb-4">
                <div>Escanea este código QR para acceder al token</div>
                <div className="font-mono text-xs mt-1 break-all">
                  {window.location.origin}/static/{selectedToken.id}
                </div>
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => downloadQR(selectedToken.id, selectedToken.prize?.label || 'token')}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <IconDownload size={16} />
                  Descargar
                </button>
                <button
                  onClick={() => copyLink(selectedToken.id)}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    copySuccess === selectedToken.id
                      ? 'bg-green-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <IconCopy size={16} />
                  {copySuccess === selectedToken.id ? '¡Copiado!' : 'Copiar enlace'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}