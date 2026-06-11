"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function Mundial2026RedeemPanel(props: {
  qrPayload: string;
  role: string | null;
  claimStatus: string;
  predictionStatus: string;
  assignedPrizeLabel: string | null;
  availableAt: string | null;
  claimExpiresAt: string | null;
  redeemedAt: string | null;
}) {
  const router = useRouter();
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canRedeem = useMemo(() => {
    return !!props.role && !!props.assignedPrizeLabel && props.predictionStatus === "WON" && props.claimStatus === "AVAILABLE";
  }, [props.assignedPrizeLabel, props.claimStatus, props.predictionStatus, props.role]);

  async function handleRedeem() {
    setRedeeming(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/system/mundial2026/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "redeem",
          scanInput: props.qrPayload,
          notes: "Canje desde vista publica de jugada Mundial 2026",
        }),
      });

      const body = (await response.json()) as { message?: string; redeemed?: boolean };
      if (!response.ok) {
        throw new Error(body?.message || "No se pudo registrar el canje.");
      }

      setMessage(body.redeemed === false ? "La jugada ya no está disponible para canje." : "Canje registrado correctamente.");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo registrar el canje.");
    } finally {
      setRedeeming(false);
    }
  }

  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4 text-left sm:p-5">
      {!props.role ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
          Inicia sesión con un perfil operativo para canjear este premio desde aquí.
        </div>
      ) : (
        <>
          {canRedeem ? (
            <div className="space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">Acción</div>
              <button
                className="btn w-full justify-center rounded-full px-5 py-3 text-sm font-semibold"
                type="button"
                onClick={() => void handleRedeem()}
                disabled={redeeming}
              >
                {redeeming ? "Registrando canje..." : "Canjear premio"}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/8 p-4 text-sm leading-relaxed text-amber-100">
              {props.claimStatus === "REDEEMED"
                ? "Esta jugada ya fue canjeada."
                : props.claimStatus === "AVAILABLE"
                  ? "La jugada tiene premio, pero todavía no cumple todas las condiciones de canje."
                  : "El premio aún no está listo para canje o no fue asignado."}
            </div>
          )}

          {message ? <div className="alert alert-success mt-4">{message}</div> : null}
          {error ? <div className="alert alert-danger mt-4">{error}</div> : null}
        </>
      )}
    </div>
  );
}