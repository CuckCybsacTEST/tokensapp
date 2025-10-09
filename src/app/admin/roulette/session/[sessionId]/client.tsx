"use client";
import React, { useCallback, useEffect, useState } from 'react';
import RouletteWheel from '../../RouletteWheel';

interface GetResp { sessionId: string; mode: string; status: string; twoPhase?: boolean; spins: Array<{ prizeId: string; order: number; tokenId?: string|null; token?: { revealedAt: string|null; deliveredAt: string|null } }>; remaining: { prizeId: string; label: string; color: string|null; count?: number; remaining?: number }[]; finished: boolean; snapshot: any }

export default function RouletteSessionClient({ sessionId }: { sessionId: string }) {
  const [elements, setElements] = useState<{ prizeId: string; label: string; color: string|null; count: number }[]>([]);
  const [history, setHistory] = useState<{ order: number; prizeId: string; label?: string; tokenId?: string|null; revealedAt?: string|null; deliveredAt?: string|null }[]>([]);
  const [twoPhase, setTwoPhase] = useState(false);
  const [delivering, setDelivering] = useState<string|null>(null);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [tip, setTip] = useState<string|null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/roulette/${sessionId}`);
      if (!res.ok) throw new Error('GET_FAILED');
      const data: GetResp = await res.json();
      const elems = data.remaining.map(r => ({ prizeId: r.prizeId, label: r.label, color: r.color, count: (r as any).count ?? (r as any).remaining ?? 0 }));
      setElements(elems);
      setHistory(data.spins.map(s => ({ order: s.order, prizeId: s.prizeId, tokenId: s.tokenId, revealedAt: s.token?.revealedAt, deliveredAt: s.token?.deliveredAt })));
      setTwoPhase(!!data.twoPhase);
      setFinished(data.finished);
    } catch (e:any) { setError(e.message); } finally { setLoading(false); }
  }, [sessionId]);

  const confirmDelivery = useCallback(async (tokenId: string) => {
    setDelivering(tokenId);
    try {
      const res = await fetch(`/api/token/${tokenId}/deliver`, { method: 'POST' });
      if (!res.ok) throw new Error('DELIVER_FAILED');
      const data = await res.json();
      if (data.phase === 'DELIVERED') {
        setHistory(h => h.map(item => item.tokenId === tokenId ? { ...item, deliveredAt: data.timestamps.deliveredAt } : item));
      }
    } catch { /* ignore */ } finally { setDelivering(null); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const spinWrapper = useCallback(async () => {
    const res = await fetch(`/api/roulette/${sessionId}`, { method: 'POST' });
    if (!res.ok) throw new Error('SPIN_FAILED');
    const data: any = await res.json();
    if (data.phase === 'REVEALED') {
      setHistory(h => [...h, { order: data.order, prizeId: data.prize.prizeId, label: data.prize.label, tokenId: data.tokenId, revealedAt: data.timestamps.revealedAt }]);
    } else {
      setHistory(h => [...h, { order: data.order, prizeId: data.chosen.prizeId, label: data.chosen.label, tokenId: data.chosen.tokenId }]);
    }
    setElements(data.remaining.map((r: any) => ({ prizeId: r.prizeId, label: r.label, color: r.color, count: r.count })));
    setFinished(data.finished);
    // Manejar acciones virtuales
    if (data.action === 'RETRY') {
      // Giro inmediato sin intervención; breve tip opcional
      setTip('Nuevo intento…');
      setTimeout(() => setTip(null), 1200);
      // Cadena: volver a girar (evitar bucles infinitos si sólo quedan virtuales)
      // Protección: si ya no hay elementos reales y sólo virtuales, el backend igual decrece y finalizará.
      try { await spinWrapper(); } catch {}
    } else if (data.action === 'LOSE') {
      setTip('Hoy no tuviste suerte');
      setTimeout(() => setTip(null), 1800);
    }
    return data;
  }, [sessionId]);

  if (loading) return <div className="text-sm text-slate-500">Cargando…</div>;
  if (error) return <div className="text-sm text-red-600">Error: {error}</div>;

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div>
        <RouletteWheel
          elements={elements}
          onSpin={spinWrapper as any}
          spinning={false}
          history={history}
        />
      </div>
      <div className="flex-1 space-y-4">
        {tip && (
          <div className="rounded bg-amber-100 text-amber-900 text-xs px-2 py-1 inline-block">{tip}</div>
        )}
        <div className="text-sm">
          <strong>Spins:</strong>
          <ol className="mt-2 space-y-1 text-xs">
            {history.map(h => (
              <li key={h.order} className="flex items-center gap-2">
                <span className="font-mono">#{h.order}</span>
                <span>{h.label || h.prizeId}</span>
                {twoPhase && h.tokenId && (
                  <>
                    {h.revealedAt && !h.deliveredAt && (
                      <button
                        disabled={delivering === h.tokenId}
                        onClick={() => confirmDelivery(h.tokenId!)}
                        className="px-2 py-0.5 text-[10px] rounded bg-emerald-600 text-white hover:bg-emerald-700"
                      >{delivering === h.tokenId ? 'Entregando…' : 'Marcar entregado'}</button>
                    )}
                    {h.deliveredAt && <span className="text-emerald-600">Entregado</span>}
                  </>
                )}
              </li>
            ))}
          </ol>
        </div>
        <div className="text-xs text-slate-500">
          {finished ? 'Sesión finalizada' : 'Sesión activa'} | modo: {twoPhase ? '2-fases' : 'legacy'}
        </div>
      </div>
    </div>
  );
}
