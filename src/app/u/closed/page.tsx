"use client";
export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import "../../globals.css";

function localYMD(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function ClosedPageInner() {
  const params = useSearchParams();
  const day = params.get("day") || localYMD();
  const scanId = params.get("scanId") || "";
  const undoMs = 0; // Set undoMs to 0 to remove undo functionality
  const time = useMemo(() => new Date().toLocaleTimeString(), []);
  const [leftMs, setLeftMs] = useState<number>(undoMs);
  const ticking = useRef<number | null>(null);

  useEffect(() => {
    if (!undoMs) return;
    const end = Date.now() + undoMs;
    const id = window.setInterval(() => {
      const remain = Math.max(0, end - Date.now());
      setLeftMs(remain);
      if (remain <= 0) window.clearInterval(id);
    }, 250);
    ticking.current = id;
    return () => { if (ticking.current) window.clearInterval(ticking.current); };
  }, [undoMs]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-green-800 shadow-sm dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-100">
          <h1 className="mb-2 text-2xl font-semibold">¡Tu salida fue registrada!</h1>
          <p className="text-sm opacity-90">Turno cerrado correctamente.</p>
          <p className="mt-2 text-sm opacity-90">Fecha: <span className="font-mono">{day}</span> · Hora: <span className="font-mono">{time}</span></p>
          {/* Undo UI removed: keeping the confirmation simple without undo option */}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <a href={`/u/checklist?day=${day}`} className="btn">VER LISTA DE TAREAS DE LA JORNADA</a>
          <button
            className="btn-outline"
            onClick={async () => {
              try {
                await fetch('/api/user/auth/logout', { method: 'POST' });
              } finally {
                window.location.href = '/u/login';
              }
            }}
          >Cerrar sesión</button>
        </div>
      </div>
    </div>
  );
}

export default function ClosedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-6">Cargando…</div>}>
      <ClosedPageInner />
    </Suspense>
  );
}
