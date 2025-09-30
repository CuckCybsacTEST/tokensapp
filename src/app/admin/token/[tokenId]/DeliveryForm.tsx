"use client";
import React, { useState } from 'react';

export default function DeliveryForm({ tokenId }: { tokenId: string }) {
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
        // Recargar para traer estado actualizado desde el server (mantener simple)
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
