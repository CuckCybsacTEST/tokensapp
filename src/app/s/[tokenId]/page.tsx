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
};

type StaticTokenPageProps = {
  params: { tokenId: string };
};

export default function StaticTokenPage({ params }: StaticTokenPageProps) {
  const { tokenId } = params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);

  useEffect(() => {
    async function loadTokenData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/s/${tokenId}`);
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
              <button
                onClick={() => window.open(tokenData.batch.staticTargetUrl, '_blank')}
                className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-8 py-3 rounded-lg font-medium transition-all transform hover:scale-105 shadow-lg"
              >
                🎁 Reclamar Premio
              </button>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Se abrirá en una nueva ventana
              </p>
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