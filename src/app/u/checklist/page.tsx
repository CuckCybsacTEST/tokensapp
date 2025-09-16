export const dynamic = 'force-dynamic';
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import "../../globals.css";

type UserMe = { ok: true; user: { id: string; username: string; role: string; personCode: string; personName: string } } | { ok: false; code: string };
type TasksList = {
  tasks: {
    id: string;
    label: string;
    sortOrder: number;
    priority?: number;
    startDay?: string | null;
    endDay?: string | null;
    // measurement metadata
    measureEnabled?: boolean;
    targetValue?: number | null;
    unitLabel?: string | null;
  }[];
  statuses: {
    taskId: string;
    done: boolean;
    // for measurable tasks
    value?: number;
    updatedAt: string;
    updatedByUsername: string | null;
  }[];
};
type Recent = { scannedAt?: string; type?: "IN" | "OUT" } | null;

function isValidDay(day: string | null): day is string {
  if (!day) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const d = new Date(day + "T00:00:00Z");
  return !isNaN(d.getTime());
}

function ymdUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function ChecklistPage() {
  const router = useRouter();
  const params = useSearchParams();
  const day = params.get("day");
  const mode = params.get("mode"); // opcional
  const [recent, setRecent] = useState<Recent>(null);
  // Estado real del día actual según última marca de asistencia
  const [lastTodayType, setLastTodayType] = useState<"IN" | "OUT" | null>(null);

  const [user, setUser] = useState<UserMe | null>(null);
  const [data, setData] = useState<TasksList | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [adminSums, setAdminSums] = useState<Map<string, number>>(new Map());
  const [metaSavingIds, setMetaSavingIds] = useState<Set<string>>(new Set());

  // Local state of check statuses
  const initialMap = useMemo(() => {
    const m = new Map<string, boolean>();
    if (data) {
      for (const t of data.tasks) m.set(t.id, false);
      for (const st of data.statuses) m.set(st.taskId, !!st.done);
    }
    return m;
  }, [data]);
  const [checked, setChecked] = useState<Map<string, boolean>>(new Map());
  const [lastSavedChecked, setLastSavedChecked] = useState<Map<string, boolean>>(new Map());
  // Local numeric values for measurable tasks
  const initialVals = useMemo(() => {
    const m = new Map<string, number>();
    if (data) {
      for (const t of data.tasks) m.set(t.id, 0);
      for (const st of data.statuses) m.set(st.taskId, typeof (st as any).value === 'number' ? Math.max(0, Math.floor((st as any).value)) : 0);
    }
    return m;
  }, [data]);
  const [values, setValues] = useState<Map<string, number>>(new Map());
  const [lastSavedValues, setLastSavedValues] = useState<Map<string, number>>(new Map());
  const [hasLoaded, setHasLoaded] = useState(false);
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null);
  const [pendingLockedIds, setPendingLockedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setChecked(initialMap);
    setLastSavedChecked(new Map(initialMap));
    setValues(initialVals);
    setLastSavedValues(new Map(initialVals));
    // Quitar bloqueo permanente: solo se bloquea temporalmente durante el guardado
    setHasLoaded(true);
  }, [initialMap, initialVals]);

  async function fetchAll(signal?: AbortSignal) {
    setLoading(true);
    setError(null);
    try {
      // Current user
      const rUser = await fetch("/api/user/me", { cache: "no-store", signal });
      if (rUser.status === 401) {
        router.replace("/u/login");
        return;
      }
      const ju: UserMe = await rUser.json();
      if (!ju || ("ok" in ju && (ju as any).ok === false)) {
        throw new Error("No se pudo cargar el usuario");
      }
      setUser(ju);
      // Recent attendance to decide next action (IN/OUT)
      try {
        const rRecent = await fetch(`/api/attendance/me/recent`, { cache: "no-store", signal });
        const jRecent = await rRecent.json().catch(() => ({}));
        const rec = (jRecent?.recent ?? null) as Recent;
        setRecent(rec);
        if (rec?.scannedAt) {
          const lastDay = ymdUtc(new Date(rec.scannedAt));
          if (isValidDay(day) && lastDay === day) {
            const t = rec.type === 'IN' ? 'IN' : rec.type === 'OUT' ? 'OUT' : null;
            if (t) setLastTodayType(t);
          }
        }
      } catch {}
      // Tasks list
      const r = await fetch(`/api/tasks/list?day=${encodeURIComponent(day!)}`, { cache: "no-store", signal });
      if (!r.ok) throw new Error(`No se pudo cargar la checklist (HTTP ${r.status})`);
      const j: TasksList = await r.json();
      setData(j);
    } catch (e: any) {
      // Friendly error for network issues
      const msg = String(e?.message || e);
      // Silenciar aborts (cambios de navegación/cleanup) para evitar alerta roja confusa
      if (e?.name === 'AbortError' || /aborted/i.test(msg)) {
        return;
      }
      setError(msg.includes("fetch") || msg.includes("NetworkError")
        ? "No se pudo cargar la checklist. Revisa tu conexión e intenta nuevamente."
        : msg);
    } finally {
      setLoading(false);
    }
  }

  // Admin-only: fetch aggregated sums for today to show "Avance hoy"
  async function fetchAdminSumsForDay(signal?: AbortSignal) {
    try {
      if (!isValidDay(day)) return;
      const r = await fetch(`/api/admin/tasks?day=${encodeURIComponent(day!)}`, { cache: 'no-store', signal });
      if (!r.ok) return; // ignore silently if not admin
      const j = await r.json();
      const map = new Map<string, number>();
      const list = Array.isArray(j?.tasks) ? j.tasks : [];
      for (const t of list) {
        const id = String(t.id);
        const sum = Number(t.sumValueToday || 0);
        map.set(id, sum);
      }
      setAdminSums(map);
    } catch {}
  }

  useEffect(() => {
    if (!isValidDay(day)) {
      // Si falta el día o es inválido, enviar a la checklist de hoy
      const today = ymdUtc(new Date());
      router.replace(`/u/checklist?day=${today}`);
      return;
    }
    const ac = new AbortController();
    fetchAll(ac.signal);
    // best-effort: also fetch admin sums in parallel; if not admin, it will 401 and is ignored
    const ac2 = new AbortController();
    fetchAdminSumsForDay(ac2.signal);
    return () => ac.abort();
  }, [day, mode, router]);

  // On user or data change, try to refresh admin sums if admin is logged in
  useEffect(() => {
    const ok = (user as any)?.ok && (user as any).user?.role === 'ADMIN';
    if (!ok || !data) return;
    const ac = new AbortController();
    fetchAdminSumsForDay(ac.signal);
    return () => ac.abort();
  }, [user, data, day]);

  const setCheckedValue = (taskId: string, value: boolean) => {
    // Solo permitir edición si ya se registró ENTRADA para el día
    if (lastTodayType !== 'IN') return;
    setChecked(prev => {
      const m = new Map(prev);
      m.set(taskId, value);
      return m;
    });
    setPendingLockedIds(prev => new Set([...prev, taskId]));
  };

  // Helpers for measurable tasks
  const clampInt = (n: number) => Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
  const deriveDone = (taskId: string, v: number) => {
    const t = data?.tasks.find(tt => tt.id === taskId);
    if (!t || !t.measureEnabled) return false;
    const target = typeof t.targetValue === 'number' ? t.targetValue : null;
    if (target !== null) return v >= target;
    return v > 0;
  };
  const setValueForTask = (taskId: string, raw: number) => {
    if (lastTodayType !== 'IN') return;
    const v = clampInt(raw);
    setValues(prev => {
      const m = new Map(prev);
      m.set(taskId, v);
      return m;
    });
    // Keep checked map in sync for completed counter and UI
    const done = deriveDone(taskId, v);
    setChecked(prev => {
      const m = new Map(prev);
      m.set(taskId, done);
      return m;
    });
    setPendingLockedIds(prev => new Set([...prev, taskId]));
  };

  const onSave = async (opts?: { refresh?: boolean; silent?: boolean }) => {
    if (!isValidDay(day) || !data) return;
    try {
      setSaving(true);
      if (!opts?.silent) setSavedMsg(null);
      setError(null);
      const items = data.tasks.map(t => (
        t.measureEnabled
          ? { taskId: t.id, value: Number(values.get(t.id) ?? 0) }
          : { taskId: t.id, done: !!checked.get(t.id) }
      ));
      const prevSaved = new Map(lastSavedChecked);
      const prevSavedVals = new Map(lastSavedValues);
      const r = await fetch("/api/tasks/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ day, items }),
      });
      const txt = await r.text();
      if (!r.ok) throw new Error(txt || `Error ${r.status}`);
      if (!opts?.silent) setSavedMsg("Checklist guardada");
      setLastSavedChecked(new Map(checked));
      setLastSavedValues(new Map(values));
      // Identificar qué tareas cambiaron respecto del último guardado
      const changedIds: string[] = [];
      for (const t of data.tasks) {
        const before = !!prevSaved.get(t.id);
        const now = !!checked.get(t.id);
        const beforeVal = Number(prevSavedVals.get(t.id) ?? 0);
        const nowVal = Number(values.get(t.id) ?? 0);
        if (before !== now || beforeVal !== nowVal) changedIds.push(t.id);
      }
      // Liberar bloqueos temporales de ítems ya persistidos
      if (changedIds.length > 0) {
        setPendingLockedIds(prev => {
          const s = new Set(prev);
          for (const id of changedIds) s.delete(id);
          return s;
        });
      }
      // After save, refresh statuses
      if (opts?.refresh !== false) {
        const r2 = await fetch(`/api/tasks/list?day=${encodeURIComponent(day)}`, { cache: "no-store" });
        if (r2.ok) {
          const j2: TasksList = await r2.json();
          setData(j2);
        }
        // Refresh admin sums if possible
        fetchAdminSumsForDay().catch(() => {});
      }
      return true;
    } catch (e: any) {
      setError(String(e?.message || e));
      return false;
    } finally {
      setSaving(false);
      // auto-hide success after a moment
      if (!opts?.silent) setTimeout(() => setSavedMsg(null), 2000);
      // En cualquier caso, liberar bloqueos temporales si quedaron prendidos por error
      setPendingLockedIds(new Set());
    }
  };

  // Admin: persist meta changes
  const saveTaskMeta = async (taskId: string, patch: Partial<{ measureEnabled: boolean; targetValue: number | null; unitLabel: string | null }>) => {
    try {
      setMetaSavingIds(prev => new Set([...prev, taskId]));
      // Sanitize
      const body: any = {};
      if (patch.measureEnabled !== undefined) body.measureEnabled = !!patch.measureEnabled;
      if (patch.targetValue !== undefined) {
        if (patch.targetValue === null) body.targetValue = null;
        else {
          const n = Math.floor(Number(patch.targetValue));
          body.targetValue = n < 0 || !Number.isFinite(n) ? 0 : n;
        }
      }
      if (patch.unitLabel !== undefined) {
        const s = (patch.unitLabel ?? '').toString().trim().slice(0, 30);
        body.unitLabel = s.length === 0 ? null : s;
      }
      const r = await fetch(`/api/admin/tasks/${encodeURIComponent(taskId)}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(txt || `Error ${r.status}`);
      }
      const j = await r.json();
      const t = j?.task;
      if (t && data) {
        // Update local task metadata to reflect server state
        setData(prev => {
          if (!prev) return prev;
          const tasks = prev.tasks.map(x => x.id === taskId ? { ...x, measureEnabled: !!t.measureEnabled, targetValue: t.targetValue ?? null, unitLabel: t.unitLabel ?? null } : x);
          return { ...prev, tasks } as any;
        });
      }
      // refresh sums
      fetchAdminSumsForDay().catch(() => {});
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setMetaSavingIds(prev => { const s = new Set(prev); s.delete(taskId); return s; });
    }
  };

  // Ya no se requiere que todas las tareas estén marcadas para registrar salida

  const openScanner = async () => {
    if (!isValidDay(day)) return;
    // Guardar progreso solo cuando la próxima acción es SALIDA (ya hubo ENTRADA)
    if (data && nextAction === 'OUT') {
      const ok = await onSave();
      if (ok === false) return;
    }
    window.location.href = "/u/scanner?from=checklist";
  };

  // Autosave con debounce cuando cambian los estados
  function mapsEqual(a: Map<string, boolean>, b: Map<string, boolean>) {
    if (a.size !== b.size) return false;
    for (const [k, v] of a) { if (b.get(k) !== v) return false; }
    return true;
  }

  useEffect(() => {
    if (!hasLoaded || !data) return;
    // No autosave si aún no se registró ENTRADA
    if (lastTodayType !== 'IN') return;
    const valuesEqual = (() => {
      if (values.size !== lastSavedValues.size) return false;
      for (const [k, v] of values) { if ((lastSavedValues.get(k) ?? 0) !== v) return false; }
      return true;
    })();
    if (mapsEqual(checked, lastSavedChecked) && valuesEqual) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      onSave({ refresh: false, silent: true });
    }, 800);
    return () => { if (autosaveTimer.current) { clearTimeout(autosaveTimer.current); autosaveTimer.current = null; } };
  }, [checked, hasLoaded, data, lastTodayType, values, lastSavedValues]);

  if (!isValidDay(day)) return null;

  const nextAction: "IN" | "OUT" = mode === 'IN' ? 'OUT' : mode === 'OUT' ? 'IN' : (lastTodayType === 'IN' ? 'OUT' : 'IN');
  const nextActionLabel = nextAction === 'IN' ? 'Registrar entrada' : 'Registrar salida';
  const lockedAfterOut = lastTodayType === 'OUT';
  const canEdit = lastTodayType === 'IN';

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Checklist</h1>
            <p className="text-sm text-gray-600">Día: <span className="font-mono">{day}</span></p>
            <p className="text-sm text-gray-600">Próxima acción: <span className="font-medium">{nextActionLabel}</span></p>
            {data && (
              <p className="text-xs text-gray-500">Completadas {Array.from(checked.values()).filter(Boolean).length} / {data.tasks.length}</p>
            )}
            {user && (user as any).ok && (
              <p className="text-sm text-gray-600">Usuario: {(user as any).user.personName} ({(user as any).user.personCode})</p>
            )}
          </div>
          {/* Removed header "Abrir escáner" to give more hierarchy to the primary action at the bottom */}
        </div>

        {/* Notices */}
        {/* Editable durante todo el día */}
        {error && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            <span>{error}</span>
            <button onClick={() => fetchAll()} disabled={loading} className="rounded-md border border-red-300 bg-white px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50">Reintentar</button>
          </div>
        )}
        {/* Ya no es obligatorio completar todas las tareas para registrar salida */}
        {savedMsg && (
          <div className="mb-4 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">{savedMsg}</div>
        )}
        {lockedAfterOut && (
          <div className="mb-4 rounded-md border border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-700">Checklist bloqueada tras registrar salida. No se puede editar.</div>
        )}
        {!lockedAfterOut && !canEdit && (
          <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Para editar la checklist debes registrar tu entrada primero. Usa el botón "Registrar entrada".
          </div>
        )}

        {/* Content */}
        {loading && (
          <ul className="animate-pulse space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="h-12 rounded-md bg-gray-200" />
            ))}
          </ul>
        )}
        {!loading && data && data.tasks.length === 0 && (
          <div className="text-sm text-gray-500">No hay tareas configuradas.</div>
        )}
        {!loading && data && data.tasks.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {data.tasks.map((t) => {
                const done = !!checked.get(t.id);
                const st = data.statuses.find(s => s.taskId === t.id);
                const prio = typeof t.priority === 'number' ? t.priority : 0;
                const prioColor = prio >= 2 ? 'bg-red-600' : prio === 1 ? 'bg-amber-500' : 'bg-emerald-600';
                const measurable = !!t.measureEnabled;
                const currentVal = Number(values.get(t.id) ?? (st as any)?.value ?? 0);
                const isAdmin = (user as any)?.ok && (user as any).user?.role === 'ADMIN';
                const adminSum = adminSums.get(t.id) ?? 0;
                return (
                  <div key={t.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={"inline-block h-2 w-2 rounded-full " + prioColor} />
                        <div className="font-medium text-slate-900 dark:text-slate-100">{t.label}</div>
                      </div>
                      {!measurable ? (
                        <div className="text-xs">
                          <label className="inline-flex items-center gap-1 mr-2">
                            <input type="radio" name={`st-${t.id}`} checked={!done} onChange={() => setCheckedValue(t.id, false)} disabled={saving || !canEdit || lockedAfterOut || pendingLockedIds.has(t.id)} />
                            <span>Pendiente</span>
                          </label>
                          <label className="inline-flex items-center gap-1">
                            <input type="radio" name={`st-${t.id}`} checked={done} onChange={() => setCheckedValue(t.id, true)} disabled={saving || !canEdit || lockedAfterOut || pendingLockedIds.has(t.id)} />
                            <span>Completada</span>
                          </label>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded border border-slate-300 px-2 py-1 text-sm disabled:opacity-50"
                            onClick={() => setValueForTask(t.id, currentVal - 1)}
                            disabled={saving || !canEdit || lockedAfterOut || pendingLockedIds.has(t.id) || currentVal <= 0}
                            aria-label="Decrementar"
                          >−</button>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            step={1}
                            value={Number.isFinite(currentVal) ? currentVal : 0}
                            onChange={(e) => setValueForTask(t.id, Number(e.target.value))}
                            disabled={saving || !canEdit || lockedAfterOut || pendingLockedIds.has(t.id)}
                            className="w-16 rounded border border-slate-300 bg-white px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50 text-slate-900 placeholder-slate-400 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder-slate-400"
                          />
                          <button
                            type="button"
                            className="rounded border border-slate-300 px-2 py-1 text-sm disabled:opacity-50"
                            onClick={() => setValueForTask(t.id, currentVal + 1)}
                            disabled={saving || !canEdit || lockedAfterOut || pendingLockedIds.has(t.id)}
                            aria-label="Incrementar"
                          >+</button>
                        </div>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="mb-1 mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                        <label className="inline-flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={!!t.measureEnabled}
                            onChange={(e) => {
                              const v = e.target.checked;
                              // Optimistic local update
                              setData(prev => prev ? { ...prev, tasks: prev.tasks.map(x => x.id === t.id ? { ...x, measureEnabled: v } : x) } : prev);
                              saveTaskMeta(t.id, { measureEnabled: v });
                            }}
                            disabled={metaSavingIds.has(t.id)}
                          />
                          <span>Tarea medible</span>
                        </label>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
                          placeholder="Objetivo"
                          value={typeof t.targetValue === 'number' ? t.targetValue : ''}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const val = raw === '' ? null : Math.max(0, Math.floor(Number(raw)) || 0);
                            setData(prev => prev ? { ...prev, tasks: prev.tasks.map(x => x.id === t.id ? { ...x, targetValue: val } : x) } : prev);
                          }}
                          onBlur={(e) => {
                            const raw = e.target.value;
                            const val = raw === '' ? null : Math.max(0, Math.floor(Number(raw)) || 0);
                            saveTaskMeta(t.id, { targetValue: val });
                          }}
                          className="w-24 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 placeholder-slate-400 disabled:opacity-50"
                          disabled={metaSavingIds.has(t.id)}
                        />
                        <input
                          type="text"
                          placeholder="Unidad"
                          value={t.unitLabel ?? ''}
                          onChange={(e) => {
                            const s = e.target.value;
                            setData(prev => prev ? { ...prev, tasks: prev.tasks.map(x => x.id === t.id ? { ...x, unitLabel: s } : x) } : prev);
                          }}
                          onBlur={(e) => {
                            const s = e.target.value;
                            saveTaskMeta(t.id, { unitLabel: s });
                          }}
                          className="w-28 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 placeholder-slate-400 disabled:opacity-50"
                          maxLength={30}
                          disabled={metaSavingIds.has(t.id)}
                        />
                      </div>
                    )}
                    {measurable && (
                      <div className="mt-1 text-xs">
                        {typeof t.targetValue === 'number' && t.targetValue !== null ? (
                          <span className={deriveDone(t.id, currentVal) ? 'text-emerald-600 font-medium' : 'text-slate-600'}>
                            {currentVal} / {t.targetValue} {t.unitLabel || ''}
                          </span>
                        ) : (
                          <span className={currentVal > 0 ? 'text-emerald-600 font-medium' : 'text-slate-600'}>
                            {currentVal} {t.unitLabel || ''}
                          </span>
                        )}
                        {isAdmin && (
                          <div className="mt-1 text-[11px] text-slate-500">Avance hoy: <span className="font-medium text-slate-700 dark:text-slate-200">{adminSum}</span> {t.unitLabel || ''}</div>
                        )}
                      </div>
                    )}
                    {t.endDay && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">Vence: <span className="font-mono">{t.endDay}</span></div>
                    )}
                    {st?.updatedByUsername && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">Últ. act: {st.updatedByUsername}</div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Barra inferior sticky centrada con acción principal destacada */}
            <div className="sticky bottom-0 z-10 mt-4 -mx-4 border-t border-slate-200 bg-white/85 px-4 py-4 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
              <div className="mx-auto flex max-w-3xl flex-col items-center gap-2">
                <div className="text-xs text-gray-600 dark:text-slate-300">Completadas {Array.from(checked.values()).filter(Boolean).length} / {data.tasks.length}</div>
                <button
                  onClick={openScanner}
                  disabled={saving || loading}
                  className="btn w-full max-w-xs !py-3 !px-6 !text-base"
                >
                  {nextActionLabel}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
