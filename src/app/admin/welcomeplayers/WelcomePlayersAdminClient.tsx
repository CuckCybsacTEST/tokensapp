"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

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
  id: string;
  label: string;
  description: string;
  status: "active" | "inactive";
  weight: number;
};

const EMPTY_FORM: PrizeForm = {
  id: "",
  label: "",
  description: "",
  status: "active",
  weight: 1,
};

export default function WelcomePlayersAdminClient() {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<PrizeForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [stats, setStats] = useState<{ totalSpins: number; activePrizes: number } | null>(null);

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
        });
      }
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar la configuración");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const sorted = useMemo(() => [...prizes].sort((a, b) => a.order - b.order), [prizes]);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setMessage(null);
  };

  const savePrize = () => {
    if (!form.label.trim()) {
      setError("El label es requerido");
      return;
    }

    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const payload = {
          label: form.label.trim(),
          description: form.description.trim() || null,
          status: form.status,
          weight: Number(form.weight) || 1,
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
      id: prize.id,
      label: prize.label,
      description: prize.description || "",
      status: prize.status,
      weight: prize.weight,
    });
    setMessage(null);
    setError(null);
  };

  const deletePrize = (prize: Prize) => {
    if (!window.confirm(`Eliminar "${prize.label}"?`)) return;
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

  const resetToDefaults = () => {
    if (!window.confirm("¿Restaurar los premios base? Se agregará la configuración inicial si faltara.")) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/welcomeplayers/prizes/reset", { method: "POST" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          throw new Error(data?.message || "No se pudo restaurar");
        }
        setMessage("Configuración recargada");
        await loadAll();
      } catch (err: any) {
        setError(err?.message || "No se pudo restaurar");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Welcome Players</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Configuración de la ruleta pública independiente.
            </p>
          </div>
          <div className="flex gap-2">
            <a href="/welcomeplayers" className="btn-outline text-xs">
              Ver pública
            </a>
            <button onClick={resetToDefaults} className="btn-outline text-xs" type="button" disabled={pending}>
              Restaurar base
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label="Premios activos" value={stats?.activePrizes ?? sorted.filter((p) => p.status === "active").length} />
          <Stat label="Giros totales" value={stats?.totalSpins ?? 0} />
          <Stat label="Premios configurados" value={sorted.length} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {editingId ? "Editar premio" : "Crear premio"}
            </h2>
            {editingId && (
              <button type="button" className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-300" onClick={resetForm}>
                Cancelar edición
              </button>
            )}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Label">
              <input className="input" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
            </Field>
            <Field label="Peso">
              <input className="input" type="number" min={1} value={form.weight} onChange={(e) => setForm((f) => ({ ...f, weight: Number(e.target.value) }))} />
            </Field>
            <Field label="Estado">
              <select className="input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as PrizeForm["status"] }))}>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </Field>
            <Field label="Descripción">
              <input className="input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </Field>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-300">
            El color y el orden se asignan automáticamente para mantener la ruleta coherente y sin colores repetidos contiguos.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={savePrize} disabled={pending}>
              {editingId ? "Guardar cambios" : "Crear premio"}
            </button>
            <button type="button" className="btn-outline" onClick={resetForm}>
              Limpiar
            </button>
          </div>

          {(message || error) && (
            <div className={`mt-4 rounded-xl px-4 py-3 text-sm ${error ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}>
              {error || message}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Vista pública</h2>
            {loading && <span className="text-xs text-slate-500">Cargando…</span>}
          </div>
          <div className="mt-4 space-y-3">
            {sorted.map((prize) => (
              <div key={prize.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full border border-slate-300" style={{ background: prize.color }} />
                      <div className="font-semibold text-slate-900 dark:text-slate-50">{prize.label}</div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] ${prize.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-500/10 text-slate-500"}`}>
                        {prize.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">{prize.description || "Sin descripción"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" className="btn-outline text-xs" onClick={() => editPrize(prize)}>
                      Editar
                    </button>
                    <button type="button" className="btn-danger text-xs" onClick={() => deletePrize(prize)}>
                      Eliminar
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex gap-2 text-xs text-slate-500">
                  <span>Orden: {prize.order}</span>
                  <span>Peso: {prize.weight}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-900/60">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-black text-slate-900 dark:text-slate-50">{value}</div>
    </div>
  );
}
