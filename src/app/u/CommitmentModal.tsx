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
          <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-slate-100">Compromiso El Lounge</h2>
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 mb-3">
            Bienvenid@ a <span className="font-semibold">El Lounge</span>. Nuestro éxito depende de un equipo disciplinado, proactivo y alineado con la tecnología que usamos. Esta plataforma no es solo una herramienta operativa: es el sistema que nos permite <strong>medir desempeño, reconocer logros y también detectar incumplimientos</strong>. Al aceptar, confirmas que tu rol es clave para la experiencia de nuestros clientes y para el crecimiento conjunto.
          </p>
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 mb-4">
            Tu trabajo aquí tiene impacto real. La información que registres alimenta decisiones: asignación de turnos, incentivos, oportunidades de mejora y, cuando sea necesario, acciones correctivas. Usar bien esta herramienta es parte de tu responsabilidad profesional.
          </p>
          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 mb-5 list-disc pl-5">
            <li>Registrar asistencia y actividades a tiempo y con exactitud.</li>
            <li>Completar tareas y métricas diarias con honestidad (sin datos ficticios).</li>
            <li>Ser proactiv@ ante bloqueos: comunicar antes de frenar procesos.</li>
            <li>Adoptar la tecnología: mantener datos al día y usar el sistema como fuente única.</li>
            <li>Proteger accesos y no compartir credenciales ni capturas sensibles.</li>
            <li>Tratar a todos con respeto, enfoque en servicio y mentalidad de mejora continua.</li>
            <li>Aportar ideas que optimicen operación, control y experiencia del cliente.</li>
          </ul>
          <div className="text-xs rounded bg-indigo-500/10 border border-indigo-500/30 px-3 py-2 text-indigo-300 mb-4">
            Este sistema evaluará tu constancia y resultados. El buen desempeño será visible y premiado; los desvíos se corregirán con retroalimentación y, si persisten, acciones formales. Crecemos si todos cumplimos.
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
            Versión del compromiso: v{requiredVersion}. Puede actualizarse según evolucionen nuestros estándares operativos.
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