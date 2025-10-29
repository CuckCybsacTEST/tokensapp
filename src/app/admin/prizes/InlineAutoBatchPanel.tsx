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
  | { mode: "singleDay"; singleDayDate: string; includeQr: boolean; lazyQr: boolean; name?: string }
  | { mode: "singleHour"; date: string; hour: string; durationMinutes: number; includeQr: boolean; lazyQr: boolean; name?: string };

export default function InlineAutoBatchPanel({ prizes }: Props) {
  const router = useRouter();
  const [expirationDays, setExpirationDays] = useState(7);
  const [includeQr, setIncludeQr] = useState(true);
  const [lazyQr, setLazyQr] = useState(false); // will be removed logically (always false)
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"byDays" | "singleDay" | "singleHour">("byDays");
  const [singleDayDate, setSingleDayDate] = useState(""); // YYYY-MM-DD
  // singleHour specific
  const [hourDate, setHourDate] = useState(""); // YYYY-MM-DD
  const [hourTime, setHourTime] = useState(""); // HH:mm
  const [durationMinutes, setDurationMinutes] = useState(60); // 5..720
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastBatchInfo, setLastBatchInfo] = useState<{ batchId: string; prizes: number } | null>(
    null
  );
  // Post-generación: permitir elegir Descargar ZIP o Ver lote
  const [postGen, setPostGen] = useState<
    | null
    | {
        batchId: string;
        blobUrl: string;
        filename: string;
        displayName?: string;
      }
  >(null);

  // Limpiar Blob URL si cambia el estado o al desmontar
  useEffect(() => {
    return () => {
      if (postGen?.blobUrl) {
        try { URL.revokeObjectURL(postGen.blobUrl); } catch {}
      }
    };
  }, [postGen?.blobUrl]);

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
      let bodyPayload: GenerateAllRequest;
      if (mode === "singleDay") {
        if (!singleDayDate) throw new Error("Selecciona una fecha específica");
        bodyPayload = {
          mode: "singleDay",
          singleDayDate,
          includeQr,
          lazyQr: false,
          name: name || undefined,
        };
      } else if (mode === 'singleHour') {
        if (!hourDate) throw new Error('Selecciona fecha de ventana');
        if (!/^\d{2}:\d{2}$/.test(hourTime)) throw new Error('Hora inválida');
        if (durationMinutes < 5 || durationMinutes > 720) throw new Error('Duración fuera de rango');
        bodyPayload = {
          mode: 'singleHour',
          date: hourDate,
          hour: hourTime,
            durationMinutes,
          includeQr,
          lazyQr: false,
          name: name || undefined,
        };
      } else {
        bodyPayload = { expirationDays, includeQr, lazyQr: false, name: name || undefined };
      }

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
        // Intentar obtener el batchId desde la cabecera Content-Disposition (filename)
        let batchIdFromHeader: string | null = null;
        const cd = res.headers.get("Content-Disposition") || res.headers.get("content-disposition");
        if (cd) {
          try {
            const m = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
            const rawName = m ? decodeURIComponent((m[1] || m[2] || '').trim()) : '';
            const idm = rawName.match(/_([^\.]+)\.zip$/i);
            if (idm && idm[1]) batchIdFromHeader = idm[1];
          } catch {}
        }

        const blob = await res.blob();
        let totalTokens: number | null = null;
        let batchId: string | null = batchIdFromHeader;
        let prizeCount: number | null = null;
        try {
          const JSZipMod = await import("jszip");
          const zip = await JSZipMod.loadAsync(blob);
          const manifestFile = zip.file("manifest.json");
          if (manifestFile) {
            const manifestText = await manifestFile.async("text");
            const manifest = JSON.parse(manifestText);
            totalTokens = manifest?.meta?.totalTokens ?? null;
            if (!batchId) batchId = manifest?.batchId || null;
            prizeCount = Array.isArray(manifest?.prizes) ? manifest.prizes.length : null;
            if (batchId && prizeCount != null) {
              setLastBatchInfo({ batchId, prizes: prizeCount });
            }
          }
        } catch {
          // ignore
        }
        const url = URL.createObjectURL(blob);
        const filename = `lote_${Date.now()}.zip`;
        setSuccess(
          totalTokens != null
            ? `Lote "${name || "(sin nombre)"}" generado (${totalTokens} tokens)`
            : `Lote "${name || "(sin nombre)"}" generado`
        );
        // Mostrar SIEMPRE el modal post-generación; si no hay batchId, solo permitimos descargar.
        setPostGen({ batchId: batchId || "", blobUrl: url, filename, displayName: name || batchId || "(sin nombre)" });
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

  function handleDownloadZip() {
    if (!postGen) return;
    const a = document.createElement("a");
    a.href = postGen.blobUrl;
    a.download = postGen.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(postGen.blobUrl);
    setPostGen(null);
    router.refresh();
  }

  function handleViewBatch() {
    if (!postGen) return;
    // liberar url si existe
    if (postGen.blobUrl) URL.revokeObjectURL(postGen.blobUrl);
    const id = postGen.batchId;
    setPostGen(null);
    router.push(`/admin/roulettebatches/${id}`);
  }

  function handleCloseModal() {
    if (!postGen) return;
    if (postGen.blobUrl) URL.revokeObjectURL(postGen.blobUrl);
    // Mostrar confirmación de éxito al cerrar sin descargar
    setSuccess(`Lote "${postGen.displayName || postGen.batchId || "(sin id)"}" creado con éxito`);
    setPostGen(null);
    // No refrescamos aquí para no perder el mensaje; el usuario puede refrescar manualmente si desea.
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
        {/* Modal post-generación */}
        {postGen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="card w-[92%] max-w-md">
              <div className="card-header">
                <h3 className="text-sm font-medium">Lote generado</h3>
              </div>
              <div className="card-body space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <span>¿Qué deseas hacer con el lote</span>
                  {postGen.batchId ? (
                    <>
                      <span className="font-mono">{postGen.batchId}</span>
                      <button
                        type="button"
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700"
                        onClick={() => navigator.clipboard?.writeText(postGen.batchId)}
                        title="Copiar ID"
                      >
                        Copiar ID
                      </button>
                    </>
                  ) : (
                    <span className="italic text-slate-500">(id no disponible aún)</span>
                  )}
                  <span>?</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button type="button" className="btn !py-1 !px-3 text-xs" onClick={handleDownloadZip}>Descargar ZIP</button>
                  <button
                    type="button"
                    className={`btn-outline !py-1 !px-3 text-xs ${!postGen.batchId ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={postGen.batchId ? handleViewBatch : undefined}
                    disabled={!postGen.batchId}
                    title={!postGen.batchId ? "No se pudo leer el identificador del lote desde el ZIP" : undefined}
                  >
                    Ver lote
                  </button>
                  <button type="button" className="ml-auto text-xs opacity-70 hover:opacity-100" onClick={handleCloseModal}>Cerrar</button>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="form-row md:col-span-3">
          <label className="text-xs font-medium">Modo de generación</label>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="gen-mode"
                value="byDays"
                checked={mode === "byDays"}
                onChange={() => {
                  setMode("byDays");
                  setSingleDayDate(""); // limpiar campo no usado
                  setHourDate(""); setHourTime("");
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
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="gen-mode"
                value="singleHour"
                checked={mode === 'singleHour'}
                onChange={() => {
                  setMode('singleHour');
                  setSingleDayDate("");
                  setError(null); setSuccess(null);
                }}
              />
              <span>Ventana horaria</span>
            </label>
          </div>
        </div>
        <div className="form-row">
          <label className="text-xs font-medium">Expiración</label>
          <select
            className="input"
            value={expirationDays}
            onChange={(e) => setExpirationDays(Number(e.target.value))}
            disabled={mode === "singleDay" || mode === 'singleHour'}
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
        {mode === 'singleHour' && (
          <>
            <div className="form-row">
              <label className="text-xs font-medium">Fecha ventana</label>
              <input
                type="date"
                className="input"
                value={hourDate}
                onChange={(e) => setHourDate(e.target.value)}
              />
            </div>
            <div className="form-row">
              <label className="text-xs font-medium">Hora inicio (HH:mm)</label>
              <input
                type="time"
                className="input"
                value={hourTime}
                onChange={(e) => setHourTime(e.target.value)}
              />
            </div>
            <div className="form-row">
              <label className="text-xs font-medium">Duración (min)</label>
              <select
                className="input"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
              >
                {[15,30,45,60,90,120,180,240,360].map(m => <option key={m} value={m}>{m} min</option>)}
              </select>
            </div>
          </>
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
              disabled={!hasStock || loading || (mode === "singleDay" && !singleDayDate) || (mode === 'singleHour' && (!hourDate || !/^\d{2}:\d{2}$/.test(hourTime)))}
              className="btn text-xs disabled:opacity-40"
              title={!hasStock ? "No hay stock disponible" : undefined}
            >
              {loading ? "Generando…" : "Generar Lote"}
            </button>
          </div>
        </div>
        {mode === "singleDay" && (
          <p className="col-span-full text-[10px] text-slate-500">
            Expiran a las 23:59:59 del día seleccionado (hora Lima). Si es una fecha futura, se generarán deshabilitados y se habilitan el mismo día.
          </p>
        )}
        {mode === 'singleHour' && (
          <p className="col-span-full text-[10px] text-slate-500">
            Ventana horaria: los tokens solo se podrán canjear entre la hora de inicio y la duración indicada. Si la ventana es futura se crean deshabilitados y se habilitan automáticamente al comenzar.
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
