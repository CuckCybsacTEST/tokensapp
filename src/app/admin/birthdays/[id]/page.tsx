"use client";

import { useEffect, useState } from "react";

function fmtLima(iso?: string | null) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const lima = new Date(d.getTime() - 5 * 3600 * 1000);
    const y = lima.getUTCFullYear();
    const m = String(lima.getUTCMonth() + 1).padStart(2, '0');
    const day = String(lima.getUTCDate()).padStart(2, '0');
    const hh = String(lima.getUTCHours()).padStart(2, '0');
    const mm = String(lima.getUTCMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${hh}:${mm}`;
  } catch { return ''; }
}
import { generateQrPngDataUrl } from "@/lib/qr";

type Reservation = {
  id: string;
  celebrantName: string;
  phone: string;
  documento: string;
  email: string | null;
  date: string; // YYYY-MM-DD
  timeSlot: string;
  pack: { id: string; name: string; qrCount: number; bottle: string | null; perks?: any };
  guestsPlanned: number;
  status: string;
  tokensGeneratedAt: string | null;
  createdAt: string;
  courtesyItems: Array<{ id: string; type: string; status: string; notes?: string | null }>;
  photoDeliveries: Array<{ id: string; kind: string; url?: string | null; status: string }>;
};

type Token = { id: string; code: string; kind: string; status: string; expiresAt: string; usedCount?: number; maxUses?: number };

type Props = { params: { id: string } };

export default function AdminBirthdayDetailPage({ params }: Props) {
  const id = params.id;
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resv, setResv] = useState<Reservation | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  // Cortesías y fotos ahora son de solo lectura (no editables aquí)

  async function load() {
    setLoading(true); setErr(null);
    try {
      const [rRes, tRes] = await Promise.all([
        fetch(`/api/admin/birthdays/${encodeURIComponent(id)}`),
        fetch(`/api/admin/birthdays/${encodeURIComponent(id)}/tokens`),
      ]);
      const r = await rRes.json();
      const t = await tRes.json();
      if (!rRes.ok) throw new Error(r?.code || r?.message || rRes.status);
      if (!tRes.ok) throw new Error(t?.code || t?.message || tRes.status);
  setResv(toDto(r));
      setTokens(t.items || []);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [id]);

  // Generate QR previews for tokens whenever the list changes
  useEffect(() => {
    let cancelled = false;
    async function run() {
      const entries: Array<[string, string]> = [];
      for (const t of tokens) {
        if (qrMap[t.id]) continue;
        try {
          const redeemUrl = `${location.origin}/b/${encodeURIComponent(t.code)}`;
          const dataUrl = await generateQrPngDataUrl(redeemUrl);
          if (!cancelled) entries.push([t.id, dataUrl]);
        } catch {}
      }
      if (!cancelled && entries.length) {
        setQrMap((m) => {
          const next = { ...m } as Record<string, string>;
          for (const [k, v] of entries) next[k] = v;
          return next;
        });
      }
    }
    run();
    return () => { cancelled = true; };
  }, [tokens]);

  function toDto(r: any): Reservation {
    return {
      id: r.id,
      celebrantName: r.celebrantName,
      phone: r.phone,
      documento: r.documento,
      email: r.email ?? null,
      date: r.date?.slice?.(0,10) || r.date,
      timeSlot: r.timeSlot,
      pack: r.pack,
      guestsPlanned: r.guestsPlanned,
      status: r.status,
      tokensGeneratedAt: r.tokensGeneratedAt,
      createdAt: r.createdAt,
      courtesyItems: Array.isArray(r.courtesyItems) ? r.courtesyItems : [],
      photoDeliveries: Array.isArray(r.photoDeliveries) ? r.photoDeliveries : [],
    };
  }

  async function approve() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/admin/birthdays/${encodeURIComponent(id)}/approve`, { method: 'POST' });
      const j = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(j?.code || j?.message || res.status);
      await load();
    } catch (e: any) { setErr(String(e?.message || e)); } finally { setBusy(false); }
  }

  async function cancel() {
    if (!confirm('¿Cancelar esta reserva?')) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/admin/birthdays/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
      const j = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(j?.code || j?.message || res.status);
      await load();
    } catch (e: any) { setErr(String(e?.message || e)); } finally { setBusy(false); }
  }

  async function complete() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/admin/birthdays/${encodeURIComponent(id)}/complete`, { method: 'POST' });
      const j = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(j?.code || j?.message || res.status);
      await load();
    } catch (e: any) { setErr(String(e?.message || e)); } finally { setBusy(false); }
  }

  async function genTokens(force = false) {
    setBusy(true); setErr(null);
    try {
      const url = `/api/admin/birthdays/${encodeURIComponent(id)}/tokens${force ? '?force=1' : ''}`;
      const res = await fetch(url, { method: 'POST' });
      const j = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(j?.code || j?.message || res.status);
      await load();
    } catch (e: any) { setErr(String(e?.message || e)); } finally { setBusy(false); }
  }

  function downloadCards() {
    fetch(`/api/admin/birthdays/${encodeURIComponent(id)}/download-cards`).then(async res => {
      if (!res.ok) throw new Error('download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `reservation-${id}-invites.zip`; a.click();
      URL.revokeObjectURL(url);
    }).catch(e => setErr(String(e?.message || e)));
  }

  if (loading && !resv) return <div className="p-4 text-sm text-gray-400">Cargando…</div>;
  if (err && !resv) return <div className="p-4 text-sm text-red-300">{err}</div>;
  if (!resv) return null;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reserva: {resv.celebrantName}</h1>
        <a className="btn" href="/admin/birthdays">Volver</a>
      </div>
      {err && <div className="border border-red-700 bg-red-950/30 text-red-200 rounded p-3 text-sm">{err}</div>}

      <div className="grid md:grid-cols-2 gap-4">
  <div className="rounded border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800 space-y-2 shadow-sm">
          <div className="text-sm text-slate-300">Fecha: {resv.date} {resv.timeSlot}</div>
          <div className="text-sm text-slate-300">Pack: {resv.pack?.name}</div>
          <div className="text-sm text-slate-300">Documento: {resv.documento}</div>
          <div className="text-sm text-slate-300">WhatsApp: {resv.phone}</div>
          <div className="text-sm text-slate-300">Email: {resv.email || '-'}</div>
          <div className="text-sm text-slate-300">Estado: {resv.status}</div>
          {resv.tokensGeneratedAt && <div className="text-xs text-slate-400">Tokens generados: {fmtLima(resv.tokensGeneratedAt)}</div>}

          <div className="flex flex-wrap gap-2 pt-2">
            {resv.status === 'pending_review' && <button className="btn" disabled={busy} onClick={approve}>Aprobar</button>}
            {resv.status !== 'canceled' && <button className="btn" disabled={busy} onClick={cancel}>Cancelar</button>}
            {resv.status === 'approved' && <button className="btn" disabled={busy} onClick={complete}>Completar</button>}
          </div>
        </div>

  <div className="rounded border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800 space-y-2 shadow-sm">
          <div className="font-medium">Invites</div>
          <div className="flex flex-wrap gap-2">
            <button className="btn" disabled={busy} onClick={()=>genTokens(false)}>Generar tarjetas</button>
            <a className="btn" href={`/marketing/birthdays/${encodeURIComponent(id)}/qrs?mode=admin`} target="_blank" rel="noopener noreferrer">Ver tarjetas</a>
            <button className="btn" disabled={busy} onClick={()=>genTokens(true)}>Regenerar tokens (forzar)</button>
          </div>
          <div className="text-xs text-slate-400">Total: {tokens.length}</div>
          <div className="max-h-60 overflow-auto border border-slate-700 rounded">
            <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead>
                <tr className="bg-slate-800">
                  <th className="text-left px-2 py-1">QR</th>
                  <th className="text-left px-2 py-1">Code</th>
                  <th className="text-left px-2 py-1">Tipo</th>
                  <th className="text-left px-2 py-1">Estado</th>
                  <th className="text-left px-2 py-1">Expira</th>
                  <th className="text-left px-2 py-1">Usos</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map(t => (
                  <tr key={t.id} className="border-t border-slate-700">
                    <td className="px-2 py-1">
                      {qrMap[t.id] ? (
                        <img src={qrMap[t.id]} alt={`QR ${t.code}`} className="w-12 h-12 object-contain" />
                      ) : (
                        <div className="w-12 h-12 bg-slate-800 animate-pulse rounded" />
                      )}
                    </td>
                    <td className="px-2 py-1 font-mono">{t.code}</td>
                    <td className="px-2 py-1">{t.kind}</td>
                    <td className="px-2 py-1">{t.status}</td>
                    <td className="px-2 py-1">{fmtLima(t.expiresAt)}</td>
                    <td className="px-2 py-1">{(t.usedCount ?? 0)}{t.maxUses ? ` / ${t.maxUses}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </div>

      {/* Detalles del Pack (vista fija, no editable) */}
  <div className="rounded border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800 space-y-2 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="font-medium">Detalles del Pack</div>
          {/* Oculto: cantidad de QRs */}
        </div>
        {resv.pack?.bottle && (
          <div className="inline-flex items-center gap-2 mt-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-white/10 bg-white/10">
            <span>🍾</span>
            <span>Botella de cortesía: {resv.pack.bottle}</span>
          </div>
        )}
        {(() => {
          let perks: string[] = [];
          try {
            const raw = (resv.pack as any)?.perks;
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (Array.isArray(parsed)) perks = parsed.filter(Boolean);
          } catch {}
          return perks.length ? (
            <ul className="mt-2 space-y-1.5 text-[13px] text-slate-200">
              {perks.map((p) => (
                <li key={p} className={`flex items-start gap-2 ${p.toLowerCase().startsWith('botella') ? 'font-semibold' : ''}`}>
                  <span className="mt-0.5 text-[10px] text-slate-400">●</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          ) : null;
        })()}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
  <div className="rounded border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800 space-y-2 shadow-sm">
          <div className="font-medium">Cortesías</div>
          <div className="text-xs text-slate-400">Resumen no editable de elementos registrados</div>
          {resv.courtesyItems?.length ? (
            <ul className="mt-2 space-y-1">
              {resv.courtesyItems.map(ci => (
                <li key={ci.id} className="flex items-center justify-between border-b border-slate-800 py-1">
                  <div className="text-sm text-slate-200">{ci.type}</div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${ci.status === 'delivered' ? 'bg-green-900/30 border-green-700 text-green-200' : 'bg-yellow-900/20 border-yellow-700 text-yellow-200'}`}>{ci.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-slate-400">No hay cortesías registradas.</div>
          )}
        </div>

  <div className="rounded border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800 space-y-2 shadow-sm">
          <div className="font-medium">Fotos</div>
          <div className="text-xs text-slate-400">Listado no editable de fotos adjuntas</div>
          {resv.photoDeliveries?.length ? (
            <ul className="mt-2 space-y-1">
              {resv.photoDeliveries.map(ph => (
                <li key={ph.id} className="flex items-center justify-between border-b border-slate-800 py-1">
                  <div className="text-sm text-slate-200 flex items-center gap-2">
                    <span className="text-xs text-slate-400">{ph.kind}</span>
                    {ph.url ? (
                      <a className="underline text-blue-300" href={ph.url} target="_blank" rel="noreferrer">ver</a>
                    ) : (
                      <span className="text-slate-500">(sin url)</span>
                    )}
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${ph.status === 'sent' ? 'bg-green-900/30 border-green-700 text-green-200' : ph.status === 'ready' ? 'bg-blue-900/20 border-blue-700 text-blue-200' : 'bg-yellow-900/20 border-yellow-700 text-yellow-200'}`}>{ph.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-slate-400">No hay fotos registradas.</div>
          )}
        </div>
      </div>
    </div>
  );
}
