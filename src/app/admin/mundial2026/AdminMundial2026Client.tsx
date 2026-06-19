"use client";

import { useEffect, useState } from "react";

type AssignmentMode = "DIRECT_FIRST_N" | "RAFFLE";

type PrizeCatalogItem = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  color: string | null;
  stockTotal: number | null;
  stockReserved: number;
  stockClaimed: number;
  priority: number;
  claimWindowHours: number;
  active: boolean;
  assignedMatches: number;
  assignedPredictions: number;
};

type PrizeFormState = {
  id: string | null;
  key: string;
  label: string;
  description: string;
  stockTotal: string;
  priority: string;
  claimWindowHours: string;
  active: boolean;
};

type MatchFormState = {
  stage: string;
  homeTeam: string;
  awayTeam: string;
  startsAtLocal: string;
  predictionClosesAtLocal: string;
  externalKey: string;
};

type AssignmentDraft = {
  prizeId: string;
  assignmentMode: AssignmentMode;
  maxWinners: string;
  sortOrder: string;
};

type ExistingAssignmentDraft = {
  assignmentMode: AssignmentMode;
  maxWinners: string;
  sortOrder: string;
  active: boolean;
};

type MatchItem = {
  id: string;
  externalKey: string;
  stage: string | null;
  homeTeam: string;
  awayTeam: string;
  startsAt: string;
  predictionClosesAt: string;
  status: string;
  result: string | null;
  settledAt: string | null;
  canSettle: boolean;
  stats: {
    totalPredictions: number;
    won: number;
    available: number;
    redeemed: number;
  };
  prizes: Array<{
    id: string;
    prizeId: string;
    key: string;
    label: string;
    description: string | null;
    color: string | null;
    assignmentMode: string;
    maxWinners: number | null;
    sortOrder: number;
    active: boolean;
    stockTotal: number;
    stockReserved: number;
    stockClaimed: number;
    claimWindowHours: number | null;
  }>;
};

type SettlementResponse = {
  settlement: {
    winners: number;
    losers: number;
    assigned: number;
    rejectedWinners: number;
    totalPredictions: number;
  };
};

function getResultOptions(match: MatchItem) {
  return [
    { value: "HOME", label: `Gana ${match.homeTeam}` },
    { value: "DRAW", label: "Empate" },
    { value: "AWAY", label: `Gana ${match.awayTeam}` },
    { value: "VOID", label: "Void / anulado" },
  ] as const;
}

const ASSIGNMENT_MODE_OPTIONS = [
  { value: "DIRECT_FIRST_N", label: "Primeros N ganadores" },
  { value: "RAFFLE", label: "Sorteo / selección posterior" },
] as const;

const emptyPrizeForm: PrizeFormState = {
  id: null,
  key: "",
  label: "",
  description: "",
  stockTotal: "",
  priority: "0",
  claimWindowHours: "48",
  active: true,
};

const emptyMatchForm: MatchFormState = {
  stage: "",
  homeTeam: "",
  awayTeam: "",
  startsAtLocal: "",
  predictionClosesAtLocal: "",
  externalKey: "",
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function slugifyPrizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function createDefaultAssignmentDraft(): AssignmentDraft {
  return {
    prizeId: "",
    assignmentMode: "DIRECT_FIRST_N",
    maxWinners: "1",
    sortOrder: "0",
  };
}

export default function AdminMundial2026Client() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [prizes, setPrizes] = useState<PrizeCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingFor, setSubmittingFor] = useState<string | null>(null);
  const [catalogSaving, setCatalogSaving] = useState(false);
  const [matchSaving, setMatchSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});
  const [prizeForm, setPrizeForm] = useState<PrizeFormState>(emptyPrizeForm);
  const [matchForm, setMatchForm] = useState<MatchFormState>(emptyMatchForm);
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, AssignmentDraft>>({});
  const [existingAssignments, setExistingAssignments] = useState<Record<string, ExistingAssignmentDraft>>({});

  async function loadMatches() {
    const response = await fetch("/api/admin/mundial2026/matches", { credentials: "include" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.message || "No se pudieron cargar los partidos.");
    const nextMatches = payload.matches || [];
    setMatches(nextMatches);
    setResults((current) => {
      const next = { ...current };
      nextMatches.forEach((match: MatchItem) => {
        if (!next[match.id]) next[match.id] = match.result || "HOME";
      });
      return next;
    });
    setAssignmentDrafts((current) => {
      const next = { ...current };
      nextMatches.forEach((match: MatchItem, index: number) => {
        if (!next[match.id]) {
          next[match.id] = {
            ...createDefaultAssignmentDraft(),
            sortOrder: String((index + 1) * 10),
          };
        }
      });
      return next;
    });
    setExistingAssignments(() => {
      const next: Record<string, ExistingAssignmentDraft> = {};
      nextMatches.forEach((match: MatchItem) => {
        match.prizes.forEach((prize) => {
          next[prize.id] = {
            assignmentMode: prize.assignmentMode as AssignmentMode,
            maxWinners: prize.maxWinners ? String(prize.maxWinners) : "",
            sortOrder: String(prize.sortOrder ?? 0),
            active: prize.active,
          };
        });
      });
      return next;
    });
  }

  async function loadPrizes() {
    const response = await fetch("/api/admin/mundial2026/prizes", { credentials: "include" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.message || "No se pudieron cargar los premios.");
    setPrizes(payload.prizes || []);
  }

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadMatches(), loadPrizes()]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los partidos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  async function handleSettle(matchId: string) {
    setSubmittingFor(matchId);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/admin/mundial2026/matches/${matchId}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ result: results[matchId] || "HOME" }),
      });
      const payload = (await response.json()) as SettlementResponse & { message?: string };
      if (!response.ok) throw new Error(payload?.message || "No se pudo liquidar el partido.");
      setMessage(
        `Liquidación aplicada: ${payload.settlement.winners} ganadores, ${payload.settlement.assigned} premios desbloqueados, ${payload.settlement.rejectedWinners} ganadores sin premio.`
      );
      await loadAll();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo liquidar el partido.");
    } finally {
      setSubmittingFor(null);
    }
  }

  async function handleSavePrize() {
    setCatalogSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload = {
        key: prizeForm.key.trim(),
        label: prizeForm.label.trim(),
        description: prizeForm.description.trim(),
        stockTotal: prizeForm.stockTotal.trim() ? Number(prizeForm.stockTotal) : null,
        priority: Number(prizeForm.priority || 0),
        claimWindowHours: Number(prizeForm.claimWindowHours || 48),
        active: prizeForm.active,
      };
      const response = await fetch(
        prizeForm.id ? `/api/admin/mundial2026/prizes/${prizeForm.id}` : "/api/admin/mundial2026/prizes",
        {
          method: prizeForm.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body?.message || "No se pudo guardar el premio.");
      setMessage(prizeForm.id ? "Premio actualizado." : "Premio creado y disponible para asignar.");
      setPrizeForm(emptyPrizeForm);
      await loadAll();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el premio.");
    } finally {
      setCatalogSaving(false);
    }
  }

  async function handleCreateMatch() {
    if (!matchForm.homeTeam.trim() || !matchForm.awayTeam.trim() || !matchForm.startsAtLocal.trim()) {
      setError("Completa local, visita y fecha/hora del partido.");
      setMessage(null);
      return;
    }

    setMatchSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload = {
        stage: matchForm.stage.trim(),
        homeTeam: matchForm.homeTeam.trim(),
        awayTeam: matchForm.awayTeam.trim(),
        startsAt: new Date(matchForm.startsAtLocal).toISOString(),
        predictionClosesAt: matchForm.predictionClosesAtLocal.trim() ? new Date(matchForm.predictionClosesAtLocal).toISOString() : "",
        externalKey: matchForm.externalKey.trim(),
      };
      const response = await fetch("/api/admin/mundial2026/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.message || "No se pudo crear el partido.");
      setMessage("Partido creado y agregado al fixture admin.");
      setMatchForm(emptyMatchForm);
      await loadMatches();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear el partido.");
    } finally {
      setMatchSaving(false);
    }
  }

  async function handleDeletePrize(prizeId: string) {
    if (typeof window !== "undefined" && !window.confirm("Se eliminará este premio del catálogo y de los partidos donde aún esté asignado. ¿Continuar?")) {
      return;
    }
    setCatalogSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/admin/mundial2026/prizes/${prizeId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.message || "No se pudo eliminar el premio.");
      setMessage("Premio eliminado del catálogo.");
      if (prizeForm.id === prizeId) {
        setPrizeForm(emptyPrizeForm);
      }
      await loadAll();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el premio.");
    } finally {
      setCatalogSaving(false);
    }
  }

  async function handleAddPrizeToMatch(matchId: string) {
    const draft = assignmentDrafts[matchId] || createDefaultAssignmentDraft();
    setSubmittingFor(matchId);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/admin/mundial2026/matches/${matchId}/prizes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          prizeId: draft.prizeId,
          assignmentMode: draft.assignmentMode,
          maxWinners: draft.maxWinners.trim() ? Number(draft.maxWinners) : null,
          sortOrder: Number(draft.sortOrder || 0),
          active: true,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.message || "No se pudo asignar el premio al partido.");
      setMessage("Premio asignado al partido.");
      setAssignmentDrafts((current) => ({
        ...current,
        [matchId]: createDefaultAssignmentDraft(),
      }));
      await loadMatches();
      await loadPrizes();
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : "No se pudo asignar el premio al partido.");
    } finally {
      setSubmittingFor(null);
    }
  }

  async function handleSaveExistingAssignment(matchId: string, matchPrizeId: string) {
    const draft = existingAssignments[matchPrizeId];
    if (!draft) return;
    setSubmittingFor(matchPrizeId);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/admin/mundial2026/matches/${matchId}/prizes/${matchPrizeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          assignmentMode: draft.assignmentMode,
          maxWinners: draft.maxWinners.trim() ? Number(draft.maxWinners) : null,
          sortOrder: Number(draft.sortOrder || 0),
          active: draft.active,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.message || "No se pudo actualizar la asignación.");
      setMessage("Asignación actualizada.");
      await loadMatches();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "No se pudo actualizar la asignación.");
    } finally {
      setSubmittingFor(null);
    }
  }

  async function handleDeleteAssignment(matchId: string, matchPrizeId: string) {
    if (typeof window !== "undefined" && !window.confirm("Se quitará este premio del partido. ¿Continuar?")) {
      return;
    }
    setSubmittingFor(matchPrizeId);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/admin/mundial2026/matches/${matchId}/prizes/${matchPrizeId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.message || "No se pudo quitar el premio del partido.");
      setMessage("Premio retirado del partido.");
      await loadMatches();
      await loadPrizes();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo quitar el premio del partido.");
    } finally {
      setSubmittingFor(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
        <h1 className="text-3xl font-black text-white">Control Mundial 2026</h1>
        <p className="mt-2 text-sm text-slate-300">
          Administra el catálogo de premios, asígnalos al fixture y luego liquida resultados cuando corresponda.
        </p>
      </div>

      {message ? <div className="alert alert-success">{message}</div> : null}
      {error ? <div className="alert alert-danger">{error}</div> : null}

      {loading ? (
        <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6 text-sm text-slate-300">Cargando partidos...</div>
      ) : (
        <>
          <section className="grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Fixture cargado</div>
              <div className="mt-2 text-4xl font-black text-white">{matches.length}</div>
              <p className="mt-2 text-sm text-slate-300">
                El app ya conserva el fixture preprogramado del Mundial 2026 y cubre la programación publicada hasta el 27 de junio. Desde aquí también puedes agregar partidos manuales.
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Registrar partido manual</div>
              <div className="mt-2 text-2xl font-black text-white">Agregar un partido al fixture</div>
              <p className="mt-2 text-sm text-slate-300">
                Úsalo para sumar cruces nuevos o correcciones operativas sin tocar el seed base del torneo.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Fase o etiqueta</span>
                  <input
                    className="input bg-slate-950/45 text-white"
                    value={matchForm.stage}
                    onChange={(event) => setMatchForm((current) => ({ ...current, stage: event.target.value }))}
                    placeholder="Ej. Octavos / Manual"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Equipo local</span>
                  <input
                    className="input bg-slate-950/45 text-white"
                    value={matchForm.homeTeam}
                    onChange={(event) => setMatchForm((current) => ({ ...current, homeTeam: event.target.value }))}
                    placeholder="Equipo local"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Equipo visita</span>
                  <input
                    className="input bg-slate-950/45 text-white"
                    value={matchForm.awayTeam}
                    onChange={(event) => setMatchForm((current) => ({ ...current, awayTeam: event.target.value }))}
                    placeholder="Equipo visitante"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Inicio del partido</span>
                  <input
                    type="datetime-local"
                    className="input bg-slate-950/45 text-white"
                    value={matchForm.startsAtLocal}
                    onChange={(event) => setMatchForm((current) => ({ ...current, startsAtLocal: event.target.value }))}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Cierre de pronóstico</span>
                  <input
                    type="datetime-local"
                    className="input bg-slate-950/45 text-white"
                    value={matchForm.predictionClosesAtLocal}
                    onChange={(event) => setMatchForm((current) => ({ ...current, predictionClosesAtLocal: event.target.value }))}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Clave externa opcional</span>
                  <input
                    className="input bg-slate-950/45 text-white"
                    value={matchForm.externalKey}
                    onChange={(event) => setMatchForm((current) => ({ ...current, externalKey: event.target.value }))}
                    placeholder="fwc26-manual-001"
                  />
                </label>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button className="btn rounded-full px-6" type="button" onClick={() => void handleCreateMatch()} disabled={matchSaving}>
                  {matchSaving ? "Guardando..." : "Crear partido"}
                </button>
                <button className="btn btn-secondary rounded-full px-6" type="button" onClick={() => setMatchForm(emptyMatchForm)} disabled={matchSaving}>
                  Limpiar
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Catálogo de premios</div>
              <div className="mt-2 text-2xl font-black text-white">Crear o editar premios identificables</div>
              <p className="mt-2 text-sm text-slate-300">
                Define la clave interna del token, el label visible, stock y ventana de canje. El color se asigna automáticamente al guardar.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Label visible</span>
                  <input
                    className="input bg-slate-950/45 text-white"
                    value={prizeForm.label}
                    onChange={(event) => {
                      const label = event.target.value;
                      setPrizeForm((current) => ({
                        ...current,
                        label,
                        key: current.id ? current.key : slugifyPrizeKey(label),
                      }));
                    }}
                    placeholder="Ej. Token barra mundialista"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Clave interna</span>
                  <input
                    className="input bg-slate-950/45 text-white"
                    value={prizeForm.key}
                    onChange={(event) => setPrizeForm((current) => ({ ...current, key: slugifyPrizeKey(event.target.value) }))}
                    placeholder="token-barra-mundialista"
                  />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Descripción</span>
                  <textarea
                    className="input min-h-[96px] bg-slate-950/45 text-white"
                    value={prizeForm.description}
                    onChange={(event) => setPrizeForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Describe el premio o token para identificarlo rápido en operación."
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Stock base</span>
                  <input
                    className="input bg-slate-950/45 text-white"
                    value={prizeForm.stockTotal}
                    onChange={(event) => setPrizeForm((current) => ({ ...current, stockTotal: event.target.value }))}
                    placeholder="50"
                    inputMode="numeric"
                  />
                  <span className="block text-[11px] leading-5 text-slate-500">En Mundial 2026, el stock efectivo se sincroniza automáticamente con el mayor valor de Max configurado en los partidos.</span>
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Prioridad</span>
                  <input
                    className="input bg-slate-950/45 text-white"
                    value={prizeForm.priority}
                    onChange={(event) => setPrizeForm((current) => ({ ...current, priority: event.target.value }))}
                    inputMode="numeric"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Horas de canje</span>
                  <input
                    className="input bg-slate-950/45 text-white"
                    value={prizeForm.claimWindowHours}
                    onChange={(event) => setPrizeForm((current) => ({ ...current, claimWindowHours: event.target.value }))}
                    inputMode="numeric"
                  />
                </label>
              </div>

              <label className="mt-4 inline-flex items-center gap-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={prizeForm.active}
                  onChange={(event) => setPrizeForm((current) => ({ ...current, active: event.target.checked }))}
                />
                Premio activo
              </label>

              <div className="mt-5 flex flex-wrap gap-3">
                <button className="btn rounded-full px-6" type="button" onClick={() => void handleSavePrize()} disabled={catalogSaving}>
                  {catalogSaving ? "Guardando..." : prizeForm.id ? "Actualizar premio" : "Crear premio"}
                </button>
                <button className="btn btn-secondary rounded-full px-6" type="button" onClick={() => setPrizeForm(emptyPrizeForm)} disabled={catalogSaving}>
                  Limpiar formulario
                </button>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Premios creados</div>
              <div className="mt-2 text-2xl font-black text-white">Catálogo listo para asignar</div>
              <div className="mt-4 grid gap-3 max-h-[620px] overflow-y-auto pr-1">
                {prizes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/15 px-4 py-6 text-sm text-slate-400">
                    Aún no hay premios cargados. Crea el primero y luego asígnalo a los partidos del fixture.
                  </div>
                ) : (
                  prizes.map((prize) => (
                    <div key={prize.id} className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{prize.key}</div>
                          <div className="mt-1 text-lg font-bold" style={prize.color ? { color: prize.color } : undefined}>{prize.label}</div>
                        </div>
                        <span className={["inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]", prize.active ? "bg-emerald-400/15 text-emerald-200" : "bg-slate-400/15 text-slate-200"].join(" ")}>
                          {prize.active ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                      {prize.description ? <div className="mt-2 text-sm text-slate-300">{prize.description}</div> : null}
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                        <span>Stock {prize.stockClaimed + prize.stockReserved}/{prize.stockTotal ?? "sin límite"}</span>
                        <span>Prioridad {prize.priority}</span>
                        <span>Ventana {prize.claimWindowHours}h</span>
                        <span>{prize.assignedMatches} partidos</span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          className="btn btn-secondary rounded-full px-5"
                          type="button"
                          onClick={() =>
                            setPrizeForm({
                              id: prize.id,
                              key: prize.key,
                              label: prize.label,
                              description: prize.description || "",
                              stockTotal: prize.stockTotal ? String(prize.stockTotal) : "",
                              priority: String(prize.priority),
                              claimWindowHours: String(prize.claimWindowHours),
                              active: prize.active,
                            })
                          }
                        >
                          Editar
                        </button>
                        <button className="btn btn-secondary rounded-full px-5" type="button" onClick={() => void handleDeletePrize(prize.id)} disabled={catalogSaving || prize.assignedPredictions > 0}>
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <div className="grid gap-4">
          {matches.map((match) => (
            <section key={match.id} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{match.stage || "Partido"}</div>
                  <div className="mt-2 text-2xl font-black text-white">
                    {match.homeTeam} <span className="text-slate-500">vs</span> {match.awayTeam}
                  </div>
                  <div className="mt-2 text-sm text-slate-300">Empieza {formatDate(match.startsAt)}</div>
                  <div className="text-sm text-slate-400">Estado actual: {match.status}</div>
                  <div className="text-sm text-slate-400">Resultado: {match.result || "pendiente"}</div>
                  <div className="text-sm text-slate-400">Liquidado: {formatDate(match.settledAt)}</div>
                </div>

                <div className="grid min-w-[240px] gap-3 rounded-2xl border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-200">
                  <div>Total jugadas: {match.stats.totalPredictions}</div>
                  <div>Ganadas: {match.stats.won}</div>
                  <div>Disponibles: {match.stats.available}</div>
                  <div>Canjeadas: {match.stats.redeemed}</div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Premios asignados</div>
                    <div className="text-xs text-slate-500">Configura por partido directamente desde esta pantalla.</div>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {match.prizes.length === 0 ? (
                      <div className="text-sm text-slate-400">Este partido aún no tiene premios asignados.</div>
                    ) : (
                      match.prizes.map((prize) => (
                        <div key={prize.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-200">
                          <div className="min-w-0">
                            <div className="min-w-0">
                              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{prize.key}</div>
                              <div className="font-semibold" style={prize.color ? { color: prize.color } : undefined}>{prize.label}</div>
                              <div className="mt-1 text-xs text-slate-400">
                                stock {prize.stockReserved + prize.stockClaimed}/{prize.stockTotal} · el stock se sincroniza con Max · ventana {prize.claimWindowHours ?? 48}h
                              </div>
                            </div>
                            <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_92px_92px] xl:grid-cols-[minmax(0,1.4fr)_92px_92px_auto] xl:items-end">
                              <label className="space-y-1 min-w-0 sm:col-span-2 lg:col-span-1">
                                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Modo</span>
                                <select
                                  className="input h-10 w-full min-w-0 bg-slate-950/45 text-white"
                                  value={existingAssignments[prize.id]?.assignmentMode || "DIRECT_FIRST_N"}
                                  onChange={(event) =>
                                    setExistingAssignments((current) => ({
                                      ...current,
                                      [prize.id]: {
                                        ...(current[prize.id] || { assignmentMode: "DIRECT_FIRST_N", maxWinners: "", sortOrder: "0", active: true }),
                                        assignmentMode: event.target.value as AssignmentMode,
                                      },
                                    }))
                                  }
                                >
                                  {ASSIGNMENT_MODE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="space-y-1">
                                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Max</span>
                                <input
                                  className="input h-10 w-full min-w-0 bg-slate-950/45 text-white"
                                  value={existingAssignments[prize.id]?.maxWinners || ""}
                                  onChange={(event) =>
                                    setExistingAssignments((current) => ({
                                      ...current,
                                      [prize.id]: {
                                        ...(current[prize.id] || { assignmentMode: "DIRECT_FIRST_N", maxWinners: "", sortOrder: "0", active: true }),
                                        maxWinners: event.target.value,
                                      },
                                    }))
                                  }
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Orden</span>
                                <input
                                  className="input h-10 w-full min-w-0 bg-slate-950/45 text-white"
                                  value={existingAssignments[prize.id]?.sortOrder || "0"}
                                  onChange={(event) =>
                                    setExistingAssignments((current) => ({
                                      ...current,
                                      [prize.id]: {
                                        ...(current[prize.id] || { assignmentMode: "DIRECT_FIRST_N", maxWinners: "", sortOrder: "0", active: true }),
                                        sortOrder: event.target.value,
                                      },
                                    }))
                                  }
                                />
                              </label>
                              <div className="grid gap-2 sm:col-span-2 lg:col-span-3 xl:col-span-1 xl:grid-cols-2">
                                <button className="btn btn-secondary h-10 w-full justify-center rounded-full px-4" type="button" onClick={() => void handleSaveExistingAssignment(match.id, prize.id)} disabled={submittingFor === prize.id}>
                                  Guardar
                                </button>
                                <button className="btn btn-secondary h-10 w-full justify-center rounded-full px-4" type="button" onClick={() => void handleDeleteAssignment(match.id, prize.id)} disabled={submittingFor === prize.id}>
                                  Quitar
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}

                    <div className="mt-3 rounded-2xl border border-dashed border-white/15 bg-slate-950/20 p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Asignar nuevo premio</div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_92px_92px_auto] xl:items-end">
                        <label className="space-y-1 min-w-0 md:col-span-2 xl:col-span-1">
                          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Premio</span>
                          <select
                            className="input w-full min-w-0 bg-slate-950/45 text-white"
                            value={assignmentDrafts[match.id]?.prizeId || ""}
                            onChange={(event) =>
                              setAssignmentDrafts((current) => ({
                                ...current,
                                [match.id]: {
                                  ...(current[match.id] || createDefaultAssignmentDraft()),
                                  prizeId: event.target.value,
                                },
                              }))
                            }
                          >
                            <option value="">Selecciona un premio del catálogo</option>
                            {prizes
                              .filter((prize) => !match.prizes.some((assigned) => assigned.prizeId === prize.id))
                              .map((prize) => (
                                <option key={prize.id} value={prize.id}>{prize.label} · {prize.key}</option>
                              ))}
                          </select>
                        </label>
                        <label className="space-y-1 min-w-0">
                          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Modo</span>
                          <select
                            className="input w-full min-w-0 bg-slate-950/45 text-white"
                            value={assignmentDrafts[match.id]?.assignmentMode || "DIRECT_FIRST_N"}
                            onChange={(event) =>
                              setAssignmentDrafts((current) => ({
                                ...current,
                                [match.id]: {
                                  ...(current[match.id] || createDefaultAssignmentDraft()),
                                  assignmentMode: event.target.value as AssignmentMode,
                                },
                              }))
                            }
                          >
                            {ASSIGNMENT_MODE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-1">
                          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Max</span>
                          <input
                            className="input w-full min-w-0 bg-slate-950/45 text-white"
                            value={assignmentDrafts[match.id]?.maxWinners || "1"}
                            onChange={(event) =>
                              setAssignmentDrafts((current) => ({
                                ...current,
                                [match.id]: {
                                  ...(current[match.id] || createDefaultAssignmentDraft()),
                                  maxWinners: event.target.value,
                                },
                              }))
                            }
                            placeholder="Max"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Orden</span>
                          <input
                            className="input w-full min-w-0 bg-slate-950/45 text-white"
                            value={assignmentDrafts[match.id]?.sortOrder || "0"}
                            onChange={(event) =>
                              setAssignmentDrafts((current) => ({
                                ...current,
                                [match.id]: {
                                  ...(current[match.id] || createDefaultAssignmentDraft()),
                                  sortOrder: event.target.value,
                                },
                              }))
                            }
                            placeholder="Orden"
                          />
                        </label>
                        <button
                          className="btn w-full justify-center self-end rounded-full px-5"
                          type="button"
                          onClick={() => void handleAddPrizeToMatch(match.id)}
                          disabled={submittingFor === match.id || !(assignmentDrafts[match.id]?.prizeId || "")}
                        >
                          Asignar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Asentar resultado</div>
                  <div className="mt-3 space-y-4">
                    <select
                      className="input bg-slate-950/45 text-white"
                      value={results[match.id] || "HOME"}
                      onChange={(event) => setResults((current) => ({ ...current, [match.id]: event.target.value }))}
                      disabled={!match.canSettle || submittingFor === match.id}
                    >
                      {getResultOptions(match).map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <button
                      className="btn w-full justify-center"
                      type="button"
                      onClick={() => void handleSettle(match.id)}
                      disabled={!match.canSettle || submittingFor === match.id}
                    >
                      {submittingFor === match.id ? "Liquidando..." : match.canSettle ? "Confirmar y liquidar" : "Ya liquidado"}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ))}
          </div>
        </>
      )}
    </div>
  );
}
