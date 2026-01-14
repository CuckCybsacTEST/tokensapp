"use client";

import { useEffect, useState } from "react";

export function SystemConfigPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [config, setConfig] = useState<{
    id: number;
    tokensEnabled: boolean;
    wednesdaySpecialBottle: string | null;
    updatedAt: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    tokensEnabled: true,
    wednesdaySpecialBottle: '',
  });

  // Cargar configuración
  useEffect(()=>{ (async()=>{ try { const res=await fetch('/api/admin/system/config'); const j=await res.json().catch(()=>({})); if(res.ok && j?.config) { setConfig(j.config); setFormData({ tokensEnabled: j.config.tokensEnabled, wednesdaySpecialBottle: j.config.wednesdaySpecialBottle || '' }); } } catch{} })(); }, []);

  async function saveConfig() {
    try {
      setSaving(true);
      setErr(null);

      const body = {
        tokensEnabled: formData.tokensEnabled,
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
          tokensEnabled: j.config.tokensEnabled,
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Configuración del Sistema</h1>
        </div>

        {err && (
          <div className="rounded-md border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-950/30 p-4 text-red-800 dark:text-red-200">
            Error: {err}
          </div>
        )}

        {/* System Configuration */}
        <div className="rounded border border-slate-200 dark:border-slate-700 p-4 sm:p-6 bg-white dark:bg-slate-800 space-y-6 shadow-sm transition-colors">
          <div className="font-semibold text-lg text-slate-900 dark:text-white">Configuración General</div>

          {/* Tokens Enabled */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formData.tokensEnabled}
                onChange={e=>setFormData(prev=>({...prev, tokensEnabled:e.target.checked}))}
                className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-700 dark:text-slate-300 font-medium">Sistema de tokens habilitado</span>
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 ml-6">
              Activa o desactiva el sistema de tokens en toda la aplicación
            </p>
          </div>

          {/* Wednesday Special Bottle */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                Botella especial de miércoles
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                value={formData.wednesdaySpecialBottle}
                onChange={e=>setFormData(prev=>({...prev, wednesdaySpecialBottle:e.target.value}))}
                placeholder="Ej: OLD TIMES GOLD"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Botella especial que se regala automáticamente los miércoles en packs gratuitos.
                Deja vacío para usar la botella normal del pack.
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="px-6 py-3 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm border border-transparent focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
            >
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="rounded border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 p-4 sm:p-6 shadow-sm transition-colors">
          <div className="font-semibold text-lg text-blue-900 dark:text-blue-100 mb-2">ℹ️ Información</div>
          <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <p>
              <strong>Botella especial de miércoles:</strong> Se aplica automáticamente cuando:
            </p>
            <ul className="list-disc ml-5 space-y-1">
              <li>La reserva es para un miércoles</li>
              <li>El pack seleccionado es gratuito (S/ 0.00)</li>
              <li>Hay una botella especial configurada arriba</li>
            </ul>
            <p>
              Los usuarios verán la botella especial en su confirmación de reserva.
            </p>
          </div>
        </div>

        {/* Last Updated */}
        {config && (
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
            Última actualización: {new Date(config.updatedAt).toLocaleString('es-ES')}
          </div>
        )}
      </div>
    </div>
  );
}