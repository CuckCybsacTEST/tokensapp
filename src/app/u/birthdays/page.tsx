"use client";
import { useEffect, useState, useRef, memo } from 'react';

type Reservation = {
  id: string; celebrantName: string; phone: string; documento: string; date: string; timeSlot: string;
  pack: { id: string; name: string; qrCount: number; bottle: string | null } | null;
  guestsPlanned: number; status: string; tokensGeneratedAt: string | null; createdAt: string;
};

type Pack = { id:string; name:string; qrCount:number; bottle?: string|null; perks?: string[] };

type ReservationCardProps = {
  r: Reservation;
  busy: boolean;
  onApprove: (id:string)=>void;
  onGenTokens: (id:string)=>void;
  onDownload: (id:string)=>void;
};

const ReservationCard = memo(function ReservationCard({ r, busy, onApprove, onGenTokens, onDownload }: ReservationCardProps){
  const isApproved = r.status==='approved' || r.status==='completed';
  const isAlert = r.status==='pending_review' || r.status==='canceled';
  const badgeCls = isApproved? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300': isAlert? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300':'bg-slate-200 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200';
  const statusLabel = r.status === 'pending_review'
    ? 'PENDIENTE'
    : r.status === 'approved'
      ? 'APROBADO'
      : r.status === 'completed'
        ? 'COMPLETADO'
        : r.status === 'canceled'
          ? 'CANCELADO'
          : r.status;
  // Date tidy: strip trailing time pattern if provided in ISO full string
  const cleanDate = r.date.replace(/T00:00:00\.000Z$/,'');
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800 shadow-sm flex flex-col gap-3">
      {/* Header line */}
      <div className="flex flex-wrap items-center gap-2">
        <a href={`/u/birthdays/${encodeURIComponent(r.id)}`} className="font-semibold text-slate-800 dark:text-slate-100 hover:underline leading-tight">{r.celebrantName}</a>
  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badgeCls}`}>{statusLabel}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">{r.documento}</span>
      </div>
      {/* Meta info with explicit labels */}
      <div className="grid gap-y-1 text-[13px] sm:grid-cols-2">
  <div className="text-slate-600 dark:text-slate-300"><span className="font-semibold text-slate-700 dark:text-slate-200">Fecha celebración:</span> {cleanDate}</div>
        <div className="text-slate-600 dark:text-slate-300"><span className="font-semibold text-slate-700 dark:text-slate-200">Hora de llegada:</span> {r.timeSlot}</div>
        <div className="text-slate-600 dark:text-slate-300"><span className="font-semibold text-slate-700 dark:text-slate-200">Cantidad de QR (invitados):</span> {r.guestsPlanned || r.pack?.qrCount || '-'}</div>
        <div className="text-slate-600 dark:text-slate-300"><span className="font-semibold text-slate-700 dark:text-slate-200">Pack elegido:</span> {r.pack?.name || '-'}</div>
      </div>
      {/* Actions row without gradients */}
      <div className="flex flex-wrap gap-2">
        {r.status==='pending_review' && <button className="btn h-8 px-3" disabled={busy} onClick={()=>onApprove(r.id)}>Aprobar</button>}
        <button className="btn h-8 px-3" disabled={busy} onClick={()=>onGenTokens(r.id)}>Gen tokens</button>
        <button className="btn h-8 px-3" onClick={()=>onDownload(r.id)}>Descargar</button>
        <a className="btn h-8 px-3" href={`/u/birthdays/${encodeURIComponent(r.id)}`}>Detalle</a>
      </div>
    </div>
  );
});

export default function StaffBirthdaysPage() {
  const [items, setItems] = useState<Reservation[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string|null>(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  // form
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cDoc, setCDoc] = useState('');
  const [cDate, setCDate] = useState('');
  const [cSlot, setCSlot] = useState('20:00');
  const [cPack, setCPack] = useState('');
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const q = new URLSearchParams();
      if (status) q.set('status', status);
      if (search) q.set('search', search);
      q.set('page', String(page)); q.set('pageSize','30');
  const res = await fetch(`/api/staff/birthdays?${q.toString()}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j?.code || j?.message || res.status);
      setItems(j.items || []);
    } catch(e:any){ setErr(String(e?.message||e)); } finally { setLoading(false); }
  }
  useEffect(()=>{ load(); }, [page]);
  useEffect(()=>{ (async()=>{ try { const r = await fetch('/api/birthdays/packs'); const j = await r.json(); if (r.ok && j?.packs) setPacks(j.packs); } catch{} })(); }, []);

  async function approve(id:string){ setBusy(p=>({...p,[id]:true})); try { const r=await fetch(`/api/staff/birthdays/${id}/approve`,{method:'POST'}); const j=await r.json(); if(!r.ok) throw new Error(j?.code||j?.message||r.status); load(); } catch(e:any){ setErr(String(e?.message||e)); } finally { setBusy(p=>({...p,[id]:false})); } }
  async function genTokens(id:string){ setBusy(p=>({...p,[id]:true})); try { const r=await fetch(`/api/staff/birthdays/${id}/tokens`,{method:'POST'}); const j=await r.json(); if(!r.ok) throw new Error(j?.code||j?.message||r.status); load(); } catch(e:any){ setErr(String(e?.message||e)); } finally { setBusy(p=>({...p,[id]:false})); } }
  async function downloadCards(id:string){ try { const r=await fetch(`/api/staff/birthdays/${id}/download-cards`); if(!r.ok) throw new Error('download failed'); const b=await r.blob(); const url=URL.createObjectURL(b); const a=document.createElement('a'); a.href=url; a.download=`reservation-${id}-invites.zip`; a.click(); URL.revokeObjectURL(url); } catch(e:any){ setErr(String(e?.message||e)); } }

  async function submitCreate(){ setCreating(true); setErr(null); try { const payload={ celebrantName:cName, phone:cPhone, documento:cDoc, date:cDate, timeSlot:cSlot, packId:cPack, guestsPlanned: packs.find(p=>p.id===cPack)?.qrCount || 5 }; const r=await fetch('/api/staff/birthdays',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); const j=await r.json(); if(!r.ok||!j?.ok) throw new Error(j?.code||j?.message||r.status); setCName(''); setCPhone(''); setCDoc(''); setCDate(''); setCSlot('20:00'); setCPack(''); load(); } catch(e:any){ setErr(String(e?.message||e)); } finally { setCreating(false); } }

  const empty = !loading && items.length===0;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">Cumpleaños</h1>
        </div>
        {err && <div className="rounded border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-200 p-3 text-sm">{err}</div>}

        {/* Crear reserva (container propio) */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-5">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Crea una reservación para cumpleaños</h2>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 max-w-prose">Ingresa los datos del celebrante, selecciona horario y pack. La cantidad de QR sugerida se toma del pack, puedes ajustar luego en el detalle. Tras guardar podrás aprobar y generar los códigos para compartir con invitados.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input className="h-9 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-sm" placeholder="Nombre" value={cName} onChange={e=>setCName(e.target.value)} />
            <input className="h-9 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-sm" placeholder="WhatsApp" value={cPhone} onChange={e=>setCPhone(e.target.value)} />
            <input className="h-9 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-sm" placeholder="Documento" value={cDoc} onChange={e=>setCDoc(e.target.value)} />
            <input type="date" className="h-9 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-sm" value={cDate} onChange={e=>setCDate(e.target.value)} />
            <select className="h-9 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-sm" value={cSlot} onChange={e=>setCSlot(e.target.value)}>
              <option value="20:00">20:00</option><option value="21:00">21:00</option><option value="22:00">22:00</option><option value="23:00">23:00</option><option value="00:00">00:00</option>
            </select>
            <select className="h-9 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-sm" value={cPack} onChange={e=>setCPack(e.target.value)}>
              <option value="">Pack…</option>
              {packs.map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button disabled={creating} onClick={submitCreate} className="btn h-9">{creating? 'Guardando…':'Guardar'}</button>
          </div>
          {cPack && (()=>{ const sel=packs.find(p=>p.id===cPack); if(!sel) return null; const perks=(sel.perks||[]).filter(Boolean); return (
            <div className="mt-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-4">
              <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">Pack: {sel.name}</div>
              {sel.bottle && <div className="inline-flex items-center gap-2 mt-2 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"><span>🍾</span><span>Botella: {sel.bottle}</span></div>}
              {perks.length>0 && <ul className="mt-2 space-y-1.5 text-[13px] text-slate-600 dark:text-slate-300">{perks.map(pk=> <li key={pk} className="flex items-start gap-2"><span className="mt-0.5 text-[10px] text-slate-400">●</span><span>{pk}</span></li>)}</ul>}
            </div> ); })()}
        </div>

        {/* Filtros + listado en un solo contenedor */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Reservas</h2>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 max-w-prose">Filtra por estado o busca por nombre, documento o WhatsApp. Usa “Aprobar” para confirmar una reserva pendiente, luego genera los tokens para enviar a los invitados. El estado “completed” indica que el evento ya se realizó.</p>
          </div>
          <div className="flex flex-wrap items-end gap-4">
          <div className="grid gap-1">
            <label className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Estado</label>
            <select className="h-9 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-sm" value={status} onChange={e=>setStatus(e.target.value)}>
              <option value="">Todos</option><option value="pending_review">Pendientes</option><option value="approved">Aprobadas</option><option value="completed">Completadas</option><option value="canceled">Canceladas</option>
            </select>
          </div>
          <div className="grid gap-1 flex-1 min-w-[220px] max-w-xs">
            <label className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Buscar</label>
            <input className="h-9 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-sm" value={search} onChange={e=>setSearch(e.target.value)} placeholder="nombre, WhatsApp, doc" />
          </div>
          <button className="btn" onClick={()=>{ setPage(1); load(); }}>Buscar</button>
          </div>
          {/* Listado */}
          {loading && <div className="text-sm text-slate-500 dark:text-slate-400">Cargando…</div>}
          {empty && <div className="text-sm text-slate-500 dark:text-slate-400">No hay reservas</div>}
          <div className="grid gap-3">
          {items.map(r=> (
            <ReservationCard
              key={r.id}
              r={r}
              busy={!!busy[r.id]}
              onApprove={approve}
              onGenTokens={genTokens}
              onDownload={downloadCards}
            />
          ))}
          </div>
          {/* Pagination: show buttons only if movement possible */}
          <div className="flex items-center gap-3 pt-2">
            {(page>1) && <button className="btn h-8 px-3" onClick={()=>setPage(p=>Math.max(1,p-1))}>Anterior</button>}
            <span className="text-xs text-slate-500 dark:text-slate-400">Página {page}</span>
            {(!empty && items.length===30) && <button className="btn h-8 px-3" onClick={()=>setPage(p=>p+1)}>Siguiente</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
