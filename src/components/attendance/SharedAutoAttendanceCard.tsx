"use client";
import React, { useCallback, useEffect, useState } from "react";
import SharedMarkAttendanceCard from "./SharedMarkAttendanceCard";

interface Props {
  initialLastType?: "IN" | "OUT" | null;
  showDynamicTitle?: boolean;
  /** Path prefix — '/u' or '/admin' */
  basePath?: string;
}

export default function SharedAutoAttendanceCard({
  initialLastType = null,
  showDynamicTitle = false,
  basePath = "/u",
}: Props) {
  const [lastType, setLastType] = useState<"IN" | "OUT" | null>(
    initialLastType,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const dayClosed = completed || lastType === "OUT";
  const nextAction: "IN" | "OUT" = lastType === "IN" ? "OUT" : "IN";

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/attendance/me/recent", {
        cache: "no-store",
      });
      if (r.status === 401) return;
      const j = await r.json().catch(() => null);
      const last = j?.recent;
      if (j?.completed != null) setCompleted(!!j.completed);
      else setCompleted(last?.type === "OUT");
      if (last && (last.type === "IN" || last.type === "OUT"))
        setLastType(last.type);
      else setLastType(null);
    } catch {
      setError("No se pudo actualizar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (dayClosed) {
    return (
      <div className="relative">
        {showDynamicTitle && (
          <div className="mb-3 text-center">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Jornada Completada
            </h3>
          </div>
        )}
        <div className="relative rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
            Jornada completada
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Ya registraste tu Entrada y tu Salida de hoy. Podrás volver a
            registrar una nueva entrada cuando inicie el siguiente business day.
          </p>
          <div className="mt-4 flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
            <button
              onClick={refresh}
              disabled={loading}
              className="px-2 py-0.5 rounded border border-slate-300/60 dark:border-slate-600 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              {loading ? "Actualizando…" : "Actualizar"}
            </button>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              ✔ Día cerrado
            </span>
            {error && <span className="text-red-500">{error}</span>}
          </div>
          <div className="mt-4 text-xs text-slate-400 dark:text-slate-500">
            Si necesitas corregir una marca contacta a un supervisor.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {showDynamicTitle && (
        <div className="mb-3 text-center">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {nextAction === "IN" ? "Marcar Entrada" : "Marcar Salida"}
          </h3>
        </div>
      )}
      <SharedMarkAttendanceCard nextAction={nextAction} basePath={basePath} />
    </div>
  );
}
