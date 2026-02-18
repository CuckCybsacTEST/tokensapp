"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { generateQrPngDataUrl } from "@/lib/qr";

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

function fmtDate(iso?: string | null) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const lima = new Date(d.getTime() - 5 * 3600 * 1000);
    const day = lima.getUTCDate();
    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${day} ${months[lima.getUTCMonth()]} ${lima.getUTCFullYear()}`;
  } catch { return ''; }
}

type Event = {
  id: string;
  name: string;
  description: string | null;
  date: string;
  timeSlot: string;
  location: string | null;
  maxGuests: number | null;
  status: string;
  templateUrl: string | null;
  createdAt: string;
  stats: { total: number; confirmed: number; arrived: number; cancelled: number; pending: number; withCode: number };
};

type Invitation = {
  id: string;
  guestName: string;
  guestPhone: string | null;
  guestWhatsapp: string | null;
  guestEmail: string | null;
  guestDni: string | null;
  guestCategory: string | null;
  courtesyNote: string | null;
  additionalNote: string | null;
  notes: string | null;
  code: string | null;
  status: string;
  arrivedAt: string | null;
  createdAt: string;
};

export function EventDetailClient({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<Event | null>(null);
  const [guests, setGuests] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [qrMap, setQrMap] = useState<Record<string, string>>({});

  // Add guest form
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestWhatsapp, setGuestWhatsapp] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestDni, setGuestDni] = useState("");
  const [guestCategory, setGuestCategory] = useState("");
  const [courtesyNote, setCourtesyNote] = useState("");
  const [additionalNote, setAdditionalNote] = useState("");
  const [guestNotes, setGuestNotes] = useState("");
  const [addingGuest, setAddingGuest] = useState(false);

  // Bulk add
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkNames, setBulkNames] = useState("");

  // Actions
  const [busyGenerate, setBusyGenerate] = useState(false);
  const [busyDownload, setBusyDownload] = useState(false);
  const [busyCardId, setBusyCardId] = useState<string | null>(null);

  // Template edit
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [newTemplateUrl, setNewTemplateUrl] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const templateFileRef = useRef<HTMLInputElement>(null);

  // Tab
  const [activeTab, setActiveTab] = useState<'guests' | 'add' | 'settings'>('guests');

  const loadData = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const [evRes, gRes] = await Promise.all([
        fetch(`/api/admin/invitations/${eventId}`),
        fetch(`/api/admin/invitations/${eventId}/guests`),
      ]);
      const evJ = await evRes.json();
      const gJ = await gRes.json();
      if (!evRes.ok) throw new Error(evJ?.message || evJ?.code || 'Error loading event');
      setEvent(evJ);
      setGuests(gJ?.guests || []);
    } catch (e: any) { setErr(String(e?.message || e)); }
    finally { setLoading(false); }
  }, [eventId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Generate QR data URLs for inline preview
  useEffect(() => {
    const gen = async () => {
      const newMap: Record<string, string> = {};
      for (const g of guests) {
        if (g.code && !qrMap[g.id]) {
          try {
            newMap[g.id] = await generateQrPngDataUrl(`${location.origin}/i/${g.code}`);
          } catch { /* skip */ }
        }
      }
      if (Object.keys(newMap).length) setQrMap(prev => ({ ...prev, ...newMap }));
    };
    gen();
  }, [guests]);

  async function handleAddGuest() {
    setAddingGuest(true); setErr(null);
    try {
      if (!guestName.trim()) throw new Error('El nombre es obligatorio');
      const payload: any = { guestName: guestName.trim() };
      if (guestPhone.trim()) payload.guestPhone = guestPhone.trim();
      if (guestWhatsapp.trim()) payload.guestWhatsapp = guestWhatsapp.trim();
      if (guestEmail.trim()) payload.guestEmail = guestEmail.trim();
      if (guestDni.trim()) payload.guestDni = guestDni.trim();
      if (guestCategory) payload.guestCategory = guestCategory;
      if (courtesyNote.trim()) payload.courtesyNote = courtesyNote.trim();
      if (additionalNote.trim()) payload.additionalNote = additionalNote.trim();
      if (guestNotes.trim()) payload.notes = guestNotes.trim();

      const res = await fetch(`/api/admin/invitations/${eventId}/guests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || j?.code || 'Error');
      setGuestName(""); setGuestPhone(""); setGuestWhatsapp(""); setGuestEmail(""); setGuestDni(""); setGuestCategory(""); setCourtesyNote(""); setAdditionalNote(""); setGuestNotes("");
      await loadData();
    } catch (e: any) { setErr(String(e?.message || e)); }
    finally { setAddingGuest(false); }
  }

  async function handleBulkAdd() {
    setAddingGuest(true); setErr(null);
    try {
      const names = bulkNames.split('\n').map(n => n.trim()).filter(Boolean);
      if (!names.length) throw new Error('Escribe al menos un nombre');

      const payload = { guests: names.map(n => ({ guestName: n })) };
      const res = await fetch(`/api/admin/invitations/${eventId}/guests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || j?.code || 'Error');
      setBulkNames(""); setBulkMode(false);
      await loadData();
    } catch (e: any) { setErr(String(e?.message || e)); }
    finally { setAddingGuest(false); }
  }

  async function handleRemoveGuest(guestId: string) {
    if (!confirm('¿Eliminar este invitado?')) return;
    try {
      const res = await fetch(`/api/admin/invitations/${eventId}/guests/${guestId}`, { method: 'DELETE' });
      if (!res.ok) { const j = await res.json(); throw new Error(j?.message || 'Error'); }
      await loadData();
    } catch (e: any) { setErr(String(e?.message || e)); }
  }

  async function handleGenerateCodes() {
    setBusyGenerate(true); setErr(null);
    try {
      const res = await fetch(`/api/admin/invitations/${eventId}/generate-codes`, { method: 'POST' });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || j?.code || 'Error');
      await loadData();
    } catch (e: any) { setErr(String(e?.message || e)); }
    finally { setBusyGenerate(false); }
  }

  async function handleDownloadCards() {
    setBusyDownload(true); setErr(null);
    try {
      const res = await fetch(`/api/admin/invitations/${eventId}/download-cards`);
      if (!res.ok) throw new Error('Error descargando tarjetas');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `invitaciones-${event?.name || eventId}.zip`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { setErr(String(e?.message || e)); }
    finally { setBusyDownload(false); }
  }

  async function handleDownloadSingleCard(guestId: string, guestName: string) {
    setBusyCardId(guestId); setErr(null);
    try {
      const res = await fetch(`/api/admin/invitations/${eventId}/download-cards?guestId=${guestId}`);
      if (!res.ok) throw new Error('Error descargando tarjeta');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeName = guestName.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '').replace(/\s+/g, '_');
      a.href = url; a.download = `${safeName}.png`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { setErr(String(e?.message || e)); }
    finally { setBusyCardId(null); }
  }

  async function handleCancelEvent() {
    if (!confirm('¿Cancelar este evento?')) return;
    try {
      const res = await fetch(`/api/admin/invitations/${eventId}/cancel`, { method: 'POST' });
      if (!res.ok) throw new Error('Error');
      await loadData();
    } catch (e: any) { setErr(String(e?.message || e)); }
  }

  async function handleCompleteEvent() {
    if (!confirm('¿Marcar como completado?')) return;
    try {
      const res = await fetch(`/api/admin/invitations/${eventId}/complete`, { method: 'POST' });
      if (!res.ok) throw new Error('Error');
      await loadData();
    } catch (e: any) { setErr(String(e?.message || e)); }
  }

  async function handleSaveTemplate() {
    setSavingTemplate(true); setErr(null);
    try {
      const res = await fetch(`/api/admin/invitations/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateUrl: newTemplateUrl.trim() || null }),
      });
      if (!res.ok) throw new Error('Error guardando plantilla');
      setEditingTemplate(false);
      await loadData();
    } catch (e: any) { setErr(String(e?.message || e)); }
    finally { setSavingTemplate(false); }
  }

  async function handleUploadTemplate(file: File) {
    setUploadingTemplate(true); setErr(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/invitations/upload-template', {
        method: 'POST',
        body: formData,
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || j?.code || 'Error subiendo plantilla');

      // Save the uploaded URL to the event
      const patchRes = await fetch(`/api/admin/invitations/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateUrl: j.url }),
      });
      if (!patchRes.ok) throw new Error('Error guardando plantilla');
      await loadData();
    } catch (e: any) { setErr(String(e?.message || e)); }
    finally { setUploadingTemplate(false); }
  }

  if (loading) return <div className="p-6 text-slate-500">Cargando...</div>;
  if (!event) return <div className="p-6 text-red-500">Evento no encontrado</div>;

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    completed: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-rose-100 text-rose-700',
    draft: 'bg-slate-200 text-slate-700',
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-blue-100 text-blue-700',
    arrived: 'bg-green-100 text-green-700',
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <a href="/admin/generadorinvitaciones" className="text-blue-600 hover:underline text-sm">← Eventos</a>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{event.name}</h1>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[event.status] || 'bg-slate-200 text-slate-700'}`}>
            {event.status.toUpperCase()}
          </span>
        </div>

        {err && <div className="border border-red-700 bg-red-950/30 text-red-200 rounded p-3 text-sm">{err}</div>}

        {/* Event Info Card */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-xs">Fecha</span>
              <span className="font-bold text-pink-700 dark:text-pink-300">{fmtDate(event.date)}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-xs">Hora</span>
              <span className="font-semibold">{event.timeSlot}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-xs">Ubicación</span>
              <span className="font-semibold">{event.location || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-xs">Creado</span>
              <span className="text-slate-600 dark:text-slate-300">{fmtLima(event.createdAt)}</span>
            </div>
          </div>
          {event.description && (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{event.description}</p>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: event.stats.total, color: 'text-slate-800 dark:text-white' },
            { label: 'Pendientes', value: event.stats.pending, color: 'text-amber-600' },
            { label: 'Confirmados', value: event.stats.confirmed, color: 'text-blue-600' },
            { label: 'Llegaron', value: event.stats.arrived, color: 'text-green-600' },
            { label: 'Con QR', value: event.stats.withCode, color: 'text-purple-600' },
          ].map(s => (
            <div key={s.label} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
            disabled={busyGenerate || guests.length === 0}
            onClick={handleGenerateCodes}
          >
            {busyGenerate ? 'Generando...' : '🎫 Generar QR Codes'}
          </button>
          <button
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
            disabled={busyDownload || event.stats.withCode === 0}
            onClick={handleDownloadCards}
          >
            {busyDownload ? 'Descargando...' : '📥 Descargar Tarjetas ZIP'}
          </button>
          {event.status !== 'completed' && event.status !== 'cancelled' && (
            <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium" onClick={handleCompleteEvent}>
              ✅ Completar
            </button>
          )}
          {event.status !== 'cancelled' && (
            <button className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-sm font-medium" onClick={handleCancelEvent}>
              Cancelar evento
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-700">
          <nav className="flex space-x-6">
            {([
              ['guests', 'Invitados'],
              ['add', 'Agregar invitados'],
              ['settings', 'Configuración'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`py-2 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === key
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >{label} {key === 'guests' && `(${guests.length})`}</button>
            ))}
          </nav>
        </div>

        {/* Guest List Tab */}
        {activeTab === 'guests' && (
          <div className="space-y-2">
            {guests.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <p className="text-lg">No hay invitados aún</p>
                <p className="text-sm mt-1">Ve a &quot;Agregar invitados&quot; para empezar</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs text-slate-500 uppercase">
                      <th className="px-3 py-2">QR</th>
                      <th className="px-3 py-2">Nombre</th>
                      <th className="px-3 py-2">Categoría</th>
                      <th className="px-3 py-2">WhatsApp</th>
                      <th className="px-3 py-2">DNI</th>
                      <th className="px-3 py-2">Estado</th>
                      <th className="px-3 py-2">Llegada</th>
                      <th className="px-3 py-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guests.map(g => (
                      <tr key={g.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-3 py-2">
                          {g.code ? (
                            qrMap[g.id] ? (
                              <img src={qrMap[g.id]} alt="QR" width={48} height={48} className="rounded" />
                            ) : (
                              <div className="w-12 h-12 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                            )
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div>
                            <span className="font-medium text-slate-800 dark:text-slate-100">{g.guestName}</span>
                            {g.courtesyNote && <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">🎁 {g.courtesyNote}</p>}
                            {g.additionalNote && <p className="text-[10px] text-slate-400 mt-0.5">📝 {g.additionalNote}</p>}
                            {g.notes && <p className="text-[10px] text-slate-400 italic mt-0.5">{g.notes}</p>}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {g.guestCategory === 'vip' && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">⭐ VIP</span>}
                          {g.guestCategory === 'influencer' && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">📸 Influencer</span>}
                          {(!g.guestCategory || g.guestCategory === 'normal') && <span className="text-[10px] text-slate-400">Normal</span>}
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{g.guestWhatsapp || g.guestPhone || '—'}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{g.guestDni || '—'}</td>
                        <td className="px-3 py-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[g.status] || 'bg-slate-200 text-slate-700'}`}>
                            {g.status === 'pending' ? 'PENDIENTE' : g.status === 'confirmed' ? 'CONFIRMADO' : g.status === 'arrived' ? 'LLEGÓ' : g.status === 'cancelled' ? 'CANCELADO' : g.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                          {g.arrivedAt ? (
                            <span className="text-green-600 dark:text-green-400">✅ {fmtLima(g.arrivedAt)}</span>
                          ) : '—'}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {g.code && (
                              <button
                                className="text-xs text-blue-500 hover:text-blue-700 disabled:opacity-50"
                                disabled={busyCardId === g.id}
                                onClick={() => handleDownloadSingleCard(g.id, g.guestName)}
                              >{busyCardId === g.id ? '⏳' : '📥 Tarjeta'}</button>
                            )}
                            <button
                              className="text-xs text-rose-500 hover:text-rose-700"
                              onClick={() => handleRemoveGuest(g.id)}
                            >Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Add Guest Tab */}
        {activeTab === 'add' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setBulkMode(false)}
                className={`text-sm font-medium px-3 py-1 rounded ${!bulkMode ? 'bg-blue-100 text-blue-700' : 'text-slate-500'}`}
              >Individual</button>
              <button
                onClick={() => setBulkMode(true)}
                className={`text-sm font-medium px-3 py-1 rounded ${bulkMode ? 'bg-blue-100 text-blue-700' : 'text-slate-500'}`}
              >Carga masiva</button>
            </div>

            {!bulkMode ? (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-700 dark:text-slate-300">Nombre completo *</label>
                    <input className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white" placeholder="Nombre del invitado" value={guestName} onChange={e => setGuestName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-700 dark:text-slate-300">WhatsApp</label>
                    <input className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white" placeholder="999 999 999" value={guestWhatsapp} onChange={e => setGuestWhatsapp(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-700 dark:text-slate-300">Teléfono</label>
                    <input className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white" placeholder="Teléfono" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-700 dark:text-slate-300">Email</label>
                    <input className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white" placeholder="correo@ejemplo.com" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-700 dark:text-slate-300">DNI</label>
                    <input className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white" placeholder="Documento" value={guestDni} onChange={e => setGuestDni(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-700 dark:text-slate-300">Categoría</label>
                    <select className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={guestCategory} onChange={e => setGuestCategory(e.target.value)}>
                      <option value="">Normal</option>
                      <option value="influencer">Influencer</option>
                      <option value="vip">VIP</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-700 dark:text-slate-300">Cortesías</label>
                    <input className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white" placeholder="Ej: 1 botella Red Label, mesa VIP..." value={courtesyNote} onChange={e => setCourtesyNote(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-700 dark:text-slate-300">Nota adicional</label>
                    <input className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white" placeholder="Apunte extra..." value={additionalNote} onChange={e => setAdditionalNote(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-700 dark:text-slate-300">Notas internas</label>
                    <input className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white" placeholder="Notas del admin" value={guestNotes} onChange={e => setGuestNotes(e.target.value)} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50" disabled={addingGuest} onClick={handleAddGuest}>
                    {addingGuest ? 'Agregando...' : '+ Agregar invitado'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800 space-y-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Un nombre por línea:
                </label>
                <textarea
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-mono"
                  rows={10}
                  placeholder={"Juan Pérez\nMaría García\nCarlos López"}
                  value={bulkNames}
                  onChange={e => setBulkNames(e.target.value)}
                />
                <p className="text-xs text-slate-500">{bulkNames.split('\n').filter(n => n.trim()).length} nombres detectados</p>
                <div className="flex justify-end">
                  <button className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50" disabled={addingGuest} onClick={handleBulkAdd}>
                    {addingGuest ? 'Agregando...' : '+ Agregar todos'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            {/* Template Management */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800 space-y-3">
              <h3 className="font-semibold text-slate-800 dark:text-white">Plantilla de Tarjeta</h3>
              <p className="text-xs text-slate-500">Imagen 1080×1920px. El QR se imprime en la zona central (460×460px a 310px del borde izquierdo, 621px desde arriba).</p>

              <input
                ref={templateFileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadTemplate(file);
                }}
              />

              {event.templateUrl ? (
                <div className="flex items-start gap-4">
                  <img src={event.templateUrl} alt="Template" className="w-24 h-auto rounded border border-slate-300" />
                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">✅ Plantilla activa</p>
                    <p className="text-[10px] text-slate-400 break-all">{event.templateUrl}</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                        onClick={() => templateFileRef.current?.click()}
                        disabled={uploadingTemplate}
                      >{uploadingTemplate ? 'Subiendo...' : '📤 Cambiar plantilla'}</button>
                      <button
                        className="text-sm text-rose-500 hover:underline"
                        onClick={async () => {
                          const res = await fetch(`/api/admin/invitations/${eventId}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ templateUrl: null }),
                          });
                          if (res.ok) await loadData();
                        }}
                      >Quitar plantilla</button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="w-full border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center hover:border-blue-400 hover:bg-blue-50/5 transition-colors disabled:opacity-50"
                  onClick={() => templateFileRef.current?.click()}
                  disabled={uploadingTemplate}
                >
                  {uploadingTemplate ? (
                    <div className="space-y-2">
                      <div className="animate-spin text-2xl">⏳</div>
                      <p className="text-sm text-blue-500 font-medium">Subiendo y optimizando...</p>
                      <p className="text-xs text-slate-400">Se redimensiona a 1080×1920 automáticamente</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-3xl">🎨</div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">Subir plantilla de tarjeta</p>
                      <p className="text-xs text-slate-400">PNG, JPG o WebP · Máx 10MB · Se optimiza a 1080×1920</p>
                    </div>
                  )}
                </button>
              )}
            </div>

            {/* Event info edit */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800 space-y-2">
              <h3 className="font-semibold text-slate-800 dark:text-white">Información del Evento</h3>
              <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
                <p><strong>ID:</strong> {event.id}</p>
                <p><strong>Estado:</strong> {event.status}</p>
                <p><strong>Max invitados:</strong> {event.maxGuests || 'Sin límite'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
