"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  prizes: any[];
}

const EXPIRATION_OPTIONS = [1, 3, 5, 7, 15, 30];

// Inline type for request payload to /api/batch/generate-all
type GenerateAllRequest =
  | { expirationDays: number; includeQr: boolean; lazyQr: boolean; name?: string }
  | { mode: "singleDay"; singleDayDate: string; includeQr: boolean; lazyQr: boolean; name?: string };

export default function InlineAutoBatchPanel({ prizes }: Props) {
  const router = useRouter();
  const [expirationDays, setExpirationDays] = useState(7);
  const [includeQr, setIncludeQr] = useState(true);
  const [lazyQr, setLazyQr] = useState(false); // will be removed logically (always false)
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"byDays" | "singleDay">("byDays");
  const [singleDayDate, setSingleDayDate] = useState(""); // YYYY-MM-DD
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastBatchInfo, setLastBatchInfo] = useState<{ batchId: string; prizes: number } | null>(
    null
  );

  const plannedCount = useMemo(
    () =>
      prizes
        .filter((p) => p.active && typeof p.stock === "number" && p.stock > 0)
        .reduce((acc, p) => acc + p.stock, 0),
    [prizes]
  );
  const hasStock = plannedCount > 0;

  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [success, error]);

  async function generate() {
    if (!hasStock || loading) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (plannedCount > 5000) {
        const ok = window.confirm(`Se generarán ${plannedCount} tokens. ¿Confirmar?`);
        if (!ok) {
          setLoading(false);
          return;
        }
      }
      const bodyPayload: GenerateAllRequest =
        mode === "singleDay"
          ? (() => {
              if (!singleDayDate) {
                throw new Error("Selecciona una fecha específica");
              }
              return {
                mode: "singleDay",
                singleDayDate,
                includeQr,
                lazyQr: false,
                name: name || undefined,
              } as const;
            })()
          : { expirationDays, includeQr, lazyQr: false, name: name || undefined };

      const res = await fetch("/api/batch/generate-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });
      const ct = res.headers.get("Content-Type") || "";
      if (!res.ok) {
        let msg = "Error";
        if (ct.includes("application/json")) {
          const j = await res.json().catch(() => ({}));
            msg = j.error || msg;
        }
        setError(msg);
        return;
      }
      if (ct.includes("application/zip")) {
        const blob = await res.blob();
        let totalTokens: number | null = null;
        let batchId: string | null = null;
        let prizeCount: number | null = null;
        try {
          const JSZipMod = await import("jszip");
          const zip = await JSZipMod.loadAsync(blob);
          const manifestFile = zip.file("manifest.json");
          if (manifestFile) {
            const manifestText = await manifestFile.async("text");
            const manifest = JSON.parse(manifestText);
            totalTokens = manifest?.meta?.totalTokens ?? null;
            batchId = manifest?.batchId || null;
            prizeCount = Array.isArray(manifest?.prizes) ? manifest.prizes.length : null;
            if (batchId && prizeCount != null) {
              setLastBatchInfo({ batchId, prizes: prizeCount });
            }
          }
        } catch {
          // ignore
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `lote_${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setSuccess(
          totalTokens != null
            ? `Lote "${name || "(sin nombre)"}" generado (${totalTokens} tokens)`
            : `Lote "${name || "(sin nombre)"}" generado`
        );
        router.refresh();
      } else {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Respuesta inesperada");
      }
    } catch (e: any) {
      setError(e.message || "Fallo red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <span className="text-sm font-medium">Generación Automática</span>
        <span className="text-[10px] text-slate-500">
          Tokens previstos: {plannedCount} {includeQr ? "(con QR)" : ""}
        </span>
      </div>
      <div className="card-body grid gap-4 md:grid-cols-3">
        <div className="form-row md:col-span-3">
          <label className="text-xs font-medium">Modo de generación</label>
          <div className="flex items-center gap-4 text-xs">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="gen-mode"
                value="byDays"
                checked={mode === "byDays"}
                onChange={() => {
                  setMode("byDays");
                  setSingleDayDate(""); // limpiar campo no usado
                  setError(null);
                  setSuccess(null);
                }}
              />
              <span>Por días</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="gen-mode"
                value="singleDay"
                checked={mode === "singleDay"}
                onChange={() => {
                  setMode("singleDay");
                  setError(null);
                  setSuccess(null);
                }}
              />
              <span>Fecha específica</span>
            </label>
          </div>
        </div>
        <div className="form-row">
          <label className="text-xs font-medium">Expiración</label>
          <select
            className="input"
            value={expirationDays}
            onChange={(e) => setExpirationDays(Number(e.target.value))}
            disabled={mode === "singleDay"}
          >
            {EXPIRATION_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d} días
              </option>
            ))}
          </select>
        </div>
        {mode === "singleDay" && (
          <div className="form-row">
            <label className="text-xs font-medium">Día específico</label>
            <input
              type="date"
              className="input"
              value={singleDayDate}
              onChange={(e) => setSingleDayDate(e.target.value)}
            />
          </div>
        )}
        <div className="form-row md:col-span-2">
          <label className="text-xs font-medium">Nombre del lote</label>
          <input
            className="input"
            value={name}
            maxLength={120}
            placeholder="Ej: Promo Septiembre"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="col-span-full flex flex-wrap items-center gap-4 text-xs">
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
          {/* QR Lazy eliminado */}
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={generate}
              disabled={!hasStock || loading || (mode === "singleDay" && !singleDayDate)}
              className="btn text-xs disabled:opacity-40"
              title={!hasStock ? "No hay stock disponible" : undefined}
            >
              {loading ? "Generando…" : "Generar Lote"}
            </button>
          </div>
        </div>
        {mode === "singleDay" && (
          <p className="col-span-full text-[10px] text-slate-500">
            Expiran a las 23:59:59 del día seleccionado (hora del servidor). Si es una fecha futura,
            se entregan deshabilitados.
          </p>
        )}
        {(error || success) && (
          <div className="col-span-full text-xs">
            {error && (
              <div className="rounded border border-rose-300 bg-rose-50 px-2 py-1 text-rose-700 dark:border-rose-600 dark:bg-rose-800/60 dark:text-rose-100">
                {error}
              </div>
            )}
            {success && (
              <div className="space-y-2">
                <div className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-800/60 dark:text-emerald-100">
                  {success}
                </div>
                {lastBatchInfo && lastBatchInfo.prizes <= 12 && (
                  <button
                    type="button"
                    className="btn-outline !px-3 !py-1"
                    onClick={() => router.push(`/admin/roulette/session/${lastBatchInfo.batchId}`)}
                  >
                    Ir a ruleta ({lastBatchInfo.prizes} premio{lastBatchInfo.prizes !== 1 ? "s" : ""})
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        <p className="col-span-full text-[10px] text-slate-500">
          Se generarán tokens para cada premio activo con stock numérico &gt; 0, consumiendo todo el
          stock y dejándolo en 0. Los premios con stock ilimitado (∞) no generan tokens en modo
          automático.
        </p>
      </div>
    </div>
  );
}
