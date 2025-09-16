"use client";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

const EXPIRATION_OPTIONS = [1, 3, 5, 7, 15, 30];

export default function AutoBatchModalTrigger({
  disabled = false,
  plannedCount,
}: {
  disabled?: boolean;
  plannedCount?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [expirationDays, setExpirationDays] = useState<number>(7);
  const [includeQr, setIncludeQr] = useState<boolean>(true);
  const [lazyQr, setLazyQr] = useState<boolean>(false);
  const [description, setDescription] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  function reset() {
    setExpirationDays(7);
    setIncludeQr(true);
    setLazyQr(false);
    setDescription("");
    setError(null);
  }

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      // Confirmación soft si supera umbral
      if (plannedCount && plannedCount > 5000) {
        const ok = window.confirm(
          `Se generarán aproximadamente ${plannedCount} tokens. ¿Confirmar?`
        );
        if (!ok) {
          setLoading(false);
          return;
        }
      }
      const res = await fetch("/api/batch/generate-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expirationDays,
          includeQr,
          lazyQr,
          description: description || undefined,
        }),
      });
      const ct = res.headers.get("Content-Type") || "";
      if (!res.ok) {
        if (ct.includes("application/json")) {
          const j = await res.json().catch(() => ({}));
          setError(j.error || "Error");
          setToast({ type: "error", msg: j.error || "Error generando batch" });
        } else {
          setError("Error");
          setToast({ type: "error", msg: "Error generando batch" });
        }
        return;
      }
      if (ct.includes("application/zip")) {
        const blob = await res.blob();
        // Intentar extraer manifest.json para contar tokens
        let totalTokens: number | null = null;
        try {
          const JSZipMod = await import("jszip");
          const zip = await JSZipMod.loadAsync(blob);
          const manifestFile = zip.file("manifest.json");
          if (manifestFile) {
            const manifestText = await manifestFile.async("text");
            const manifest = JSON.parse(manifestText);
            totalTokens = manifest?.meta?.totalTokens ?? null;
          }
        } catch {
          // ignorar extracción fallida
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `batch_auto_${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setOpen(false);
        reset();
        router.refresh();
        setToast({
          type: "success",
          msg: totalTokens != null ? `Lote generado: ${totalTokens} tokens` : "Lote generado",
        });
      } else {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Respuesta inesperada");
        setToast({ type: "error", msg: j.error || "Respuesta inesperada" });
      }
    } catch (e: any) {
      setError(e.message || "Fallo red");
      setToast({ type: "error", msg: e.message || "Fallo de red" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 rounded-md border px-4 py-2 text-xs shadow-lg backdrop-blur-sm ${toast.type === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-800/70 dark:text-emerald-100" : "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-600 dark:bg-rose-800/70 dark:text-rose-100"}`}
        >
          {toast.msg}
        </div>
      )}
      <button
        type="button"
        onClick={() => !disabled && setOpen(true)}
        className="btn-outline text-xs disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={disabled}
        title={disabled ? "No hay premios con stock > 0" : undefined}
      >
        Generar Automático
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !loading && setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-md border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <h2 className="mb-4 text-sm font-semibold">Generar Batch Automático</h2>
            <div className="space-y-4">
              <div className="form-row">
                <label className="text-xs font-medium">Expiración (días)</label>
                <select
                  className="input"
                  value={expirationDays}
                  onChange={(e) => setExpirationDays(Number(e.target.value))}
                >
                  {EXPIRATION_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeQr}
                    onChange={(e) => {
                      setIncludeQr(e.target.checked);
                      if (!e.target.checked) setLazyQr(false);
                    }}
                  />
                  <span>Incluir QR</span>
                </label>
                <label
                  className={
                    "inline-flex items-center gap-2 " +
                    (!includeQr ? "opacity-40 cursor-not-allowed" : "")
                  }
                >
                  <input
                    type="checkbox"
                    disabled={!includeQr}
                    checked={lazyQr}
                    onChange={(e) => setLazyQr(e.target.checked)}
                  />
                  <span>QR Lazy</span>
                </label>
              </div>
              <div className="form-row">
                <label className="text-xs font-medium">Descripción (opcional)</label>
                <textarea
                  className="input min-h-[70px]"
                  maxLength={300}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción del batch"
                />
              </div>
              {error && <p className="text-xs text-rose-600">Error: {error}</p>}
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                className="btn-outline text-xs"
                disabled={loading}
                onClick={() => setOpen(false)}
              >
                Cancelar
              </button>
              <button type="button" className="btn text-xs" disabled={loading} onClick={generate}>
                {loading ? "Generando…" : "Generar"}
              </button>
            </div>
            <p className="mt-3 text-[10px] text-slate-500">
              Creará tokens para todos los premios activos con stock &gt; 0 respetando el límite y
              descontando stock.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
