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
  const [cPackId, setCPackId] = useState("");
  const [creating, setCreating] = useState(false);
  // packs
  const [packs, setPacks] = useState<Array<{id: string, name: string, qrCount: number, bottle: string | null}>>([]);
  // tabs
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('list');

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

  // Load packs
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/birthdays/packs');
        const j = await res.json();
        if (res.ok && j?.packs) {
          const uniquePacks = Array.from(new Map(j.packs.map((p: any) => [p.id, p as any])).values()) as typeof packs;
          setPacks(uniquePacks);
        }
      } catch (e) {
        console.error('Failed to load packs:', e);
      }
    })();
  }, []);

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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestión de Cumpleaños</h1>
      </div>
      {err && <div className="border border-red-700 bg-red-950/30 text-red-200 rounded p-3 text-sm">{err}</div>}

      {/* Pestañas - Horizontales */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="flex justify-center space-x-8">
          <button
            onClick={() => setActiveTab('create')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 whitespace-nowrap ${
              activeTab === 'create'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            Crear Reserva
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 whitespace-nowrap ${
              activeTab === 'list'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            Ver Reservas
          </button>
        </nav>
      </div>

      {/* Contenido de las pestañas */}
      {activeTab === 'create' && (
        <div className="space-y-6">
          {/* Crear reserva */}
          <div className="rounded border border-slate-200 dark:border-slate-700 p-4 sm:p-6 bg-white dark:bg-slate-800 shadow-sm transition-colors">
            <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Crear Nueva Reserva</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                  Nombre del Cumpleañero *
                </label>
                <input
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  placeholder="Nombre completo"
                  value={cName}
                  onChange={(e)=>setCName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                  WhatsApp *
                </label>
                <input
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  placeholder="Número de WhatsApp"
                  value={cPhone}
                  onChange={(e)=>setCPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                  Documento (DNI) *
                </label>
                <input
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  placeholder="Número de documento"
                  value={cDoc}
                  onChange={(e)=>setCDoc(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                  Email (Opcional)
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  placeholder="correo@ejemplo.com"
                  value={cEmail}
                  onChange={(e)=>setCEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                  Fecha de Celebración *
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  value={cDate}
                  onChange={(e)=>setCDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                  Hora de Llegada *
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  value={cSlot}
                  onChange={(e)=>setCSlot(e.target.value)}
                >
                  <option value="20:00">20:00</option>
                  <option value="21:00">21:00</option>
                  <option value="22:00">22:00</option>
                  <option value="23:00">23:00</option>
                  <option value="00:00">00:00</option>
                </select>
              </div>
              <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                  Pack de Cumpleaños *
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  value={cPackId}
                  onChange={(e)=>setCPackId(e.target.value)}
                >
                  <option value="">Seleccionar pack…</option>
                  {packs.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.qrCount} QR{p.bottle ? ` + ${p.bottle}` : ''})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6">
              <button
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2 text-sm font-medium rounded-md bg-blue-600 hover:bg-blue-700 text-white border border-transparent focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 w-full sm:w-auto"
                disabled={creating}
                onClick={async ()=>{
                  setCreating(true); setErr(null);
                  try {
                    // Validaciones básicas
                    if (!cName.trim()) throw new Error('Nombre requerido');
                    if (!cPhone.trim()) throw new Error('WhatsApp requerido');
                    if (!cDoc.trim()) throw new Error('Documento requerido');
                    if (!cPackId) throw new Error('Pack requerido');
                    let finalDate = cDate;
                    if (!finalDate) {
                      const d = new Date();
                      finalDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                      setCDate(finalDate);
                    }
                    const selectedPack = packs.find(p => p.id === cPackId);
                    if (!selectedPack) throw new Error('Pack no encontrado');
                    const payload = {
                      celebrantName: cName.trim(),
                      phone: cPhone.trim(),
                      documento: cDoc.trim(),
                      email: cEmail.trim() || null,
                      date: finalDate,
                      timeSlot: cSlot,
                      packId: cPackId,
                      guestsPlanned: selectedPack.qrCount
                    } as any;
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
                    setCName(''); setCPhone(''); setCDoc(''); setCEmail(''); setCDate(''); setCSlot('20:00'); setCPackId('');
                    await load();
                    // Cambiar a la pestaña de lista después de crear
                    setActiveTab('list');
                  } catch(e:any) { setErr(String(e?.message || e)); } finally { setCreating(false); }
                }}
              >
                {creating ? 'Creando Reserva...' : 'Crear Reserva'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'list' && (
        <div className="space-y-6">

      <div className="flex flex-col lg:flex-row lg:items-end gap-4">
        {/* Pestañas de estado */}
        <div className="grid gap-1 flex-1">
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
        <div className="grid gap-1 min-w-[140px]">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Fechas</label>
          <select
            className="input-sm"
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
        <div className="grid gap-1 flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Buscar</label>
          <input
            className="input-sm"
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

          {/* Paginación mejorada - Responsive */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-4">
              {/* Botón anterior */}
              <button
                className="btn h-8 px-3 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                ← Anterior
              </button>

              {/* Números de página */}
              <div className="flex gap-1 order-first sm:order-none">
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
              </div>

              {/* Botón siguiente */}
              <button
                className="btn h-8 px-3 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Siguiente →
              </button>
            </div>
          )}      {/* Información de paginación */}
      <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2">
        Página {page} de {totalPages} • Total: {total} reservas
      </div>
        </div>
      )}
      </div>
    </div>
  );
}
