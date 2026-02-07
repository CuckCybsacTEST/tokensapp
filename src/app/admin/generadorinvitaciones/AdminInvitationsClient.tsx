"use client";

import { useEffect, useState, useCallback } from "react";

function fmtLima(iso?: string | null) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const lima = new Date(d.getTime() - 5 * 3600 * 1000);
    const y = lima.getUTCFullYear();
    const m = String(lima.getUTCMonth() + 1).padStart(2, '0');
    const day = String(lima.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch { return ''; }
}

type EventItem = {
  id: string;
  name: string;
  description: string | null;
  date: string;
  timeSlot: string;
  location: string | null;
  maxGuests: number | null;
  status: string;
  templateUrl: string | null;
  invitationCount: number;
  arrivedCount: number;
  createdAt: string;
};

export function AdminInvitationsPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<EventItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [status, setStatus] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("upcoming");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const q = new URLSearchParams();
      if (status) q.set('status', status);
      if (dateFilter && dateFilter !== 'all') q.set('dateFilter', dateFilter);
      if (search) q.set('search', search);
      q.set('page', String(page));
      q.set('pageSize', String(pageSize));
      const res = await fetch(`/api/admin/invitations?${q}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j?.code || j?.message || `HTTP_${res.status}`);
      setItems(j.items || []);
      setTotal(j.total || 0);
    } catch (e: any) { setErr(String(e?.message || e)); }
    finally { setLoading(false); }
  }, [status, dateFilter, search, page, pageSize]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const statusTabs = [
    { value: '', label: 'Todos' },
    { value: 'active', label: 'Activos' },
    { value: 'completed', label: 'Completados' },
    { value: 'cancelled', label: 'Cancelados' },
    { value: 'draft', label: 'Borrador' },
  ];

  const dateOptions = [
    { value: 'all', label: 'Todas las fechas' },
    { value: 'upcoming', label: 'Próximos' },
    { value: 'past', label: 'Pasados' },
    { value: 'today', label: 'Hoy' },
  ];

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    draft: 'bg-slate-200 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200',
  };

  const statusLabels: Record<string, string> = {
    active: 'ACTIVO', completed: 'COMPLETADO', cancelled: 'CANCELADO', draft: 'BORRADOR',
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Invitaciones Especiales</h1>
          <a
            href="/admin/generadorinvitaciones/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            + Crear Evento
          </a>
        </div>

        {err && <div className="border border-red-700 bg-red-950/30 text-red-200 rounded p-3 text-sm">{err}</div>}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex rounded-md overflow-hidden border border-slate-300 dark:border-slate-600">
            {statusTabs.map(t => (
              <button
                key={t.value}
                onClick={() => { setStatus(t.value); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  status === t.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >{t.label}</button>
            ))}
          </div>
          <select
            className="text-sm px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
          >
            {dateOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input
            className="text-sm px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 w-48"
            placeholder="Buscar evento..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* Events List */}
        {loading && <p className="text-slate-500 text-sm">Cargando...</p>}
        {!loading && items.length === 0 && (
          <div className="text-center text-slate-500 dark:text-slate-400 py-12">
            <p className="text-lg">No hay eventos</p>
            <p className="text-sm mt-1">Crea tu primer evento de invitación especial</p>
          </div>
        )}

        <div className="space-y-4">
          {items.map(ev => (
            <div key={ev.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800 shadow-sm flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`/admin/generadorinvitaciones/${encodeURIComponent(ev.id)}`}
                  className="font-semibold text-lg text-slate-800 dark:text-slate-100 hover:underline"
                >{ev.name}</a>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[ev.status] || statusColors.draft}`}>
                  {statusLabels[ev.status] || ev.status.toUpperCase()}
                </span>
              </div>
              {ev.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400">{ev.description}</p>
              )}
              <div className="grid gap-y-1 text-[13px] sm:grid-cols-3">
                <div className="text-slate-600 dark:text-slate-300">
                  <span className="font-semibold">Fecha:</span>{' '}
                  <span className="font-bold text-pink-700 dark:text-pink-300 bg-pink-100 dark:bg-pink-900/40 px-2 py-0.5 rounded">{fmtLima(ev.date)}</span>
                </div>
                <div className="text-slate-600 dark:text-slate-300">
                  <span className="font-semibold">Hora:</span> {ev.timeSlot}
                </div>
                <div className="text-slate-600 dark:text-slate-300">
                  <span className="font-semibold">Ubicación:</span> {ev.location || '—'}
                </div>
                <div className="text-slate-600 dark:text-slate-300">
                  <span className="font-semibold">Invitados:</span>{' '}
                  <span className="text-blue-600 dark:text-blue-400 font-bold">{ev.invitationCount}</span>
                  {ev.maxGuests ? ` / ${ev.maxGuests}` : ''}
                </div>
                <div className="text-slate-600 dark:text-slate-300">
                  <span className="font-semibold">Llegadas:</span>{' '}
                  <span className="text-green-600 dark:text-green-400 font-bold">{ev.arrivedCount}</span>
                  {' / '}{ev.invitationCount}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a className="btn h-8 px-3 text-sm bg-slate-100 dark:bg-slate-700 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-white" href={`/admin/generadorinvitaciones/${encodeURIComponent(ev.id)}`}>
                  Ver detalle
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 pt-4">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-30">← Anterior</button>
            <span className="px-3 py-1 text-sm text-slate-500">Página {page} de {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-30">Siguiente →</button>
          </div>
        )}
      </div>
    </div>
  );
}
