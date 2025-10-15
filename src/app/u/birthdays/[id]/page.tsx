"use client";
import { useEffect, useState } from 'react';

type Reservation = { id:string; celebrantName:string; phone:string; documento:string; email:string|null; date:string; timeSlot:string; pack?: any; guestsPlanned:number; status:string; tokensGeneratedAt:string|null; courtesyItems:any[]; photoDeliveries:any[] };
type Token = { id:string; code:string; kind:string; status:string; expiresAt:string; usedCount?:number; maxUses?:number };

export default function StaffBirthdayDetail({ params }: { params: { id: string } }) {
  const id = params.id;
  const [resv, setResv] = useState<Reservation|null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string|null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const [rRes, tRes] = await Promise.all([
        fetch(`/api/admin/birthdays/${encodeURIComponent(id)}`),
        fetch(`/api/admin/birthdays/${encodeURIComponent(id)}/tokens`),
      ]);
      const r = await rRes.json().catch(()=>({}));
      const t = await tRes.json().catch(()=>({}));
      if (!rRes.ok) throw new Error(r?.code || r?.message || rRes.status);
      if (!tRes.ok) throw new Error(t?.code || t?.message || tRes.status);
      setResv(r); setTokens(t.items||[]);
    } catch(e:any) { setErr(String(e?.message||e)); } finally { setLoading(false); }
  }
  useEffect(()=>{ load(); }, [id]);

  async function approve() { setBusy(true); setErr(null); try { const r=await fetch(`/api/admin/birthdays/${id}/approve`,{method:'POST'}); const j=await r.json(); if(!r.ok) throw new Error(j?.code||j?.message||r.status); load(); } catch(e:any){ setErr(String(e?.message||e)); } finally { setBusy(false); } }
  async function cancel() { if(!confirm('¿Cancelar?')) return; setBusy(true); setErr(null); try { const r=await fetch(`/api/admin/birthdays/${id}/cancel`,{method:'POST'}); const j=await r.json(); if(!r.ok) throw new Error(j?.code||j?.message||r.status); load(); } catch(e:any){ setErr(String(e?.message||e)); } finally { setBusy(false); } }
  async function complete() { setBusy(true); setErr(null); try { const r=await fetch(`/api/admin/birthdays/${id}/complete`,{method:'POST'}); const j=await r.json(); if(!r.ok) throw new Error(j?.code||j?.message||r.status); load(); } catch(e:any){ setErr(String(e?.message||e)); } finally { setBusy(false); } }
  async function genTokens(force=false) { setBusy(true); setErr(null); try { const url=`/api/admin/birthdays/${id}/tokens${force?'?force=1':''}`; const r=await fetch(url,{method:'POST'}); const j=await r.json(); if(!r.ok) throw new Error(j?.code||j?.message||r.status); load(); } catch(e:any){ setErr(String(e?.message||e)); } finally { setBusy(false); } }
  function downloadCards(){ fetch(`/api/admin/birthdays/${id}/download-cards`).then(async r=>{ if(!r.ok) throw new Error('download'); const b=await r.blob(); const url=URL.createObjectURL(b); const a=document.createElement('a'); a.href=url; a.download=`reservation-${id}-invites.zip`; a.click(); URL.revokeObjectURL(url); }).catch(e=>setErr(String(e?.message||e))); }

  if (loading && !resv) return <div className="p-4 text-sm text-slate-400">Cargando…</div>;
  if (err && !resv) return <div className="p-4 text-sm text-red-300">{err}</div>;
  if (!resv) return null;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Reserva: {resv.celebrantName}</h1>
          <a className="btn" href="/u/birthdays">Volver</a>
        </div>
        {err && <div className="rounded border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-200 p-3 text-sm">{err}</div>}
        <div className="grid md:grid-cols-2 gap-5">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-2 shadow-sm">
            <div className="text-sm text-slate-600 dark:text-slate-300"><span className="font-medium">Fecha:</span> {resv.date} {resv.timeSlot}</div>
            <div className="text-sm text-slate-600 dark:text-slate-300"><span className="font-medium">Pack:</span> {resv.pack?.name || '-'}</div>
            <div className="text-sm text-slate-600 dark:text-slate-300"><span className="font-medium">Documento:</span> {resv.documento}</div>
            <div className="text-sm text-slate-600 dark:text-slate-300"><span className="font-medium">WhatsApp:</span> {resv.phone}</div>
            <div className="text-sm text-slate-600 dark:text-slate-300"><span className="font-medium">Email:</span> {resv.email||'-'}</div>
            <div className="text-sm text-slate-600 dark:text-slate-300"><span className="font-medium">Estado:</span> {resv.status}</div>
            {resv.tokensGeneratedAt && <div className="text-xs text-slate-500 dark:text-slate-400">Tokens generados: {resv.tokensGeneratedAt}</div>}
            <div className="flex flex-wrap gap-2 pt-2">
              {resv.status==='pending_review' && <button className="btn h-8 px-3" disabled={busy} onClick={approve}>Aprobar</button>}
              {resv.status!=='canceled' && <button className="btn h-8 px-3" disabled={busy} onClick={cancel}>Cancelar</button>}
              {resv.status==='approved' && <button className="btn h-8 px-3" disabled={busy} onClick={complete}>Completar</button>}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-3 shadow-sm">
            <div className="font-medium text-slate-800 dark:text-slate-100">Invitaciones</div>
            <div className="flex flex-wrap gap-2">
              <button className="btn h-8 px-3" disabled={busy} onClick={()=>genTokens(false)}>Generar</button>
              <button className="btn h-8 px-3" disabled={busy} onClick={()=>genTokens(true)}>Forzar</button>
              <button className="btn h-8 px-3" onClick={downloadCards}>Descargar</button>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Total: {tokens.length}</div>
            <div className="max-h-60 overflow-auto rounded border border-slate-200 dark:border-slate-600">
              <table className="min-w-[650px] w-full text-sm">
                <thead><tr className="bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200"><th className="text-left px-2 py-1">Code</th><th className="text-left px-2 py-1">Tipo</th><th className="text-left px-2 py-1">Estado</th><th className="text-left px-2 py-1">Expira</th><th className="text-left px-2 py-1">Usos</th></tr></thead>
                <tbody>{tokens.map(t=> <tr key={t.id} className="border-t border-slate-100 dark:border-slate-700"><td className="px-2 py-1 font-mono">{t.code}</td><td className="px-2 py-1">{t.kind}</td><td className="px-2 py-1">{t.status}</td><td className="px-2 py-1">{t.expiresAt?.slice?.(0,19)?.replace('T',' ')}</td><td className="px-2 py-1">{(t.usedCount??0)}{t.maxUses?` / ${t.maxUses}`:''}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-2 shadow-sm">
            <div className="font-medium text-slate-800 dark:text-slate-100">Cortesías</div>
            {resv.courtesyItems?.length? <ul className="mt-1 space-y-1">{resv.courtesyItems.map(ci=> <li key={ci.id} className="flex justify-between text-sm border-b border-slate-100 dark:border-slate-700 py-1"><span>{ci.type}</span><span className="text-xs text-slate-500 dark:text-slate-400">{ci.status}</span></li>)}</ul> : <div className="text-xs text-slate-500 dark:text-slate-400">No hay cortesías.</div>}
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-2 shadow-sm">
            <div className="font-medium text-slate-800 dark:text-slate-100">Fotos</div>
              {resv.photoDeliveries?.length? <ul className="mt-1 space-y-1">{resv.photoDeliveries.map(ph=> <li key={ph.id} className="flex justify-between text-sm border-b border-slate-100 dark:border-slate-700 py-1"><span>{ph.kind}</span><span className="text-xs text-slate-500 dark:text-slate-400">{ph.status}</span></li>)}</ul> : <div className="text-xs text-slate-500 dark:text-slate-400">No hay fotos.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
