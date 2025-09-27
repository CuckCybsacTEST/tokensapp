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
  // Mostrar solo en el PRIMER login (cuando el usuario nunca aceptó nada).
  // Ignoramos versiones futuras: si initialAcceptedVersion > 0 ya no vuelve a salir.
  const needs = (initialAcceptedVersion || 0) <= 0;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg max-h-[92dvh] sm:max-h-[90dvh] rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl flex flex-col relative"
      >
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-5 pb-5 custom-scroll">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 text-slate-900 dark:text-slate-100">Compromiso El Lounge</h2>
          <p className="text-[13px] sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300 mb-3">
            Bienvenid@ a <span className="font-semibold">El Lounge</span>. Nuestro éxito depende de un equipo disciplinado, proactivo y alineado con la tecnología que usamos. Esta plataforma no es solo una herramienta operativa: es el sistema que nos permite <strong>medir desempeño, reconocer logros y detectar incumplimientos</strong>. Al aceptar confirmas que tu rol es clave para la experiencia de clientes y para el crecimiento conjunto.
          </p>
          <p className="text-[13px] sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300 mb-4">
            La información que registres alimenta decisiones: turnos, incentivos, oportunidades de mejora y, cuando sea necesario, acciones correctivas. Usar bien esta herramienta es parte de tu responsabilidad profesional.
          </p>
          <ul className="text-[12px] sm:text-xs text-slate-600 dark:text-slate-400 space-y-1.5 mb-5 list-disc pl-5">
            <li>Registrar asistencia y actividades con exactitud y a tiempo.</li>
            <li>Completar tareas y métricas sin inventar datos.</li>
            <li>Ser proactiv@ ante bloqueos: comunicar antes de frenar procesos.</li>
            <li>Mantener datos al día: el sistema es la fuente única.</li>
            <li>Proteger accesos; no compartir credenciales ni capturas sensibles.</li>
            <li>Trato respetuoso, enfoque en servicio y mejora continua.</li>
            <li>Aportar ideas que optimicen operación y experiencia.</li>
          </ul>
          <div className="text-[11px] sm:text-xs rounded bg-indigo-500/10 border border-indigo-500/30 px-3 py-2 text-indigo-500 dark:text-indigo-300 mb-4">
            Evaluaremos constancia y resultados. El buen desempeño se reconocerá; los desvíos se corrigen y, si persisten, escalan formalmente. Crecemos si todos cumplimos.
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mb-2">
            Versión del compromiso: v{requiredVersion}. Puede actualizarse conforme evolucionen los estándares.
          </div>
          {error && <div className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-[11px] text-red-700">{error}</div>}
        </div>
        <div className="px-4 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex flex-col items-center gap-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-slate-900/70">
          <button
            disabled={loading}
            onClick={accept}
            className="btn w-full sm:max-w-xs px-6 py-2 text-center justify-center font-medium tracking-wide"
          >
            {loading ? 'Guardando…' : 'Acepto el compromiso'}
          </button>
          <button
            disabled={loading}
            onClick={()=>setOpen(false)}
            className="btn-outline w-full sm:max-w-xs px-6 py-2 text-xs text-center justify-center"
          >
            Cerrar (ver luego)
          </button>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
      </div>
    </div>
  );
}