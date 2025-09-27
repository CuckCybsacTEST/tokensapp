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
  const longPressRef = useRef(false);

  const goToManual = () => { window.location.href = '/u/manual'; };
  const goToScanner = () => { window.location.href = nextAction === 'OUT' ? '/u/assistance?expected=OUT' : '/u/assistance'; };

  function onPointerDown(e: React.PointerEvent) {
    if (loading) return;
    longPressRef.current = false;
    if (nextAction === 'OUT') {
      setHoldMs(0);
      const start = Date.now();
      const id = window.setInterval(() => {
        const ms = Date.now() - start;
        setHoldMs(ms);
        if (ms >= 2000) {
          window.clearInterval(id);
          timerRef.current = null;
          longPressRef.current = true;
          setHoldMs(0);
          goToManual(); // activa modo manual sólo tras mantener 2s
        }
      }, 50);
      timerRef.current = id as unknown as number;
    }
  }
  function endPress() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    const wasLong = longPressRef.current;
    longPressRef.current = false;
    const ms = holdMs; // snapshot
    setHoldMs(0);
    if (nextAction === 'OUT') {
      // Si no llegó a long-press => navegación a escáner QR (método predeterminado)
      if (!wasLong && ms < 2000) goToScanner();
    } else {
      goToScanner();
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
  <div className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">Marcar mi asistencia</div>
      <p className="text-sm text-gray-600 dark:text-slate-300">
        {nextAction === 'IN' ? 'Comienza tu turno registrando tu Entrada.' : 'Finaliza tu turno registrando tu Salida.'}
      </p>
      {msg && (
        <div className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{msg}</div>
      )}
      <div className="mt-4">
        <button
          type="button"
          className="btn relative select-none"
          disabled={loading}
          onPointerDown={onPointerDown}
          onPointerUp={endPress}
          onPointerLeave={endPress}
          onPointerCancel={endPress}
        >
          {loading ? 'Enviando…' : (
            nextAction === 'IN'
              ? 'Registrar entrada (QR)'
              : holdMs > 0
                ? `Mantén para modo manual… ${Math.ceil(Math.max(0, 2000 - holdMs)/1000)}s`
                : 'Registrar salida (QR)'
          )}
          {nextAction === 'OUT' && holdMs > 0 && (
            <span className="absolute left-0 bottom-0 h-1 bg-orange-500 rounded-b" style={{ width: `${Math.min(100, (holdMs/2000)*100)}%` }} />
          )}
        </button>
      </div>
      {nextAction === 'OUT' && (
        <div className="mt-2 text-xs text-slate-500">Pulsa para salida con QR. Mantén 2s para modo manual.</div>
      )}
    </div>
  );
}
