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

export default function AdminShowsPage() {
  const [shows, setShows] = useState<ShowRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
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
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Shows Admin</h1>

      {/* Toasts */}
      <div className="fixed top-4 right-4 space-y-2 z-50 text-sm">
        {error && <div className="bg-red-600 text-white px-3 py-2 rounded shadow">{error}</div>}
        {success && <div className="bg-green-600 text-white px-3 py-2 rounded shadow">{success}</div>}
      </div>

      {/* Create Form */}
  <form onSubmit={handleCreate} className="card grid gap-4 md:grid-cols-5 items-end p-4">
        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wide">Title</label>
          <input required value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} className="input-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase">Starts At</label>
          <input type="datetime-local" required value={form.startsAt} onChange={e=>setForm(f=>({...f,startsAt:e.target.value}))} className="input-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase">Ends At</label>
          <input type="datetime-local" value={form.endsAt} onChange={e=>setForm(f=>({...f,endsAt:e.target.value}))} className="input-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase">Slot (1-4)</label>
            <input type="number" min={1} max={4} value={form.slot} onChange={e=>setForm(f=>({...f,slot:e.target.value}))} className="input-sm" />
        </div>
        <div className="md:col-span-5 flex justify-end">
          <button disabled={creating || !form.title} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded">{creating ? 'Creando...' : 'Crear'}</button>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-4">
        <h2 className="font-medium">Shows ({shows.length})</h2>
        <button onClick={fetchShows} className="text-sm px-3 py-1 border rounded hover:bg-slate-100 dark:hover:bg-slate-700">Refrescar</button>
        {loading && <span className="text-xs text-gray-500">Cargando…</span>}
        <div className="ml-auto text-[11px] text-gray-500 flex flex-col sm:flex-row gap-2">
          <span><strong>Campos:</strong> Details, Invitados Especiales, Notas (click para editar)</span>
        </div>
      </div>

  <div className="overflow-x-auto card p-0">
        <table className="min-w-full text-sm align-top">
          <thead className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
            <tr>
              <th className="p-2 text-left">Title</th>
              <th className="p-2">Status</th>
              <th className="p-2">Slot</th>
              <th className="p-2">Starts</th>
              <th className="p-2">Image</th>
              <th className="p-2">Detalles</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {shows.map(s => {
              const canPublish = s.status === 'DRAFT' && s.hasImage;
              return (
                <tr key={s.id} className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="p-2 align-top max-w-xs">
                    <div className="font-medium truncate" title={s.title}>{s.title}</div>
                    <div className="text-[10px] text-gray-500">{s.slug}</div>
                  </td>
                  <td className="p-2 text-center">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-200 dark:bg-slate-600 dark:text-slate-100">{s.status}</span>
                  </td>
                  <td className="p-2 text-center">{s.slot ?? '-'}</td>
                  <td className="p-2 whitespace-nowrap">{new Date(s.startsAt).toLocaleString()}</td>
                  <td className="p-2 text-center">
                    {s.hasImage ? <span className="text-green-600 font-semibold">✓</span> : <span className="text-red-500">✗</span>}
                  </td>
                  <td className="p-2 w-72 align-top">
                    <InlineRichField show={s} field="details" label="Detalles" placeholder="Descripción, temática, etc." onUpdated={updateShowLocally} />
                    <InlineRichField show={s} field="specialGuests" label="Invitados" placeholder="Lista o nombres" onUpdated={updateShowLocally} />
                    <InlineRichField show={s} field="notes" label="Notas" placeholder="Notas internas" onUpdated={updateShowLocally} />
                  </td>
                  <td className="p-2 space-x-1 whitespace-nowrap">
                    <input ref={el=> (fileInputsRef.current[s.id]=el)} type="file" accept="image/*" className="hidden" onChange={e=>onFileSelected(s.id,e)} />
                    <button onClick={()=>triggerUpload(s.id)} className="px-2 py-1 border rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-700">Img</button>
                    <button disabled={!canPublish} onClick={()=>publishShow(s.id)} className="px-2 py-1 border rounded text-xs disabled:opacity-40 bg-emerald-600 text-white hover:bg-emerald-700">Publish</button>
                    <button disabled={s.status==='ARCHIVED'} onClick={()=>archiveShow(s.id)} className="px-2 py-1 border rounded text-xs disabled:opacity-40 bg-orange-600 text-white hover:bg-orange-700">Archive</button>
                  </td>
                </tr>
              );
            })}
            {shows.length === 0 && !loading && (
              <tr><td colSpan={7} className="p-4 text-center text-gray-500">No shows</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">Nota: Botón Publish deshabilitado hasta que el show tenga imagen. Errores de conflicto (slot, límite) se muestran como toast.</p>
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
    <div className="mb-2 last:mb-0">
      <button type="button" onClick={()=>setOpen(o=>!o)} className="text-[11px] uppercase tracking-wide font-medium text-slate-600 dark:text-slate-300 hover:underline flex items-center gap-1">
        {label}
        <span className="text-[9px] opacity-60">{open ? '▼' : '▶'}</span>
      </button>
      {!open && (
        <div className="text-xs mt-0.5 line-clamp-2 text-gray-600 dark:text-gray-300 whitespace-pre-wrap max-h-16">{val || <span className="opacity-40 italic">{placeholder || 'Vacío'}</span>}</div>
      )}
      {open && (
        <div className="mt-1 space-y-1">
          <textarea value={val} onChange={e=>setVal(e.target.value)} rows={3} placeholder={placeholder} className="w-full resize-y rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-1.5 text-xs leading-snug" />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={()=>{ setVal(show[field] || ''); setOpen(false); }} className="px-2 py-0.5 text-[11px] rounded border">Cancelar</button>
            <button disabled={saving} onClick={save} className="px-3 py-0.5 text-[11px] rounded bg-blue-600 text-white disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
