"use client";

import { useEffect, useState } from 'react';

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export default function AdminDayBriefPage() {
  const [day, setDay] = useState(todayYmd());
  const [title, setTitle] = useState('');
  const [events, setEvents] = useState<string[]>(['']);
  const [promos, setPromos] = useState<string[]>(['']);
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setErr(null); setMsg(null);
    try {
      const r = await fetch(`/api/admin/day-brief?day=${encodeURIComponent(day)}`, { cache: 'no-store' });
      const j = await r.json();
      if (r.ok && j?.ok) {
        const b = j.brief || null;
        setTitle(b?.title || '');
        const ev = (b?.show || '')
          .split(/\r?\n|;|•/)
          .map((s: string) => s.trim())
          .filter(Boolean);
        setEvents(ev.length ? ev : ['']);
        const pr = (b?.promos || '')
          .split(/\r?\n|;|•/)
          .map((s: string) => s.trim())
          .filter(Boolean);
        setPromos(pr.length ? pr : ['']);
        setNotes(b?.notes || '');
      }
    } catch {}
  }

  useEffect(() => { load(); }, [day]);

  async function save() {
    setErr(null); setMsg(null); setLoading(true);
    try {
      const r = await fetch('/api/admin/day-brief', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day,
          title,
          show: events.map(s => s.trim()).filter(Boolean).join('\n'),
          promos: promos.map(s => s.trim()).filter(Boolean).join('\n'),
          notes,
        })
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j?.ok) setMsg('Guardado'); else setErr(j?.code || j?.message || String(r.status));
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Brief del día</h1>
      {msg && <div className="border border-green-700 bg-green-950/30 text-green-200 rounded p-3 text-sm">{msg}</div>}
      {err && <div className="border border-red-700 bg-red-950/30 text-red-200 rounded p-3 text-sm">{err}</div>}
      <div className="grid gap-3">
        <label className="text-sm text-gray-300">Día</label>
  <input type="date" value={day} onChange={(e)=> setDay(e.target.value)} className="input-sm w-48" />
      </div>
      <div className="grid gap-1">
        <label className="text-sm text-gray-300">Título</label>
  <input value={title} onChange={(e)=> setTitle(e.target.value)} className="input-sm" placeholder="Ej: Jueves de Full Salsa" />
      </div>
      <div className="grid gap-1">
        <label className="text-sm text-gray-300">Eventos</label>
        <div className="space-y-2">
          {events.map((v, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={v}
                onChange={(e)=> setEvents(prev => prev.map((x,idx)=> idx===i ? e.target.value : x))}
                className="flex-1 input-sm"
                placeholder="Artista/Evento y horario"
              />
              <button type="button" onClick={()=> setEvents(prev => prev.filter((_,idx)=> idx!==i))} className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700">Quitar</button>
            </div>
          ))}
          <button type="button" onClick={()=> setEvents(prev => [...prev, ''])} className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700">Agregar evento</button>
        </div>
      </div>
      <div className="grid gap-1">
        <label className="text-sm text-gray-300">Promos</label>
        <div className="space-y-2">
          {promos.map((v, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={v}
                onChange={(e)=> setPromos(prev => prev.map((x,idx)=> idx===i ? e.target.value : x))}
                className="flex-1 input-sm"
                placeholder="Ej: 2x1 hasta las 11pm"
              />
              <button type="button" onClick={()=> setPromos(prev => prev.filter((_,idx)=> idx!==i))} className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700">Quitar</button>
            </div>
          ))}
          <button type="button" onClick={()=> setPromos(prev => [...prev, ''])} className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700">Agregar promo</button>
        </div>
      </div>
      <div className="grid gap-1">
        <label className="text-sm text-gray-300">Apuntes</label>
  <textarea value={notes} onChange={(e)=> setNotes(e.target.value)} className="input-sm min-h-[80px]" placeholder="Notas de operación" />
      </div>
      <div>
        <button onClick={save} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white rounded px-3 py-2 disabled:opacity-50">{loading ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </div>
  );
}
