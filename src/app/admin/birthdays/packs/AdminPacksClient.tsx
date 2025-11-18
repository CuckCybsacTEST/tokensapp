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
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {/* Header - Responsive */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestión de Packs de Cumpleaños</h1>
        </div>

        {err && (
          <div className="rounded-md border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-950/30 p-4 text-red-800 dark:text-red-200">
            Error: {err}
          </div>
        )}

        {/* Packs Management - Responsive */}
        <div className="rounded border border-slate-200 dark:border-slate-700 p-4 sm:p-6 bg-white dark:bg-slate-800 space-y-4 shadow-sm transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="font-semibold text-lg text-slate-900 dark:text-white">Packs de cumpleaños</div>
            <button
              onClick={async()=>{
                // refrescar packs explicitamente
                const list = await fetch('/api/admin/birthdays/packs').then(r=>r.json()).catch(()=>null);
                if (list?.packs) setPacks(list.packs);
              }}
              className="btn btn-secondary w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 transition-colors duration-200"
            >
              Refrescar
            </button>
          </div>

          {packs.length===0 && (
            <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-4 rounded-md border border-amber-200 dark:border-amber-700">
              No hay packs. Usa "Recrear packs por defecto" abajo.
            </div>
          )}

          {/* Grid responsive para packs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {packs.map(p => {
              const isEditing = editingPack === p.id;
              const edit = packEdits[p.id];
              return (
                <div key={p.id} className={`rounded-lg border-2 ${p.isCustom ? 'border-fuchsia-400 dark:border-fuchsia-600' : 'border-slate-300 dark:border-slate-600'} p-4 bg-slate-50 dark:bg-slate-800/60 flex flex-col gap-3 transition-all duration-200 hover:shadow-md`}>
                  {!isEditing && (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-base text-slate-900 dark:text-white flex-1 min-w-0">
                          {p.name}
                        </div>
                        {p.isCustom && (
                          <span className="text-xs px-2 py-1 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/40 text-fuchsia-600 dark:text-fuchsia-300 font-medium flex-shrink-0">
                            Custom
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <span className="text-blue-600 dark:text-blue-400">👥</span>
                          <span>Invitados (QRs): <span className="font-medium text-slate-900 dark:text-white">{p.qrCount}</span></span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <span className="text-green-600 dark:text-green-400">💰</span>
                          <span>Precio: <span className="font-medium text-slate-900 dark:text-white">{p.priceSoles ? `S/ ${p.priceSoles}` : 'Gratis'}</span></span>
                        </div>

                        {p.bottle && (
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <span className="text-purple-600 dark:text-purple-400">🍾</span>
                            <span>Botella: <span className="font-medium text-slate-900 dark:text-white">{p.bottle}</span></span>
                          </div>
                        )}
                      </div>

                      {p.perks && p.perks.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wide">Beneficios</div>
                          <ul className="text-xs list-disc ml-4 space-y-0.5 text-slate-600 dark:text-slate-400">
                            {p.perks.map(per => <li key={per} className="leading-relaxed">{per}</li>)}
                          </ul>
                        </div>
                      )}

                      <button
                        onClick={()=>startEdit(p.id)}
                        className="w-full mt-2 btn btn-primary px-4 py-2 text-sm font-medium rounded-md bg-blue-600 hover:bg-blue-700 text-white border border-transparent focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                      >
                        Editar Pack
                      </button>
                    </>
                  )}

                  {isEditing && edit && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium mb-1 text-slate-700 dark:text-slate-300">
                          Nombre del Pack
                        </label>
                        <input
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-sm"
                          value={edit.name}
                          onChange={e=>{ if(p.isCustom) return; setPackEdits(prev=>({...prev,[p.id]:{...prev[p.id], name:e.target.value}})); }}
                          placeholder="Nombre"
                          disabled={p.isCustom}
                          title={p.isCustom ? 'Nombre bloqueado para el placeholder Custom' : 'Nombre del pack'}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1 text-slate-700 dark:text-slate-300">
                          Número de Invitados
                        </label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-sm"
                          value={edit.qrCount}
                          onChange={e=>setPackEdits(prev=>({...prev,[p.id]:{...prev[p.id], qrCount: parseInt(e.target.value)||0}}))}
                          placeholder="Invitados"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1 text-slate-700 dark:text-slate-300">
                          Botella de Cortesía
                        </label>
                        <input
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-sm"
                          value={edit.bottle}
                          onChange={e=>setPackEdits(prev=>({...prev,[p.id]:{...prev[p.id], bottle:e.target.value}}))}
                          placeholder="Botella cortesía"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1 text-slate-700 dark:text-slate-300">
                          Beneficios (uno por línea)
                        </label>
                        <textarea
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-sm resize-none"
                          rows={4}
                          value={edit.perksText}
                          onChange={e=>setPackEdits(prev=>({...prev,[p.id]:{...prev[p.id], perksText:e.target.value}}))}
                          placeholder="Beneficios, uno por línea"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={edit.hasPrice}
                            onChange={e=>setPackEdits(prev=>({...prev,[p.id]:{...prev[p.id], hasPrice:e.target.checked, priceSoles: e.target.checked ? prev[p.id].priceSoles : 0}}))}
                            className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-slate-700 dark:text-slate-300 font-medium">Habilitar precio</span>
                        </label>

                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-sm"
                          value={edit.priceSoles}
                          onChange={e=>setPackEdits(prev=>({...prev,[p.id]:{...prev[p.id], priceSoles: Math.max(0, parseInt(e.target.value)||0)}}))}
                          placeholder="Precio (S/)"
                          disabled={!edit.hasPrice}
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        <button
                          onClick={()=>savePack(p.id)}
                          className="flex-1 btn btn-primary px-4 py-2 text-sm font-medium rounded-md bg-emerald-600 hover:bg-emerald-700 text-white border border-transparent focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors duration-200"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex-1 sm:flex-none btn btn-secondary px-4 py-2 text-sm font-medium rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 transition-colors duration-200"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Restore packs section - Responsive */}
        <div className="rounded border border-slate-200 dark:border-slate-700 p-4 sm:p-6 bg-white dark:bg-slate-800 space-y-4 shadow-sm transition-colors">
          <div className="font-semibold text-lg text-slate-900 dark:text-white">Restaurar packs por defecto</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Si has eliminado packs importantes o quieres resetear a la configuración original, usa este botón.
          </div>
          <button
            onClick={restorePacks}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 rounded-md bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm border border-transparent focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors duration-200"
          >
            {loading ? 'Restaurando...' : 'Recrear packs por defecto'}
          </button>
        </div>
      </div>
    </div>
  );
}
