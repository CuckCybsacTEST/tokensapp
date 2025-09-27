"use client";
import React, { useEffect, useState } from 'react';

interface Props {
  userId: string;
  initialAcceptedVersion: number;
  requiredVersion: number;
}

export default function CommitmentModal({ userId, initialAcceptedVersion, requiredVersion }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needs = initialAcceptedVersion < requiredVersion;

  useEffect(() => { if (needs) setOpen(true); }, [needs]);

  async function accept() {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/user/commitment/accept', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ version: requiredVersion }) });
      const j = await res.json().catch(()=>({}));
      if (!res.ok || !j?.ok) throw new Error(j?.code || 'ERROR');
      setOpen(false);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally { setLoading(false); }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl relative overflow-hidden">
        <div className="px-6 pt-5 pb-4">
          <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-slate-100">Compromiso de Responsabilidad</h2>
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 mb-4">
            Este es un recordatorio amistoso pero serio de nuestro estándar interno: cuidar la experiencia del equipo y de los clientes, cumplir tareas asignadas con disciplina, comunicar bloqueos a tiempo y proteger la información interna. Al aceptar confirmas que entiendes tu rol y te comprometes a actuar con criterio, respeto y foco en resultados.
          </p>
          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 mb-5 list-disc pl-5">
            <li>Registrar tu asistencia puntualmente.</li>
            <li>Completar tus tareas y métricas diarias con honestidad.</li>
            <li>Reportar incidencias o riesgos sin demoras.</li>
            <li>Cuidar los accesos y no compartir credenciales.</li>
            <li>Mantener una actitud profesional y colaborativa.</li>
          </ul>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
            Versión del compromiso: v{requiredVersion}. Podrá actualizarse si evolucionan las operaciones.
          </div>
          {error && <div className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
          <div className="flex items-center gap-3">
            <button disabled={loading} onClick={accept} className="btn !px-5 !py-2">{loading ? 'Guardando…' : 'Acepto el compromiso'}</button>
            <button disabled={loading} onClick={()=>setOpen(false)} className="btn-outline !px-5 !py-2 text-xs">Cerrar (ver luego)</button>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
      </div>
    </div>
  );
}