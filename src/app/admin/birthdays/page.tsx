"use client";

import { useEffect, useMemo, useState } from "react";

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

  async function load() {
    setLoading(true); setErr(null);
    try {
      const q = new URLSearchParams();
      if (status) q.set('status', status);
      if (search) q.set('search', search);
      q.set('page', String(page));
      q.set('pageSize', String(pageSize));
      const res = await fetch(`/api/admin/birthdays?${q.toString()}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j?.code || j?.message || res.status);
      setItems(j.items || []);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, pageSize]);
  useEffect(() => { (async ()=>{
    try {
      const res = await fetch('/api/birthdays/packs');
      const j = await res.json().catch(()=>({}));
      if (res.ok && j?.packs) setPacks(j.packs);
    } catch {}
  })(); }, []);

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
      <div className="rounded border border-slate-700 p-3 bg-slate-900">
        <div className="font-medium mb-2">Crear reserva</div>
  <div className="grid md:grid-cols-3 gap-2">
          <input className="border rounded px-2 py-1 bg-gray-900 text-gray-100" placeholder="Nombre" value={cName} onChange={(e)=>setCName(e.target.value)} />
          <input className="border rounded px-2 py-1 bg-gray-900 text-gray-100" placeholder="WhatsApp" value={cPhone} onChange={(e)=>setCPhone(e.target.value)} />
          <input className="border rounded px-2 py-1 bg-gray-900 text-gray-100" placeholder="Documento" value={cDoc} onChange={(e)=>setCDoc(e.target.value)} />
          <input className="border rounded px-2 py-1 bg-gray-900 text-gray-100" placeholder="Email (opcional)" value={cEmail} onChange={(e)=>setCEmail(e.target.value)} />
          <input type="date" className="border rounded px-2 py-1 bg-gray-900 text-gray-100" value={cDate} onChange={(e)=>setCDate(e.target.value)} />
          <select className="border rounded px-2 py-1 bg-gray-900 text-gray-100" value={cSlot} onChange={(e)=>setCSlot(e.target.value)}>
            <option value="20:00">20:00</option>
            <option value="21:00">21:00</option>
            <option value="22:00">22:00</option>
            <option value="23:00">23:00</option>
            <option value="00:00">00:00</option>
          </select>
          <select
            className="border rounded px-2 py-1 bg-gray-900 text-gray-100"
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
            <div className="mt-3 rounded border border-slate-700 bg-slate-800/60 p-3">
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
                <ul className="mt-2 space-y-1.5 text-[13px] text-slate-200">
                  {perks.map((p) => (
                    <li key={p} className={`flex items-start gap-2 ${p.toLowerCase().startsWith('botella') ? 'font-semibold' : ''}`}>
                      <span className="mt-0.5 text-[10px] text-slate-400">●</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })()}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <label className="text-xs">Estado</label>
          <select className="border rounded px-2 py-1 bg-gray-900 text-gray-100" value={status} onChange={(e)=>setStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="pending_review">Pendientes</option>
            <option value="approved">Aprobadas</option>
            <option value="completed">Completadas</option>
            <option value="canceled">Canceladas</option>
          </select>
        </div>
        <div className="grid gap-1">
          <label className="text-xs">Buscar</label>
          <input className="border rounded px-2 py-1 bg-gray-900 text-gray-100" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="cumpleañero, WhatsApp, documento" />
        </div>
        <button className="btn" onClick={()=>{ setPage(1); load(); }}>Buscar</button>
      </div>

      {loading && <div className="text-sm text-gray-400">Cargando…</div>}
      {empty && <div className="text-sm text-gray-400">No hay reservas</div>}

      <div className="grid gap-2">
        {items.map(r => (
          <div key={r.id} className="rounded border border-slate-700 p-3 bg-slate-900">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <div className="font-medium">
                  <a href={`/admin/birthdays/${encodeURIComponent(r.id)}`} className="hover:underline">
                    {r.celebrantName}
                  </a>
                  <span className="text-xs text-slate-400"> ({r.documento})</span>
                </div>
                <div className="text-xs text-slate-400">{r.date} {r.timeSlot} • Pack: {r.pack?.name}</div>
                <div className="text-xs text-slate-400">Estado: {r.status}{r.tokensGeneratedAt ? ` • Tokens: ${r.tokensGeneratedAt}` : ''}</div>
              </div>
              <div className="flex gap-2">
                {r.status === 'pending_review' && (
                  <button className="btn" disabled={busy[r.id]} onClick={()=>approve(r.id)}>Aprobar</button>
                )}
                <button className="btn" disabled={busy[r.id]} onClick={()=>genTokens(r.id)}>Generar tokens</button>
                <button className="btn" onClick={()=>downloadCards(r.id)}>Descargar tarjetas</button>
                <a className="btn" href={`/admin/birthdays/${encodeURIComponent(r.id)}`}>Ver detalle</a>
              </div>
            </div>
          </div>
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
