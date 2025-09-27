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
  const cardBorder = isApproved? 'border-emerald-700': isAlert? 'border-rose-700':'border-slate-700';
  const cardBg = isApproved? 'bg-emerald-950/30': isAlert? 'bg-rose-950/30':'bg-slate-900';
  const badgeCls = isApproved? 'border-emerald-700 bg-emerald-600/20 text-emerald-300': isAlert? 'border-rose-700 bg-rose-600/20 text-rose-300':'border-slate-700 bg-slate-600/20 text-slate-300';
  const scrollRef = useRef<HTMLDivElement|null>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const [hint, setHint] = useState(true);
  useEffect(()=>{
    const el = scrollRef.current; if(!el) return;
    const update = ()=>{ const {scrollLeft, scrollWidth, clientWidth} = el; setShowLeft(scrollLeft>0); setShowRight(scrollLeft+clientWidth < scrollWidth-1); };
    update();
    const h = ()=>{ update(); if(hint) setHint(false); };
    el.addEventListener('scroll', h, { passive:true });
    window.addEventListener('resize', update);
    return ()=>{ el.removeEventListener('scroll', h); window.removeEventListener('resize', update); };
  }, [hint]);
  return (
    <div className={`rounded border p-3 ${cardBorder} ${cardBg}`}>
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <div className="font-medium flex items-center gap-2">
            <a href={`/u/birthdays/${encodeURIComponent(r.id)}`} className="hover:underline">{r.celebrantName}</a>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${badgeCls}`}>{r.status}</span>
            <span className="text-xs text-slate-400">({r.documento})</span>
          </div>
          <div className="text-xs text-slate-400">{r.date} {r.timeSlot} • Pack: {r.pack?.name}</div>
          <div className="text-xs text-slate-400">Tokens: {r.tokensGeneratedAt? r.tokensGeneratedAt : '-'}</div>
        </div>
        <div className="relative max-w-full">
          <div ref={scrollRef} className="flex gap-2 overflow-x-auto max-w-full pr-1 -mr-1 flex-nowrap scrollbar-thin scrollbar-thumb-slate-700/50 scroll-smooth" style={{scrollbarGutter:'stable'}}>
            {r.status==='pending_review' && <button className="btn shrink-0" disabled={busy} onClick={()=>onApprove(r.id)}>Aprobar</button>}
            <button className="btn shrink-0" disabled={busy} onClick={()=>onGenTokens(r.id)}>Generar tokens</button>
            <button className="btn shrink-0" onClick={()=>onDownload(r.id)}>Descargar</button>
            <a className="btn shrink-0" href={`/u/birthdays/${encodeURIComponent(r.id)}`}>Detalle</a>
          </div>
          {showLeft && <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-[rgba(15,23,42,0.9)] to-transparent rounded-l" />}
          {showRight && <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-[rgba(15,23,42,0.9)] to-transparent rounded-r" />}
          {showRight && hint && <div className="absolute -top-4 right-2 text-[10px] text-slate-400 animate-pulse select-none">Desliza →</div>}
        </div>
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
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">Cumpleaños</h1>
        <a href="/u" className="btn">Volver</a>
      </div>
      {err && <div className="border border-red-700 bg-red-950/30 text-red-200 rounded p-3 text-sm">{err}</div>}

      <div className="rounded border border-slate-700 p-3 bg-slate-900">
        <div className="font-medium mb-2">Crear reserva</div>
        <div className="grid md:grid-cols-3 gap-2">
          <input className="border rounded px-2 py-1 bg-gray-900 text-gray-100" placeholder="Nombre" value={cName} onChange={e=>setCName(e.target.value)} />
          <input className="border rounded px-2 py-1 bg-gray-900 text-gray-100" placeholder="WhatsApp" value={cPhone} onChange={e=>setCPhone(e.target.value)} />
          <input className="border rounded px-2 py-1 bg-gray-900 text-gray-100" placeholder="Documento" value={cDoc} onChange={e=>setCDoc(e.target.value)} />
          <input type="date" className="border rounded px-2 py-1 bg-gray-900 text-gray-100" value={cDate} onChange={e=>setCDate(e.target.value)} />
          <select className="border rounded px-2 py-1 bg-gray-900 text-gray-100" value={cSlot} onChange={e=>setCSlot(e.target.value)}>
            <option value="20:00">20:00</option><option value="21:00">21:00</option><option value="22:00">22:00</option><option value="23:00">23:00</option><option value="00:00">00:00</option>
          </select>
          <select className="border rounded px-2 py-1 bg-gray-900 text-gray-100" value={cPack} onChange={e=>setCPack(e.target.value)}>
            <option value="">Pack…</option>
            {packs.map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button disabled={creating} onClick={submitCreate} className="btn">Guardar</button>
        </div>
        {cPack && (()=>{ const sel=packs.find(p=>p.id===cPack); if(!sel) return null; const perks=(sel.perks||[]).filter(Boolean); return (
          <div className="mt-3 rounded border border-slate-700 bg-slate-800/60 p-3">
            <div className="font-semibold">Pack: {sel.name}</div>
            {sel.bottle && <div className="inline-flex items-center gap-2 mt-2 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-white/10 bg-white/10"><span>🍾</span><span>Botella: {sel.bottle}</span></div>}
            {perks.length>0 && <ul className="mt-2 space-y-1.5 text-[13px] text-slate-200">{perks.map(pk=> <li key={pk} className={pk.toLowerCase().startsWith('botella')?'font-semibold flex items-start gap-2':'flex items-start gap-2'}><span className="mt-0.5 text-[10px] text-slate-400">●</span><span>{pk}</span></li>)}</ul>}
          </div> ); })()}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <label className="text-xs">Estado</label>
          <select className="border rounded px-2 py-1 bg-gray-900 text-gray-100" value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="">Todos</option><option value="pending_review">Pendientes</option><option value="approved">Aprobadas</option><option value="completed">Completadas</option><option value="canceled">Canceladas</option>
          </select>
        </div>
        <div className="grid gap-1">
          <label className="text-xs">Buscar</label>
          <input className="border rounded px-2 py-1 bg-gray-900 text-gray-100" value={search} onChange={e=>setSearch(e.target.value)} placeholder="nombre, WhatsApp, doc" />
        </div>
        <button className="btn" onClick={()=>{ setPage(1); load(); }}>Buscar</button>
      </div>

      {loading && <div className="text-sm text-gray-400">Cargando…</div>}
      {empty && <div className="text-sm text-gray-400">No hay reservas</div>}

      <div className="grid gap-2">
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
      <div className="flex items-center gap-2">
        <button className="btn" onClick={()=>setPage(p=>Math.max(1,p-1))}>Anterior</button>
        <span className="text-xs">Página {page}</span>
        <button className="btn" onClick={()=>setPage(p=>p+1)}>Siguiente</button>
      </div>
    </div>
  );
}
