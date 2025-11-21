"use client";
import React, { useEffect, useState } from "react";
import { DateTime } from "luxon";

type TokenData = {
  id: string;
  prize: {
    key: string;
    label: string;
    color: string | null;
  };
  batch: {
    id: string;
    description: string;
    staticTargetUrl: string;
    createdAt: string;
  };
  expiresAt: string;
  validFrom: string | null;
  disabled: boolean;
  deliveredAt?: string | null;
};

type StaticTokenPageProps = {
  params: { tokenId: string };
};

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

function decodeSessionCookie(raw: string | null): string | null {
  if (!raw) return null;
  const parts = raw.split('.');
  if (parts.length !== 2) return null;
  try {
    const payload = parts[0];
    const data = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return data.role || null;
  } catch {
    return null;
  }
}

export default function StaticTokenPage({ params }: StaticTokenPageProps) {
  const { tokenId } = params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  // Detectar modo staff por query param o por API
  const [isStaff, setIsStaff] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    async function checkStaff() {
      let staffParam = false;
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        staffParam = urlParams.get('staff') === '1';
      }
      try {
        const res = await fetch('/api/static/session');
        const data = await res.json();
        const newIsStaff = staffParam || data.isStaff === true;
        const newIsAdmin = data.isAdmin === true;
        setIsStaff(newIsStaff);
        setIsAdmin(newIsAdmin);
      } catch (error) {
        setIsStaff(staffParam);
        setIsAdmin(false);
      }
    }
    checkStaff();
  }, []);

  const [markingDelivery, setMarkingDelivery] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string|null>(null);
  const [deliverySuccess, setDeliverySuccess] = useState(false);
  const [qrSrc, setQrSrc] = useState('');

  useEffect(() => {
    async function loadTokenData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/static/${tokenId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Error al cargar el token');
        }

        setTokenData(data.token);
      } catch (err: any) {
        setError(err.message || 'Error desconocido');
      } finally {
        setLoading(false);
      }
    }

    if (tokenId) {
      loadTokenData();
    }
    // Construir URL del QR para la sesión pública (cliente)
    if (typeof window !== 'undefined') {
      try {
        const fullUrl = window.location.href;
        // Usamos un servicio público de generación de QR (no persistente)
        setQrSrc(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(fullUrl)}`);
      } catch (e) {
        // silence
      }
    }
  }, [tokenId]);

  async function handleMarkDelivered() {
    setMarkingDelivery(true);
    setDeliveryError(null);
    try {
      const res = await fetch(`/api/token/${tokenId}/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al marcar entrega');
      setDeliverySuccess(true);
      window.location.reload();
    } catch (err: any) {
      setDeliveryError(err.message || 'Error desconocido');
    } finally {
      setMarkingDelivery(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0E0606] text-white relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[100px]" />
        <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white/10 border-t-[#FF4D2E] rounded-full animate-spin" />
            <div className="text-white/60 text-sm font-medium tracking-wider uppercase">Cargando token...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0E0606] text-white p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/10 rounded-full blur-[100px]" />
        
        <div className="relative z-10 max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center">
            <div className="text-6xl mb-6">🎁</div>
            <h1 className="text-2xl font-bold mb-2 text-white">Algo salió mal</h1>
            <p className="text-white/60 mb-8 text-sm leading-relaxed">{error}</p>
            <button
            onClick={() => window.location.reload()}
            className="w-full bg-[#FF4D2E] hover:bg-[#FF6542] text-white py-3 rounded-xl font-bold transition-colors"
            >
            Intentar nuevamente
            </button>
        </div>
      </div>
    );
  }

  if (!tokenData) {
    return null;
  }

  const expiresAt = DateTime.fromISO(tokenData.expiresAt).setZone('America/Lima');
  const isExpired = expiresAt < DateTime.now();
  const isValidFromFuture = tokenData.validFrom && DateTime.fromISO(tokenData.validFrom) > DateTime.now();

  // @ts-ignore - toFormat method exists in Luxon DateTime
  const formattedExpiry = expiresAt.toFormat('dd/MM/yyyy HH:mm');
  // @ts-ignore - toFormat method exists in Luxon DateTime
  const formattedCreated = DateTime.fromISO(tokenData.batch.createdAt).toFormat('dd/MM/yyyy HH:mm');

  // Si el token está expirado, mostrar UI especial
  if (isExpired && !tokenData.disabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0E0606] text-white p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-900/20 rounded-full blur-[100px]" />
        
        <div className="relative z-10 max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center">
            <div className="text-6xl mb-6 grayscale opacity-50">⏰</div>
            <h1 className="text-2xl font-bold mb-2 text-white">Token Expirado</h1>
            <p className="text-white/60 mb-6 text-sm leading-relaxed">
                Lo sentimos, el tiempo para canjear este token ha finalizado.
            </p>
            <div className="inline-block bg-white/5 rounded-lg px-4 py-2 text-xs text-white/40 mb-8">
                Expiró el: {formattedExpiry}
            </div>
            <button
            onClick={() => window.location.reload()}
            className="text-white/40 hover:text-white text-sm transition-colors flex items-center justify-center gap-2 w-full"
            >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Volver al inicio
            </button>
        </div>
      </div>
    );
  }

  // Si el token está deshabilitado, mostrar UI especial
  if (tokenData.disabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0E0606] text-white p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gray-600/20 rounded-full blur-[100px]" />
        
        <div className="relative z-10 max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center">
            <div className="text-6xl mb-6 grayscale opacity-50">🚫</div>
            <h1 className="text-2xl font-bold mb-2 text-white">Token Deshabilitado</h1>
            <p className="text-white/60 mb-8 text-sm leading-relaxed">
                Este token ha sido invalidado por la administración.
            </p>
            <button
            onClick={() => window.location.reload()}
            className="text-white/40 hover:text-white text-sm transition-colors flex items-center justify-center gap-2 w-full"
            >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Volver al inicio
            </button>
        </div>
      </div>
    );
  }

  // Si el token ya fue entregado, mostrar UI especial
  if (tokenData.deliveredAt) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0E0606] text-white p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-600/20 rounded-full blur-[100px]" />
        
        <div className="relative z-10 max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center">
            <div className="text-6xl mb-6">✅</div>
            <h1 className="text-2xl font-bold mb-2 text-white">¡Token Canjeado!</h1>
            <p className="text-white/60 mb-6 text-sm leading-relaxed">
                Este token ya fue canjeado y entregado exitosamente. ¡Que lo disfrutes!
            </p>
            <div className="inline-block bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-2 text-xs text-green-400 mb-8">
                Entregado el: {DateTime.fromISO(tokenData.deliveredAt).setZone('America/Lima').toLocaleString(DateTime.DATETIME_SHORT, { locale: 'es-ES' })}
            </div>
            <button
            onClick={() => window.location.reload()}
            className="text-white/40 hover:text-white text-sm transition-colors flex items-center justify-center gap-2 w-full"
            >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Volver al inicio
            </button>
        </div>
      </div>
    );
  }
  if (isValidFromFuture && !tokenData.disabled) {
    const validFrom = DateTime.fromISO(tokenData.validFrom!);
    const now = DateTime.now();
    // @ts-ignore - diff method exists in Luxon DateTime
    const diff = validFrom.diff(now);
    // @ts-ignore - as method exists in Luxon Duration
    const days = Math.floor(diff.as('days'));
    // @ts-ignore - as method exists in Luxon Duration
    const hours = Math.floor(diff.as('hours') % 24);
    // @ts-ignore - as method exists in Luxon Duration
    const minutes = Math.floor(diff.as('minutes') % 60);

    // @ts-ignore - toFormat method exists in Luxon DateTime
    const formattedValidFromDate = validFrom.toFormat('dd/MM/yyyy');
    // @ts-ignore - toFormat method exists in Luxon DateTime
    const formattedValidFromTime = validFrom.toFormat('HH:mm');

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0E0606] text-white p-4 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[100px]" />
        
        <div className="relative z-10 max-w-md w-full flex flex-col gap-6">
            {/* Header / Back */}
            <div className="flex justify-between items-center px-2">
            <a
                href={isAdmin ? "/admin" : isStaff ? "/u" : "/"}
                className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                Volver
            </a>
            <div className="text-sm font-bold text-white/40 tracking-widest">GO LOUNGE</div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Token Programado</h1>
                <p className="text-white/60 text-sm mb-8">
                    Este token estará disponible próximamente.
                </p>

                <div className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/5">
                    <div
                        className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl shadow-lg"
                        style={{ backgroundColor: tokenData.prize.color || '#e5e7eb' }}
                    >
                        🎁
                    </div>
                    <h2 className="text-xl font-bold text-white mb-1">
                        {tokenData.prize.label}
                    </h2>
                    {isStaff && (
                        <p className="text-xs font-mono text-white/40">
                        KEY: {tokenData.prize.key}
                        </p>
                    )}
                </div>

                {/* Countdown Timer */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <div className="text-2xl font-bold text-blue-400">{days}</div>
                        <div className="text-[10px] uppercase tracking-wider text-white/40">Días</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <div className="text-2xl font-bold text-blue-400">{hours}</div>
                        <div className="text-[10px] uppercase tracking-wider text-white/40">Horas</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <div className="text-2xl font-bold text-blue-400">{minutes}</div>
                        <div className="text-[10px] uppercase tracking-wider text-white/40">Minutos</div>
                    </div>
                </div>

                <div className="text-sm text-white/60 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                    Se activará el <span className="text-blue-300 font-bold">{formattedValidFromDate}</span> a las <span className="text-blue-300 font-bold">{formattedValidFromTime} hs</span>
                </div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0E0606] text-white p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md mx-auto relative z-10 flex flex-col gap-6">
        {/* Header / Back */}
        <div className="flex justify-between items-center px-2">
           <a
            href={isAdmin ? "/admin" : isStaff ? "/u" : "/"}
            className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Volver
          </a>
          <div className="text-sm font-bold text-white/40 tracking-widest">GO LOUNGE</div>
        </div>

        {/* Main Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden group">
            {/* Card shine effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="mb-6 relative">
                <div className="absolute inset-0 bg-[#FF4D2E] blur-2xl opacity-20 rounded-full" />
                <h1 className="relative text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-sm">
                  ¡TOKEN<br/><span className="text-[#FF4D2E]">DISPONIBLE!</span>
                </h1>
            </div>

            <div className="w-full bg-gradient-to-b from-white/10 to-transparent rounded-2xl p-6 border border-white/5 mb-6">
                <div className="text-sm text-white/60 uppercase tracking-wider font-medium mb-2">Ganaste</div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 break-words">
                  {tokenData.prize.label}
                </h2>
                <div className="h-1 w-16 bg-[#FF4D2E] mx-auto rounded-full my-4" />
                <p className="text-white/80 text-sm leading-relaxed">
                  {isStaff 
                    ? 'Token válido. Procede a marcar la entrega.' 
                    : '¡Felicidades! Acércate a la barra, muestra este código QR y canjea tu token.'}
                </p>
            </div>

            {/* QR Code Section */}
            {qrSrc && !isStaff && (
                <div className="bg-white p-4 rounded-xl shadow-lg mb-6 transform transition-transform hover:scale-105 duration-300">
                    <img 
                        src={qrSrc} 
                        alt="QR Canje" 
                        className="w-48 h-48 object-contain" 
                    />
                    <div className="flex items-center justify-between mt-2">
                        <div className="text-black/60 text-[10px] font-mono uppercase tracking-widest">Escanear en barra</div>
                        <button
                            onClick={async () => {
                                try {
                                    const response = await fetch(qrSrc);
                                    const blob = await response.blob();
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = `token-${tokenId.slice(0,8)}.png`;
                                    link.click();
                                    URL.revokeObjectURL(url);
                                } catch (e) {
                                    // Fallback: open in new tab
                                    window.open(qrSrc, '_blank');
                                }
                            }}
                            className="text-black/40 hover:text-black/60 transition-colors p-1 rounded hover:bg-black/5"
                            title="Descargar QR"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7,10 12,15 17,10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Expiration */}
            <div className="flex items-center gap-2 text-xs text-yellow-400/80 bg-yellow-400/10 px-3 py-1.5 rounded-full border border-yellow-400/20">
                <span>⏰</span>
                <span>Expira: {(() => {
                  const expiresAtLima = DateTime.fromJSDate(new Date(tokenData.expiresAt)).setZone('America/Lima');
                  return expiresAtLima.toLocaleString(DateTime.DATETIME_SHORT, { locale: 'es-ES' });
                })()}</span>
            </div>

            {/* Staff Actions */}
            {isStaff && !tokenData.deliveredAt && !tokenData.disabled && !isExpired && !isValidFromFuture && (
                <div className="w-full mt-8 pt-6 border-t border-white/10">
                    <button
                    onClick={handleMarkDelivered}
                    disabled={markingDelivery}
                    className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                        markingDelivery 
                        ? 'bg-gray-600 cursor-not-allowed opacity-50' 
                        : 'bg-[#FF4D2E] hover:bg-[#FF6542] active:scale-[0.98] text-white'
                    }`}
                    >
                    {markingDelivery ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Procesando...</span>
                        </>
                    ) : (
                        <>
                            <span>✅</span>
                            <span>Marcar como Entregado</span>
                        </>
                    )}
                    </button>
                    {deliveryError && (
                        <div className="mt-3 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-xs text-left">
                            ⚠️ {deliveryError}
                        </div>
                    )}
                    {deliverySuccess && (
                        <div className="mt-3 p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-200 text-xs text-left">
                            🎉 ¡Entrega registrada!
                        </div>
                    )}
                </div>
            )}

            {/* Status Messages */}
            {(tokenData.disabled || isExpired || isValidFromFuture) && (
                <div className="w-full mt-6 p-4 rounded-xl bg-white/5 border border-white/10 text-left">
                    <div className="text-lg font-bold text-white mb-1">
                        {tokenData.disabled ? '🚫 Token deshabilitado' :
                        isExpired ? '⏰ Token expirado' :
                        '🕒 Aún no disponible'}
                    </div>
                    <p className="text-sm text-white/60">
                        {tokenData.disabled ? 'Este token ha sido invalidado.' :
                        isExpired ? 'El tiempo para canjear este token ha finalizado.' :
                        'Este token estará disponible en la fecha programada.'}
                    </p>
                </div>
            )}
        </div>

        {/* Footer Info */}
        <div className="text-center space-y-2">
            {isStaff && (
                <div className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-white/40">
                    ID: {tokenData.id.split('-')[0]}...
                </div>
            )}
            <p className="text-xs text-white/30">© 2025 Go Lounge Experience</p>
        </div>
      </div>
    </div>
  );
}