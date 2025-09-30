"use client";
import { prisma } from "@/lib/prisma";
import { buildTitle } from '@/lib/seo/title';
import { isTwoPhaseRedemptionEnabled } from "@/lib/featureFlags";
import React from "react";
export const revalidate = 0;

function format(ts?: Date|null) { return ts ? ts.toLocaleString() : "—"; }

export async function generateMetadata({ params }: { params: { tokenId: string } }) {
  const tokenId = params.tokenId;
  try {
    const t = await (prisma as any).token.findUnique({ where: { id: tokenId }, select: { prize: { select: { label: true } } } });
    if (t?.prize?.label) return { title: buildTitle(['Token', t.prize.label]) };
  } catch {}
  return { title: buildTitle(['Token', tokenId.slice(0,8)]) };
}

export default async function AdminTokenLookup({ params }: { params: { tokenId: string } }) {
  const { tokenId } = params;
  const twoPhase = isTwoPhaseRedemptionEnabled();
  const token = await (prisma as any).token.findUnique({ where: { id: tokenId }, include: { prize: true, batch: true } });
  if (!token) {
    return <div className="p-6 text-sm">Token no encontrado.</div>;
  }
  const state = (token as any).deliveredAt ? 'DELIVERED' : ((token as any).revealedAt ? 'REVEALED' : ((token as any).redeemedAt ? 'LEGACY_REDEEMED' : 'PENDING'));
  return <div className="max-w-lg p-6 space-y-6">
    <h1 className="text-lg font-semibold">Token #{token.id.slice(0,8)}…</h1>
    <div className="rounded border p-4 text-sm space-y-3 bg-slate-50 dark:bg-slate-800/40">
      <div><span className="font-medium">Premio:</span> {token.prize.label} <span className="text-xs text-slate-500">({token.prize.key})</span></div>
      <div className="grid grid-cols-2 gap-2 text-xs">
  <div>Revealed: {format((token as any).revealedAt)}</div>
  <div>Delivered: {format((token as any).deliveredAt)}</div>
  <div>Redeemed (legacy mirror): {format((token as any).redeemedAt)}</div>
        <div>Expires: {format(token.expiresAt)}</div>
      </div>
      <div className="text-xs">Estado actual: <StateBadge state={state} /></div>
      {twoPhase && state === 'REVEALED' && <DeliveryForm tokenId={token.id} />}
      {twoPhase && state === 'DELIVERED' && (token as any).deliveryNote && (
        <div className="rounded bg-emerald-500/10 border border-emerald-500/30 p-2 text-xs"><strong>Nota entrega:</strong><br/>{(token as any).deliveryNote}</div>
      )}
    </div>
  </div>;
}

function StateBadge({ state }: { state: string }) {
  const map: Record<string,{cls:string;label:string}> = {
    PENDING: { cls: 'bg-slate-500/15 text-slate-600', label: 'Pendiente' },
    REVEALED: { cls: 'bg-amber-500/15 text-amber-600', label: 'Revelado' },
    DELIVERED: { cls: 'bg-emerald-500/15 text-emerald-600', label: 'Entregado' },
    LEGACY_REDEEMED: { cls: 'bg-emerald-500/15 text-emerald-600', label: 'Canjeado' },
  };
  const m = map[state] || map.PENDING;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${m.cls}`}>{m.label}</span>;
}

// Client component inline (simple)

import { useState } from 'react';

function DeliveryForm({ tokenId }: { tokenId: string }) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string|null>(null);
  async function submit() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/token/${tokenId}/deliver`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ deliveryNote: note || undefined }) });
      const body = await res.json().catch(()=>({}));
      if (!res.ok) {
        setError(body?.error || 'ERROR');
      } else {
        setDone(true);
        // Hard refresh just this route for updated server data
        location.reload();
      }
    } catch (e:any) {
      setError(e.message || 'ERROR');
    } finally { setLoading(false); }
  }
  return <div className="space-y-2">
    <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Nota (opcional)" className="w-full rounded border p-2 text-xs" rows={3} />
    <div className="flex items-center gap-2">
      <button onClick={submit} disabled={loading || done} className="btn btn-sm">{loading ? 'Confirmando…' : 'Confirmar entrega'}</button>
      {done && <span className="text-emerald-600 text-xs">OK</span>}
    </div>
    {error && <div className="text-xs text-rose-600">{error}</div>}
  </div>;
}
