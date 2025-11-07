"use client";

import { useEffect, useState } from "react";

export function AdminPacksPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [packs, setPacks] = useState<{ id:string; name:string; qrCount:number; bottle?: string | null; perks?: string[]; priceSoles?: number; isCustom?: boolean }[]>([]);
  const [editingPack, setEditingPack] = useState<string|null>(null);
  const [packEdits, setPackEdits] = useState<Record<string, { name: string; qrCount: number; bottle: string; perksText: string; priceSoles: number; hasPrice: boolean }>>({});

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

  function startEdit(pId:string){
    const p = packs.find(x=>x.id===pId);
    if(!p) return;
    setEditingPack(pId);
    setPackEdits(prev=>({...prev,[pId]:{ name:p.name, qrCount:p.qrCount, bottle:p.bottle||'', perksText:(p.perks||[]).join('\n'), priceSoles: p.priceSoles ?? 0, hasPrice: (p.priceSoles ?? 0) > 0 }}));
  }

  function cancelEdit(){
    setEditingPack(null);
  }

  async function savePack(pId:string){
    const e = packEdits[pId];
    if(!e) return;
    try {
      const perks = e.perksText.split(/\n+/).map(l=>l.trim()).filter(Boolean);
      const body={ name:e.name, qrCount:e.qrCount, bottle:e.bottle, perks, priceSoles: e.hasPrice ? e.priceSoles : 0 };
      const res = await fetch(`/api/admin/birthdays/packs/${pId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      const j=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(j?.code||j?.message||res.status);
      const list = await fetch('/api/admin/birthdays/packs').then(r=>r.json()).catch(()=>null);
      if(list?.packs) setPacks(list.packs);
      setEditingPack(null);
    } catch(e:any){ setErr(String(e?.message||e)); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Gestión de Packs de Cumpleaños</h1>
      </div>

      {err && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-800">
          Error: {err}
        </div>
      )}

      {/* Packs Management */}
      <div className="rounded border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800 space-y-3 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="font-medium">Packs de cumpleaños</div>
          <button onClick={async()=>{
            // refrescar packs explicitamente
            const list = await fetch('/api/admin/birthdays/packs').then(r=>r.json()).catch(()=>null);
            if (list?.packs) setPacks(list.packs);
          }} className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Refrescar</button>
        </div>
        {packs.length===0 && (
          <div className="text-xs text-amber-300">No hay packs. Usa "Recrear packs por defecto" abajo.</div>
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
                    <div className="text-xs text-slate-700 dark:text-slate-300 transition-colors">Precio: {p.priceSoles ? `S/ ${p.priceSoles}` : 'Gratis'}</div>
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
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={edit.hasPrice} onChange={e=>setPackEdits(prev=>({...prev,[p.id]:{...prev[p.id], hasPrice:e.target.checked, priceSoles: e.target.checked ? prev[p.id].priceSoles : 0}}))} />
                      Habilitar precio
                    </label>
                    <input type="number" className="input text-sm px-2 py-1" value={edit.priceSoles} onChange={e=>setPackEdits(prev=>({...prev,[p.id]:{...prev[p.id], priceSoles: Math.max(0, parseInt(e.target.value)||0)}}))} placeholder="Precio (S/)" disabled={!edit.hasPrice} />
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

      {/* Restore packs section */}
      <div className="rounded border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800 space-y-3 shadow-sm">
        <div className="font-medium">Restaurar packs por defecto</div>
        <div className="text-xs text-slate-600 dark:text-slate-400">
          Si has eliminado packs importantes o quieres resetear a la configuración original, usa este botón.
        </div>
        <button
          onClick={restorePacks}
          disabled={loading}
          className="px-3 py-2 rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Restaurando...' : 'Recrear packs por defecto'}
        </button>
      </div>
    </div>
  );
}
