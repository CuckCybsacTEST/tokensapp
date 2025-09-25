"use client";

import React, { useRef, useState } from "react";

type Props = {
  nextAction: "IN" | "OUT";
};

export default function MarkAttendanceCard({ nextAction }: Props) {
  const [holdMs, setHoldMs] = useState(0);
  const [loading] = useState(false);
  const [msg] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const goToScanner = () => {
    window.location.href = '/u/scanner?from=home';
  };

  const startHoldIfOut = () => {
  if (nextAction !== 'OUT') { goToScanner(); return; }
    if (loading) return;
    setHoldMs(0);
    const start = Date.now();
    const id = window.setInterval(() => {
      const ms = Date.now() - start;
      setHoldMs(ms);
      if (ms >= 2000) {
        window.clearInterval(id);
        timerRef.current = null;
        setHoldMs(0);
        goToScanner();
      }
    }, 50);
    timerRef.current = id as unknown as number;
  };
  const clearHold = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setHoldMs(0);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">Marcar asistencia</div>
      <p className="text-sm text-gray-600 dark:text-slate-300">
        {nextAction === 'IN' ? 'Comienza tu turno registrando tu Entrada.' : 'Finaliza tu turno registrando tu Salida.'}
      </p>
      {msg && (
        <div className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{msg}</div>
      )}
      <div className="mt-4">
        <button
          className="btn relative"
          disabled={loading}
          onPointerDown={startHoldIfOut}
          onPointerUp={clearHold}
          onPointerLeave={clearHold}
          onPointerCancel={clearHold}
        >
          {loading ? 'Enviando…' : (nextAction === 'IN' ? 'Registrar entrada' : (holdMs > 0 ? `Mantén presionado… ${Math.ceil(Math.max(0, 2000 - holdMs)/1000)}s` : 'Registrar salida'))}
          {nextAction === 'OUT' && holdMs > 0 && (
            <span className="absolute inset-x-0 bottom-0 h-1 rounded-b bg-orange-500" style={{ width: `${Math.min(100, (holdMs/2000)*100)}%` }} />
          )}
        </button>
      </div>
      {nextAction === 'OUT' && (
        <div className="mt-2 text-xs text-slate-500">Mantén presionado 2s para confirmar la salida.</div>
      )}
    </div>
  );
}
