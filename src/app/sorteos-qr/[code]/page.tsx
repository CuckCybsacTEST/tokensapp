"use client";
import React, { useEffect, useState } from 'react';
import { DateTime } from 'luxon';
import Link from 'next/link';

type CustomQrData = {
  id: string;
  customerName: string;
  customerWhatsapp: string;
  customerPhrase?: string;
  customData?: string;
  theme: string;
  qrColor?: string;
  backgroundColor?: string;
  imageUrl?: string;
  originalImageUrl?: string;
  imageMetadata?: string;
  code: string;
  isActive: boolean;
  expiresAt?: string;
  redeemedAt?: string;
  createdAt: string;
};

type QrPageProps = {
  params: { code: string };
};

export default function CustomQrPage({ params }: QrPageProps) {
  const { code } = params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrData, setQrData] = useState<CustomQrData | null>(null);
  const [qrSrc, setQrSrc] = useState('');

  // Set page title
  useEffect(() => {
    if (qrData) {
      document.title = `🎄 Gran Sorteo Navideño - ${qrData.customerName}`;
    }
  }, [qrData]);

  useEffect(() => {
    async function loadQrData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch QR data from API
        const response = await fetch(`/api/qr/validate/${code}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Error al cargar el QR');
        }

        setQrData(data.qr);
      } catch (err: any) {
        setError(err.message || 'Error desconocido');
      } finally {
        setLoading(false);
      }
    }

    if (code) {
      loadQrData();
    }

    // Construir URL del QR usando servicio externo
    if (typeof window !== 'undefined') {
      try {
        const fullUrl = window.location.href;
        setQrSrc(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(fullUrl)}`);
      } catch (e) {
        // silence
      }
    }
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0E0606] text-white px-4 py-6 sm:px-6 sm:py-8">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:h-12 border-b-2 border-white"></div>
        <p className="mt-4 text-white/60 text-sm sm:text-base">Cargando QR personalizado...</p>
      </div>
    );
  }

  if (error || !qrData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0E0606] text-white px-4 py-6 sm:px-6 sm:py-8 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-900/20 rounded-full blur-[100px]" />

        <div className="relative z-10 max-w-xs sm:max-w-sm md:max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 text-center">
            <div className="text-3xl sm:text-4xl md:text-6xl mb-3 sm:mb-4 md:mb-6">❌</div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 text-white">Error</h1>
            <p className="text-white/60 mb-4 sm:mb-6 md:mb-8 text-sm leading-relaxed px-2">
                {error || 'QR no encontrado'}
            </p>
            <Link
              href="/"
              className="text-white/40 hover:text-white text-sm transition-colors flex items-center justify-center gap-2 w-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Volver al inicio
            </Link>
        </div>
      </div>
    );
  }

  // Check if QR is expired
  const now = DateTime.now().setZone('America/Lima');
  const expiryDate = qrData.expiresAt ? DateTime.fromISO(qrData.expiresAt).setZone('America/Lima') : null;
  const isExpired = expiryDate && expiryDate <= now;
  const isDisabled = !qrData.isActive;
  const isRedeemed = !!qrData.redeemedAt;

  // Si el QR está inactivo, mostrar UI especial
  if (isDisabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0E0606] text-white p-4 sm:p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gray-600/20 rounded-full blur-[100px]" />

        <div className="relative z-10 max-w-sm sm:max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 text-center">
            <div className="text-4xl sm:text-6xl mb-4 sm:mb-6 grayscale opacity-50">🚫</div>
            <h1 className="text-xl sm:text-2xl font-bold mb-2 text-white">QR Deshabilitado</h1>
            <p className="text-white/60 mb-6 sm:mb-8 text-sm leading-relaxed">
                Este QR personalizado ha sido invalidado por la administración.
            </p>
            <Link
              href="/"
              className="text-white/40 hover:text-white text-sm transition-colors flex items-center justify-center gap-2 w-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Volver al inicio
            </Link>
        </div>
      </div>
    );
  }

  // Si el QR ya fue redimido, mostrar UI especial
  if (isRedeemed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0E0606] text-white p-4 sm:p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-600/20 rounded-full blur-[100px]" />

        <div className="relative z-10 max-w-sm sm:max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 text-center">
            <div className="text-4xl sm:text-6xl mb-4 sm:mb-6">✅</div>
            <h1 className="text-xl sm:text-2xl font-bold mb-2 text-white">QR Ya Redimido</h1>
            <p className="text-white/60 mb-6 sm:mb-8 text-sm leading-relaxed">
                Este QR personalizado ya fue usado por el personal de Go Lounge.
            </p>
            <Link
              href="/"
              className="text-white/40 hover:text-white text-sm transition-colors flex items-center justify-center gap-2 w-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Volver al inicio
            </Link>
        </div>
      </div>
    );
  }

  // Si el QR expiró, mostrar UI especial
  if (isExpired) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0E0606] text-white p-4 sm:p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-600/20 rounded-full blur-[100px]" />

        <div className="relative z-10 max-w-sm sm:max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 text-center">
            <div className="text-4xl sm:text-6xl mb-4 sm:mb-6">⏰</div>
            <h1 className="text-xl sm:text-2xl font-bold mb-2 text-white">QR Expirado</h1>
            <p className="text-white/60 mb-6 sm:mb-8 text-sm leading-relaxed">
                Este QR personalizado expiró y ya no es válido.
            </p>
            <Link
              href="/"
              className="text-white/40 hover:text-white text-sm transition-colors flex items-center justify-center gap-2 w-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Volver al inicio
            </Link>
        </div>
      </div>
    );
  }

  // QR válido - mostrar información y QR
  return (
    <div className="min-h-screen bg-[#0E0606] text-white px-4 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-12 relative overflow-hidden">
      {/* Elementos decorativos navideños - ocultos en móviles pequeños */}
      <div className="hidden sm:block absolute top-10 left-4 md:left-10 text-yellow-400/20 text-2xl md:text-4xl animate-pulse">🎄</div>
      <div className="hidden sm:block absolute top-20 right-4 md:right-16 text-red-400/20 text-xl md:text-3xl animate-pulse delay-1000">🎁</div>
      <div className="hidden md:block absolute bottom-20 left-4 md:left-20 text-green-400/20 text-lg md:text-2xl animate-pulse delay-500">❄️</div>
      <div className="hidden md:block absolute bottom-32 right-4 md:right-10 text-blue-400/20 text-xl md:text-3xl animate-pulse delay-1500">⭐</div>

      <div className="max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-6">
          <div className="inline-block p-2 sm:p-3 md:p-4 bg-gradient-to-r from-yellow-500/20 to-red-500/20 rounded-full mb-3 sm:mb-4">
            <svg className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-red-400 bg-clip-text text-transparent leading-tight">
            ¡Estás participando!
          </h1>
          <p className="text-white/80 text-xs sm:text-sm md:text-base font-medium px-2">
            Gran Sorteo: 2 CANASTAS y 2 PAVOS NAVIDEÑOS
          </p>
          <p className="text-white/60 text-xs sm:text-sm mt-1 px-2">
            Código QR válido para {qrData.customerName}
          </p>
        </div>

        {/* Customer Information Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-5">
          <div className="space-y-2 sm:space-y-3">
            <div className="text-center space-y-3 sm:space-y-4">
              <div>
                <span className="font-medium text-white/60 block text-xs sm:text-sm">Participante:</span>
                <p className="mt-1 text-white text-sm sm:text-base break-words">{qrData.customerName}</p>
              </div>
              <div>
                <span className="font-medium text-white/60 block text-xs sm:text-sm">WhatsApp:</span>
                <p className="mt-1 text-white text-sm sm:text-base break-words">{qrData.customerWhatsapp}</p>
              </div>
            </div>

            {/* QR Code Section - integrado dentro de la tarjeta */}
            {qrSrc && (
              <div className="pt-1 sm:pt-2 border-t border-white/10">
                <div className="text-center mb-2 sm:mb-3">
                  <span className="text-xs sm:text-sm font-medium text-white/60 block mb-1">Descarga tu qr ahora!</span>
                  <div className="flex justify-center">
                    <div className="inline-flex w-36 sm:w-48 md:w-56 flex-col items-center bg-white p-3 sm:p-4 rounded-xl shadow-lg transform transition-transform hover:scale-105 duration-300">
                      <img
                        src={qrSrc}
                        alt="QR del Gran Sorteo Navideño"
                        className="w-full h-auto object-contain"
                      />
                      <div className="mt-2 flex w-full flex-col items-center gap-1 sm:flex-row sm:justify-between">
                        <div className="text-black/60 text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-center sm:text-left">🎄 Boleto navideño</div>
                        <button
                          onClick={async () => {
                            try {
                              const response = await fetch(qrSrc);
                              const blob = await response.blob();
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = `boleto-sorteo-${qrData.code.slice(0,8)}.png`;
                              link.click();
                              URL.revokeObjectURL(url);
                            } catch (e) {
                              window.open(qrSrc, '_blank');
                            }
                          }}
                          className="text-black/40 hover:text-black/60 transition-colors p-1 rounded hover:bg-black/5"
                          title="Descargar boleto del sorteo"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7,10 12,15 17,10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {qrData.customerPhrase && (
              <div>
                <span className="text-xs sm:text-sm font-medium text-white/60 block">Frase personal:</span>
                <p className="mt-1 italic text-white text-sm sm:text-base break-words">"{qrData.customerPhrase}"</p>
              </div>
            )}

            {qrData.customData && (
              <div>
                <span className="text-xs sm:text-sm font-medium text-white/60 block">Dato adicional:</span>
                <p className="mt-1 text-white text-sm sm:text-base break-words">{qrData.customData}</p>
              </div>
            )}

            <div className="pt-2 sm:pt-3 border-t border-white/10">
              <div className="text-center mb-2 sm:mb-3">
                <div className="inline-flex items-center gap-1 sm:gap-2 bg-gradient-to-r from-yellow-500/20 to-red-500/20 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full border border-yellow-500/30 animate-pulse">
                  <span className="text-yellow-400 text-sm">🎯</span>
                  <span className="text-xs font-bold text-yellow-400 uppercase tracking-wide">Fecha de Sorteo</span>
                </div>
                <div className="text-lg sm:text-xl font-bold text-white mt-1 bg-gradient-to-r from-yellow-400 to-red-400 bg-clip-text text-transparent">
                  {qrData.expiresAt
                    ? new Date(qrData.expiresAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : 'Por definir'
                  }
                </div>
                <div className="text-xs text-white/60">
                  ¡No te lo pierdas!
                </div>
              </div>
            </div>
          </div>

          {/* Social Media Announcement */}
          <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-white/10">
            <div className="text-center">
              <p className="text-white/80 text-xs sm:text-sm mb-1 sm:mb-2 px-2">
                ¡El sorteo será transmitido en vivo por todas nuestras plataformas!
              </p>
              <p className="text-xs text-white/60">
                Facebook • Instagram • TikTok
              </p>
            </div>
          </div>

          <div className="text-center mt-3 sm:mt-4">
            <p className="text-xs sm:text-sm text-white/40 px-2">
              🎄 ¡Suerte en el Gran Sorteo Navideño! 🎄
            </p>
            <p className="text-xs text-white/30 mt-1 px-2 leading-relaxed">
              Este QR es válido y puede ser redimido por el personal de Go Lounge
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}