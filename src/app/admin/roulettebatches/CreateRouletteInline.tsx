"use client";
import React, { useState } from 'react';

async function createRoulette(batchId: string, modeParam?: 'token') {
  const url = modeParam ? `/api/roulette?mode=${modeParam}` : '/api/roulette';
  const res = await fetch(url, { method: 'POST', body: JSON.stringify({ batchId }), headers: { 'content-type': 'application/json' } });
  if (!res.ok) throw new Error(await res.text() || 'CREATE_FAILED');
  return res.json();
}

export default function CreateRouletteInline({ batchId, hasSession, sessionId, sessionMode, eligibleByPrize, eligibleByToken }: { batchId: string; hasSession: boolean; sessionId?: string; sessionMode?: string; eligibleByPrize: boolean; eligibleByToken: boolean }) {
  const [loading, setLoading] = useState(false);
  if (hasSession) {
  return <a href={`/admin/roulette/session/${sessionId}`} className="btn !px-2 !py-1 text-[10px]">Ruleta ({sessionMode})</a>;
  }
  if (!eligibleByPrize && !eligibleByToken) return null;
  const create = async (tokenMode?: boolean) => {
    try {
      setLoading(true);
      const r = await createRoulette(batchId, tokenMode ? 'token' : undefined);
  window.location.href = `/admin/roulette/session/${r.sessionId}`;
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert('Error creando ruleta');
    } finally { setLoading(false); }
  };
  return (
    <div className="flex gap-1">
      {eligibleByPrize && <button disabled={loading} onClick={() => create(false)} className="btn-outline !px-2 !py-1 text-[10px]">Ruleta</button>}
      {eligibleByToken && <button disabled={loading} onClick={() => create(true)} className="btn-outline !px-2 !py-1 text-[10px]">Ruleta tokens</button>}
    </div>
  );
}
