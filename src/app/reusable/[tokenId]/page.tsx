"use client";
import React, { useEffect, useState, useCallback } from "react";
import { DateTime } from "luxon";
import Link from 'next/link';

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
    isReusable: boolean;
  };
  expiresAt: string;
  maxUses: number | null;
  usedCount: number;
  disabled: boolean;
  deliveredAt: string | null;
  startTime?: string | null;
  endTime?: string | null;
};

type ReusableTokenPageProps = {
  params: { tokenId: string };
  searchParams: { redeem?: string };
};

// Componente para mostrar contador de expiración cuando quedan menos de 24 horas
function ExpirationCountdown({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = DateTime.now().setZone('America/Lima');
      const expiry = DateTime.fromISO(expiresAt).setZone('America/Lima');
      // @ts-ignore - diff method exists in Luxon DateTime
      const diff = expiry.diff(now);

      if (diff.as('milliseconds') <= 0) {
        // Token expiró, recargar página
        window.location.reload();
        return;
      }

      // @ts-ignore - as method exists in Luxon Duration
      const totalHours = diff.as('hours');
      const hours = Math.floor(totalHours);
      // @ts-ignore - as method exists in Luxon Duration
      const minutes = Math.floor(diff.as('minutes') % 60);

      // Mostrar contador solo si quedan menos de 24 horas
      const shouldShow = totalHours < 24;
      setIsVisible(shouldShow);

      if (shouldShow) {
        setTimeLeft({ hours, minutes });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Actualizar cada minuto
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!isVisible) return null;

  return (
    <div className="w-full bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-2xl p-4 mb-4 animate-pulse">
      <div className="text-center mb-3">
        <div className="text-sm font-bold text-red-400 mb-1">⏰ ¡ATENCIÓN!</div>
        <div className="text-xs text-red-300">Este token expira pronto</div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-red-500/20 rounded-lg p-2 text-center border border-red-500/30">
          <div className="text-lg font-bold text-red-400">{timeLeft.hours}</div>
          <div className="text-[10px] text-red-300 uppercase">Horas</div>
        </div>
        <div className="bg-red-500/20 rounded-lg p-2 text-center border border-red-500/30">
          <div className="text-lg font-bold text-red-400">{timeLeft.minutes}</div>
          <div className="text-[10px] text-red-300 uppercase">Minutos</div>
        </div>
        <div className="bg-red-500/20 rounded-lg p-2 text-center border border-red-500/30 flex flex-col items-center justify-center">
          <div className="text-lg">⚠️</div>
          <div className="text-[10px] text-red-300 uppercase">¡Corre!</div>
        </div>
      </div>
    </div>
  );
}

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

export default function ReusableTokenPage({ params, searchParams }: ReusableTokenPageProps) {
  const { tokenId } = params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  // Detectar modo staff por query param o por API
  const [isStaff, setIsStaff] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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
        // Solo considerar staff si tiene sesión de ADMIN (no usuarios BYOD)
        const newIsStaff = staffParam || (data.isAdmin === true || data.role === 'ADMIN' || data.role === 'STAFF');
        const newIsAdmin = data.isAdmin === true;
        const newIsLoggedIn = data.ok === true;
        setIsStaff(newIsStaff);
        setIsAdmin(newIsAdmin);
        setIsLoggedIn(newIsLoggedIn);
      } catch (error) {
        // Si no hay sesión válida, es usuario público
        setIsStaff(staffParam);
        setIsAdmin(false);
        setIsLoggedIn(false);
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

        // Fetch token data from API
        const response = await fetch(`/api/reusable/${tokenId}`);
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

  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState(false);
  const [autoRedeemAttempted, setAutoRedeemAttempted] = useState(false);

  async function handleMarkDelivered() {
    setMarkingDelivery(true);
    setDeliveryError(null);
    try {
      const res = await fetch(`/api/admin/reusable-tokens/${tokenId}/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          // Token ya entregado, recargar para mostrar estado actualizado
          window.location.reload();
          return;
        }
        throw new Error(data.error || 'Error al marcar entrega');
      }
      setDeliverySuccess(true);
      window.location.reload();
    } catch (err: any) {
      setDeliveryError(err.message || 'Error desconocido');
    } finally {
      setMarkingDelivery(false);
    }
  }

  const handleRedeem = useCallback(async () => {
    setRedeeming(true);
    setRedeemError(null);
    try {
      const res = await fetch(`/api/reusable/${tokenId}/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al redimir token');
      setRedeemSuccess(true);
      // Recargar datos del token
      const response = await fetch(`/api/reusable/${tokenId}`);
      const newData = await response.json();
      if (response.ok) {
        setTokenData(newData.token);
      }
      // Limpiar URL
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch (err: any) {
      setRedeemError(err.message || 'Error desconocido');
    } finally {
      setRedeeming(false);
    }
  }, [tokenId, setRedeeming, setRedeemError, setRedeemSuccess, setTokenData]);

  // Calculations moved up to avoid hook ordering issues
  const now = DateTime.now().setZone('America/Lima');
  let isExpired = false;
  let isDisabled = false;
  let maxUses = 1;
  let canRedeem = false;
  let formattedExpiry = '';

  if (tokenData) {
    const expiryDate = DateTime.fromISO(tokenData.expiresAt).setZone('America/Lima');
    const isExpiredByDate = expiryDate <= now;

    let isOutsideTimeWindow = false;
    if (tokenData.startTime && tokenData.endTime) {
      // @ts-ignore - hour property exists in Luxon DateTime
      const currentHour = now.hour;
      const startHour = parseInt(tokenData.startTime.split(':')[0]);
      const endHour = parseInt(tokenData.endTime.split(':')[0]);
      isOutsideTimeWindow = currentHour < startHour || currentHour >= endHour;
    }

    isExpired = isExpiredByDate || isOutsideTimeWindow;
    isDisabled = tokenData.disabled;
    maxUses = tokenData.maxUses || 1;
    canRedeem = !isExpired && !isDisabled && tokenData.usedCount < maxUses;
    formattedExpiry = DateTime.fromJSDate(new Date(tokenData.expiresAt)).setZone('America/Lima').toLocaleString(DateTime.DATETIME_SHORT, { locale: 'es-ES' });
  }

  // Handle redeem query param
  useEffect(() => {
    if (!autoRedeemAttempted && searchParams.redeem === 'true' && tokenData && canRedeem && isLoggedIn && !isStaff) {
      handleRedeem();
      setAutoRedeemAttempted(true);
    }
  }, [searchParams.redeem, tokenData, canRedeem, isLoggedIn, isStaff, handleRedeem, autoRedeemAttempted]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0E0606] text-white p-4 sm:p-6">
        <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-white"></div>
        <p className="mt-4 text-white/60 text-sm sm:text-base">Cargando token...</p>
      </div>
    );
  }

  if (error || !tokenData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0E0606] text-white p-4 sm:p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-900/20 rounded-full blur-[100px]" />

        <div className="relative z-10 max-w-sm sm:max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 text-center">
            <div className="text-4xl sm:text-6xl mb-4 sm:mb-6">❌</div>
            <h1 className="text-xl sm:text-2xl font-bold mb-2 text-white">Error</h1>
            <p className="text-white/60 mb-6 sm:mb-8 text-sm leading-relaxed">
                {error || 'Token no encontrado'}
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

  // Si el token está deshabilitado, mostrar UI especial
  if (tokenData.disabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0E0606] text-white p-4 sm:p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gray-600/20 rounded-full blur-[100px]" />

        <div className="relative z-10 max-w-sm sm:max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 text-center">
            <div className="text-4xl sm:text-6xl mb-4 sm:mb-6 grayscale opacity-50">🚫</div>
            <h1 className="text-xl sm:text-2xl font-bold mb-2 text-white">Token Deshabilitado</h1>
            <p className="text-white/60 mb-6 sm:mb-8 text-sm leading-relaxed">
                Este token ha sido invalidado por la administración.
            </p>
            <ExpirationCountdown expiresAt={tokenData.expiresAt} />
            <Link
              href={isAdmin ? "/admin" : isStaff ? "/u" : "/"}
              className="text-white/40 hover:text-white text-sm transition-colors flex items-center justify-center gap-2 w-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Volver
            </Link>
        </div>
      </div>
    );
  }

  // Si el token ya fue completamente usado (usedCount >= maxUses), mostrar UI especial
  if (tokenData.usedCount >= maxUses) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0E0606] text-white p-4 sm:p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-600/20 rounded-full blur-[100px]" />

        <div className="relative z-10 max-w-sm sm:max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 text-center">
            <div className="text-4xl sm:text-6xl mb-4 sm:mb-6">✅</div>
            <h1 className="text-xl sm:text-2xl font-bold mb-2 text-white">¡Token Agotado!</h1>
            <p className="text-white/60 mb-4 sm:mb-6 text-sm leading-relaxed">
                Este token ha alcanzado el límite de usos disponibles. ¡Gracias por participar!
            </p>
            <div className="inline-block bg-green-500/10 border border-green-500/20 rounded-lg px-3 sm:px-4 py-2 text-xs text-green-400 mb-6 sm:mb-8">
                Usos completados: {tokenData.usedCount}/{maxUses}
            </div>
            <ExpirationCountdown expiresAt={tokenData.expiresAt} />
            <Link
              href={isAdmin ? "/admin" : isStaff ? "/u" : "/"}
              className="text-white/40 hover:text-white text-sm transition-colors flex items-center justify-center gap-2 w-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Volver
            </Link>
        </div>
      </div>
    );
  }

  // Si el token expiró, mostrar UI especial
  if (isExpired) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0E0606] text-white p-4 sm:p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-900/20 rounded-full blur-[100px]" />

        <div className="relative z-10 max-w-sm sm:max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 text-center">
            <div className="text-4xl sm:text-6xl mb-4 sm:mb-6 grayscale opacity-50">⏰</div>
            <h1 className="text-xl sm:text-2xl font-bold mb-2 text-white">Token Expirado</h1>
            <p className="text-white/60 mb-4 sm:mb-6 text-sm leading-relaxed">
                Lo sentimos, el tiempo para canjear este token ha finalizado.
            </p>
            <div className="inline-block bg-white/5 rounded-lg px-3 sm:px-4 py-2 text-xs text-white/40 mb-6 sm:mb-8">
                Expiró el: {formattedExpiry}
            </div>
            <ExpirationCountdown expiresAt={tokenData.expiresAt} />
            <Link
              href={isAdmin ? "/admin" : isStaff ? "/u" : "/"}
              className="text-white/40 hover:text-white text-sm transition-colors flex items-center justify-center gap-2 w-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Volver
            </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0E0606] text-white p-4 sm:p-6 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-sm sm:max-w-md mx-auto relative z-10 flex flex-col gap-4 sm:gap-6">
        {/* Header / Back */}
        <div className="flex justify-between items-center px-2">
           <Link
            href={isAdmin ? "/admin" : isStaff ? "/u" : "/"}
            className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Volver
          </Link>
          <div className="text-sm font-bold text-white/40 tracking-widest">GO LOUNGE</div>
        </div>

        {/* Main Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden group">
            {/* Card shine effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="mb-4 sm:mb-6 relative">
                <div className="absolute inset-0 bg-[#FF4D2E] blur-2xl opacity-20 rounded-full" />
                <h1 className="relative text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow-sm">
                  TOKEN<br/><span className="text-[#FF4D2E]">DISPONIBLE</span>
                </h1>
            </div>

            <div className="w-full bg-gradient-to-b from-white/10 to-transparent rounded-2xl p-4 sm:p-6 border border-white/5 mb-4 sm:mb-6">
                <div className="text-xs sm:text-sm text-white/60 uppercase tracking-wider font-medium mb-2">RECLAMA</div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2 break-words leading-tight">
                  {tokenData.prize.label}
                </h2>
                <div className="h-1 w-12 sm:w-16 bg-[#FF4D2E] mx-auto rounded-full my-3 sm:my-4" />
                <p className="text-white/80 text-xs sm:text-sm leading-relaxed px-2 sm:px-0">
                  {isStaff
                    ? 'Token válido. El local abre a las 5:00 PM. Procede a marcar la entrega cuando llegue el cliente.'
                    : isLoggedIn
                    ? '¡Felicidades! Haz clic en Canjear Premio para obtener tu recompensa.'
                    : '¡Felicidades! Acércate a la barra, muestra este código QR y canjea tu token.'}
                </p>
            </div>

            {/* Usage Progress */}
            <div className="w-full bg-white/5 rounded-2xl p-3 sm:p-4 border border-white/10 mb-3 sm:mb-4">
                <div className="text-xs sm:text-sm text-white/60 uppercase tracking-wider font-medium mb-2">DISPONIBILIDAD</div>
                <div className="text-2xl sm:text-3xl font-bold text-[#FF4D2E] mb-2">
                  {tokenData.usedCount} / {maxUses}
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 sm:h-3">
                  <div
                    className="bg-[#FF4D2E] h-2 sm:h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(tokenData.usedCount / maxUses) * 100}%` }}
                  ></div>
                </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-blue-400/80 bg-blue-400/10 px-3 py-2 rounded-full border border-blue-400/20 mb-4">
              <span>Expira: {formattedExpiry}</span>
            </div>

            {/* QR Code Section */}
            {qrSrc && !isStaff && canRedeem && (
                <div className="bg-white p-3 sm:p-4 rounded-xl shadow-lg mb-4 sm:mb-6 transform transition-transform hover:scale-105 duration-300">
                    <img
                        src={qrSrc}
                        alt="QR Canje"
                        className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 object-contain mx-auto"
                    />
                    <div className="flex items-center justify-between mt-2">
                        <div className="text-black/60 text-[9px] sm:text-[10px] font-mono uppercase tracking-widest">Escanear en barra</div>
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
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7,10 12,15 17,10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Expiration Countdown */}
            <div className="flex items-center justify-center gap-2 text-sm text-orange-400/80 bg-orange-400/10 px-3 py-2 rounded-full border border-orange-400/20 mb-4">
              <span>Expira en: {(() => {
                const now = DateTime.now().setZone('America/Lima');
                const expiry = DateTime.fromISO(tokenData.expiresAt).setZone('America/Lima');
                // @ts-ignore - diff method exists in Luxon DateTime
                const diff = expiry.diff(now);
                if (diff.as('milliseconds') <= 0) return 'Expirado';
                const hours = Math.floor(diff.as('hours'));
                const minutes = Math.floor(diff.as('minutes') % 60);
                return `${hours}h ${minutes}m`;
              })()}</span>
            </div>

            {/* Time window info */}
            {tokenData.startTime && tokenData.endTime && (
                <div className="flex items-center gap-2 text-xs text-blue-400/80 bg-blue-400/10 px-3 py-1.5 rounded-full border border-blue-400/20">
                    <span>🕐</span>
                    <span>Válido: {tokenData.startTime.slice(0, 5)} - {tokenData.endTime.slice(0, 5)} (Lima)</span>
                </div>
            )}

            {/* Redeem Button - Only show if logged in and can redeem and not staff */}
            {canRedeem && isLoggedIn && !isStaff && (
                <div className="w-full mt-3 sm:mt-4">
                    <button
                        onClick={handleRedeem}
                        disabled={redeeming}
                        className={`w-full font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base ${
                            redeeming
                                ? 'bg-gray-600 cursor-not-allowed'
                                : 'bg-[#FF4D2E] hover:bg-[#FF6542] active:scale-[0.98] text-white'
                        }`}
                    >
                        {redeeming ? (
                            <>
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Procesando...</span>
                            </>
                        ) : (
                            <>
                                <span>🎁</span>
                                <span>Canjear Premio</span>
                            </>
                        )}
                    </button>
                    {redeemError && (
                        <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-xs text-left">
                            ⚠️ {redeemError}
                        </div>
                    )}
                    {redeemSuccess && (
                        <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-200 text-xs text-left">
                        🎉 ¡Premio canjeado! Usos restantes: {(tokenData.maxUses || 1) - tokenData.usedCount - 1}
                        </div>
                    )}
                </div>
            )}

            {/* Staff Actions */}
            {isStaff && (
                <div className="w-full mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/10">
                    <div className="mb-3 text-center">
                        <p className="text-white/70 text-sm">Panel de Administración</p>
                    </div>
                    {tokenData.deliveredAt ? (
                        <div className="w-full py-3 sm:py-4 rounded-xl bg-green-600/20 border border-green-600/30 text-green-200 text-center font-medium text-sm sm:text-base">
                            ✅ Ya marcado como entregado
                        </div>
                    ) : (
                        <button
                        onClick={handleMarkDelivered}
                        disabled={markingDelivery}
                        className={`w-full py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${
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
                    )}
                    {deliveryError && (
                        <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-xs text-left">
                            ⚠️ {deliveryError}
                        </div>
                    )}
                    {deliverySuccess && (
                        <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-200 text-xs text-left">
                            🎉 ¡Entrega registrada!
                        </div>
                    )}
                </div>
            )}

            {/* Status Messages */}
            {!canRedeem && (
                <div className="w-full mt-4 sm:mt-6 p-3 sm:p-4 rounded-xl bg-white/5 border border-white/10 text-left">
                    <div className="text-base sm:text-lg font-bold text-white mb-1">
                        {isDisabled ? '🚫 Token deshabilitado' :
                        isExpired ? '⏰ Token expirado' :
                        '🎯 Sin usos disponibles'}
                    </div>
                    <p className="text-xs sm:text-sm text-white/60">
                        {isDisabled ? 'Este token ha sido invalidado.' :
                        isExpired ? 'El tiempo para canjear este token ha finalizado.' :
                        'Este token ha alcanzado el límite de usos.'}
                    </p>
                </div>
            )}
        </div>

        {/* Footer Info */}
        <div className="text-center space-y-1 sm:space-y-2">
            {isStaff && (
                <div className="inline-block px-2 sm:px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] sm:text-[10px] font-mono text-white/40">
                    ID: {tokenData.id.split('-')[0]}...
                </div>
            )}
            <p className="text-[10px] sm:text-xs text-white/30">© 2025 Go Lounge Experience</p>
        </div>
      </div>
    </div>
  );
}