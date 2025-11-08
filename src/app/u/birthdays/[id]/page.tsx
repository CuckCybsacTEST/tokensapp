"use client";
import { useEffect, useState } from 'react';
import { DateTime } from 'luxon';

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
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Header responsive */}
        <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 break-words">
            Reserva: {resv.celebrantName}
          </h1>
          <a className="btn w-full sm:w-auto text-center" href="/u/birthdays">Volver</a>
        </div>

        {/* Error message responsive */}
        {err && (
          <div className="rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-200 p-3 sm:p-4 text-sm">
            {err}
          </div>
        )}

        {/* Main content grid - responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {/* Reservation details card */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-5 space-y-3 sm:space-y-2 shadow-sm">
            <h2 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-3">Detalles de la Reserva</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div className="text-slate-600 dark:text-slate-300">
                <span className="font-medium">Fecha:</span>
                <div className="mt-1 text-slate-800 dark:text-slate-200 font-medium">
                  {resv.date} {resv.timeSlot}
                </div>
              </div>
              <div className="text-slate-600 dark:text-slate-300">
                <span className="font-medium">Pack:</span>
                <div className="mt-1 text-slate-800 dark:text-slate-200 font-medium">
                  {resv.pack?.name || '-'}
                </div>
              </div>
              <div className="text-slate-600 dark:text-slate-300">
                <span className="font-medium">Documento:</span>
                <div className="mt-1 text-slate-800 dark:text-slate-200 font-medium font-mono">
                  {resv.documento}
                </div>
              </div>
              <div className="text-slate-600 dark:text-slate-300">
                <span className="font-medium">Email:</span>
                <div className="mt-1 text-slate-800 dark:text-slate-200 font-medium break-all">
                  {resv.email || '-'}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <div className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                <span className="font-medium">Estado:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                  resv.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                  resv.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                  resv.status === 'canceled' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                }`}>
                  {resv.status === 'pending_review' ? 'Pendiente' :
                   resv.status === 'approved' ? 'Aprobado' :
                   resv.status === 'completed' ? 'Completado' :
                   resv.status === 'canceled' ? 'Cancelado' : resv.status}
                </span>
              </div>

              {resv.tokensGeneratedAt && (
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Tokens generados: {resv.tokensGeneratedAt}
                </div>
              )}

              {/* Action buttons - responsive */}
              <div className="flex flex-col sm:flex-row gap-2">
                {resv.status === 'pending_review' && (
                  <button className="btn flex-1 sm:flex-none" disabled={busy} onClick={approve}>
                    Aprobar
                  </button>
                )}
                {resv.status !== 'canceled' && (
                  <button className="btn flex-1 sm:flex-none" disabled={busy} onClick={cancel}>
                    Cancelar
                  </button>
                )}
                {resv.status === 'approved' && (
                  <button className="btn flex-1 sm:flex-none" disabled={busy} onClick={complete}>
                    Completar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Invitations card */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-5 space-y-3 shadow-sm">
            <div className="font-medium text-slate-800 dark:text-slate-100 text-lg">Invitaciones</div>

            {/* Action buttons for invitations */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button className="btn flex-1 sm:flex-none" disabled={busy} onClick={() => genTokens(false)}>
                Generar
              </button>
              <button className="btn flex-1 sm:flex-none" disabled={busy} onClick={() => genTokens(true)}>
                Forzar
              </button>
              <button className="btn flex-1 sm:flex-none" onClick={downloadCards}>
                Descargar
              </button>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              Total: {tokens.length} invitaciones
            </div>

            {/* Responsive table container */}
            <div className="max-h-60 overflow-auto rounded border border-slate-200 dark:border-slate-600">
              <div className="min-w-full overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200">
                      <th className="text-left px-2 py-2 font-medium">Código</th>
                      <th className="text-left px-2 py-2 font-medium hidden sm:table-cell">Tipo</th>
                      <th className="text-left px-2 py-2 font-medium">Estado</th>
                      <th className="text-left px-2 py-2 font-medium hidden md:table-cell">Expira</th>
                      <th className="text-left px-2 py-2 font-medium">Usos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokens.map(t => (
                      <tr key={t.id} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="px-2 py-2 font-mono text-xs break-all">{t.code}</td>
                        <td className="px-2 py-2 hidden sm:table-cell text-xs">{t.kind}</td>
                        <td className="px-2 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            t.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                            t.status === 'used' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                            t.status === 'expired' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                          }`}>
                            {t.status === 'active' ? 'Activo' :
                             t.status === 'used' ? 'Usado' :
                             t.status === 'expired' ? 'Expirado' : t.status}
                          </span>
                        </td>
                        <td className="px-2 py-2 hidden md:table-cell text-xs">
                          {t.expiresAt ? DateTime.fromISO(t.expiresAt).setZone('America/Lima').toLocaleString(DateTime.DATETIME_SHORT, { locale: 'es-ES' }) : '-'}
                        </td>
                        <td className="px-2 py-2 text-xs font-medium">
                          {(t.usedCount ?? 0)}{t.maxUses ? ` / ${t.maxUses}` : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Additional info grid - responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {/* Courtesy items */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-5 space-y-2 shadow-sm">
            <div className="font-medium text-slate-800 dark:text-slate-100 text-lg">Cortesías</div>
            {resv.courtesyItems?.length ? (
              <ul className="mt-2 space-y-2">
                {resv.courtesyItems.map(ci => (
                  <li key={ci.id} className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-700 py-2 last:border-b-0">
                    <span className="font-medium">{ci.type}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      ci.status === 'delivered' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                      ci.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                    }`}>
                      {ci.status === 'delivered' ? 'Entregado' :
                       ci.status === 'pending' ? 'Pendiente' : ci.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
                No hay cortesías.
              </div>
            )}
          </div>

          {/* Photo deliveries */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-5 space-y-2 shadow-sm">
            <div className="font-medium text-slate-800 dark:text-slate-100 text-lg">Fotos</div>
            {resv.photoDeliveries?.length ? (
              <ul className="mt-2 space-y-2">
                {resv.photoDeliveries.map(ph => (
                  <li key={ph.id} className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-700 py-2 last:border-b-0">
                    <span className="font-medium">{ph.kind}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      ph.status === 'delivered' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                      ph.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                    }`}>
                      {ph.status === 'delivered' ? 'Entregado' :
                       ph.status === 'pending' ? 'Pendiente' : ph.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
                No hay fotos.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
