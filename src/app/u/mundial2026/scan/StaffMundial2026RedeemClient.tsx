"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { MUNDIAL2026_CLAIM_WINDOW_HOURS } from "@/lib/mundial2026/time";

type Snapshot = {
  predictionId: string;
  qrCode: string;
  status: string;
  claimStatus: string;
  availableAt: string | null;
  claimExpiresAt: string | null;
  redeemedAt: string | null;
  match: {
    homeTeam: string;
    awayTeam: string;
    startsAt: string;
    result: string | null;
  };
  participant: {
    name: string;
    whatsappNormalized: string;
  };
  assignedPrize: null | {
    label: string;
    description: string | null;
    color: string | null;
  };
  integrity: {
    hasStructuredPayload: boolean;
    signatureChecked: boolean;
    valid: boolean;
  };
};

type ResponsePayload = {
  valid?: boolean;
  redeemed?: boolean;
  result?: string;
  snapshot: Snapshot;
};

function formatDate(value: string | null) {
  if (!value) return "Pendiente";
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" }).format(new Date(value));
}

export default function StaffMundial2026RedeemClient() {
  const searchParams = useSearchParams();
  const [scanInput, setScanInput] = useState("");
  const [device, setDevice] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [payload, setPayload] = useState<ResponsePayload | null>(null);
  const initialAutoValidateDoneRef = useRef(false);

  function getScanParam() {
    return searchParams?.get("scan")?.trim() ?? "";
  }

  async function submit(action: "validate" | "redeem", inputOverride?: string) {
    const effectiveScanInput = (inputOverride ?? scanInput).trim();
    if (!effectiveScanInput) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/system/mundial2026/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, scanInput: effectiveScanInput, device, location, notes }),
      });
      const body = (await response.json()) as ResponsePayload & { message?: string };
      if (!response.ok) throw new Error(body?.message || "No se pudo procesar la jugada.");

      setPayload(body);
      setMessage(action === "redeem" ? "Jugada canjeada correctamente." : `Validación lista: ${body.result || "OK"}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo procesar la jugada.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const scanParam = getScanParam();
    if (!scanParam) return;
    setScanInput(scanParam);
  }, [searchParams]);

  useEffect(() => {
    const scanParam = getScanParam();
    if (!scanParam || initialAutoValidateDoneRef.current) return;

    initialAutoValidateDoneRef.current = true;
    setScanInput(scanParam);
    void submit("validate", scanParam);
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
        <h1 className="text-3xl font-black text-white">Canje staff Mundial 2026</h1>
        <p className="mt-2 text-sm text-slate-300">
          Pega el QR simple o el payload del QR. Primero valida y luego confirma el canje una sola vez.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
          <div className="space-y-4">
            <label className="form-row">
              <span className="text-sm font-medium text-slate-200">QR o payload</span>
              <textarea
                className="input min-h-[140px] bg-slate-950/45 text-white"
                value={scanInput}
                onChange={(event) => setScanInput(event.target.value)}
                placeholder="M26_... o el JSON del QR"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="form-row">
                <span className="text-sm font-medium text-slate-200">Dispositivo</span>
                <input className="input bg-slate-950/45 text-white" value={device} onChange={(event) => setDevice(event.target.value)} placeholder="Scanner barra 1" />
              </label>
              <label className="form-row">
                <span className="text-sm font-medium text-slate-200">Ubicación</span>
                <input className="input bg-slate-950/45 text-white" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Zona fan" />
              </label>
            </div>

            <label className="form-row">
              <span className="text-sm font-medium text-slate-200">Notas</span>
              <textarea className="input min-h-[96px] bg-slate-950/45 text-white" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Observaciones del canje" />
            </label>

            {message ? <div className="alert alert-success">{message}</div> : null}
            {error ? <div className="alert alert-danger">{error}</div> : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <button className="btn btn-secondary justify-center" type="button" onClick={() => void submit("validate")} disabled={loading || !scanInput.trim()}>
                {loading ? "Procesando..." : "Validar jugada"}
              </button>
              <button className="btn justify-center" type="button" onClick={() => void submit("redeem")} disabled={loading || !scanInput.trim()}>
                {loading ? "Procesando..." : "Confirmar canje"}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
          {!payload ? (
            <div className="text-sm text-slate-400">Aquí aparecerá el detalle de la jugada validada.</div>
          ) : (
            <div className="space-y-4 text-sm text-slate-200">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400">QR</div>
                <div className="mt-1 text-xl font-black text-white">{payload.snapshot.qrCode}</div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Participante</div>
                  <div className="mt-2 font-semibold text-white">{payload.snapshot.participant.name}</div>
                  <div className="mt-1">{payload.snapshot.participant.whatsappNormalized}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Estado</div>
                  <div className="mt-2 font-semibold text-white">{payload.snapshot.status} / {payload.snapshot.claimStatus}</div>
                  <div className="mt-1">Resultado validación: {payload.result || (payload.valid ? "OK" : "N/A")}</div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Partido</div>
                <div className="mt-2 font-semibold text-white">
                  {payload.snapshot.match.homeTeam} vs {payload.snapshot.match.awayTeam}
                </div>
                <div className="mt-1">Empieza: {formatDate(payload.snapshot.match.startsAt)}</div>
                <div className="mt-1">Resultado oficial: {payload.snapshot.match.result || "Pendiente"}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Premio</div>
                {payload.snapshot.assignedPrize ? (
                  <>
                    <div className="mt-2 font-semibold" style={payload.snapshot.assignedPrize.color ? { color: payload.snapshot.assignedPrize.color } : undefined}>
                      {payload.snapshot.assignedPrize.label}
                    </div>
                    <div className="mt-1 text-slate-300">{payload.snapshot.assignedPrize.description || "Premio listo para entrega."}</div>
                  </>
                ) : (
                  <div className="mt-2 text-slate-400">No hay premio asignado.</div>
                )}
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Ventana de canje</div>
                <div className="mt-2">Disponible desde: {formatDate(payload.snapshot.availableAt)}</div>
                <div className="mt-1">Expira ({MUNDIAL2026_CLAIM_WINDOW_HOURS}h): {formatDate(payload.snapshot.claimExpiresAt)}</div>
                <div className="mt-1">Canjeado: {formatDate(payload.snapshot.redeemedAt)}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Integridad</div>
                <div className="mt-2">Payload estructurado: {payload.snapshot.integrity.hasStructuredPayload ? "Sí" : "No"}</div>
                <div className="mt-1">Firma verificada: {payload.snapshot.integrity.signatureChecked ? (payload.snapshot.integrity.valid ? "Sí" : "Inválida") : "No aplica"}</div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
