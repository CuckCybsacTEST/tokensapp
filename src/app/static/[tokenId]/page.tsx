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
  }, [tokenId]);

  async function handleMarkDelivered() {
    setMarkingDelivery(true);
    setDeliveryError(null);
    try {
      const res = await fetch('/api/static/mark-delivered', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenId }),
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
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="text-6xl mb-4">🎁</div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            Token No Válido
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
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

  // Si el token es futuro, mostrar UI especial
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

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">⏰</div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">
              ¡Premio Próximamente!
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Este token se activará pronto
            </p>
          </div>

          {/* Countdown Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 mb-6">
            <div className="text-center mb-6">
              <div
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl"
                style={{ backgroundColor: tokenData.prize.color || '#e5e7eb' }}
              >
                🎁
              </div>
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-1">
                {tokenData.prize.label}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Código: {tokenData.prize.key}
              </p>
            </div>

            {/* Countdown Timer */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 rounded-xl p-6 mb-6">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="text-center">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Se activa el</div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {/* @ts-ignore - toFormat method exists in Luxon DateTime */}
                  {validFrom.toFormat('dd/MM/yyyy')}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {/* @ts-ignore - toFormat method exists in Luxon DateTime */}
                  {validFrom.toFormat('HH:mm')} hs
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Expira el</div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {formattedExpiry.split(' ')[0]}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {formattedExpiry.split(' ')[1]} hs
                </div>
              </div>
            </div>

            {/* Batch Info */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">Información del lote</div>
              <div className="text-sm text-slate-700 dark:text-slate-300">
                <div>Lote: {tokenData.batch.description}</div>
                <div>Creado: {formattedCreated}</div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <div className="text-blue-500 text-xl">ℹ️</div>
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  ¿Qué sucede ahora?
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Este token se activará automáticamente en la fecha indicada</li>
                  <li>• Podrás reclamar tu premio una vez que esté disponible</li>
                  <li>• Guarda este enlace para cuando llegue el momento</li>
                  <li>• Si tienes alguna duda, contacta al administrador</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-slate-500 dark:text-slate-400 mt-8">
            <p>Token ID: {tokenData.id}</p>
            <p className="mt-1">Sistema de Premios - Próximamente Disponible</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            ¡Felicidades!
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Has recibido un premio especial
          </p>
        </div>

        {/* Token Info Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 mb-6">
          <div className="text-center mb-6">
            <div
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl"
              style={{ backgroundColor: tokenData.prize.color || '#e5e7eb' }}
            >
              🎁
            </div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-1">
              {tokenData.prize.label}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Código: {tokenData.prize.key}
            </p>
          </div>

          {/* Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="text-center">
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Estado</div>
              <div className={`text-sm font-medium ${tokenData.disabled ? 'text-red-500' : isExpired ? 'text-orange-500' : isValidFromFuture ? 'text-blue-500' : 'text-green-500'}`}>
                {tokenData.disabled ? 'Deshabilitado' :
                 isExpired ? 'Expirado' :
                 isValidFromFuture ? 'Próximamente' : 'Válido'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Expira</div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {formattedExpiry}
              </div>
            </div>
          </div>

          {/* Batch Info */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mb-6">
            <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">Información del lote</div>
            <div className="text-sm text-slate-700 dark:text-slate-300">
              <div>Lote: {tokenData.batch.description}</div>
              <div>ID: {tokenData.batch.id}</div>
              <div>Creado: {formattedCreated}</div>
            </div>
          </div>

          {/* Action Button */}
          {!tokenData.disabled && !isExpired && !isValidFromFuture && (
            <div className="text-center">
              {tokenData.batch.staticTargetUrl && tokenData.batch.staticTargetUrl.trim() !== '' ? (
                <>
                  <button
                    onClick={() => window.open(tokenData.batch.staticTargetUrl, '_blank')}
                    className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-8 py-3 rounded-lg font-medium transition-all transform hover:scale-105 shadow-lg"
                  >
                    🎁 Reclamar Premio
                  </button>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Se abrirá en una nueva ventana
                  </p>
                </>
              ) : (
                <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-8 py-3 rounded-lg font-medium shadow-lg">
                  🎉 ¡Premio Disponible!
                </div>
              )}
              {/* Botón staff para marcar entrega */}
              {isStaff && !tokenData.deliveredAt && (
                <div className="mt-4">
                  <button
                    onClick={handleMarkDelivered}
                    disabled={markingDelivery}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    {markingDelivery ? 'Marcando entrega…' : 'Marcar entrega (Staff)'}
                  </button>
                  {deliveryError && <div className="text-xs text-red-500 mt-2">{deliveryError}</div>}
                  {deliverySuccess && <div className="text-xs text-green-500 mt-2">¡Entrega marcada correctamente!</div>}
                </div>
              )}
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
        <div className="text-center text-sm text-slate-500 dark:text-slate-400">
          <p>Token ID: {tokenData.id}</p>
          <p className="mt-1">Sistema de Premios - Cumpleaños</p>
        </div>
      </div>
    </div>
  );
}