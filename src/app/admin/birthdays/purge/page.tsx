"use client";
import { useEffect, useState } from 'react';

type ReservationLite = { id:string; celebrantName:string; date:string; timeSlot:string; status:string; cardsReady?:boolean };

export default function PurgeBirthdayCardsPage(){
  const [items, setItems] = useState<ReservationLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string|null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string|null>(null);
  const [showOnlyWithCards, setShowOnlyWithCards] = useState(true);

  async function load(){
    setLoading(true); setErr(null); setResult(null);
    try {
      // pedir más grande para facilitar selección
      const res = await fetch('/api/admin/birthdays?page=1&pageSize=200');
      const j = await res.json();
      if(!res.ok) throw new Error(j?.code||j?.message||res.status);
      const list: ReservationLite[] = (j.items||[]).map((r:any)=>({ id:r.id, celebrantName:r.celebrantName, date:r.date?.slice? r.date.slice(0,10):r.date, timeSlot:r.timeSlot, status:r.status, cardsReady:r.cardsReady }));
      setItems(list);
    } catch(e:any){ setErr(String(e?.message||e)); }
    finally { setLoading(false); }
  }
  useEffect(()=>{ load(); }, []);

  function toggle(id:string){ setSelected(prev=>({...prev,[id]: !prev[id]})); }
  function selectAll(){ const base = showOnlyWithCards ? items.filter(i=>i.cardsReady) : items; const map:Record<string,boolean>={}; for(const r of base) map[r.id]=true; setSelected(map); }
  function clearSel(){ setSelected({}); }

  async function purge(){
    const ids = Object.keys(selected).filter(id=>selected[id]);
    if(!ids.length) { setResult('No hay seleccionados'); return; }
    if(!confirm(`Esto eliminará las tarjetas (host/guest) de ${ids.length} reservas. Continuar?`)) return;
    setBusy(true); setErr(null); setResult(null);
    try {
      const res = await fetch('/api/admin/birthdays/purge-cards', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ reservationIds: ids }) });
      const j = await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(j?.code||j?.message||res.status);
      setResult(`Purgadas ${ids.length} reservas (archivos borrados: ${j.filesRemoved||0})`);
      // actualizar flags localmente
      setItems(prev=> prev.map(r=> ids.includes(r.id) ? { ...r, cardsReady:false } : r));
      setSelected({});
    } catch(e:any){ setErr(String(e?.message||e)); }
    finally { setBusy(false); }
  }

  const visible = showOnlyWithCards ? items.filter(i=>i.cardsReady) : items;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Purgar Tarjetas de Cumpleaños</h1>
      <div className="flex flex-wrap gap-4 items-center text-sm">
        <label className="inline-flex items-center gap-1 cursor-pointer select-none"><input type="checkbox" checked={showOnlyWithCards} onChange={e=>setShowOnlyWithCards(e.target.checked)} /> Mostrar solo con tarjetas</label>
        <button className="btn" onClick={load} disabled={loading}>Refrescar</button>
        <button className="btn" onClick={selectAll} disabled={loading || !visible.length}>Seleccionar todos</button>
        <button className="btn" onClick={clearSel} disabled={!Object.keys(selected).length}>Limpiar selección</button>
        <button className="btn" onClick={purge} disabled={busy || !Object.keys(selected).some(id=>selected[id])}>{busy? 'Purgando...' : 'Purgar seleccionados'}</button>
        <a className="btn" href="/admin/birthdays">Volver</a>
      </div>
      {err && <div className="text-sm rounded border border-red-600 bg-red-900/30 p-2 text-red-200">{err}</div>}
      {result && <div className="text-sm rounded border border-emerald-600 bg-emerald-900/30 p-2 text-emerald-200">{result}</div>}
      <div className="grid gap-2">
        {visible.map(r=>{
          const sel = !!selected[r.id];
          return (
            <label key={r.id} className={`flex items-center justify-between gap-4 rounded border p-2 text-sm cursor-pointer transition-colors ${sel? 'border-amber-400 bg-amber-100 dark:bg-amber-900/30 dark:border-amber-600':'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>              
              <div className="flex-1">
                <div className="font-medium flex flex-wrap items-center gap-2">
                  <input type="checkbox" checked={sel} onChange={()=>toggle(r.id)} />
                  <span>{r.celebrantName}</span>
                  {r.cardsReady ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-300">cards</span> : <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-600/20 border border-slate-500/40 text-slate-500 dark:text-slate-300">no-cards</span>}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 border border-slate-400/40 text-slate-600 dark:text-slate-300">{r.status}</span>
                </div>
                <div className="text-[11px] opacity-70 mt-0.5">{r.date} {r.timeSlot}</div>
              </div>
            </label>
          );
        })}
        {!visible.length && !loading && <div className="text-xs opacity-60">No hay reservas que coincidan con el filtro.</div>}
      </div>
    </div>
  );
}
