"use client";

import { useState } from 'react';
import { DateTime } from 'luxon';

export default function DebugTokenPage() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function checkToken() {
    if (!code.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/birthdays/debug-token/${encodeURIComponent(code.trim())}`);
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setResult({ error: String(e?.message || e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Debug Token de Cumpleaños</h1>

        <div className="bg-slate-800 p-6 rounded-lg mb-6">
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ingresa código del QR"
              className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
              onKeyPress={(e) => e.key === 'Enter' && checkToken()}
            />
            <button
              onClick={checkToken}
              disabled={loading || !code.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 rounded font-medium"
            >
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </div>

        {result && (
          <div className="bg-slate-800 p-6 rounded-lg">
            {result.error ? (
              <div className="text-red-400">
                <h3 className="font-bold mb-2">Error:</h3>
                <p>{result.error}</p>
              </div>
            ) : result.found ? (
              <div>
                <h3 className="text-green-400 font-bold mb-4">✅ Token encontrado</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-2">Token:</h4>
                    <div className="space-y-1 text-sm">
                      <div>Código: <code className="bg-slate-700 px-2 py-1 rounded">{result.token.code}</code></div>
                      <div>Tipo: {result.token.kind}</div>
                      <div>Estado: {result.token.status}</div>
                      <div>Expira: {(() => {
                        const expiresAtLima = DateTime.fromJSDate(new Date(result.token.expiresAt)).setZone('America/Lima');
                        return expiresAtLima.toLocaleString(DateTime.DATETIME_SHORT, { locale: 'es-ES' });
                      })()}</div>
                      <div>Creado: {new Date(result.token.createdAt).toLocaleString()}</div>
                      {result.token.maxUses && <div>Usos: {result.token.usedCount}/{result.token.maxUses}</div>}
                    </div>
                  </div>
                  {result.reservation && (
                    <div>
                      <h4 className="font-semibold mb-2">Reserva:</h4>
                      <div className="space-y-1 text-sm">
                        <div>Cumpleañero: {result.reservation.celebrantName}</div>
                        <div>Fecha: {new Date(result.reservation.date).toLocaleDateString()}</div>
                        <div>Estado: {result.reservation.status}</div>
                        <div>Pack: {result.reservation.packName}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-red-400 font-bold mb-4">❌ Token NO encontrado</h3>
                <div className="mb-4">
                  <p>Se buscó: <code className="bg-slate-700 px-2 py-1 rounded">{result.searchedCode}</code></p>
                  <p>Total de tokens en BD: {result.totalTokens}</p>
                </div>
                {result.similarTokens && result.similarTokens.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Tokens similares encontrados:</h4>
                    <div className="space-y-2">
                      {result.similarTokens.map((t: any, i: number) => (
                        <div key={i} className="bg-slate-700 p-3 rounded text-sm">
                          <div>Código: <code className="bg-slate-600 px-2 py-1 rounded">{t.code}</code></div>
                          <div>Tipo: {t.kind} | Estado: {t.status}</div>
                          <div>Cumpleañero: {t.celebrantName} | Fecha: {t.date ? new Date(t.date).toLocaleDateString() : 'N/A'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}