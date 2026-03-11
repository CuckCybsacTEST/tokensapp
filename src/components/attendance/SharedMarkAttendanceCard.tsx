"use client";

import React, { useRef, useState } from "react";
import { IconClock } from "@tabler/icons-react";

type Props = {
  nextAction: "IN" | "OUT";
  /** Path prefix for scanner URL — '/u' or '/admin' */
  basePath?: string;
};

export default function SharedMarkAttendanceCard({
  nextAction,
  basePath = "/u",
}: Props) {
  const [holdMs, setHoldMs] = useState(0);
  const [loading] = useState(false);
  const [msg] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const longPressRef = useRef(false);
  const intentionalInteractionRef = useRef(false);

  const goToScanner = () => {
    window.location.href =
      nextAction === "OUT"
        ? `${basePath}/assistance?expected=OUT`
        : `${basePath}/assistance`;
  };

  function onPointerDown(e: React.PointerEvent) {
    if (loading) return;
    intentionalInteractionRef.current = true;
    longPressRef.current = false;
    if (nextAction === "OUT") {
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
          goToScanner();
        }
      }, 50);
      timerRef.current = id as unknown as number;
    }
  }

  function endPress(e: React.PointerEvent) {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    longPressRef.current = false;
    setHoldMs(0);

    if (intentionalInteractionRef.current) {
      if (nextAction === "IN" && e.type === "pointerup") {
        goToScanner();
      }
    }
    intentionalInteractionRef.current = false;
  }

  return (
    <div className="rounded-lg border border-green-200 bg-white p-5 shadow-sm dark:border-green-800/60 dark:bg-slate-800">
      <div className="flex items-center gap-3 mb-2">
        <IconClock className="w-6 h-6 text-green-600 dark:text-green-400" />
        <div className="text-lg font-medium text-gray-900 dark:text-slate-100">
          {nextAction === "IN" ? "Marcar entrada" : "Marcar salida"}
        </div>
      </div>
      <p className="text-sm text-gray-600 dark:text-slate-300">
        {nextAction === "IN"
          ? "Comienza tu turno registrando tu Entrada."
          : "Finaliza tu turno registrando tu Salida."}
      </p>
      {msg && (
        <div className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {msg}
        </div>
      )}
      <div className="mt-4">
        <button
          type="button"
          className={`btn relative select-none overflow-hidden ${
            nextAction === "OUT"
              ? "bg-red-500 hover:bg-red-600 text-white border-red-500 dark:bg-red-600 dark:hover:bg-red-700 dark:border-red-600"
              : ""
          }`}
          disabled={loading}
          onPointerDown={onPointerDown}
          onPointerUp={endPress}
          onPointerLeave={endPress}
          onPointerCancel={endPress}
        >
          {loading ? (
            "Enviando…"
          ) : nextAction === "IN" ? (
            "Registrar entrada (QR)"
          ) : (
            <>
              <span className="invisible block">
                Mantén 2s para registrar salida (QR)
              </span>
              <span className="absolute inset-0 flex items-center justify-center px-2">
                {holdMs > 0
                  ? `Mantén ${Math.ceil(Math.max(0, 2000 - holdMs) / 1000)}s…`
                  : "Mantén 2s para registrar salida (QR)"}
              </span>
            </>
          )}
          {nextAction === "OUT" && holdMs > 0 && (
            <span
              className="absolute left-0 bottom-0 h-1 bg-white/80 transition-[width] duration-75 ease-linear"
              style={{
                width: `${Math.min(100, (holdMs / 2000) * 100)}%`,
              }}
            />
          )}
        </button>
      </div>
    </div>
  );
}
