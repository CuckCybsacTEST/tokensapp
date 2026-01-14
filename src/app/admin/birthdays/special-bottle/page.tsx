"use client";

import { useEffect, useState } from "react";

export default function SpecialBottlePage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [config, setConfig] = useState<{
    id: number;
    wednesdaySpecialBottle: string | null;
    updatedAt: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    wednesdaySpecialBottle: '',
  });

  // Cargar configuración
  useEffect(()=>{ (async()=>{ try { const res=await fetch('/api/admin/system/config'); const j=await res.json().catch(()=>({})); if(res.ok && j?.config) { setConfig(j.config); setFormData({ wednesdaySpecialBottle: j.config.wednesdaySpecialBottle || '' }); } } catch{} })(); }, []);

  async function saveConfig() {
    try {
      setSaving(true);
      setErr(null);

      const body = {
        wednesdaySpecialBottle: formData.wednesdaySpecialBottle.trim() || null,
      };

      const res = await fetch('/api/admin/system/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const j = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(j?.code || j?.message || res.status);

      if (j?.config) {
        setConfig(j.config);
        setFormData({
          wednesdaySpecialBottle: j.config.wednesdaySpecialBottle || ''
        });
      }
    } catch(e:any){
      setErr(String(e?.message||e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Botella Especial de Miércoles</h1>
        </div>

        {err && (
          <div className="rounded-md border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-950/30 p-4 text-red-800 dark:text-red-200">
            Error: {err}
          </div>
        )}

        {/* Wednesday Special Bottle */}
        <div className="rounded border border-slate-200 dark:border-slate-700 p-4 sm:p-6 bg-white dark:bg-slate-800 space-y-6 shadow-sm transition-colors">
          <div className="font-semibold text-lg text-slate-900 dark:text-white">Configuración de Botella Especial</div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                Botella especial de miércoles
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                placeholder="Ej: OLD TIMES GOLD"
                value={formData.wednesdaySpecialBottle}
                onChange={e=>setFormData(prev=>({...prev, wednesdaySpecialBottle:e.target.value}))}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Botella que se regala automáticamente los miércoles en packs gratuitos.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                <strong>Condiciones:</strong> Miércoles + pack gratis (S/ 0).
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}