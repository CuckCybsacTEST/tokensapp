"use client";
import React, { useEffect, useRef, useState } from 'react';

interface ShowRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  slot: number | null;
  startsAt: string;
  endsAt: string | null;
  hasImage: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isExpired?: boolean;
  details?: string | null;
  specialGuests?: string | null;
  notes?: string | null;
}

interface ApiListResponse { ok: boolean; shows: ShowRow[] }

const dtLocal = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000); // adjust to local for input
  return local.toISOString().slice(0,16);
};

const toISOFromLocal = (val: string) => {
  if (!val) return undefined;
  const d = new Date(val);
  return d.toISOString();
};

export function AdminShowsPage() {
  const [shows, setShows] = useState<ShowRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [success, setSuccess] = useState<string|null>(null);
  const [form, setForm] = useState({ title: '', startsAt: dtLocal(new Date().toISOString()), endsAt: '', slot: '' });
  const fileInputsRef = useRef<Record<string, HTMLInputElement|null>>({});

  function toastError(msg: string) { setError(msg); setTimeout(()=> setError(null), 5000); }
  function toastSuccess(msg: string) { setSuccess(msg); setTimeout(()=> setSuccess(null), 4000); }

  async function fetchShows() {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/shows?order=startsAt_desc&pageSize=50', { cache: 'no-store' });
      const j: ApiListResponse = await r.json();
      if (j.ok) setShows(j.shows);
      else toastError('Error al listar shows');
    } catch (e:any) {
      toastError('Fallo de red listando shows');
    } finally { setLoading(false); }
  }

  useEffect(()=> { fetchShows(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const body: any = { title: form.title, startsAt: toISOFromLocal(form.startsAt) };
      if (form.endsAt) body.endsAt = toISOFromLocal(form.endsAt);
      if (form.slot) body.slot = Number(form.slot);
      const r = await fetch('/api/admin/shows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (r.status === 201 && j.ok) {
        setForm(prev=> ({ ...prev, title: '' }));
        toastSuccess('Show creado');
        setShows(s => [j.show, ...s]);
      } else {
        toastError(j.message || 'Error creando show');
      }
    } catch (e:any) {
      toastError('Fallo de red creando');
    } finally { setCreating(false); }
  }

  function updateShowLocally(id: string, patch: Partial<ShowRow>) {
    setShows(s => s.map(sh => sh.id === id ? { ...sh, ...patch } : sh));
  }

  async function publishShow(id: string) {
    updateShowLocally(id, { status: '...'} as any);
    try {
      const r = await fetch(`/api/admin/shows/${id}/publish`, { method: 'POST' });
      const j = await r.json();
      if (r.ok && j.ok) {
        updateShowLocally(id, j.show);
        toastSuccess('Publicado');
      } else {
        fetchShows();
        if (j.code === 'INVALID_ACTIVE_WINDOW') {
          toastError('No se puede publicar: la fecha de fin ya pasó. Ajusta Ends At o déjalo vacío.');
        } else if (j.code === 'IMAGE_REQUIRED') {
          toastError('Falta imagen antes de publicar.');
        } else {
          toastError(j.code || 'Error publicando');
        }
      }
    } catch (e:any) { fetchShows(); toastError('Fallo de red'); }
  }

  async function archiveShow(id: string) {
    try {
      const r = await fetch(`/api/admin/shows/${id}/archive`, { method: 'POST' });
      const j = await r.json();
      if (r.ok && j.ok) { updateShowLocally(id, j.show); toastSuccess('Archivado'); }
      else toastError(j.code || 'Error archivando');
    } catch (e:any) { toastError('Fallo de red'); }
  }

  async function cleanupExpired() {
    if (!confirm('¿Archivar todos los shows publicados expirados? Esta acción no se puede deshacer.')) return;
    setCleaning(true);
    try {
      const r = await fetch('/api/admin/shows/cleanup', { method: 'POST' });
      const j = await r.json();
      if (r.ok && j.ok) {
        toastSuccess(`Archivados ${j.archivedCount} shows expirados`);
        fetchShows(); // refresh
      } else {
        toastError(j.code || 'Error limpiando');
      }
    } catch (e:any) {
      toastError('Fallo de red');
    } finally {
      setCleaning(false);
    }
  }

  function triggerUpload(id: string) {
    const el = fileInputsRef.current[id];
    if (el) el.click();
  }

  async function onFileSelected(id: string, ev: React.ChangeEvent<HTMLInputElement>) {
    const files = ev.target.files;
    if (!files || !files[0]) return;
    const file = files[0];
    const fd = new FormData();
    fd.append('file', file);
    updateShowLocally(id, { hasImage: true }); // optimistic
    try {
      const r = await fetch(`/api/admin/shows/${id}/image`, { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        toastError(j.code || 'Error subiendo imagen');
        fetchShows();
      } else {
        toastSuccess('Imagen subida');
        updateShowLocally(id, { hasImage: true });
      }
    } catch (e:any) {
      toastError('Fallo de red imagen');
      fetchShows();
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
          Shows Admin
        </h1>
      </div>

      {/* Toasts */}
      <div className="fixed top-4 right-4 left-4 sm:left-auto space-y-2 z-50 text-sm max-w-sm sm:max-w-none">
        {error && (
          <div className="bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg border border-red-700">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        )}
        {success && (
          <div className="bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg border border-green-700">
            <div className="flex items-center gap-2">
              <span className="text-lg">✅</span>
              <span>{success}</span>
            </div>
          </div>
        )}
      </div>

      {/* Create Form */}
      <form onSubmit={handleCreate} className="bg-white dark:bg-gray-800 rounded-lg shadow-md border p-4 sm:p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Crear Nuevo Show
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Título *</label>
            <input
              required
              value={form.title}
              onChange={e=>setForm(f=>({...f,title:e.target.value}))}
              className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nombre del show"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Fecha de Inicio *</label>
            <input
              type="datetime-local"
              required
              value={form.startsAt}
              onChange={e=>setForm(f=>({...f,startsAt:e.target.value}))}
              className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Fecha de Fin</label>
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={e=>setForm(f=>({...f,endsAt:e.target.value}))}
              className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Slot (1-4)</label>
            <input
              type="number"
              min={1}
              max={4}
              value={form.slot}
              onChange={e=>setForm(f=>({...f,slot:e.target.value}))}
              className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="1-4"
            />
          </div>
        </div>
        <div className="flex justify-end mt-6">
          <button
            disabled={creating || !form.title}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
          >
            {creating ? 'Creando...' : 'Crear Show'}
          </button>
        </div>
      </form>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Shows ({shows.length})
          </h2>
          <button
            onClick={fetchShows}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
          >
            Refrescar
          </button>
          <button
            onClick={cleanupExpired}
            disabled={cleaning}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
          >
            {cleaning ? 'Limpiando...' : 'Limpiar Expirados'}
          </button>
          {loading && <span className="text-sm text-gray-500">Cargando…</span>}
        </div>
        <div className="text-xs text-gray-500 max-w-md">
          <strong>Campos editables:</strong> Details, Invitados Especiales, Notas (click para editar)
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm align-top">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
              <tr>
                <th className="p-4 text-left font-medium">Título</th>
                <th className="p-4 text-center font-medium">Estado</th>
                <th className="p-4 text-center font-medium">Slot</th>
                <th className="p-4 text-center font-medium">Fecha Inicio</th>
                <th className="p-4 text-center font-medium">Imagen</th>
                <th className="p-4 text-center font-medium">Detalles</th>
                <th className="p-4 text-center font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {shows.map(s => {
                const canPublish = s.status === 'DRAFT' && s.hasImage;
                return (
                  <tr key={s.id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-4 align-top max-w-xs">
                      <div className="font-medium truncate text-gray-900 dark:text-white" title={s.title}>
                        {s.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {s.slug}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        s.status === 'PUBLISHED'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : s.status === 'ARCHIVED'
                          ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="p-4 text-center text-gray-900 dark:text-white">
                      {s.slot ?? '-'}
                    </td>
                    <td className="p-4 text-center text-gray-900 dark:text-white whitespace-nowrap">
                      {new Date(s.startsAt).toLocaleString()}
                    </td>
                    <td className="p-4 text-center">
                      {s.hasImage ? (
                        <span className="text-green-600 font-semibold text-lg">✓</span>
                      ) : (
                        <span className="text-red-500 text-lg">✗</span>
                      )}
                    </td>
                    <td className="p-4 w-72 align-top">
                      <InlineRichField show={s} field="details" label="Detalles" placeholder="Descripción, temática, etc." onUpdated={updateShowLocally} />
                      <InlineRichField show={s} field="specialGuests" label="Invitados" placeholder="Lista o nombres" onUpdated={updateShowLocally} />
                      <InlineRichField show={s} field="notes" label="Notas" placeholder="Notas internas" onUpdated={updateShowLocally} />
                    </td>
                    <td className="p-4 space-x-2 whitespace-nowrap">
                      <input
                        ref={el=> (fileInputsRef.current[s.id]=el)}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e=>onFileSelected(s.id,e)}
                      />
                      <button
                        onClick={()=>triggerUpload(s.id)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Imagen
                      </button>
                      <button
                        disabled={!canPublish}
                        onClick={()=>publishShow(s.id)}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
                      >
                        Publicar
                      </button>
                      <button
                        disabled={s.status==='ARCHIVED'}
                        onClick={()=>archiveShow(s.id)}
                        className="px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
                      >
                        Archivar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {shows.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    No hay shows registrados aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {shows.map(s => {
          const canPublish = s.status === 'DRAFT' && s.hasImage;
          return (
            <div key={s.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate" title={s.title}>
                    {s.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    @{s.slug}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 ml-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    s.status === 'PUBLISHED'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                      : s.status === 'ARCHIVED'
                      ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                  }`}>
                    {s.status}
                  </span>
                  {s.slot && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Slot {s.slot}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Fecha Inicio:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white block">
                    {new Date(s.startsAt).toLocaleDateString()}
                  </span>
                  <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">
                    {new Date(s.startsAt).toLocaleTimeString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Imagen:</span>
                  <span className="ml-2 font-medium">
                    {s.hasImage ? (
                      <span className="text-green-600">✓ Subida</span>
                    ) : (
                      <span className="text-red-500">✗ Falta</span>
                    )}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <InlineRichField show={s} field="details" label="Detalles" placeholder="Descripción, temática, etc." onUpdated={updateShowLocally} />
                <InlineRichField show={s} field="specialGuests" label="Invitados" placeholder="Lista o nombres" onUpdated={updateShowLocally} />
                <InlineRichField show={s} field="notes" label="Notas" placeholder="Notas internas" onUpdated={updateShowLocally} />
              </div>

              <div className="flex flex-wrap gap-2">
                <input
                  ref={el=> (fileInputsRef.current[s.id]=el)}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e=>onFileSelected(s.id,e)}
                />
                <button
                  onClick={()=>triggerUpload(s.id)}
                  className="flex-1 min-w-0 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  📷 Imagen
                </button>
                <button
                  disabled={!canPublish}
                  onClick={()=>publishShow(s.id)}
                  className="flex-1 min-w-0 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
                >
                  🚀 Publicar
                </button>
                <button
                  disabled={s.status==='ARCHIVED'}
                  onClick={()=>archiveShow(s.id)}
                  className="flex-1 min-w-0 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
                >
                  📦 Archivar
                </button>
              </div>
            </div>
          );
        })}
        {shows.length === 0 && !loading && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <p className="text-gray-500 dark:text-gray-400">
              No hay shows registrados aún.
            </p>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
        <strong>Nota:</strong> El botón "Publicar" está deshabilitado hasta que el show tenga imagen. Los errores de conflicto (slot, límite) se muestran como notificaciones.
      </div>
    </div>
  );
}

// --- Inline editor component ---
interface InlineFieldProps {
  show: ShowRow;
  field: 'details' | 'specialGuests' | 'notes';
  label: string;
  placeholder?: string;
  onUpdated: (id: string, patch: Partial<ShowRow>) => void;
}

function InlineRichField({ show, field, label, placeholder, onUpdated }: InlineFieldProps) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState<string>(show[field] || '');
  const [saving, setSaving] = useState(false);
  useEffect(()=> { setVal(show[field] || ''); }, [show.id, show[field]]);

  async function save() {
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/shows/${show.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: val || null }) });
      const j = await r.json();
      if (r.ok && j.ok) {
        onUpdated(show.id, { [field]: val || null } as any);
        setOpen(false);
      } else {
        // TODO: hook global toast; fallback alert
        alert(j.code || 'Error guardando');
      }
    } catch {
      alert('Error de red');
    } finally { setSaving(false); }
  }

  return (
    <div className="mb-3 last:mb-0">
      <button
        type="button"
        onClick={()=>setOpen(o=>!o)}
        className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 transition-colors"
      >
        <span className={`transform transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
        {label}
      </button>
      {!open && (
        <div className="text-sm mt-2 line-clamp-2 text-gray-600 dark:text-gray-300 whitespace-pre-wrap max-h-16 pl-6 border-l-2 border-gray-200 dark:border-gray-600">
          {val || <span className="opacity-60 italic">{placeholder || 'Vacío'}</span>}
        </div>
      )}
      {open && (
        <div className="mt-3 pl-6 border-l-2 border-gray-200 dark:border-gray-600">
          <textarea
            value={val}
            onChange={e=>setVal(e.target.value)}
            rows={4}
            placeholder={placeholder}
            className="w-full resize-y rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-3 text-sm leading-relaxed focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="flex flex-col sm:flex-row gap-2 justify-end mt-3">
            <button
              type="button"
              onClick={()=>{ setVal(show[field] || ''); setOpen(false); }}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              disabled={saving}
              onClick={save}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium transition-colors disabled:cursor-not-allowed"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
