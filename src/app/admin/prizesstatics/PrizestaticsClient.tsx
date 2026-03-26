"use client";
import React, { useEffect, useMemo, useState, useTransition } from 'react';
import { ACTION_LABELS, ACTION_DESCRIPTIONS, PRIZELESS_ACTIONS } from '@/components/token-actions/types';
import type { ActionType } from '@/components/token-actions/types';

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

// Claves de premios del sistema de ruleta — excluidos de tokens estáticos
const SYSTEM_PRIZE_KEYS = new Set(['retry', 'lose']);

// Gestión de premios exclusiva para tokens estáticos (excluye retry/lose de ruleta)
function StaticPrizeManager({ prizes: initialPrizes, onPrizesUpdated }: { prizes: Prize[]; onPrizesUpdated?: (prizes: Prize[]) => void }) {
  const [prizes, setPrizes] = useState(() => initialPrizes.filter(p => !SYSTEM_PRIZE_KEYS.has(p.key || '')));

  async function updatePrizesWithRefresh() {
    try {
      const res = await fetch('/api/prizes');
      if (res.ok) {
        const json = await res.json();
        const raw = Array.isArray(json) ? json : (Array.isArray(json.data) ? json.data : []);
        const list = raw.filter((p: any) => !SYSTEM_PRIZE_KEYS.has(p.key || ''));
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Premios para Tokens Estáticos</h2>
          <p className="text-[10px] text-slate-500 mt-0.5">Stock general compartido por todos los tipos de lotes (premio, trivia, reto, sorteo, etc.). Los premios de ruleta se gestionan en /admin/prizes.</p>
        </div>
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
  const [prizes, setPrizes] = useState(() => initialPrizes.filter(p => !SYSTEM_PRIZE_KEYS.has(p.key || '')));
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
  const [tokenCount, setTokenCount] = useState(50);

  // --- Action Type state ---
  const [actionType, setActionType] = useState<ActionType>('prize');
  const [triviaQuestions, setTriviaQuestions] = useState<Array<{ question: string; answers: Array<{ text: string; correct: boolean }>; points: number }>>(
    [{ question: '', answers: [{ text: '', correct: true }, { text: '', correct: false }, { text: '', correct: false }, { text: '', correct: false }], points: 10 }]
  );
  const [triviaSuccessMsg, setTriviaSuccessMsg] = useState('¡Respuesta correcta! Muestra esta pantalla al animador.');
  const [triviaFailMsg, setTriviaFailMsg] = useState('¡Casi! Mejor suerte la próxima.');
  const [phrases, setPhrases] = useState<string[]>(['']);
  const [phraseStyle, setPhraseStyle] = useState<'motivational' | 'funny' | 'wisdom' | 'custom'>('motivational');
  const [challenges, setChallenges] = useState<string[]>(['']);
  const [challengeDifficulty, setChallengeDifficulty] = useState<'easy'|'medium'|'hard'>('medium');
  const [challengeRequiresValidation, setChallengeRequiresValidation] = useState(true);
  const [raffleName, setRaffleName] = useState('');
  const [raffleMaxParticipants, setRaffleMaxParticipants] = useState(999);
  const [messageHtml, setMessageHtml] = useState('');
  const [messageCtaLabel, setMessageCtaLabel] = useState('');
  const [messageCtaUrl, setMessageCtaUrl] = useState('');
  // Feedback payload
  const [feedbackPrompt, setFeedbackPrompt] = useState('¿Qué te pareció la noche?');
  const [feedbackPlaceholder, setFeedbackPlaceholder] = useState('Escribe aquí tu mensaje…');
  const [feedbackMinLength, setFeedbackMinLength] = useState(5);
  const [feedbackMaxLength, setFeedbackMaxLength] = useState(500);
  const [feedbackThankYou, setFeedbackThankYou] = useState('¡Gracias por tu mensaje!');

  function buildActionPayload(): string | undefined {
    if (actionType === 'prize') return undefined;
    if (actionType === 'trivia') {
      return JSON.stringify({
        questions: triviaQuestions.filter(q => q.question.trim()),
        successMessage: triviaSuccessMsg,
        failMessage: triviaFailMsg,
      });
    }
    if (actionType === 'phrase') {
      return JSON.stringify({ phrases: phrases.filter(p => p.trim()), style: phraseStyle });
    }
    if (actionType === 'challenge') {
      return JSON.stringify({
        challenges: challenges.filter(c => c.trim()),
        difficulty: challengeDifficulty,
        requiresValidation: challengeRequiresValidation,
      });
    }
    if (actionType === 'raffle') {
      return JSON.stringify({ raffleName, autoNumber: true, maxParticipants: raffleMaxParticipants });
    }
    if (actionType === 'message') {
      return JSON.stringify({
        htmlContent: messageHtml,
        ctaLabel: messageCtaLabel || undefined,
        ctaUrl: messageCtaUrl || undefined,
      });
    }
    if (actionType === 'feedback') {
      return JSON.stringify({
        prompt: feedbackPrompt,
        placeholder: feedbackPlaceholder || undefined,
        minLength: feedbackMinLength,
        maxLength: feedbackMaxLength,
        thankYouMessage: feedbackThankYou || undefined,
      });
    }
    return undefined;
  }

  // Derived
  // Solo mostrar premios activos con stock numérico disponible > 0 (evitar premios ya emitidos o ilimitados/null)
  const activePrizeList = useMemo(() => prizes.filter(p => p.active && typeof p.stock === 'number' && p.stock > 0), [prizes]);
  const isPrizeless = PRIZELESS_ACTIONS.has(actionType);
  const totalRequested = useMemo(() => isPrizeless ? tokenCount : Object.entries(counts).reduce((a,[id,v]) => a + (v||0),0), [counts, isPrizeless, tokenCount]);

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
    if (totalRequested <= 0) { setError(isPrizeless ? 'Define cantidad de tokens' : 'Define cantidades'); return; }
    setLoading(true); setError(null); setSuccess(null);
    try {
      let payload: StaticRequest;
      const base = {
        name: name || 'Lote estático',
        ...(trimmedUrl && { targetUrl: trimmedUrl }),
        includeQr,
        lazyQr: false,
        ...(isPrizeless
          ? { prizes: [] as { prizeId: string; count: number }[], tokenCount }
          : { prizes: Object.entries(counts).filter(([,v]) => v>0).map(([prizeId,v]) => ({ prizeId, count: v })) }),
        actionType,
        actionPayload: buildActionPayload(),
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
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">Tokens Estáticos · Generador</h1>
        <p className="text-sm text-slate-500 mt-1">
          Genera lotes de tokens QR por tipo de acción.
          <span className="ml-1 text-[10px] text-slate-400">Independiente del sistema de ruleta.</span>
        </p>
      </div>

      {/* Inventario de Premios para Estáticos */}
      <StaticPrizeManager prizes={prizes} onPrizesUpdated={setPrizes} />

      {/* Generar Lote Estático por Tipo de Acción */}
      <div className="card">
        <div className="card-header space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Generar Lote Estático</span>
            {!isPrizeless && <button type="button" className="text-[10px] underline" onClick={fillMax}>Rellenar máximos</button>}
          </div>
          <div className="flex flex-wrap gap-1 -mx-5 px-5">
            {(Object.keys(ACTION_LABELS) as ActionType[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setActionType(t)}
                className={`px-3 py-1.5 text-xs font-medium rounded-t border-b-2 transition-colors ${
                  actionType === t
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-900/20'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {ACTION_LABELS[t]}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-500">{ACTION_DESCRIPTIONS[actionType]}</p>
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

          {/* Configuración del tipo de acción (seleccionada en pestañas) */}
          {actionType === 'trivia' && (
            <div className="col-span-full space-y-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-xs font-medium text-blue-700 dark:text-blue-300">🧩 Configuración de Trivia Rápida</div>
              {triviaQuestions.map((q, qi) => (
                <div key={qi} className="p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex gap-2 items-center">
                    <span className="text-[10px] text-slate-500 shrink-0">P{qi+1}</span>
                    <input className="input !w-auto flex-1 min-w-0 text-xs" placeholder="Escribe la pregunta aquí..." value={q.question} onChange={e=>{ const nq = [...triviaQuestions]; nq[qi] = { ...nq[qi], question: e.target.value }; setTriviaQuestions(nq); }} />
                    <input type="number" min={1} max={100} className="input !w-16 shrink-0 text-xs text-center" placeholder="Pts" title="Puntos por respuesta correcta" value={q.points} onChange={e=>{ const nq = [...triviaQuestions]; nq[qi] = { ...nq[qi], points: Number(e.target.value)||10 }; setTriviaQuestions(nq); }} />
                    {triviaQuestions.length > 1 && <button type="button" className="text-rose-500 text-xs shrink-0" onClick={()=>setTriviaQuestions(triviaQuestions.filter((_,i)=>i!==qi))}>✕</button>}
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {q.answers.map((a, ai) => (
                      <div key={ai} className="flex items-center gap-1">
                        <input type="radio" name={`correct-${qi}`} checked={a.correct} onChange={()=>{ const nq = [...triviaQuestions]; nq[qi] = { ...nq[qi], answers: nq[qi].answers.map((x,j)=>({...x, correct: j===ai})) }; setTriviaQuestions(nq); }} title="Correcta" />
                        <input className="input flex-1 text-[10px]" placeholder={`Opción ${ai+1}`} value={a.text} onChange={e=>{ const nq = [...triviaQuestions]; nq[qi] = { ...nq[qi], answers: nq[qi].answers.map((x,j)=> j===ai ? {...x, text: e.target.value} : x) }; setTriviaQuestions(nq); }} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button type="button" className="btn-outline !py-1 !px-2 text-[10px]" onClick={()=>setTriviaQuestions([...triviaQuestions, { question: '', answers: [{text:'',correct:true},{text:'',correct:false},{text:'',correct:false},{text:'',correct:false}], points: 10 }])}>+ Agregar pregunta</button>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-[10px] text-slate-600">Mensaje si acierta</label><input className="input text-xs" value={triviaSuccessMsg} onChange={e=>setTriviaSuccessMsg(e.target.value)} /></div>
                <div><label className="text-[10px] text-slate-600">Mensaje si falla</label><input className="input text-xs" value={triviaFailMsg} onChange={e=>setTriviaFailMsg(e.target.value)} /></div>
              </div>
            </div>
          )}

          {actionType === 'phrase' && (
            <div className="col-span-full space-y-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="text-xs font-medium text-amber-700 dark:text-amber-300">💬 Configuración de Frases</div>
              <div className="flex gap-3 text-[11px]">
                {(['motivational','funny','wisdom','custom'] as const).map(s => (
                  <label key={s} className="inline-flex items-center gap-1"><input type="radio" name="phrase-style" value={s} checked={phraseStyle===s} onChange={()=>setPhraseStyle(s)} /><span>{s === 'motivational' ? 'Motivacional' : s === 'funny' ? 'Divertida' : s === 'wisdom' ? 'Sabiduría' : 'Personalizada'}</span></label>
                ))}
              </div>
              {phrases.map((p, i) => (
                <div key={i} className="flex gap-1 items-center">
                  <input className="input flex-1 text-xs" placeholder={`Frase ${i+1}...`} value={p} onChange={e=>{ const np=[...phrases]; np[i]=e.target.value; setPhrases(np); }} />
                  {phrases.length > 1 && <button type="button" className="text-rose-500 text-xs" onClick={()=>setPhrases(phrases.filter((_,j)=>j!==i))}>✕</button>}
                </div>
              ))}
              <button type="button" className="btn-outline !py-1 !px-2 text-[10px]" onClick={()=>setPhrases([...phrases,''])}>+ Agregar frase</button>
              <p className="text-[10px] text-slate-500">Cada token mostrará una frase aleatoria del pool.</p>
            </div>
          )}

          {actionType === 'challenge' && (
            <div className="col-span-full space-y-3 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-xs font-medium text-green-700 dark:text-green-300">🎯 Configuración de Retos</div>
              <div className="flex gap-3 text-[11px]">
                {(['easy','medium','hard'] as const).map(d => (
                  <label key={d} className="inline-flex items-center gap-1"><input type="radio" name="challenge-diff" value={d} checked={challengeDifficulty===d} onChange={()=>setChallengeDifficulty(d)} /><span>{d==='easy'?'🟢 Fácil':d==='medium'?'🟡 Medio':'🔴 Difícil'}</span></label>
                ))}
              </div>
              {challenges.map((c, i) => (
                <div key={i} className="flex gap-1 items-center">
                  <input className="input flex-1 text-xs" placeholder={`Reto ${i+1}...`} value={c} onChange={e=>{ const nc=[...challenges]; nc[i]=e.target.value; setChallenges(nc); }} />
                  {challenges.length > 1 && <button type="button" className="text-rose-500 text-xs" onClick={()=>setChallenges(challenges.filter((_,j)=>j!==i))}>✕</button>}
                </div>
              ))}
              <button type="button" className="btn-outline !py-1 !px-2 text-[10px]" onClick={()=>setChallenges([...challenges,''])}>+ Agregar reto</button>
              <div className="flex items-center gap-2"><label className="text-[10px] text-slate-600"><input type="checkbox" checked={challengeRequiresValidation} onChange={e=>setChallengeRequiresValidation(e.target.checked)} className="mr-1" />Requiere validación del animador</label></div>
            </div>
          )}

          {actionType === 'raffle' && (
            <div className="col-span-full space-y-3 p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="text-xs font-medium text-purple-700 dark:text-purple-300">🎰 Configuración de Sorteo</div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-[10px] text-slate-600">Nombre del sorteo</label><input className="input text-xs" placeholder="Ej: Sorteo Gran Premio 10pm" value={raffleName} onChange={e=>setRaffleName(e.target.value)} /></div>
                <div><label className="text-[10px] text-slate-600">Máximo participantes</label><input type="number" min={10} max={9999} className="input text-xs" value={raffleMaxParticipants} onChange={e=>setRaffleMaxParticipants(Number(e.target.value)||999)} /></div>
              </div>
              <p className="text-[10px] text-slate-500">Cada token genera un número único de participación automáticamente.</p>
            </div>
          )}

          {actionType === 'message' && (
            <div className="col-span-full space-y-3 p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="text-xs font-medium text-orange-700 dark:text-orange-300">📢 Configuración de Mensaje</div>
              <div><label className="text-[10px] text-slate-600">Contenido HTML</label><textarea className="input text-xs" rows={4} placeholder="<h2>¡Bienvenidos!</h2><p>Disfruten la noche...</p>" value={messageHtml} onChange={e=>setMessageHtml(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-[10px] text-slate-600">Botón CTA (opcional)</label><input className="input text-xs" placeholder="Ver menú" value={messageCtaLabel} onChange={e=>setMessageCtaLabel(e.target.value)} /></div>
                <div><label className="text-[10px] text-slate-600">URL del CTA</label><input className="input text-xs" placeholder="https://..." value={messageCtaUrl} onChange={e=>setMessageCtaUrl(e.target.value)} /></div>
              </div>
            </div>
          )}

          {actionType === 'feedback' && (
            <div className="col-span-full space-y-3 p-3 bg-teal-50 dark:bg-teal-900/10 rounded-lg border border-teal-200 dark:border-teal-800">
              <div className="text-xs font-medium text-teal-700 dark:text-teal-300">✉️ Configuración de Feedback</div>
              <div><label className="text-[10px] text-slate-600">Pregunta / Prompt</label><input className="input text-xs" placeholder="¿Qué te pareció la noche?" value={feedbackPrompt} onChange={e=>setFeedbackPrompt(e.target.value)} /></div>
              <div><label className="text-[10px] text-slate-600">Placeholder del campo de texto</label><input className="input text-xs" placeholder="Escribe aquí tu mensaje…" value={feedbackPlaceholder} onChange={e=>setFeedbackPlaceholder(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-[10px] text-slate-600">Mínimo caracteres</label><input type="number" min={1} max={200} className="input text-xs" value={feedbackMinLength} onChange={e=>setFeedbackMinLength(Number(e.target.value)||5)} /></div>
                <div><label className="text-[10px] text-slate-600">Máximo caracteres</label><input type="number" min={10} max={2000} className="input text-xs" value={feedbackMaxLength} onChange={e=>setFeedbackMaxLength(Number(e.target.value)||500)} /></div>
              </div>
              <div><label className="text-[10px] text-slate-600">Mensaje de agradecimiento</label><input className="input text-xs" placeholder="¡Gracias por tu mensaje!" value={feedbackThankYou} onChange={e=>setFeedbackThankYou(e.target.value)} /></div>
              <p className="text-[10px] text-slate-500">El cliente escribe un mensaje. Al enviarlo, obtiene el QR de su premio.</p>
            </div>
          )}

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
            {isPrizeless ? (
              <div className="space-y-2">
                <label className="text-xs font-medium">Cantidad de tokens en el lote</label>
                <input type="number" min={1} max={100000} className="input w-40 text-xs" value={tokenCount} onChange={e => setTokenCount(Math.max(1, Number(e.target.value) || 1))} />
                <p className="text-[10px] text-slate-500">Este tipo de acción no consume premios. Los tokens se generan sin premio asociado.</p>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
          <div className="col-span-full flex items-center gap-3">
            <button type="button" className="btn text-xs" disabled={loading || totalRequested<=0} onClick={generate}>{loading ? 'Generando…' : 'Generar Lote Estático'}</button>
            {error && <span className="text-[11px] text-rose-600">{error}</span>}
            {success && <span className="text-[11px] text-emerald-600">{success}</span>}
          </div>
          <p className="col-span-full text-[10px] text-slate-500">{isPrizeless ? 'Las frases y mensajes no consumen premios. Solo aplican las reglas de validez (expiración, fecha, ventana horaria).' : 'Todos los tipos de lote consumen del mismo inventario de premios. El tipo de acción define la experiencia del token (canje directo, trivia, reto, etc.).'}</p>
        </div>
      </div>

      {/* Tabla de Emitidos */}
      {emitted.length > 0 && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <span className="text-sm font-medium">
              {activeBatch === 'ALL' ? 'Lotes estáticos emitidos' : 'Emitidos en lote seleccionado'}
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
