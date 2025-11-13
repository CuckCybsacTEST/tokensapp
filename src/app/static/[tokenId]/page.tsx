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
        setIsStaff(staffParam || data.isStaff === true);
      } catch {
        setIsStaff(staffParam);
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
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 flex flex-col items-center justify-center">
        <div className="max-w-sm sm:max-w-md mx-auto text-center p-6">
          <div className="text-4xl sm:text-6xl mb-4">🎁</div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            Token No Válido
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-pink-500 hover:bg-pink-600 text-white px-4 sm:px-6 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base"
          >
            Reintentar
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col items-center justify-center">
        <div className="max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="text-4xl sm:text-6xl mb-4">⏰</div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">
              {isStaff ? 'Token Programado' : 'Token Aún No Válido'}
            </h1>
            <p className="text-sm sm:text-lg text-slate-600 dark:text-slate-400">
              {isStaff ? 'Este token se activará en la fecha programada' : `Este token se activará el ${formattedValidFromDate} a las ${formattedValidFromTime} hs`}
            </p>
          </div>

          {/* Countdown Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="text-center mb-4 sm:mb-6">
              <div
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full mx-auto mb-3 sm:mb-4 flex items-center justify-center text-xl sm:text-2xl"
                style={{ backgroundColor: tokenData.prize.color || '#e5e7eb' }}
              >
                🎁
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-slate-200 mb-1">
                {tokenData.prize.label}
              </h2>
              {isStaff && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Código: {tokenData.prize.key}
                </p>
              )}
            </div>

            {/* Countdown Timer */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
              <h3 className="text-center text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3 sm:mb-4">
                ⏳ Tiempo restante para activación
              </h3>
              <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-2 sm:p-3">
                  <div className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{days}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Días</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-2 sm:p-3">
                  <div className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{hours}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Horas</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-2 sm:p-3">
                  <div className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{minutes}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Minutos</div>
                </div>
              </div>
            </div>

            {/* Activation Info - Más prominente */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
              <h3 className="text-center text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3 sm:mb-4">
                📅 Fecha y hora de activación
              </h3>
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {formattedValidFromDate}
                </div>
                <div className="text-base sm:text-lg text-blue-500 dark:text-blue-300 mb-3 sm:mb-4">
                  {formattedValidFromTime} hs
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Expira el {formattedExpiry}
                </div>
              </div>
            </div>

            {/* Batch Info */}
            {isStaff && (
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">Información del lote</div>
                <div className="text-sm text-slate-700 dark:text-slate-300">
                  <div>Lote: {tokenData.batch.description}</div>
                  <div>Creado: {formattedCreated}</div>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <div className="text-blue-500 text-xl">ℹ️</div>
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  {isStaff ? 'Información del token' : '¿Qué sucede ahora?'}
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  {isStaff ? (
                    <>
                      <li>• El token se activará automáticamente en la fecha indicada</li>
                      <li>• El usuario podrá canjear el premio una vez activado</li>
                      <li>• Mantén este enlace para seguimiento administrativo</li>
                    </>
                  ) : (
                    <>
                      <li>• Este token se activará automáticamente en la fecha indicada</li>
                      <li>• Podrás reclamar tu premio una vez que esté disponible</li>
                      <li>• Guarda este enlace para cuando llegue el momento</li>
                      <li>• Si tienes alguna duda, contacta al administrador</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-6 sm:mt-8">
            {isStaff && <p>Token ID: {tokenData.id}</p>}
            <p className="mt-1">{isStaff ? 'Sistema de Administración de Premios' : 'Sistema de Premios - Próximamente Disponible'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 flex flex-col items-center justify-center">
      <div className="max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Token Info Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="text-center mb-4 sm:mb-6">
            <div
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full mx-auto mb-3 sm:mb-4 flex items-center justify-center text-xl sm:text-2xl"
              style={{ backgroundColor: tokenData.prize.color || '#e5e7eb' }}
            >
              🎁
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-slate-200 mb-1">
              {tokenData.prize.label}
            </h2>
          </div>

          {/* Prize Available Card */}
          {!tokenData.disabled && !isExpired && !isValidFromFuture && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
              <div className="text-center">
                <div className="text-green-600 dark:text-green-400 text-2xl sm:text-3xl mb-2 sm:mb-3">🎉</div>
                <h3 className="text-base sm:text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                  {isStaff ? 'Premio listo para canjear' : '¡Tu premio está disponible!'}
                </h3>
                <p className="text-sm text-green-800 dark:text-green-200 mb-3 sm:mb-4">
                  {isStaff ? 'El usuario debe dirigirse a la barra y mostrar su pulsera o código QR para canjear el premio.' : 'Dirígete a la barra y muestra tu pulsera o este código QR para canjear tu premio.'}
                </p>
                  {/* QR para canje - solo público */}
                  {qrSrc && !isStaff && (
                    <div className="mt-4">
                      <a href={qrSrc} target="_blank" rel="noopener noreferrer" title="Abrir QR en nueva pestaña">
                        <img src={qrSrc} alt="Código QR para canjear" className="mx-auto w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 object-contain rounded-lg border p-2 bg-white" />
                      </a>
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="text-center">
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Estado</div>
              <div className={`text-sm font-medium ${tokenData.disabled ? 'text-red-500' : isExpired ? 'text-orange-500' : isValidFromFuture ? 'text-blue-500' : 'text-green-500'}`}>
                {tokenData.disabled ? 'Deshabilitado' :
                 isExpired ? 'Expirado' :
                 isValidFromFuture ? 'Próximamente' : 'Disponible'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Expira</div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {formattedExpiry}
              </div>
            </div>
          </div>

          {/* Batch Info - Solo para staff */}
          {isStaff && (
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mb-6">
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">Información del lote</div>
              <div className="text-sm text-slate-700 dark:text-slate-300">
                <div>Lote: {tokenData.batch.description}</div>
                <div>ID: {tokenData.batch.id}</div>
                <div>Creado: {formattedCreated}</div>
              </div>
            </div>
          )}

          {/* Logo - solo público */}
          {!isStaff && (
            <div className="text-center mt-4 sm:mt-6">
              <img src="/logoblack.png" alt="Logo" className="mx-auto h-8 md:h-10 w-auto" />
            </div>
          )}

          {/* Botón staff para marcar entrega */}
          {isStaff && !tokenData.deliveredAt && !tokenData.disabled && !isExpired && !isValidFromFuture && (
            <div className="text-center">
              <button
                onClick={handleMarkDelivered}
                disabled={markingDelivery}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {markingDelivery ? 'Marcando entrega…' : 'Marcar entrega'}
              </button>
              {deliveryError && <div className="text-xs text-red-500 mt-2">{deliveryError}</div>}
              {deliverySuccess && <div className="text-xs text-green-500 mt-2">¡Entrega marcada correctamente!</div>}
            </div>
          )}

          {(tokenData.disabled || isExpired || isValidFromFuture) && (
            <div className="text-center">
              <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4">
                <div className="text-slate-500 dark:text-slate-400 text-sm">
                  {tokenData.disabled ? 'Este token ha sido deshabilitado.' :
                   isExpired ? 'Este token ha expirado.' :
                   'Este token aún no está disponible.'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-6 sm:mt-8">
          {isStaff && <p>Token ID: {tokenData.id}</p>}
          <p className="mt-1">{isStaff ? 'Sistema de Administración de Premios' : 'Sistema de Premios - Cumpleaños'}</p>
        </div>
      </div>
    </div>
  );
}