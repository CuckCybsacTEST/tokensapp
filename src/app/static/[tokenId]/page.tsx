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

  // Estados para el temporizador de seguridad del botón
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [holdTimeout, setHoldTimeout] = useState<NodeJS.Timeout | null>(null);

  // Limpiar timeout al desmontar el componente
  useEffect(() => {
    return () => {
      if (holdTimeout) {
        clearTimeout(holdTimeout);
      }
    };
  }, [holdTimeout]);

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

  // Funciones para el temporizador de seguridad del botón
  const startHoldTimer = () => {
    setIsHolding(true);
    setHoldProgress(0);
    
    const startTime = Date.now();
    const duration = 2000; // 2 segundos
    
    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      setHoldProgress(progress);
      
      if (progress < 100) {
        setHoldTimeout(setTimeout(updateProgress, 50));
      } else {
        // Temporizador completado, ejecutar la acción
        handleMarkDelivered();
        setIsHolding(false);
        setHoldProgress(0);
      }
    };
    
    setHoldTimeout(setTimeout(updateProgress, 50));
  };

  const cancelHoldTimer = () => {
    if (holdTimeout) {
      clearTimeout(holdTimeout);
      setHoldTimeout(null);
    }
    setIsHolding(false);
    setHoldProgress(0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-gradient-to-b from-[#0E0606] to-[#07070C] text-white">
        <div className="text-2xl mb-4">Cargando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-gradient-to-b from-[#0E0606] to-[#07070C] text-white">
        <div className="text-5xl mb-4">🎁</div>
        <h1 className="text-3xl font-extrabold mb-2 tracking-tight drop-shadow-lg">Token No Válido</h1>
        <p className="text-base opacity-80 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-[#FF4D2E] hover:bg-[#FF7A3C] text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Reintentar
        </button>
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
      <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 text-center bg-gradient-to-b from-[#2d0a0a] to-[#07070C] text-white">
        <div className="text-4xl sm:text-5xl mb-4">⏰</div>
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-2 tracking-tight drop-shadow-lg text-[#FF4D2E]">Token expirado</h1>
        <p className="text-sm sm:text-base opacity-80 mb-4">Este premio ya expiró y no es válido para reclamar.</p>
        <div className="text-xs sm:text-sm opacity-70 mb-2">Expiró el: {formattedExpiry}</div>
        <button
          onClick={() => window.location.reload()}
          className="inline-block text-xs opacity-70 hover:opacity-100 mt-4 text-white/70 hover:text-white"
        >
          ← Volver
        </button>
      </div>
    );
  }

  // Si el token está deshabilitado, mostrar UI especial
  if (tokenData.disabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 text-center bg-gradient-to-b from-[#1a1a1a] to-[#07070C] text-white">
        <div className="text-4xl sm:text-5xl mb-4">🚫</div>
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-2 tracking-tight drop-shadow-lg text-[#FF4D2E]">Token deshabilitado</h1>
        <p className="text-sm sm:text-base opacity-80 mb-4">Este premio ha sido deshabilitado y no está disponible.</p>
        <button
          onClick={() => window.location.reload()}
          className="inline-block text-xs opacity-70 hover:opacity-100 mt-4 text-white/70 hover:text-white"
        >
          ← Volver
        </button>
      </div>
    );
  }

  // Si el token ya fue entregado, mostrar UI especial
  if (tokenData.deliveredAt) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 text-center bg-gradient-to-b from-[#0a2d0a] to-[#07070C] text-white">
        <div className="text-4xl sm:text-5xl mb-4">✅</div>
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-2 tracking-tight drop-shadow-lg text-[#4CAF50]">Premio entregado</h1>
        <p className="text-sm sm:text-base opacity-80 mb-4">Este premio ya fue reclamado y entregado exitosamente.</p>
        <div className="text-xs sm:text-sm opacity-70 mb-2">Entregado el: {DateTime.fromISO(tokenData.deliveredAt).setZone('America/Lima').toLocaleString(DateTime.DATETIME_SHORT, { locale: 'es-ES' })}</div>
        <button
          onClick={() => window.location.reload()}
          className="inline-block text-xs opacity-70 hover:opacity-100 mt-4 text-white/70 hover:text-white"
        >
          ← Volver
        </button>
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
      <div className="min-h-screen flex flex-col px-4 py-8 items-center justify-center bg-gradient-to-b from-[#0E0606] to-[#07070C] text-white">
        <div className="w-full max-w-xl mx-auto rounded-2xl shadow-2xl bg-gradient-to-br from-white/5 to-white/2 border border-white/10 p-6 md:p-10 flex flex-col items-center">
          <a
            href={isAdmin ? "/admin" : isStaff ? "/u" : "/"}
            className="inline-block text-xs opacity-70 hover:opacity-100 mb-2 text-white/70 hover:text-white"
          >← Volver</a>
          
          <h1 className="mt-2 text-4xl md:text-5xl font-extrabold tracking-tight drop-shadow-lg text-center text-[#FF4D2E]">Token Programado</h1>

          <div className="mt-4 rounded-xl border border-white/20 bg-white/5 p-4 text-base leading-relaxed text-white/90 shadow-lg">
            <div className="text-center mb-4">
              <div
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl"
                style={{ backgroundColor: tokenData.prize.color || '#e5e7eb' }}
              >
                🎁
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                {tokenData.prize.label}
              </h2>
              {isStaff && (
                <p className="text-sm text-white/70">
                  Código: {tokenData.prize.key}
                </p>
              )}
            </div>
            
            <div className="text-center text-white/90 mb-4">
              {isStaff ? 'Este token se activará en la fecha programada' : `Este token se activará el ${formattedValidFromDate} a las ${formattedValidFromTime} hs`}
            </div>

            {/* Countdown Timer */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 rounded-xl p-4 mb-4">
              <h3 className="text-center text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                ⏳ Tiempo restante para activación
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{days}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Días</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{hours}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Horas</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{minutes}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Minutos</div>
                </div>
              </div>
            </div>

            {/* Activation Info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 rounded-xl p-4">
              <h3 className="text-center text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                📅 Fecha y hora de activación
              </h3>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {formattedValidFromDate}
                </div>
                <div className="text-lg text-blue-500 dark:text-blue-300 mb-3">
                  {formattedValidFromTime} hs
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Expira el {formattedExpiry}
                </div>
              </div>
            </div>
          </div>

          {/* Información de estado */}
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 pt-2 pb-4 px-4 shadow-lg">
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-white/70">Estado:</span>
                <span className="font-medium text-blue-400">Próximamente</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-white/70">Expira:</span>
                <span className="font-medium text-yellow-300">{formattedExpiry}</span>
              </div>
              
              {isStaff && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Lote:</span>
                    <span className="text-emerald-300 font-medium text-sm">{tokenData.batch.description}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">ID Lote:</span>
                    <span className="text-blue-300 font-medium text-sm">{tokenData.batch.id}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Creado:</span>
                    <span className="text-purple-300 font-medium text-sm">{formattedCreated}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center text-xs opacity-70 mt-4 text-white/70">
          {isStaff && <p>Token ID: {tokenData.id}</p>}
          <p className="mt-1">Sistema de Premios</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10 items-center justify-center bg-gradient-to-b from-[#0E0606] to-[#07070C] text-white`}>
      <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-xl mx-auto rounded-2xl shadow-2xl bg-gradient-to-br from-white/5 to-white/2 border border-white/10 p-4 sm:p-6 md:p-8 lg:p-10 flex flex-col items-center">
        <a
          href={isAdmin ? "/admin" : isStaff ? "/u" : "/"}
          className="inline-block text-xs sm:text-sm opacity-70 hover:opacity-100 mb-3 sm:mb-4 text-white/70 hover:text-white self-start transition-opacity duration-200"
        >← Volver</a>

        <h1 className="mt-2 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight drop-shadow-lg text-center text-[#FF4D2E]">Premio Disponible</h1>

        <div className="mt-4 rounded-xl border border-white/20 bg-white/5 p-3 sm:p-4 md:p-6 text-sm sm:text-base leading-relaxed text-white/90 shadow-lg w-full">
          <div className="text-center mb-3 sm:mb-4">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2">
              {tokenData.prize.label}
            </h2>
          </div>

          <div className="text-center text-white/90 mb-4 sm:mb-6 text-sm sm:text-base">
            {isStaff ? 'este token es válido y puede proceder a canjearse, utiliza el botón de abajo para marcar entrega' : 'Sobrin@, este token es válido solo una vez, acércate a nuestra barra, muestra el qr y canjéa tu premio......'}
          </div>

          {/* QR para canje - solo público */}
          {qrSrc && !isStaff && (
            <div className="mt-6 sm:mt-8 flex justify-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl border-2 border-white/20 p-4 sm:p-6 shadow-xl">
                <a href={qrSrc} target="_blank" rel="noopener noreferrer" title="Abrir QR en nueva pestaña" className="block">
                  <img 
                    src={qrSrc} 
                    alt="Código QR para canjear premio" 
                    className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 object-contain rounded-lg border border-white/30 bg-white p-2 sm:p-3 shadow-lg hover:shadow-xl transition-shadow duration-200" 
                  />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Información adicional de expiración */}
        <div className="text-xs sm:text-sm mt-3 sm:mt-4 text-center text-yellow-300 font-medium px-2">
          <div>
            ⏰ Expira: {(() => {
              const expiresAtLima = DateTime.fromJSDate(new Date(tokenData.expiresAt)).setZone('America/Lima');
              return expiresAtLima.toLocaleString(DateTime.DATETIME_SHORT, { locale: 'es-ES' });
            })()}
          </div>
        </div>

        {/* Botón staff para marcar entrega */}
        {isStaff && !tokenData.deliveredAt && !tokenData.disabled && !isExpired && !isValidFromFuture && (
          <div className="flex justify-center mt-4">
            <button
              onMouseDown={startHoldTimer}
              onMouseUp={cancelHoldTimer}
              onMouseLeave={cancelHoldTimer}
              onTouchStart={startHoldTimer}
              onTouchEnd={cancelHoldTimer}
              disabled={markingDelivery || isHolding}
              className={`relative px-6 sm:px-8 md:px-10 lg:px-12 py-3 sm:py-4 md:py-5 lg:py-6 rounded-lg font-bold text-base sm:text-lg md:text-xl lg:text-2xl transition-all duration-200 whitespace-nowrap overflow-hidden ${
                markingDelivery 
                  ? 'bg-gray-600 cursor-not-allowed opacity-50' 
                  : isHolding
                  ? 'bg-[#FF7A3C] shadow-lg text-white'
                  : 'bg-[#FF4D2E] hover:bg-[#FF7A3C] active:scale-95 shadow-lg hover:shadow-xl text-white'
              }`}
            >
              {/* Barra de progreso */}
              {isHolding && (
                <div 
                  className="absolute inset-0 bg-[#FF7A3C] transition-all duration-50"
                  style={{ width: `${holdProgress}%` }}
                />
              )}
              
              {/* Texto del botón */}
              <span className="relative z-10">
                {markingDelivery 
                  ? 'Marcando entrega…' 
                  : isHolding 
                  ? `Mantén presionado... ${Math.round(holdProgress)}%` 
                  : 'Marcar entrega'
                }
              </span>
            </button>
            {deliveryError && <div className="text-xs sm:text-sm text-red-300 bg-red-900/20 border border-red-800/40 rounded px-3 py-2 sm:px-4 sm:py-3 mt-3">{deliveryError}</div>}
            {deliverySuccess && <div className="text-xs sm:text-sm text-green-300 bg-green-900/20 border border-green-800/40 rounded px-3 py-2 sm:px-4 sm:py-3 mt-3">¡Entrega marcada correctamente!</div>}
          </div>
        )}

        {(tokenData.disabled || isExpired || isValidFromFuture) && (
          <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 sm:px-6 sm:py-4 text-center text-yellow-100 shadow-lg">
            <div className="text-base sm:text-lg md:text-xl mb-2 font-semibold">
              {tokenData.disabled ? '🚫 Token deshabilitado' :
               isExpired ? '⏰ Token expirado' :
               '🕒 Token aún no válido'}
            </div>
            <div className="text-xs sm:text-sm md:text-base opacity-80 leading-relaxed">
              {tokenData.disabled ? 'Este token ha sido deshabilitado.' :
               isExpired ? 'Este token ha expirado y no es válido para reclamar.' :
               'Este token se activará en la fecha programada.'}
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="text-center text-xs sm:text-sm opacity-70 mt-4 sm:mt-6 text-white/70 px-4">
        {isStaff && <p className="font-mono text-xs sm:text-sm">Token ID: {tokenData.id}</p>}
        <p className="mt-1 font-semibold">Go Lounge</p>
      </div>
    </div>
  );
}