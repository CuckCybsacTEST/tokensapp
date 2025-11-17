"use client";
import React, { useEffect, useMemo, useState, useTransition } from 'react';

interface Prize {
  id: string;
  label: string;
  color: string | null;
  active: boolean;
  stock: number | null;
  key: string | null;
  emittedTotal: number | null;
  revealedCount?: number;
  deliveredCount?: number;
}

interface Props {
  prizes: Prize[];
  lastBatch: Record<string, { id: string; name: string; createdAt: Date }>;
  batchPrizeStats: Array<{
    batchId: string;
    description: string;
    createdAt: Date;
    prizes: Array<{
      prizeId: string;
      label: string;
      color: string | null;
      count: number;
      expired: number;
      valid: number;
    }>;
  }>;
}

// Componente ColorPalette
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
    <div className="grid grid-cols-5 sm:grid-cols-10 gap-1">
      <div className="col-span-5 sm:col-span-10 flex items-center gap-1">
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
        className="col-span-5 sm:col-span-10 text-[10px] uppercase tracking-wide text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        Limpiar
      </button>
    </div>
  );
}

// Componente PrizeManager simplificado
function PrizeManager({ prizes: initialPrizes, onPrizesUpdated }: { prizes: Prize[]; onPrizesUpdated?: (prizes: Prize[]) => void }) {
  const [prizes, setPrizes] = useState(initialPrizes);

  async function updatePrizesWithRefresh() {
    try {
      const res = await fetch('/api/prizes');
      if (res.ok) {
        const list = await res.json();
        setPrizes(list);
        onPrizesUpdated?.(list);
      }
    } catch {}
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
    if (f.color && f.color.length > 32) e.color = "Máx 32 chars";
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
              stock: form.stock === "" ? undefined : Number(form.stock),
            }),
          });
          if (!res.ok) throw new Error("Error creando");
          setMessage("Premio creado");
          reset();
          await updatePrizesWithRefresh();
        } else {
          const res = await fetch(`/api/prizes/${form.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              label: form.label,
              color: form.color || null,
              stock: form.stock === "" ? null : Number(form.stock),
              active: form.active,
            }),
          });
          if (!res.ok) throw new Error("Error actualizando");
          setMessage("Premio actualizado");
          await updatePrizesWithRefresh();
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
    const prev = prizes;
    const next = prev.filter((x) => x.id !== id);
    setPrizes(next);
    onPrizesUpdated?.(next);
    try {
      const res = await fetch(`/api/prizes/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setPrizes(prev);
        onPrizesUpdated?.(prev);
        if (err?.code === "PRIZE_IN_USE") {
          setMessage(
            `No se puede eliminar: hay tokens asociados (por premio: ${err?.details?.tokensByPrize ?? 0}, por asignación: ${err?.details?.tokensByAssigned ?? 0})`
          );
        } else if (err?.message) {
          setMessage(err.message);
        } else {
          setMessage("Fallo eliminando");
        }
      } else {
        setMessage("Premio eliminado");
        await updatePrizesWithRefresh();
      }
      if (form.id === id) reset();
    } catch (e: any) {
      setPrizes(prev);
      onPrizesUpdated?.(prev);
      setMessage(e?.message || "Fallo eliminando");
    } finally {
      setDeletingId(null);
    }
  }

  // Lógica para ordenar y filtrar premios
  const sorted = useMemo(() => {
    function keyNum(key?: string | null) {
      if (!key) return Number.POSITIVE_INFINITY;
      const m = String(key).match(/(\d+)$/);
      return m ? Number(m[1]) : Number.POSITIVE_INFINITY;
    }
    return [...prizes].sort((a, b) => {
      const ak = keyNum(a.key);
      const bk = keyNum(b.key);
      if (ak !== bk) return ak - bk;
      const kc = String(a.key || "").localeCompare(String(b.key || ""));
      if (kc !== 0) return kc;
      return String(a.label || "").localeCompare(String(b.label || ""));
    });
  }, [prizes]);

  const pendingPrizes = useMemo(() =>
    sorted.filter((p) => p.stock == null || (typeof p.stock === "number" && p.stock > 0)),
    [sorted]
  );

  const neverUsed = useMemo(() =>
    sorted.filter((p) => p.stock === 0 && (p.emittedTotal ?? 0) === 0),
    [sorted]
  );

  function renderTable(
    list: Prize[],
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
              <table className="table min-w-[600px] sm:min-w-[900px]">
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Label</th>
                    <th className="hidden sm:table-cell">Color</th>
                    <th>Stock</th>
                    <th className="hidden md:table-cell">Último lote</th>
                    <th>Emitidos</th>
                    <th className="hidden lg:table-cell">Revelados</th>
                    <th className="hidden lg:table-cell">Consumidos</th>
                    <th className="hidden xl:table-cell">Expirado</th>
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
                      <td className="hidden sm:table-cell">
                        <div className="flex items-center gap-3">
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
                          {(p.key === 'retry' || p.key === 'lose') && (
                            <span className="badge border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" title="Premio del sistema (ruleta)">Sistema</span>
                          )}
                        </div>
                      </td>
                      <td className="text-xs">
                        {p.stock == null ? (
                          <span className="badge border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" title="Stock ilimitado">∞</span>
                        ) : (
                          <span className="badge border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" title="Stock disponible">{p.stock}</span>
                        )}
                      </td>
                      <td className="text-xs hidden md:table-cell">
                        <span className="text-slate-400">—</span>
                      </td>
                      <td className="text-xs">
                        <span
                          className="badge border-indigo-300 bg-indigo-100 text-indigo-700 dark:border-indigo-600 dark:bg-indigo-800 dark:text-indigo-200"
                          title="Tokens generados históricamente para este premio"
                        >
                          {p.emittedTotal ?? 0}
                        </span>
                      </td>
                      <td className="text-xs hidden lg:table-cell">
                        <span
                          className="badge border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-600 dark:bg-amber-800 dark:text-amber-200"
                          title="Tokens revelados aún no entregados (pending delivery)"
                        >
                          {p.revealedCount ?? 0}
                        </span>
                      </td>
                      <td className="text-xs hidden lg:table-cell">
                        <span
                          className="badge border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-800 dark:text-emerald-200"
                          title="Tokens ya entregados / canje confirmados"
                        >
                          {p.deliveredCount ?? 0}
                        </span>
                      </td>
                      <td className="hidden xl:table-cell">
                        <span className="badge-danger" title={p.active ? "Se marcaba como activo anteriormente" : "Premio inactivo"}>Sí</span>
                      </td>
                      <td className="text-right space-x-2">
                        {(() => {
                          const inUse = (p.emittedTotal ?? 0) > 0;
                          const isSystem = p.key === 'retry' || p.key === 'lose';
                          const disableDelete = inUse || isSystem || !!deletingId;
                          const title = isSystem
                            ? "No se puede eliminar: premio del sistema"
                            : inUse
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Gestión de Premios</h2>
        <button onClick={reset} className="btn-outline text-xs" type="button" disabled={pending}>
          Nuevo Premio
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
              className="input w-full"
              value={form.label}
              onChange={(e) => setForm((f: any) => ({ ...f, label: e.target.value }))}
              required
              maxLength={120}
            />
            {errors.label && <p className="text-xs text-danger">{errors.label}</p>}
          </div>
          <div className="form-row">
            <label className="text-xs font-medium">Color (paleta)</label>
            <div className="w-full">
              <ColorPalette value={form.color} onChange={(c) => setForm((f: any) => ({ ...f, color: c }))} />
            </div>
            {errors.color && <p className="text-xs text-danger">{errors.color}</p>}
          </div>
          <div className="form-row">
            <label className="text-xs font-medium">Stock (vacío = ilimitado)</label>
            <input
              className="input w-full"
              value={form.stock}
              onChange={(e) => setForm((f: any) => ({ ...f, stock: e.target.value }))}
              type="number"
              min={0}
            />
            {errors.stock && <p className="text-xs text-danger">{errors.stock}</p>}
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

      {message && (
        <div className="alert-info text-sm">{message}</div>
      )}

      <div className="space-y-6">
        {renderTable(pendingPrizes, "Pendientes / Disponibles", "No hay premios con stock disponible", true, true)}
        {neverUsed.length > 0 &&
          renderTable(neverUsed, "Sin stock y sin emisiones", "No hay premios sin stock y sin emisiones", true, true)
        }
      </div>
    </div>
  );
}

type ValidityMode = 'byDays' | 'singleDay' | 'singleHour';

interface PayloadByDays { name: string; targetUrl?: string; includeQr: boolean; lazyQr: boolean; prizes: { prizeId: string; count: number }[]; validity: { mode: 'byDays'; expirationDays: number }; }
interface PayloadSingleDay { name: string; targetUrl?: string; includeQr: boolean; lazyQr: boolean; prizes: { prizeId: string; count: number }[]; validity: { mode: 'singleDay'; date: string }; }
interface PayloadSingleHour { name: string; targetUrl?: string; includeQr: boolean; lazyQr: boolean; prizes: { prizeId: string; count: number }[]; validity: { mode: 'singleHour'; date: string; hour: string; durationMinutes: number }; }

type StaticRequest = PayloadByDays | PayloadSingleDay | PayloadSingleHour;

const EXPIRATION_OPTIONS = [1,3,5,7,15,30];

export default function PrizestaticsClient({ prizes: initialPrizes, lastBatch, batchPrizeStats }: Props) {
  const [prizes, setPrizes] = useState(initialPrizes);
  const [name, setName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [mode, setMode] = useState<ValidityMode>('byDays');
  const [expirationDays, setExpirationDays] = useState(7);
  const [singleDayDate, setSingleDayDate] = useState('');
  const [hourDate, setHourDate] = useState('');
  const [hourTime, setHourTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [includeQr, setIncludeQr] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [success, setSuccess] = useState<string|null>(null);
  const [postGen, setPostGen] = useState<null | { batchId: string; blobUrl: string; filename: string; displayName?: string }>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Derived
  // Solo mostrar premios activos con stock numérico disponible > 0 (evitar premios ya emitidos o ilimitados/null)
  const activePrizeList = useMemo(() => prizes.filter(p => p.active && typeof p.stock === 'number' && p.stock > 0), [prizes]);
  const totalRequested = useMemo(() => Object.entries(counts).reduce((a,[id,v]) => a + (v||0),0), [counts]);

  useEffect(() => { if (success||error) { const t = setTimeout(()=>{ setSuccess(null); setError(null); }, 4000); return () => clearTimeout(t);} }, [success,error]);
  useEffect(() => () => { if (postGen?.blobUrl) { try { URL.revokeObjectURL(postGen.blobUrl); } catch {} } }, [postGen?.blobUrl]);

  function setCount(prizeId: string, value: number) {
    setCounts(prev => ({ ...prev, [prizeId]: value }));
  }
  function fillMax() {
    const next: Record<string, number> = {};
    for (const p of activePrizeList) {
      if (typeof p.stock === 'number' && p.stock > 0) next[p.id] = p.stock;
    }
    setCounts(next);
  }
  function clearAll() { setCounts({}); }

  async function generate() {
    if (loading) return;
    const trimmedUrl = targetUrl.trim();
    if (trimmedUrl && !/^https?:\/\//i.test(trimmedUrl)) { setError('URL debe iniciar con http(s)://'); return; }
    if (totalRequested <= 0) { setError('Define cantidades'); return; }
    setLoading(true); setError(null); setSuccess(null);
    try {
      let payload: StaticRequest;
      const base = {
        name: name || 'Lote estático',
        ...(trimmedUrl && { targetUrl: trimmedUrl }),
        includeQr,
        lazyQr: false,
        prizes: Object.entries(counts).filter(([,v]) => v>0).map(([prizeId,v]) => ({ prizeId, count: v }))
      };
      if (mode === 'byDays') {
        payload = { ...base, validity: { mode: 'byDays', expirationDays } } as PayloadByDays;
      } else if (mode === 'singleDay') {
        if (!singleDayDate) throw new Error('Selecciona fecha');
        payload = { ...base, validity: { mode: 'singleDay', date: singleDayDate } } as PayloadSingleDay;
      } else {
        if (!hourDate) throw new Error('Fecha ventana requerida');
        if (!/^[0-2]\d:[0-5]\d$/.test(hourTime)) throw new Error('Hora inválida');
        payload = { ...base, validity: { mode: 'singleHour', date: hourDate, hour: hourTime, durationMinutes } } as PayloadSingleHour;
      }
      const res = await fetch('/api/batch/generate-static', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const ct = res.headers.get('Content-Type') || '';
      if (!res.ok) {
        if (ct.includes('application/json')) {
          const j = await res.json().catch(()=>({}));
          setError(j.error || 'Error');
        } else setError('Error desconocido');
        return;
      }
      if (ct.includes('application/zip')) {
        const blob = await res.blob();
        let batchId: string | undefined; let totalTokens: number | undefined;
        try {
          const JSZipMod = await import('jszip');
          const zip = await JSZipMod.loadAsync(blob);
            const manifestFile = zip.file('manifest.json');
            if (manifestFile) {
              const txt = await manifestFile.async('text');
              const mf = JSON.parse(txt);
              batchId = mf.batchId; totalTokens = mf.meta?.totalTokens;
            }
        } catch {}
        const url = URL.createObjectURL(blob);
        setPostGen({ batchId: batchId || '', blobUrl: url, filename: `lote_static_${Date.now()}.zip`, displayName: name });
        setSuccess(`Lote estático generado${totalTokens ? ` (${totalTokens} tokens)` : ''}`);
      } else {
        setError('Respuesta inesperada');
      }
    } catch (e: any) {
      setError(e.message || 'Fallo red');
    } finally { setLoading(false); }
  }

  function downloadZip() {
    if (!postGen) return; const a = document.createElement('a'); a.href = postGen.blobUrl; a.download = postGen.filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(postGen.blobUrl); setPostGen(null);
  }

  // Lógica para tabla de emitidos
  const sortedPrizes = useMemo(() => {
    return [...prizes].sort((a, b) => {
      const keyNum = (k: string | null) => {
        if (!k) return 999;
        const m = k.match(/^(\d+)/);
        return m ? parseInt(m[1]) : 999;
      };
      const ak = keyNum(a.key);
      const bk = keyNum(b.key);
      if (ak !== bk) return ak - bk;
      const kc = String(a.key || "").localeCompare(String(b.key || ""));
      if (kc !== 0) return kc;
      return String(a.label || "").localeCompare(String(b.label || ""));
    });
  }, [prizes]);

  const emitted = useMemo(() => sortedPrizes.filter((p) => p.stock === 0 && (p.emittedTotal ?? 0) > 0), [sortedPrizes]);

  const [activeBatch, setActiveBatch] = useState<string | 'ALL'>('ALL');
  const batches = useMemo(() => batchPrizeStats.map(b => ({ id: b.batchId, label: b.description || b.batchId })), [batchPrizeStats]);

  const countsByPrizePerBatch = useMemo(() => {
    const result: Record<string, Record<string, number>> = {};
    for (const b of batchPrizeStats) {
      const map: Record<string, number> = {};
      for (const p of b.prizes) map[p.prizeId] = p.count;
      result[b.batchId] = map;
    }
    return result;
  }, [batchPrizeStats]);

  const emittedFiltered = useMemo(() =>
    activeBatch === 'ALL' ? emitted : emitted.filter(p => (countsByPrizePerBatch[activeBatch] || {})[p.id]),
    [activeBatch, emitted, countsByPrizePerBatch]
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Gestión de Premios */}
      <PrizeManager prizes={prizes} onPrizesUpdated={setPrizes} />

      {/* Generar Lote Estático */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <span className="text-sm font-medium">Generar Lote Estático</span>
          <button type="button" className="text-[10px] underline" onClick={fillMax}>Rellenar máximos</button>
        </div>
        <div className="card-body grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {postGen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="card w-[92%] max-w-md">
                <div className="card-header"><h3 className="text-sm font-medium">Lote estático listo</h3></div>
                <div className="card-body space-y-3 text-sm">
                  <p>Puedes descargar el ZIP ahora.</p>
                  <div className="flex gap-2">
                    <button className="btn !py-1 !px-3 text-xs" onClick={downloadZip}>Descargar ZIP</button>
                    <button className="btn-outline !py-1 !px-3 text-xs" onClick={() => { if (postGen.blobUrl) URL.revokeObjectURL(postGen.blobUrl); setPostGen(null); }}>Cerrar</button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="form-row">
            <label className="text-xs font-medium">Nombre</label>
            <input className="input" value={name} maxLength={120} placeholder="Ej: Campaña Octubre" onChange={e=>setName(e.target.value)} />
          </div>
          <div className="form-row">
            <label className="text-xs font-medium">Incluye QR</label>
            <label className="inline-flex items-center gap-2 text-xs"><input type="checkbox" checked={includeQr} onChange={e=>setIncludeQr(e.target.checked)} /><span>Sí</span></label>
          </div>
          <div className="form-row col-span-full">
            <label className="text-xs font-medium">Modo de validez</label>
            <div className="flex flex-wrap items-center gap-4 text-[11px]">
              <label className="inline-flex items-center gap-1"><input type="radio" name="static-validity" value="byDays" checked={mode==='byDays'} onChange={()=>setMode('byDays')} /><span>Por días</span></label>
              <label className="inline-flex items-center gap-1"><input type="radio" name="static-validity" value="singleDay" checked={mode==='singleDay'} onChange={()=>{setMode('singleDay');}} /><span>Día específico</span></label>
              <label className="inline-flex items-center gap-1"><input type="radio" name="static-validity" value="singleHour" checked={mode==='singleHour'} onChange={()=>{setMode('singleHour');}} /><span>Ventana horaria</span></label>
            </div>
          </div>
          {mode==='byDays' && (
            <div className="form-row">
              <label className="text-xs font-medium">Expiración</label>
              <select className="input" value={expirationDays} onChange={e=>setExpirationDays(Number(e.target.value))}>{EXPIRATION_OPTIONS.map(d=> <option key={d} value={d}>{d} días</option>)}</select>
            </div>) }
          {mode==='singleDay' && (
            <div className="form-row">
              <label className="text-xs font-medium">Fecha</label>
              <input type="date" className="input" value={singleDayDate} onChange={e=>setSingleDayDate(e.target.value)} />
            </div>) }
          {mode==='singleHour' && (
            <>
              <div className="form-row"><label className="text-xs font-medium">Fecha ventana</label><input type="date" className="input" value={hourDate} onChange={e=>setHourDate(e.target.value)} /></div>
              <div className="form-row"><label className="text-xs font-medium">Hora inicio</label><input type="time" className="input" value={hourTime} onChange={e=>setHourTime(e.target.value)} /></div>
              <div className="form-row"><label className="text-xs font-medium">Duración</label><select className="input" value={durationMinutes} onChange={e=>setDurationMinutes(Number(e.target.value))}>{[15,30,45,60,90,120,180,240,360].map(m=> <option key={m} value={m}>{m} min</option>)}</select></div>
            </>) }
          <div className="col-span-full overflow-x-auto">
            <table className="w-full text-[11px] border-collapse min-w-[300px]">
              <thead><tr className="text-left"><th className="py-1 pr-2">Premio</th><th className="py-1 pr-2 w-20">Stock</th><th className="py-1 pr-2 w-28">Cantidad</th></tr></thead>
              <tbody>
                {activePrizeList.map(p => (
                  <tr key={p.id} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="py-1 pr-2"><span className="inline-block h-2 w-2 rounded-full align-middle mr-1" style={{ background: p.color || '#999' }} />{p.label}</td>
                    <td className="py-1 pr-2 tabular-nums text-xs">{typeof p.stock === 'number' ? p.stock : '—'}</td>
                    <td className="py-1 pr-2">
                      <input type="number" min={0} max={p.stock || 999999} className="input h-6 text-xs" value={counts[p.id] ?? ''} onChange={e=> setCount(p.id, e.target.value === '' ? 0 : Number(e.target.value))} />
                    </td>
                  </tr>
                ))}
                {activePrizeList.length === 0 && <tr><td colSpan={3} className="py-2 text-center italic text-slate-500">No hay premios con stock disponible</td></tr>}
              </tbody>
            </table>
            <div className="mt-2 flex flex-wrap gap-3 text-[10px] items-center">
              <span>Total solicitado: {totalRequested}</span>
              <button type="button" className="btn-outline !py-1 !px-2 text-[10px]" onClick={fillMax}>Usar stock completo</button>
              <button type="button" className="btn-outline !py-1 !px-2 text-[10px]" onClick={clearAll}>Limpiar</button>
            </div>
            <p className="mt-1 text-[10px] text-slate-500">Sólo se listan premios con stock &gt; 0. Los agotados o ilimitados no pueden usarse en lotes estáticos.</p>
          </div>
          <div className="col-span-full flex items-center gap-3">
            <button type="button" className="btn text-xs" disabled={loading || totalRequested<=0} onClick={generate}>{loading ? 'Generando…' : 'Generar Lote Estático'}</button>
            {error && <span className="text-[11px] text-rose-600">{error}</span>}
            {success && <span className="text-[11px] text-emerald-600">{success}</span>}
          </div>
          <p className="col-span-full text-[10px] text-slate-500">Los tokens muestran una interfaz interna con información del premio. Si se proporciona una URL, el usuario puede reclamar el premio haciendo clic en el botón. Si no se proporciona URL, se muestra un mensaje de premio disponible.</p>
        </div>
      </div>

      {/* Tabla de Emitidos */}
      {emitted.length > 0 && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <span className="text-sm font-medium">
              {activeBatch === 'ALL' ? 'Emitidos (stock consumido)' : 'Emitidos para batch seleccionado'}
            </span>
            <span className="text-[10px] text-slate-500">
              {emittedFiltered.length} premio{emittedFiltered.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="card-body">
            {batches.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setActiveBatch('ALL')}
                  className={`text-xs px-3 py-1 rounded border transition ${
                    activeBatch === 'ALL'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  Todos
                </button>
                {batches.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setActiveBatch(b.id)}
                    title={b.id}
                    className={`text-xs px-3 py-1 rounded border transition ${
                      activeBatch === b.id
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {b.label.length > 18 ? b.label.slice(0, 18) + '…' : b.label}
                  </button>
                ))}
              </div>
            )}

            {emittedFiltered.length === 0 ? (
              <p className="text-xs text-slate-500">
                {activeBatch === 'ALL' ? 'No hay premios emitidos todavía' : 'Sin emisiones para este batch'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table min-w-[600px] sm:min-w-[900px]">
                  <thead>
                    <tr>
                      <th>Key</th>
                      <th>Label</th>
                      <th className="hidden sm:table-cell">Color</th>
                      <th>Stock</th>
                      <th className="hidden md:table-cell">Lote</th>
                      <th>Emitidos</th>
                      <th className="hidden lg:table-cell">Revelados</th>
                      <th className="hidden lg:table-cell">Consumidos</th>
                      <th className="hidden xl:table-cell">Expirado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emittedFiltered.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                        <td className="font-mono text-xs">{p.key}</td>
                        <td>
                          <span className="uppercase tracking-wide font-semibold text-slate-800 dark:text-slate-100">
                            {p.label}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell">
                          <div className="flex items-center gap-3">
                            {p.color && (
                              <span className="inline-flex items-center gap-2">
                                <span
                                  className="h-4 w-4 rounded border border-slate-300 dark:border-slate-600"
                                  style={{ background: p.color }}
                                />
                                <span className="text-xs text-slate-500">{p.color}</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="tabular-nums text-xs">
                          {p.stock === 0 ? 'Agotado' : p.stock === null ? '∞' : p.stock}
                        </td>
                        <td className="text-xs hidden md:table-cell">
                          {lastBatch[p.id] ? (
                            <span title={lastBatch[p.id].name}>
                              {lastBatch[p.id].name.length > 15
                                ? lastBatch[p.id].name.slice(0, 15) + '…'
                                : lastBatch[p.id].name}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="tabular-nums text-xs">{p.emittedTotal || 0}</td>
                        <td className="tabular-nums text-xs hidden lg:table-cell">—</td>
                        <td className="tabular-nums text-xs hidden lg:table-cell">—</td>
                        <td className="tabular-nums text-xs hidden xl:table-cell">—</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
