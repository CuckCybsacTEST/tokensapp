"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { IconEdit, IconEye, IconPlus, IconRefresh, IconTrash, IconX } from "@tabler/icons-react";

type Prize = {
  id: string;
  label: string;
  description: string | null;
  color: string;
  status: "active" | "inactive";
  weight: number;
  order: number;
  createdAt: string;
  updatedAt: string;
};

type PrizeForm = {
  label: string;
};

type DeliveredSpin = {
  spinId: string;
  label: string;
  createdAt: string;
};

const EMPTY_FORM: PrizeForm = {
  label: "",
};

export default function WelcomePlayersCoordinatorClient() {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [stats, setStats] = useState<{ totalSpins: number; activePrizes: number; recentSpins?: DeliveredSpin[] } | null>(null);
  const [showDeliveredModal, setShowDeliveredModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<PrizeForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPrizesModal, setShowPrizesModal] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [configRes, statsRes] = await Promise.all([
        fetch("/api/admin/welcomeplayers/prizes", { cache: "no-store" }),
        fetch("/api/welcomeplayers/stats", { cache: "no-store" }),
      ]);

      const configData = await configRes.json().catch(() => null);
      const statsData = await statsRes.json().catch(() => null);

      if (configData?.ok) {
        setPrizes(Array.isArray(configData.prizes) ? configData.prizes : configData.data?.prizes || []);
      }

      if (statsData?.ok) {
        setStats({
          totalSpins: statsData.totalSpins ?? 0,
          activePrizes: statsData.activePrizes ?? 0,
          recentSpins: Array.isArray(statsData.recentSpins) ? statsData.recentSpins : [],
        });
      }
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar la ruleta");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const sortedPrizes = useMemo(() => [...prizes].sort((a, b) => a.order - b.order), [prizes]);
  const configuredCount = sortedPrizes.length;

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setMessage(null);
  };

  const openPrizesModal = () => setShowPrizesModal(true);
  const closePrizesModal = () => setShowPrizesModal(false);
  const openDeliveredModal = () => setShowDeliveredModal(true);
  const closeDeliveredModal = () => setShowDeliveredModal(false);

  const resetRoulette = () => {
    if (!window.confirm("¿Reiniciar la ruleta? Esto borrará todos los premios configurados y dejará la sesión en blanco.")) {
      return;
    }

    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/welcomeplayers/prizes/reset", { method: "POST" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          throw new Error(data?.message || "No se pudo reiniciar la ruleta");
        }

        setMessage("Ruleta reiniciada");
        resetForm();
        await loadAll();
      } catch (err: any) {
        setError(err?.message || "No se pudo reiniciar la ruleta");
      }
    });
  };

  const savePrize = () => {
    if (!form.label.trim()) {
      setError("El nombre del premio es requerido");
      return;
    }

    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        const payload = {
          label: form.label.trim(),
        };

        const res = editingId
          ? await fetch(`/api/admin/welcomeplayers/prizes/${editingId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch("/api/admin/welcomeplayers/prizes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          throw new Error(data?.message || "No se pudo guardar");
        }

        setMessage(editingId ? "Premio actualizado" : "Premio creado");
        resetForm();
        await loadAll();
      } catch (err: any) {
        setError(err?.message || "No se pudo guardar");
      }
    });
  };

  const editPrize = (prize: Prize) => {
    setEditingId(prize.id);
    setForm({
      label: prize.label,
    });
    setMessage(null);
    setError(null);
  };

  const deletePrize = (prize: Prize) => {
    if (!window.confirm(`¿Eliminar "${prize.label}"?`)) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/welcomeplayers/prizes/${prize.id}`, { method: "DELETE" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          throw new Error(data?.message || "No se pudo eliminar");
        }

        setMessage("Premio eliminado");
        await loadAll();
      } catch (err: any) {
        setError(err?.message || "No se pudo eliminar");
      }
    });
  };

  return (
    <div className="w-full max-w-full space-y-5 overflow-x-hidden px-0">
      <section className="w-full min-w-0 rounded-[28px] border border-white/10 bg-[#070A12] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.35)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0" />

        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={openDeliveredModal} className="text-left">
            <MetricCard label="PREMIOS ENTREGADOS" value={stats?.totalSpins ?? 0} accent="from-fuchsia-500 to-rose-400" interactive />
          </button>
          <button type="button" onClick={openPrizesModal} className="text-left">
            <MetricCard
              label="PREMIOS CONFIGURADOS"
              value={configuredCount}
              accent="from-amber-400 to-orange-500"
              interactive
            />
          </button>
        </div>
      </section>

      <div className="grid w-full min-w-0 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="w-full min-w-0 rounded-[28px] border border-white/10 bg-[#090D17] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.28)] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-white">{editingId ? "Editar premio" : "Nuevo premio"}</h2>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:text-white"
              >
                Cancelar edicion
              </button>
            )}
          </div>

          <div className="mt-5 space-y-4">
            <Field label="Nombre del premio">
              <input
                value={form.label}
                onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
                className="w-full min-w-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-fuchsia-400/60 focus:bg-white/10"
                placeholder="Ej. Shot gratis"
              />
            </Field>

          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={savePrize}
              disabled={pending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
            >
              <IconPlus className="h-4 w-4" />
              {editingId ? "Guardar cambios" : "Agregar premio"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              Cancelar
            </button>
          </div>

          {(message || error) && (
            <div
              className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
                error ? "border-rose-500/20 bg-rose-500/10 text-rose-200" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
              }`}
            >
              {error || message}
            </div>
          )}

        </section>
      </div>

      <div className="flex w-full flex-wrap justify-center gap-2">
        <Link
          href="/welcomeplayers"
          className="inline-flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
        >
          <IconEye className="h-4 w-4" />
          Ver ruleta
        </Link>
        <button
          type="button"
          onClick={resetRoulette}
          className="inline-flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
        >
          <IconRefresh className="h-4 w-4" />
          Reiniciar ruleta
        </button>
      </div>

      {showPrizesModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center sm:p-6" onClick={closePrizesModal}>
          <div
            className="max-h-[85vh] w-full max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[28px] border border-white/10 bg-[#070A12] shadow-[0_30px_90px_rgba(0,0,0,0.45)] sm:max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-white">Premios configurados</h3>
                <p className="mt-1 text-xs text-slate-400">Edita o elimina desde aqui sin salir de la pantalla.</p>
              </div>
              <button
                type="button"
                onClick={closePrizesModal}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:bg-white/10"
                aria-label="Cerrar"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[calc(85vh-88px)] overflow-y-auto px-4 py-4 sm:px-5">
              <div className="space-y-3">
                {sortedPrizes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-slate-400">
                    No hay premios creados todavia.
                  </div>
                ) : (
                  sortedPrizes.map((prize) => (
                    <article key={prize.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="h-4 w-4 flex-shrink-0 rounded-full border border-white/15" style={{ backgroundColor: prize.color }} />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="truncate text-sm font-semibold text-white">{prize.label}</h4>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                                  prize.status === "active"
                                    ? "bg-emerald-500/15 text-emerald-200"
                                    : "bg-slate-500/15 text-slate-300"
                                }`}
                              >
                                {prize.status === "active" ? "Activo" : "Inactivo"}
                              </span>
                            </div>
                            <div className="mt-1 text-[11px] text-slate-400">Orden {prize.order}</div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              editPrize(prize);
                              closePrizesModal();
                            }}
                            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/10"
                          >
                            <IconEdit className="h-3.5 w-3.5" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => deletePrize(prize)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-200 transition hover:bg-rose-500/20"
                          >
                            <IconTrash className="h-3.5 w-3.5" />
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeliveredModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center sm:p-6" onClick={closeDeliveredModal}>
          <div
            className="max-h-[85vh] w-full max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[28px] border border-white/10 bg-[#070A12] shadow-[0_30px_90px_rgba(0,0,0,0.45)] sm:max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-white">Premios entregados</h3>
                <p className="mt-1 text-xs text-slate-400">Historial reciente de premios ya salidos en la ruleta.</p>
              </div>
              <button
                type="button"
                onClick={closeDeliveredModal}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:bg-white/10"
                aria-label="Cerrar"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[calc(85vh-88px)] overflow-y-auto px-4 py-4 sm:px-5">
              {stats?.recentSpins?.length ? (
                <div className="space-y-3">
                  {stats.recentSpins.map((spin) => (
                    <article key={spin.spinId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white">{spin.label}</div>
                          <div className="mt-1 text-[11px] text-slate-400">
                            {new Date(spin.createdAt).toLocaleString("es-PE", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                          Entregado
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-slate-400">
                  Todavía no hay premios entregados.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function MetricCard({
  label,
  value,
  accent,
  interactive = false,
}: {
  label: string;
  value: number;
  accent: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:p-5 ${
        interactive ? "transition hover:bg-white/[0.06]" : ""
      }`}
    >
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />
      <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">{label}</div>
      <div className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">{value}</div>
    </div>
  );
}
