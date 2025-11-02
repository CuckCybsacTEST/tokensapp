"use client";

import { useEffect, useMemo, useState, memo } from "react";

// Formateo manual a hora Lima (UTC-5 sin DST efectivo). Restamos 5 horas y usamos componentes UTC.
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

// Formatear fecha de celebración de manera legible
function fmtCelebrationDate(iso?: string | null) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    // Interpretar como fecha en zona Lima (restar 5 horas de UTC)
    const lima = new Date(d.getTime() - 5 * 3600 * 1000);
    const day = lima.getUTCDate();
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const month = monthNames[lima.getUTCMonth()];
    const year = lima.getUTCFullYear();
    return `${day} ${month} ${year}`;
  } catch { return ''; }
}

type Reservation = {
  id: string;
  celebrantName: string;
  phone: string;
  documento: string;
  date: string; // fecha celebración
  timeSlot: string;
  pack: { id: string; name: string; qrCount: number; bottle: string | null };
  guestsPlanned: number;
  status: string;
  tokensGeneratedAt: string | null;
  hostArrivedAt: string | null;
  guestArrivals: number;
  createdAt: string; // fecha creación reserva
};

type AdminReservationCardProps = {
  r: Reservation;
  busyApprove: boolean;
  busyGenerate: boolean;
  onApprove: (id:string)=>void;
  onGenerateCards: (id:string)=>void;
  onViewCards: (id:string)=>void;
  onReload: ()=>void;
};

const AdminReservationCard = memo(function AdminReservationCard({ r, busyApprove, busyGenerate, onApprove, onGenerateCards, onViewCards, onReload }: AdminReservationCardProps){
  // Mirror estilo de /u/birthdays
  const isApproved = r.status==='approved' || r.status==='completed';
  const isAlert = r.status==='pending_review' || r.status==='canceled';
  const badgeCls = isApproved ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : isAlert ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200';
  const statusLabel = r.status === 'pending_review'
    ? 'PENDIENTE'
    : r.status === 'approved'
      ? 'APROBADO'
      : r.status === 'completed'
        ? 'COMPLETADO'
        : r.status === 'canceled'
          ? 'CANCELADO'
          : r.status;
  const celebrationDate = fmtCelebrationDate(r.date);
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800 shadow-sm flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <a href={`/admin/birthdays/${encodeURIComponent(r.id)}`} className="font-semibold text-slate-800 dark:text-slate-100 hover:underline leading-tight">{r.celebrantName}</a>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badgeCls}`}>{statusLabel}</span>
        <span className="text-base font-bold text-blue-900 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded">DNI: {r.documento}</span>
      </div>
      <div className="grid gap-y-1 text-[13px] sm:grid-cols-2">
        <div className="text-slate-600 dark:text-slate-300"><span className="font-semibold text-slate-700 dark:text-slate-200">Fecha celebración:</span> <span className="font-bold text-pink-700 dark:text-pink-300 bg-pink-100 dark:bg-pink-900/40 px-2 py-1 rounded">{celebrationDate}</span></div>
        <div className="text-slate-600 dark:text-slate-300"><span className="font-semibold text-slate-700 dark:text-slate-200">Hora llegada:</span> {r.timeSlot}</div>
        <div className="text-slate-600 dark:text-slate-300"><span className="font-semibold text-slate-700 dark:text-slate-200">Invitados (QR):</span> {r.guestsPlanned || r.pack?.qrCount || '-'}</div>
        <div className="text-slate-600 dark:text-slate-300"><span className="font-semibold text-slate-700 dark:text-slate-200">Pack:</span> {r.pack?.name || '-'}</div>
        <div className="text-slate-600 dark:text-slate-300"><span className="font-semibold text-slate-700 dark:text-slate-200">Creada:</span> {fmtLima(r.createdAt)}</div>
        <div className="text-slate-600 dark:text-slate-300 col-span-2">
          <span className="font-semibold text-slate-700 dark:text-slate-200">Llegadas:</span>
          <span className={`ml-2 ${r.hostArrivedAt ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
            {r.hostArrivedAt ? '✅ Host llegó' : '⏳ Esperando host'}
          </span>
          <span className="ml-4 text-blue-600 dark:text-blue-400">
            {r.guestArrivals}/{r.guestsPlanned || r.pack?.qrCount || 0} invitados
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {r.status==='pending_review' && <button className="btn h-8 px-3" disabled={busyApprove} onClick={()=>onApprove(r.id)}>{busyApprove? 'Aprobando…':'Aprobar'}</button>}
        {!r.tokensGeneratedAt && <button className="btn h-8 px-3" disabled={busyGenerate} onClick={()=>onGenerateCards(r.id)}>{busyGenerate? 'Generando…':'Generar tarjetas'}</button>}
        {r.tokensGeneratedAt && <button className="btn h-8 px-3" onClick={()=>onViewCards(r.id)}>Ver tarjetas</button>}
        <a className="btn h-8 px-3" href={`/admin/birthdays/${encodeURIComponent(r.id)}`}>Detalle</a>
        {/* Botones para cancelar y completar reserva */}
        {r.status !== 'canceled' && (
          <button className="btn h-8 px-3 bg-rose-600 text-white" onClick={async()=>{
            if (!confirm('¿Cancelar esta reserva?')) return;
            try {
              const res = await fetch(`/api/admin/birthdays/${encodeURIComponent(r.id)}/cancel`, { method: 'POST' });
              const j = await res.json();
              if (!res.ok || !j?.ok) throw new Error(j?.code || j?.message || res.status);
              // Recargar lista
              onReload();
            } catch(e:any) { /* manejar error */ }
          }}>Cancelar</button>
        )}
        {r.status !== 'completed' && r.status !== 'canceled' && (
          <button className="btn h-8 px-3 bg-emerald-600 text-white" onClick={async()=>{
            if (!confirm('¿Completar esta reserva?')) return;
            try {
              const res = await fetch(`/api/admin/birthdays/${encodeURIComponent(r.id)}/complete`, { method: 'POST' });
              const j = await res.json();
              if (!res.ok || !j?.ok) throw new Error(j?.code || j?.message || res.status);
              onReload();
            } catch(e:any) { /* manejar error */ }
          }}>Completar</button>
        )}
      </div>
    </div>
  );
});

export function AdminBirthdaysPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<Reservation[]>([]);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(5);
    const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<string | "">("");
  const [dateFilter, setDateFilter] = useState<string>("all"); // "all", "upcoming", "past", "today"
  const [search, setSearch] = useState("");
  const [busyApprove, setBusyApprove] = useState<Record<string, boolean>>({});
  const [busyGenerate, setBusyGenerate] = useState<Record<string, boolean>>({});
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
  const [packs, setPacks] = useState<{ id:string; name:string; qrCount:number; bottle?: string | null; perks?: string[]; priceSoles?: number; isCustom?: boolean }[]>([]);
  const [editingPack, setEditingPack] = useState<string|null>(null);
  const [packEdits, setPackEdits] = useState<Record<string, { name: string; qrCount: number; bottle: string; perksText: string; priceSoles: number }>>({});

  async function load() {
    setLoading(true); setErr(null);
    try {
      const q = new URLSearchParams();
      if (status) q.set('status', status);
      if (search) q.set('search', search);
      if (dateFilter && dateFilter !== 'all') q.set('dateFilter', dateFilter);
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
        if (typeof j.total === 'number') setTotal(j.total);
    } catch(e:any) {
      setErr(String(e?.message||e));
    } finally { setLoading(false); }
  }

  useEffect(()=>{ load(); }, [page, pageSize]);
  // Búsqueda instantánea (debounced) por status / search / dateFilter
  useEffect(()=>{
    const h = setTimeout(()=>{ setPage(1); load(); }, 300); // 300ms debounce
    return () => clearTimeout(h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, dateFilter]);
  // Cargar packs desde endpoint admin para incluir isCustom y evitar filtrado público
  useEffect(()=>{ (async()=>{ try { const res=await fetch('/api/admin/birthdays/packs'); const j=await res.json().catch(()=>({})); if(res.ok && j?.packs) setPacks(j.packs); } catch{} })(); }, []);

  async function restorePacks() {
    try {
      const res = await fetch('/api/admin/birthdays/packs/restore', { method: 'POST' });
      const j = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(j?.code || j?.message || 'RESTORE_ERROR');
      if (j?.packs) setPacks(j.packs);
    } catch(e:any){ setErr(String(e?.message||e)); }
  }
  function startEdit(pId:string){ const p = packs.find(x=>x.id===pId); if(!p) return; setEditingPack(pId); setPackEdits(prev=>({...prev,[pId]:{ name:p.name, qrCount:p.qrCount, bottle:p.bottle||'', perksText:(p.perks||[]).join('\n'), priceSoles: p.priceSoles ?? 0 }})); }
  function cancelEdit(){ setEditingPack(null); }
  async function savePack(pId:string){ const e = packEdits[pId]; if(!e) return; try { const perks = e.perksText.split(/\n+/).map(l=>l.trim()).filter(Boolean); const body={ name:e.name, qrCount:e.qrCount, bottle:e.bottle, perks, priceSoles: e.priceSoles }; const res = await fetch(`/api/admin/birthdays/packs/${pId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }); const j=await res.json().catch(()=>({})); if(!res.ok) throw new Error(j?.code||j?.message||res.status); const list = await fetch('/api/admin/birthdays/packs').then(r=>r.json()).catch(()=>null); if(list?.packs) setPacks(list.packs); setEditingPack(null); } catch(e:any){ setErr(String(e?.message||e)); } }

  async function approve(id: string) {
    setBusyApprove(prev => ({ ...prev, [id]: true })); setErr(null);
    try {
      const res = await fetch(`/api/admin/birthdays/${encodeURIComponent(id)}/approve`, { method: 'POST' });
      const j = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(j?.code || j?.message || res.status);
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusyApprove(prev => ({ ...prev, [id]: false }));
    }
  }

  const [cardGenErr, setCardGenErr] = useState<Record<string,string|undefined>>({});
  async function generateCards(id: string) {
    setBusyGenerate(prev => ({ ...prev, [id]: true }));
    setCardGenErr(prev => ({ ...prev, [id]: undefined }));
    try {
      const res = await fetch(`/api/admin/birthdays/${encodeURIComponent(id)}/cards/generate`, { method: 'POST' });
      const txt = await res.text();
      let j: any = {};
      if (txt) { try { j = JSON.parse(txt); } catch {/* ignore parse error */} }
      if (!res.ok) {
        const raw = j?.code || j?.message || `HTTP_${res.status}`;
        let friendly = raw;
        if (/NO_TOKENS|MISSING_TOKENS/.test(raw)) friendly = 'No hay tokens aún (verifica estado de la reserva).';
        if (/RESERVATION_DATE_PAST/.test(raw)) friendly = 'La fecha ya pasó - no se pueden generar.';
        if (/RESERVATION_NOT_FOUND/.test(raw)) friendly = 'Reserva no encontrada.';
        setCardGenErr(prev => ({ ...prev, [id]: friendly }));
        return;
      }
      await load();
    } catch(e:any) {
      setCardGenErr(prev => ({ ...prev, [id]: String(e?.message||e) }));
    } finally {
      setBusyGenerate(prev => ({ ...prev, [id]: false }));
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

  // Calcular páginas para mejor paginación
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const getVisiblePages = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  // Pestañas de estado mejoradas
  const statusTabs = [
    { value: '', label: 'Todas' },
    { value: 'approved', label: 'Aprobadas' },
    { value: 'completed', label: 'Completadas' },
    { value: 'canceled', label: 'Canceladas' },
    { value: 'pending_review', label: 'Pendientes' },
  ];

  // Opciones de filtro de fecha
  const dateFilterOptions = [
    { value: 'all', label: 'Todas las fechas' },
    { value: 'upcoming', label: 'Próximas (desde hoy)' },
    { value: 'past', label: 'Pasadas' },
    { value: 'today', label: 'Hoy' },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">Gestión de Cumpleaños</h1>
        <a href="/admin/birthdays/debug-token/test" className="btn-sm bg-blue-600 hover:bg-blue-700 text-white">
          🔍 Debug Token
        </a>
      </div>
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
              // Validaciones básicas
              if (!cName.trim()) throw new Error('Nombre requerido');
              if (!cPhone.trim()) throw new Error('WhatsApp requerido');
              if (!cDoc.trim()) throw new Error('Documento requerido');
              let finalDate = cDate;
              if (!finalDate) {
                const d = new Date();
                finalDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                setCDate(finalDate);
              }
              const sel = packs.find(p => p.id === cPack);
              const guests = sel ? sel.qrCount : cGuests;
              const phoneFinal = cPhone.trim(); // WhatsApp como teléfono principal
              const payload = { celebrantName: cName.trim(), phone: phoneFinal, documento: cDoc.trim(), email: (cEmail || undefined), date: finalDate, timeSlot: cSlot, packId: cPack, guestsPlanned: guests } as any;
              const res = await fetch('/api/admin/birthdays', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
              const j = await res.json();
              if (!res.ok || !j?.ok) {
                // Mostrar detalles de validación si existen
                if (j?.errors) {
                  const firstErr = Object.values(j.errors).flat()?.[0];
                  throw new Error(firstErr || (j?.code || j?.message || res.status));
                }
                throw new Error(j?.code || j?.message || res.status);
              }
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
              <div key={p.id} className={`rounded border ${p.isCustom ? 'border-fuchsia-400 dark:border-fuchsia-600' : 'border-slate-300 dark:border-slate-600'} p-3 bg-slate-50 dark:bg-slate-800/60 flex flex-col gap-2 transition-colors`}>                
                {!isEditing && (
                  <>
                    <div className="font-semibold text-sm flex items-center gap-2">
                      {p.name}
                      {p.isCustom && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/40 text-fuchsia-600 dark:text-fuchsia-300">Custom</span>}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 transition-colors">Invitados (QRs): {p.qrCount}</div>
                    <div className="text-xs text-slate-700 dark:text-slate-300 transition-colors">Precio: S/ {p.priceSoles ?? 0}</div>
                    {p.bottle && <div className="text-xs text-slate-700 dark:text-slate-300 transition-colors">Botella: {p.bottle}</div>}
                    <ul className="text-[11px] list-disc ml-4 space-y-0.5 text-slate-700 dark:text-slate-300 transition-colors">
                      {(p.perks||[]).map(per=> <li key={per}>{per}</li>)}
                    </ul>
                    <button onClick={()=>startEdit(p.id)} className="mt-1 text-xs px-2 py-1 rounded bg-blue-500/10 dark:bg-blue-600/20 border border-blue-400/40 dark:border-blue-500/40 hover:bg-blue-500/20 dark:hover:bg-blue-600/30 transition-colors">Editar</button>
                  </>
                )}
                {isEditing && edit && (
                  <div className="space-y-2">
                    <input className="input text-sm px-2 py-1" value={edit.name} onChange={e=>{ if(p.isCustom) return; setPackEdits(prev=>({...prev,[p.id]:{...prev[p.id], name:e.target.value}})); }} placeholder="Nombre" disabled={p.isCustom} title={p.isCustom ? 'Nombre bloqueado para el placeholder Custom' : 'Nombre del pack'} />
                    <input type="number" className="input text-sm px-2 py-1" value={edit.qrCount} onChange={e=>setPackEdits(prev=>({...prev,[p.id]:{...prev[p.id], qrCount: parseInt(e.target.value)||0}}))} placeholder="Invitados" />
                    <input className="input text-sm px-2 py-1" value={edit.bottle} onChange={e=>setPackEdits(prev=>({...prev,[p.id]:{...prev[p.id], bottle:e.target.value}}))} placeholder="Botella cortesía" />
                    <textarea className="input h-28 text-xs px-2 py-1" value={edit.perksText} onChange={e=>setPackEdits(prev=>({...prev,[p.id]:{...prev[p.id], perksText:e.target.value}}))} placeholder={"Beneficios, uno por línea"} />
                    <input type="number" className="input text-sm px-2 py-1" value={edit.priceSoles} onChange={e=>setPackEdits(prev=>({...prev,[p.id]:{...prev[p.id], priceSoles: Math.max(0, parseInt(e.target.value)||0)}}))} placeholder="Precio (S/)" />
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
        {/* Pestañas de estado */}
        <div className="grid gap-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Estado</label>
          <div className="flex flex-wrap gap-1">
            {statusTabs.map(tab => (
              <button
                key={tab.value}
                onClick={() => {
                  setStatus(tab.value);
                  // Si se selecciona "Todas", resetear también el filtro de fecha
                  if (tab.value === '') {
                    setDateFilter('all');
                  }
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  status === tab.value
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selector de fechas */}
        <div className="grid gap-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Fechas</label>
          <select 
            className="input-sm min-w-[140px]" 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
          >
            {dateFilterOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Búsqueda */}
        <div className="grid gap-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Buscar</label>
          <input 
            className="input-sm min-w-[200px]" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="cumpleañero, WhatsApp, documento" 
          />
        </div>
      </div>

      {loading && <div className="text-sm text-gray-400">Cargando…</div>}
      {empty && <div className="text-sm text-gray-400">No hay reservas</div>}

      <div className="grid gap-3">
        {items.map(r => (
          <div key={r.id} className="space-y-1">
            <AdminReservationCard
              r={r}
              busyApprove={!!busyApprove[r.id]}
              busyGenerate={!!busyGenerate[r.id]}
              onApprove={approve}
              onGenerateCards={async (id)=>{ await generateCards(id); }}
              onViewCards={(id)=>{
                window.open(`/marketing/birthdays/${encodeURIComponent(id)}/qrs?mode=admin`, '_blank', 'noopener');
              }}
              onReload={load}
            />
          </div>
        ))}
      </div>

      {/* Paginación mejorada */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          {/* Botón anterior */}
          <button
            className="btn h-8 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            ← Anterior
          </button>

          {/* Números de página */}
          {getVisiblePages().map(pageNum => (
            <button
              key={pageNum}
              className={`btn h-8 px-3 min-w-[40px] ${
                pageNum === page
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              onClick={() => setPage(pageNum)}
            >
              {pageNum}
            </button>
          ))}

          {/* Botón siguiente */}
          <button
            className="btn h-8 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Información de paginación */}
      <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2">
        Página {page} de {totalPages} • Total: {total} reservas
      </div>
      </div>
    </div>
  );
}
