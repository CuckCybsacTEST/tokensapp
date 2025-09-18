"use client";
import React, { useState, useTransition } from "react";

function ColorPalette({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const COLORS = [
    "#2563eb",
    "#dc2626",
    "#16a34a",
    "#f59e0b",
    "#7c3aed",
    "#db2777",
    "#0d9488",
    "#f87171",
    "#64748b",
    "#18181b",
  ];
  return (
    <div className="flex flex-wrap gap-2">
      <div className="flex items-center gap-1">
        {COLORS.map((c) => {
          const active = value === c;
          return (
            <button
              key={c}
              type="button"
              aria-label={c}
              onClick={() => onChange(active ? "" : c)}
              className={`h-6 w-6 rounded border transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                active
                  ? "ring-2 ring-offset-1 ring-slate-400 border-slate-700"
                  : "border-slate-300 dark:border-slate-600"
              }`}
              style={{ background: c }}
            />
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => onChange("")}
        className="text-[10px] uppercase tracking-wide text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        Limpiar
      </button>
    </div>
  );
}

export default function PrizeManager({
  initialPrizes,
  onPrizesUpdated,
  lastBatch,
}: {
  initialPrizes: any[];
  onPrizesUpdated?: (prizes: any[]) => void;
  lastBatch?: Record<string, { id: string; name: string; createdAt: Date } | undefined>;
}) {
  const [prizes, setPrizes] = useState(initialPrizes);
  function updatePrizes(updater: (prev: any[]) => any[]) {
    setPrizes((prev) => {
      const next = updater(prev);
      onPrizesUpdated?.(next);
      return next;
    });
  }
  const empty = {
    id: undefined,
    label: "",
    color: "",
    stock: "",
    active: true,
  } as any;
  const [form, setForm] = useState<any>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function validate(f: any) {
    const e: Record<string, string> = {};
    if (!f.label || f.label.trim().length === 0) e.label = "Label requerido";
    if (f.label && f.label.length > 120) e.label = "Máx 120 chars";
  if (f.color && f.color.length > 32) e.color = "Máx 32 chars"; // seguridad extra
    if (f.stock !== "" && (isNaN(Number(f.stock)) || Number(f.stock) < 0))
      e.stock = "Stock inválido";
    return e;
  }

  function reset() {
    setForm(empty);
    setErrors({});
    setMessage(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length) return;
    startTransition(async () => {
      try {
        if (!form.id) {
          const res = await fetch("/api/prizes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              label: form.label,
              color: form.color || undefined,
              // descripción eliminada
              stock: form.stock === "" ? undefined : Number(form.stock),
            }),
          });
          if (!res.ok) throw new Error("Error creando");
          const created = await res.json();
          updatePrizes((p) => [...p, created]);
          setMessage("Premio creado");
          reset();
        } else {
          const res = await fetch(`/api/prizes/${form.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              label: form.label,
              color: form.color || null,
              // descripción eliminada
              stock: form.stock === "" ? null : Number(form.stock),
              active: form.active,
            }),
          });
          if (!res.ok) throw new Error("Error actualizando");
          const updated = await res.json();
          updatePrizes((p) => p.map((x) => (x.id === updated.id ? updated : x)));
          setMessage("Premio actualizado");
        }
      } catch (err: any) {
        setMessage(err.message || "Fallo");
      }
    });
  }

  function edit(prize: any) {
    setForm({
      id: prize.id,
      label: prize.label,
      color: prize.color || "",
  // descripción eliminada
      stock: prize.stock == null ? "" : String(prize.stock),
      active: prize.active,
    });
    setMessage(null);
    setErrors({});
  }

  async function removePrize(id: string) {
    if (!id) return;
    const p = prizes.find((x) => x.id === id);
    const label = p?.label || id;
    const confirmMsg = `¿Eliminar el premio "${label}"? Esta acción no se puede deshacer.`;
    if (!window.confirm(confirmMsg)) return;
    setDeletingId(id);
    setMessage(null);
    // Optimistic removal with rollback
    const prev = prizes;
    const next = prev.filter((x) => x.id !== id);
    updatePrizes(() => next);
    try {
      const res = await fetch(`/api/prizes/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        // Rollback
        updatePrizes(() => prev);
        if (err?.code === "PRIZE_IN_USE") {
          setMessage(
            `No se puede eliminar: hay tokens asociados (por premio: ${err?.details?.tokensByPrize ?? 0}, por asignación: ${err?.details?.tokensByAssigned ?? 0})`
          );
        } else if (err?.message) {
          setMessage(err.message);
        } else {
          setMessage("Error eliminando");
        }
        return;
      }
      // Si el que se elimina está en edición, limpiar el formulario
      if (form.id === id) reset();
      setMessage("Premio eliminado");
    } catch (e: any) {
      // Rollback
      updatePrizes(() => prev);
      setMessage(e?.message || "Fallo eliminando");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Premios</h1>
        <button onClick={reset} className="btn-outline text-xs" type="button" disabled={pending}>
          Nuevo
        </button>
      </div>
      <form id="prize-form" onSubmit={submit} className="card">
        <div className="card-header flex items-center justify-between">
          <span className="text-sm font-medium">
            {form.id ? "Editar premio" : "Crear nuevo premio"}
          </span>
          {form.id && <span className="text-xs text-slate-500">ID: {form.id.slice(0, 8)}…</span>}
        </div>
        <div className="card-body grid gap-4 md:grid-cols-2">
          <div className="form-row">
            <label className="text-xs font-medium">Label *</label>
            <input
              className="input"
              value={form.label}
              onChange={(e) => setForm((f: any) => ({ ...f, label: e.target.value }))}
              required
              maxLength={120}
            />
            {errors.label && <p className="text-xs text-rose-600">{errors.label}</p>}
          </div>
          <div className="form-row">
            <label className="text-xs font-medium">Color (paleta)</label>
            <ColorPalette value={form.color} onChange={(c) => setForm((f: any) => ({ ...f, color: c }))} />
            {errors.color && <p className="text-xs text-rose-600">{errors.color}</p>}
          </div>
          {/* Descripción eliminada */}
          <div className="form-row">
            <label className="text-xs font-medium">Stock (vacío = ilimitado)</label>
            <input
              className="input"
              value={form.stock}
              onChange={(e) => setForm((f: any) => ({ ...f, stock: e.target.value }))}
              type="number"
              min={0}
            />
            {errors.stock && <p className="text-xs text-rose-600">{errors.stock}</p>}
          </div>
          {form.id && (
            <div className="form-row">
              <label className="text-xs font-medium">Activo</label>
              <select
                className="input"
                value={String(form.active)}
                onChange={(e) => setForm((f: any) => ({ ...f, active: e.target.value === "true" }))}
              >
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 dark:border-slate-700">
          <div className="text-xs text-slate-500">
            {message && <span>{message}</span>}
            {pending && <span className="ml-2 animate-pulse">Guardando…</span>}
          </div>
          <button className="btn" disabled={pending} type="submit">
            {form.id ? "Actualizar" : "Crear"}
          </button>
        </div>
      </form>
      {/* Mensaje global (acciones de tabla) */}
      {message && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-200">
          {message}
        </div>
      )}
      {(() => {
        // Ordenar por clave con orden natural (premio1, premio2, ...)
        function keyNum(key?: string) {
          if (!key) return Number.POSITIVE_INFINITY;
          const m = String(key).match(/(\d+)$/);
          return m ? Number(m[1]) : Number.POSITIVE_INFINITY;
        }
        const sorted = [...prizes].sort((a, b) => {
          const ak = keyNum(a.key);
          const bk = keyNum(b.key);
          if (ak !== bk) return ak - bk;
          // fallback estable: por clave alfabética, luego label
          const kc = String(a.key || "").localeCompare(String(b.key || ""));
          if (kc !== 0) return kc;
          return String(a.label || "").localeCompare(String(b.label || ""));
        });
        const emitted = sorted.filter((p) => p.stock === 0 && (p.emittedTotal ?? 0) > 0);
        const pending = sorted.filter(
          (p) => p.stock == null || (typeof p.stock === "number" && p.stock > 0)
        );
        const neverUsed = sorted.filter((p) => p.stock === 0 && (p.emittedTotal ?? 0) === 0);
        function renderTable(
          list: any[],
          label: string,
          emptyMsg: string,
          showDelete = true,
          showEdit = true
        ) {
          return (
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <span>{label}</span>
                <span className="text-[10px] text-slate-500">
                  {list.length} premio{list.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="card-body overflow-x-auto">
                {list.length === 0 ? (
                  <p className="text-xs text-slate-500">{emptyMsg}</p>
                ) : (
                  <div className="overflow-x-auto">
                  <table className="table min-w-[900px]">
                    <thead>
                      <tr>
                        <th>Key</th>
                        <th>Label</th>
                        <th>Color</th>
                        <th>Lote</th>
                        <th>Emitidos</th>
                        <th>Revelados</th>
                        <th>Consumidos</th>
                        <th>Activo</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                          <td className="font-mono text-xs">{p.key}</td>
                          <td>
                            <span className="uppercase tracking-wide font-semibold text-slate-800 dark:text-slate-100">
                              {p.label}
                            </span>
                          </td>
                          <td>
                            {p.color && (
                              <span className="inline-flex items-center gap-2">
                                <span
                                  className="h-4 w-4 rounded border"
                                  style={{ background: p.color }}
                                  title={p.color}
                                />
                                <span className="text-xs text-slate-500">{p.color}</span>
                              </span>
                            )}
                          </td>
                          <td className="text-xs">
                            {lastBatch?.[p.id] ? (
                              <span title={lastBatch[p.id]!.id} className="font-mono">
                                {lastBatch[p.id]!.name.length > 18
                                  ? lastBatch[p.id]!.name.slice(0, 18) + "…"
                                  : lastBatch[p.id]!.name}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          {/* Emitidos (histórico) */}
                          <td className="text-xs">
                            <span
                              className="badge border-indigo-300 bg-indigo-100 text-indigo-700 dark:border-indigo-600 dark:bg-indigo-800 dark:text-indigo-200"
                              title="Tokens generados históricamente para este premio"
                            >
                              {p.emittedTotal ?? 0}
                            </span>
                          </td>
                          {/* Revelados (con revealedAt pero sin deliveredAt) */}
                          <td className="text-xs">
                            <span
                              className="badge border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-600 dark:bg-amber-800 dark:text-amber-200"
                              title="Tokens revelados aún no entregados (pending delivery)"
                            >
                              {p.revealedCount ?? 0}
                            </span>
                          </td>
                          {/* Consumidos (entregados) */}
                          <td className="text-xs">
                            <span
                              className="badge border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-800 dark:text-emerald-200"
                              title="Tokens ya entregados / canje confirmados"
                            >
                              {p.deliveredCount ?? 0}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                p.active
                                  ? "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-800 dark:text-emerald-200"
                                  : "border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-600 dark:bg-rose-800 dark:text-rose-200"
                              }`}
                            >
                              {p.active ? "Sí" : "No"}
                            </span>
                          </td>
                          <td className="text-right space-x-2">
                            {(() => {
                              const inUse = Boolean(lastBatch?.[p.id]) || (p.emittedTotal ?? 0) > 0;
                              const disableDelete = inUse || !!deletingId;
                              const title = inUse
                                ? "No se puede eliminar: hay tokens asociados a este premio"
                                : "Eliminar premio";
                              return (
                                <>
                                  {showEdit && (
                                    <button
                                      className="btn-outline !px-3 !py-1 text-xs"
                                      onClick={() => edit(p)}
                                      type="button"
                                    >
                                      Editar
                                    </button>
                                  )}
                                  {showDelete && (
                                    <button
                                      className="btn-danger !px-3 !py-1 text-xs"
                                      onClick={() => removePrize(p.id)}
                                      disabled={disableDelete}
                                      type="button"
                                      title={title}
                                    >
                                      {deletingId === p.id ? "Eliminando…" : "Eliminar"}
                                    </button>
                                  )}
                                </>
                              );
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>
            </div>
          );
        }
        return (
          <div className="space-y-6">
            {renderTable(pending, "Pendientes / Disponibles", "No hay premios con stock disponible", true, true)}
            {renderTable(emitted, "Emitidos (stock consumido)", "No hay premios emitidos todavía", false, false)}
            {neverUsed.length > 0 &&
              renderTable(
                neverUsed,
                "Sin stock y sin emisiones",
                "No hay premios sin stock y sin emisiones",
                true,
                true
              )}
          </div>
        );
      })()}
    </div>
  );
}

