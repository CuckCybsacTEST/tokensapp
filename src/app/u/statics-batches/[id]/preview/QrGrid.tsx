'use client';

import { useState, useEffect } from 'react';
import { generateQrPngDataUrl } from '@/lib/qr';

interface Token {
  id: string;
  prizeId: string;
  prize: { key: string; label: string; color: string };
  validFrom: Date | null;
  redeemedAt: Date | null;
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
      // You could add a toast notification here
    } catch (err) {
      console.error('Error copying link:', err);
    }
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

        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {tokens.map((token) => {
            const qrDataUrl = qrCodes[token.id];
            const now = new Date();
            const isRedeemed = !!token.redeemedAt;
            const isDisabled = token.disabled;
            const isUpcoming = token.validFrom && new Date(token.validFrom) > now;
            const isExpired = !isUpcoming && token.expiresAt && new Date(token.expiresAt) < now;

            let borderColor = 'border-green-200 dark:border-green-800';
            if (isRedeemed) borderColor = 'border-blue-200 dark:border-blue-800';
            else if (isDisabled) borderColor = 'border-orange-200 dark:border-orange-800';
            else if (isUpcoming) borderColor = 'border-purple-200 dark:border-purple-800';
            else if (isExpired) borderColor = 'border-red-200 dark:border-red-800';

            return (
              <div
                key={token.id}
                className={`bg-white dark:bg-slate-800 rounded-lg border-2 ${borderColor} p-2 sm:p-3 flex flex-col items-center gap-1.5 sm:gap-2 hover:shadow-md transition-shadow min-h-[140px] sm:min-h-[160px]`}
              >
                <div className="text-[9px] sm:text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate w-full text-center leading-tight">
                  {token.id.slice(-8)}
                </div>

                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt={`QR para token ${token.id}`}
                    className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 flex-shrink-0"
                  />
                )}

                <div className="flex items-center gap-1 text-[9px] sm:text-[10px] min-h-[16px]">
                  <div
                    className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: token.prize?.color || '#666' }}
                  ></div>
                  <span className="text-slate-700 dark:text-slate-300 truncate text-center leading-tight">
                    {token.prize?.label}
                  </span>
                </div>

                <div className="flex gap-1 w-full mt-auto">
                  <button
                    onClick={() => downloadQR(token.id, token.prize?.label || 'token')}
                    className="flex-1 btn-outline !px-1 !py-1 text-[8px] sm:text-[9px] leading-tight"
                    title="Descargar QR"
                  >
                    💾
                  </button>
                  <button
                    onClick={() => copyLink(token.id)}
                    className="flex-1 btn-outline !px-1 !py-1 text-[8px] sm:text-[9px] leading-tight"
                    title="Copiar enlace"
                  >
                    📋
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}