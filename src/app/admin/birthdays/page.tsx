"use client";

import { useEffect, useMemo, useState, useRef, memo } from "react";

type Reservation = {
  id: string;
  celebrantName: string;
  phone: string;
  documento: string;
  date: string;
  timeSlot: string;
  pack: { id: string; name: string; qrCount: number; bottle: string | null };
  guestsPlanned: number;
  status: string;
  tokensGeneratedAt: string | null;
  createdAt: string;
};

type AdminReservationCardProps = {
  r: Reservation;
  busy: boolean;
  onApprove: (id:string)=>void;
  onGenTokens: (id:string)=>void;
  onDownload: (id:string)=>void;
};

const AdminReservationCard = memo(function AdminReservationCard({ r, busy, onApprove, onGenTokens, onDownload }: AdminReservationCardProps){
  const isApproved = r.status === 'approved' || r.status === 'completed';
  const isAlert = r.status === 'pending_review' || r.status === 'canceled';
  const cardBorder = isApproved ? 'border-emerald-400 dark:border-emerald-700' : isAlert ? 'border-rose-400 dark:border-rose-700' : 'border-slate-200 dark:border-slate-700';
  const cardBg = isApproved
    ? 'bg-emerald-50 dark:bg-emerald-950/30'
    : isAlert
      ? 'bg-rose-50 dark:bg-rose-950/30'
      : 'bg-white dark:bg-slate-800';
  const mutedText = isApproved ? 'text-emerald-700 dark:text-emerald-300' : isAlert ? 'text-rose-700 dark:text-rose-300' : 'text-slate-600 dark:text-slate-400';
  const badgeCls = isApproved
    ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-200/60 dark:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300'
    : isAlert
      ? 'border-rose-300 dark:border-rose-700 bg-rose-200/60 dark:bg-rose-600/20 text-rose-700 dark:text-rose-300'
      : 'border-slate-300 dark:border-slate-700 bg-slate-200/70 dark:bg-slate-600/20 text-slate-700 dark:text-slate-300';
  const scrollRef = useRef<HTMLDivElement|null>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const [hint, setHint] = useState(true);
  useEffect(()=>{
    const el = scrollRef.current; if(!el) return;
    const update = ()=>{ const {scrollLeft, scrollWidth, clientWidth}=el; setShowLeft(scrollLeft>0); setShowRight(scrollLeft+clientWidth < scrollWidth-1); };
    update();
    const h=()=>{ update(); if(hint) setHint(false); };
    el.addEventListener('scroll', h, { passive:true });
    window.addEventListener('resize', update);
    return ()=>{ el.removeEventListener('scroll', h); window.removeEventListener('resize', update); };
  }, [hint]);
  return (
  <div className={`rounded border p-3 ${cardBorder} ${cardBg} transition-colors shadow-sm`}>    
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <div className="font-medium flex items-center gap-2">
            <a href={`/admin/birthdays/${encodeURIComponent(r.id)}`} className="hover:underline">
              {r.celebrantName}
            </a>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${badgeCls}`}>{r.status}</span>
            <span className="text-xs text-slate-400">({r.documento})</span>
          </div>
          <div className={`text-xs ${mutedText}`}>{r.date} {r.timeSlot} • Pack: {r.pack?.name}</div>
          <div className={`text-xs ${mutedText}`}>
            Estado: {r.status}{r.tokensGeneratedAt ? ` • Tokens: ${r.tokensGeneratedAt}` : ''}
          </div>
        </div>
        <div className="relative max-w-full">
          <div ref={scrollRef} className="flex gap-2 overflow-x-auto max-w-full pr-1 -mr-1 flex-nowrap scrollbar-thin scrollbar-thumb-slate-700/50 scroll-smooth" style={{scrollbarGutter:'stable'}}>
            {r.status === 'pending_review' && (
              <button className="btn shrink-0" disabled={busy} onClick={()=>onApprove(r.id)}>Aprobar</button>
            )}
            <button className="btn shrink-0" disabled={busy} onClick={()=>onGenTokens(r.id)}>Generar tokens</button>
            <button className="btn shrink-0" onClick={()=>onDownload(r.id)}>Descargar tarjetas</button>
            <a className="btn shrink-0" href={`/admin/birthdays/${encodeURIComponent(r.id)}`}>Ver detalle</a>
          </div>
          {showLeft && <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-[rgba(var(--color-bg-rgb),0.9)] to-transparent rounded-l" />}
          {showRight && <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-[rgba(var(--color-bg-rgb),0.9)] to-transparent rounded-r" />}
          {showRight && hint && <div className="absolute -top-4 right-2 text-[10px] text-slate-400 animate-pulse select-none">Desliza →</div>}
        </div>
      </div>
    </div>
  );
});

export default function AdminBirthdaysPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<Reservation[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState<string | "">("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  // create form state
  const [cName, setCName] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cDoc, setCDoc] = useState("");
  const [cWhats, setCWhats] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cDate, setCDate] = useState("");
  const [cSlot, setCSlot] = useState("20:00");
  const [cPack, setCPack] = useState("");
  const [cGuests, setCGuests] = useState(5);
  const [creating, setCreating] = useState(false);
  const [packs, setPacks] = useState<{ id:string; name:string; qrCount:number; bottle?: string | null; perks?: string[] }[]>([]);
  const [editingPack, setEditingPack] = useState<string|null>(null);
  const [packEdits, setPackEdits] = useState<Record<string, { name: string; qrCount: number; bottle: string; perksText: string }>>({});

  async function load() {
    setLoading(true); setErr(null);
    try {
      const q = new URLSearchParams();
      if (status) q.set('status', status);
      if (search) q.set('search', search);
      q.set('page', String(page));
      q.set('pageSize', String(pageSize));
      const url = `/api/admin/birthdays?${q.toString()}`;
      const res = await fetch(url);
      let j: any = null;
      const txt = await res.text();
      if (txt && txt.trim()) {
        try { j = JSON.parse(txt); } catch(parseErr:any) {
          throw new Error(`RESP_PARSE_ERROR ${res.status} (${parseErr.message}) bodySnippet="${txt.slice(0,120)}"`);
        }
      } else j = {};
      if (!res.ok) throw new Error(j?.code || j?.message || `HTTP_${res.status}`);
      if (!j.items && Array.isArray(j)) j = { items: j };
      setItems(j.items || []);
    } catch(e:any) {
      setErr(String(e?.message||e));
    } finally { setLoading(false); }
  }

  useEffect(()=>{ load(); }, [page, pageSize]);
  useEffect(()=>{ (async()=>{ try { const res=await fetch('/api/birthdays/packs'); const j=await res.json().catch(()=>({})); if(res.ok && j?.packs) setPacks(j.packs); } catch{} })(); }, []);

  async function restorePacks() {
    try {
      const res = await fetch('/api/admin/birthdays/packs/restore', { method: 'POST' });
      const j = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(j?.code || j?.message || 'RESTORE_ERROR');
      if (j?.packs) setPacks(j.packs);
    } catch(e:any){ setErr(String(e?.message||e)); }
  }
  function startEdit(pId:string){ const p = packs.find(x=>x.id===pId); if(!p) return; setEditingPack(pId); setPackEdits(prev=>({...prev,[pId]:{ name:p.name, qrCount:p.qrCount, bottle:p.bottle||'', perksText:(p.perks||[]).join('\n') }})); }
  function cancelEdit(){ setEditingPack(null); }
  async function savePack(pId:string){ const e = packEdits[pId]; if(!e) return; try { const perks = e.perksText.split(/\n+/).map(l=>l.trim()).filter(Boolean); const body={ name:e.name, qrCount:e.qrCount, bottle:e.bottle, perks }; const res = await fetch(`/api/admin/birthdays/packs/${pId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }); const j=await res.json().catch(()=>({})); if(!res.ok) throw new Error(j?.code||j?.message||res.status); const list = await fetch('/api/admin/birthdays/packs').then(r=>r.json()).catch(()=>null); if(list?.packs) setPacks(list.packs); setEditingPack(null); } catch(e:any){ setErr(String(e?.message||e)); } }

  async function approve(id: string) {
    setBusy(prev => ({ ...prev, [id]: true })); setErr(null);
    try {
      const res = await fetch(`/api/admin/birthdays/${encodeURIComponent(id)}/approve`, { method: 'POST' });
      const j = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(j?.code || j?.message || res.status);
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(prev => ({ ...prev, [id]: false }));
    }
  }

  async function genTokens(id: string) {
    setBusy(prev => ({ ...prev, [id]: true })); setErr(null);
    try {
      const res = await fetch(`/api/admin/birthdays/${encodeURIComponent(id)}/tokens`, { method: 'POST' });
      const j = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(j?.code || j?.message || res.status);
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(prev => ({ ...prev, [id]: false }));
    }
  }

  async function downloadCards(id: string) {
    try {
      const res = await fetch(`/api/admin/birthdays/${encodeURIComponent(id)}/download-cards`);
      if (!res.ok) throw new Error('download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `reservation-${id}-invites.zip`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  const empty = !loading && items.length === 0;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Gestión de Cumpleaños</h1>
      {err && <div className="border border-red-700 bg-red-950/30 text-red-200 rounded p-3 text-sm">{err}</div>}

      {/* Crear reserva rápida */}
  <div className="rounded border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800 shadow-sm transition-colors">
        <div className="font-medium mb-2">Crear reserva</div>
  <div className="grid md:grid-cols-3 gap-2">
          <input className="input-sm" placeholder="Nombre" value={cName} onChange={(e)=>setCName(e.target.value)} />
          <input className="input-sm" placeholder="WhatsApp" value={cPhone} onChange={(e)=>setCPhone(e.target.value)} />
          <input className="input-sm" placeholder="Documento" value={cDoc} onChange={(e)=>setCDoc(e.target.value)} />
          <input className="input-sm" placeholder="Email (opcional)" value={cEmail} onChange={(e)=>setCEmail(e.target.value)} />
          <input type="date" className="input-sm" value={cDate} onChange={(e)=>setCDate(e.target.value)} />
          <select className="input-sm" value={cSlot} onChange={(e)=>setCSlot(e.target.value)}>
            <option value="20:00">20:00</option>
            <option value="21:00">21:00</option>
            <option value="22:00">22:00</option>
            <option value="23:00">23:00</option>
            <option value="00:00">00:00</option>
          </select>
          <select
            className="input-sm"
            value={cPack}
            onChange={(e)=>{
              const v = e.target.value;
              setCPack(v);
              const sel = packs.find(p => p.id === v);
              if (sel) setCGuests(sel.qrCount);
            }}
          >
            <option value="">Pack…</option>
            {packs.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
          <button className="btn" disabled={creating} onClick={async ()=>{
            setCreating(true); setErr(null);
            try {
              const sel = packs.find(p => p.id === cPack);
              const guests = sel ? sel.qrCount : cGuests;
              const phoneFinal = cPhone.trim(); // WhatsApp como teléfono principal
              const payload = { celebrantName: cName, phone: phoneFinal, documento: cDoc, email: (cEmail || undefined), date: cDate, timeSlot: cSlot, packId: cPack, guestsPlanned: guests } as any;
              const res = await fetch('/api/admin/birthdays', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
              const j = await res.json();
              if (!res.ok || !j?.ok) throw new Error(j?.code || j?.message || res.status);
              setCName(''); setCPhone(''); setCDoc(''); setCEmail(''); setCDate(''); setCSlot('20:00'); setCPack(''); setCGuests(5);
              await load();
            } catch(e:any) { setErr(String(e?.message || e)); } finally { setCreating(false); }
          }}>Guardar</button>
        </div>
        {/* Preview no editable del pack seleccionado */}
        {cPack && (() => {
          const sel = packs.find(p => p.id === cPack);
          if (!sel) return null;
          const perks = (sel.perks || []).filter(Boolean);
          const hasBottlePerk = perks.some(p => p.toLowerCase().startsWith('botella'));
          return (
            <div className="mt-3 rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/60 p-3 transition-colors">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Pack seleccionado: {sel.name}</div>
                {/* Oculto: cantidad de QRs */}
              </div>
              {/* Destacar botella de cortesía */}
              {sel.bottle && (
                <div className="inline-flex items-center gap-2 mt-2 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-white/10 bg-white/10">
                  <span>🍾</span>
                  <span>Botella de cortesía: {sel.bottle}</span>
                </div>
              )}
              {/* Lista de beneficios */}
              {perks.length > 0 && (
                <ul className="mt-2 space-y-1.5 text-[13px] text-slate-700 dark:text-slate-200 transition-colors">
                  {perks.map((p) => (
                    <li key={p} className={`flex items-start gap-2 ${p.toLowerCase().startsWith('botella') ? 'font-semibold' : ''}`}>
                      <span className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-400">●</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })()}
        {packs.length === 0 && (
          <div className="mt-4 text-xs text-amber-300 flex items-center gap-3">
            <span>No hay packs activos cargados.</span>
            <button type="button" onClick={restorePacks} className="px-2 py-1 rounded border border-amber-500 text-amber-200 hover:bg-amber-500/10">Recrear packs por defecto</button>
          </div>
        )}
      </div>

      {/* Gestión de Packs */}
  <div className="rounded border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800 space-y-3 shadow-sm transition-colors">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="font-medium">Packs de cumpleaños</div>
          <button onClick={async()=>{
            // refrescar packs explicitamente
            const list = await fetch('/api/admin/birthdays/packs').then(r=>r.json()).catch(()=>null);
            if (list?.packs) setPacks(list.packs);
          }} className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Refrescar</button>
        </div>
        {packs.length===0 && (
          <div className="text-xs text-amber-300">No hay packs. Usa "Recrear packs por defecto" arriba.</div>
        )}
        <div className="grid md:grid-cols-3 gap-4">
          {packs.map(p => {
            const isEditing = editingPack === p.id;
            const edit = packEdits[p.id];
            return (
              <div key={p.id} className="rounded border border-slate-300 dark:border-slate-600 p-3 bg-slate-50 dark:bg-slate-800/60 flex flex-col gap-2 transition-colors">
                {!isEditing && (
                  <>
                    <div className="font-semibold text-sm">{p.name}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 transition-colors">Invitados (QRs): {p.qrCount}</div>
                    {p.bottle && <div className="text-xs text-slate-700 dark:text-slate-300 transition-colors">Botella: {p.bottle}</div>}
                    <ul className="text-[11px] list-disc ml-4 space-y-0.5 text-slate-700 dark:text-slate-300 transition-colors">
                      {(p.perks||[]).map(per=> <li key={per}>{per}</li>)}
                    </ul>
                    <button onClick={()=>startEdit(p.id)} className="mt-1 text-xs px-2 py-1 rounded bg-blue-500/10 dark:bg-blue-600/20 border border-blue-400/40 dark:border-blue-500/40 hover:bg-blue-500/20 dark:hover:bg-blue-600/30 transition-colors">Editar</button>
                  </>
                )}
                {isEditing && edit && (
                  <div className="space-y-2">
                    <input className="input text-sm px-2 py-1" value={edit.name} onChange={e=>setPackEdits(prev=>({...prev,[p.id]:{...prev[p.id], name:e.target.value}}))} placeholder="Nombre" />
                    <input type="number" className="input text-sm px-2 py-1" value={edit.qrCount} onChange={e=>setPackEdits(prev=>({...prev,[p.id]:{...prev[p.id], qrCount: parseInt(e.target.value)||0}}))} placeholder="Invitados" />
                    <input className="input text-sm px-2 py-1" value={edit.bottle} onChange={e=>setPackEdits(prev=>({...prev,[p.id]:{...prev[p.id], bottle:e.target.value}}))} placeholder="Botella cortesía" />
                    <textarea className="input h-28 text-xs px-2 py-1" value={edit.perksText} onChange={e=>setPackEdits(prev=>({...prev,[p.id]:{...prev[p.id], perksText:e.target.value}}))} placeholder={"Beneficios, uno por línea"} />
                    <div className="flex gap-2 text-xs">
                      <button onClick={()=>savePack(p.id)} className="px-2 py-1 rounded bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600/30">Guardar</button>
                      <button onClick={cancelEdit} className="px-2 py-1 rounded bg-slate-700 border border-slate-500 hover:bg-slate-600">Cancelar</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <label className="text-xs">Estado</label>
          <select className="input-sm" value={status} onChange={(e)=>setStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="pending_review">Pendientes</option>
            <option value="approved">Aprobadas</option>
            <option value="completed">Completadas</option>
            <option value="canceled">Canceladas</option>
          </select>
        </div>
        <div className="grid gap-1">
          <label className="text-xs">Buscar</label>
          <input className="input-sm" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="cumpleañero, WhatsApp, documento" />
        </div>
        <button className="btn" onClick={()=>{ setPage(1); load(); }}>Buscar</button>
      </div>

      {loading && <div className="text-sm text-gray-400">Cargando…</div>}
      {empty && <div className="text-sm text-gray-400">No hay reservas</div>}

      <div className="grid gap-2">
        {items.map(r => (
          <AdminReservationCard
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
