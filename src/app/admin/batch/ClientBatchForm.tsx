"use client";
import React from "react";

export default function ClientBatchForm() {
  return (
    <div className="prose dark:prose-invert max-w-md">
      <h2>Vista deprecada</h2>
      <p>
        La generación manual fue deshabilitada. Usa el flujo <strong>auto batch</strong> en{" "}
        <code>/admin/prizes</code>.
      </p>
    </div>
  );
}

/* Código antiguo retenido temporalmente por si se necesita referencia histórica.
  const expirationPresets = [1, 3, 7, 15, 30];
  const [rows, setRows] = useState([
    { prizeId: "", count: "", expirationDays: 7 as number | "custom", customExpiration: "" },
  ]);
  const [includeQr, setIncludeQr] = useState(true);
  const [description, setDescription] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [errors, setErrors] = useState<string | null>(null);

  function updateRow(idx: number, patch: Partial<(typeof rows)[number]>) {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }
  function addRow() {
    setRows((r) => [...r, { prizeId: "", count: "", expirationDays: 7, customExpiration: "" }]);
  }
  function removeRow(i: number) {
    setRows((r) => (r.length === 1 ? r : r.filter((_, idx) => idx !== i)));
  }

  function validate() {
    const used = new Set<string>();
    for (const row of rows) {
      if (!row.prizeId) return "Selecciona un premio";
      if (used.has(row.prizeId)) return "Premio repetido";
      used.add(row.prizeId);
      const c = Number(row.count);
      if (!c || c <= 0 || !Number.isInteger(c)) return "Cantidad inválida";
      const exp =
        row.expirationDays === "custom" ? Number(row.customExpiration) : row.expirationDays;
      if (!exp || exp <= 0 || !Number.isInteger(exp)) return "Expiración inválida";
    }
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    setErrors(err);
    if (err) return;
    setDownloading(true);
    try {
      const payload = {
        prizes: rows.map((r) => ({
          prizeId: r.prizeId,
          count: Number(r.count),
          expirationDays:
            r.expirationDays === "custom" ? Number(r.customExpiration) : r.expirationDays,
        })),
        description: description || undefined,
        includeQr,
      };
      const res = await fetch("/api/batch/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Error generando batch");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `batch_${new Date().toISOString().replace(/[:.]/g, "-")}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setErrors(null);
    } catch (er: any) {
      setErrors(er.message || "Fallo");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Generar Batch</h1>
      </div>
      <form onSubmit={submit} className="space-y-6">
        <div className="card">
          <div className="card-header">Descripción & opciones</div>
          <div className="card-body space-y-4">
            <div className="form-row">
              <label className="text-xs font-medium">Descripción (opcional)</label>
              <input
                className="input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="flex items-center gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={includeQr}
                  onChange={(e) => setIncludeQr(e.target.checked)}
                />
                Incluir PNG QRs
              </label>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <span>Premios</span>
            <button
              type="button"
              onClick={addRow}
              className="btn-outline !px-3 !py-1 text-xs"
              disabled={downloading}
            >
              Añadir
            </button>
          </div>
          <div className="card-body space-y-4">
            {rows.map((row, idx) => (
              <div key={idx} className="grid gap-3 md:grid-cols-12 items-end">
                <div className="md:col-span-4 form-row">
                  <label className="text-xs font-medium">Premio *</label>
                  <select
                    className="input"
                    value={row.prizeId}
                    onChange={(e) => updateRow(idx, { prizeId: e.target.value })}
                    required
                  >
                    <option value="">Selecciona…</option>
                    {initialPrizes.map((p) => (
                      <option
                        key={p.id}
                        value={p.id}
                        disabled={rows.some((r, i) => i !== idx && r.prizeId === p.id)}
                      >
                        {p.key} — {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2 form-row">
                  <label className="text-xs font-medium">Cantidad *</label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    value={row.count}
                    onChange={(e) => updateRow(idx, { count: e.target.value })}
                    required
                  />
                </div>
                <div className="md:col-span-3 form-row">
                  <label className="text-xs font-medium">Expira (días) *</label>
                  <select
                    className="input"
                    value={row.expirationDays === "custom" ? "custom" : String(row.expirationDays)}
                    onChange={(e) =>
                      updateRow(idx, {
                        expirationDays:
                          e.target.value === "custom" ? "custom" : Number(e.target.value),
                      })
                    }
                    required
                  >
                    {expirationPresets.map((d) => (
                      <option key={d} value={d}>
                        {d} días
                      </option>
                    ))}
                    <option value="custom">Custom…</option>
                  </select>
                </div>
                <div className="md:col-span-2 form-row">
                  <label className="text-xs font-medium opacity-0">&nbsp;</label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    disabled={row.expirationDays !== "custom"}
                    placeholder="Días"
                    value={row.expirationDays === "custom" ? row.customExpiration : ""}
                    onChange={(e) => updateRow(idx, { customExpiration: e.target.value })}
                  />
                </div>
                <div className="md:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    disabled={rows.length === 1 || downloading}
                    className="btn-outline !px-3 !py-1 text-xs"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-rose-600">{errors}</div>
          <button className="btn" type="submit" disabled={downloading}>
            {downloading ? "Generando…" : "Generar y descargar ZIP"}
          </button>
        </div>
      </form>
    </div>
  );
*/
