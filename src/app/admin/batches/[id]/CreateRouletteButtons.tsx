'use client';
import React from 'react';

async function createRoulette(batchId: string, modeParam?: 'token') {
  const url = modeParam ? `/api/roulette?mode=${modeParam}` : '/api/roulette';
  const res = await fetch(url, { method: 'POST', body: JSON.stringify({ batchId }), headers: { 'content-type': 'application/json' } });
  if (!res.ok) throw new Error(await res.text() || 'CREATE_FAILED');
  return res.json();
}

export function CreateRouletteButtons({ batchId, eligibleByPrize, eligibleByToken }: { batchId: string; eligibleByPrize: boolean; eligibleByToken: boolean }) {
  const [loading, setLoading] = React.useState<string | null>(null);
  const handle = async (mode?: 'token') => {
    try {
      setLoading(mode || 'prize');
      const r = await createRoulette(batchId, mode);
      window.location.href = `/admin/roulette/session/${r.sessionId}`;
    } catch (e) {
      console.error(e);
      alert('Error creando ruleta');
    } finally {
      setLoading(null);
    }
  };
  if (!eligibleByPrize && !eligibleByToken) return null;
  return (
    <div className="flex gap-2">
      {eligibleByPrize && (
        <button onClick={() => handle()} disabled={!!loading} type="button" className="btn-outline !py-1 !px-3 text-xs disabled:opacity-50">
          {loading === 'prize' ? 'Creando…' : 'Crear ruleta'}
        </button>
      )}
      {eligibleByToken && (
        <button onClick={() => handle('token')} disabled={!!loading} type="button" className="btn-outline !py-1 !px-3 text-xs disabled:opacity-50">
          {loading === 'token' ? 'Creando…' : 'Crear ruleta (tokens)'}
        </button>
      )}
    </div>
  );
}