"use client";

import React from "react";

interface ServerTokenShape {
  id: string;
  expiresAt: string;
  redeemedAt: string | null;
  disabled: boolean;
  prize: { id: string; key: string; label: string; color: string | null; active: boolean };
}

export type Status =
  | 'ready'
  | 'revealed_pending'
  | 'redeemed'
  | 'delivered'
  | 'expired'
  | 'inactive'
  | 'system_off'
  | 'invalid_signature'
  | 'not_found'
  | 'error';

interface RedeemResponse {
  redeemedAt?: string;
  code?: string;
  message?: string;
  error?: string;
}

interface StatusInfo {
  icon: string;
  title: string;
  message: string;
  boxClass: string;
  iconClass: string;
}

export default function RedeemView({
  initialStatus,
  token,
  twoPhase = false,
}: {
  initialStatus: Status;
  token: ServerTokenShape | null;
  twoPhase?: boolean;
}) {
  const [status, setStatus] = React.useState<Status>(initialStatus as Status);
  const [redeeming, setRedeeming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [redeemedAt, setRedeemedAt] = React.useState<string | null>(token?.redeemedAt || null);

  const canRedeem = !twoPhase && status === "ready" && !redeeming; // en two-phase usuario no canjea manual
  const [delivering, setDelivering] = React.useState(false);
  const canDeliver = twoPhase && status === 'revealed_pending' && !delivering; // staff action

  const doRedeem = React.useCallback(async () => {
    if (!token) return;
    setRedeeming(true);
    setError(null);
    try {
      const res = await fetch(`/api/redeem/${token.id}`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as RedeemResponse;
      if (res.ok) {
        setStatus("redeemed");
        setRedeemedAt(body.redeemedAt || new Date().toISOString());
      } else {
        const code: string = (body?.code as string) || (body?.error as string) || "ERROR";
        switch (code) {
          case "NOT_FOUND":
            setStatus("not_found");
            break;
          case "SYSTEM_OFF":
            setStatus("system_off");
            break;
          case "INACTIVE":
            setStatus("inactive");
            break;
          case "EXPIRED":
            setStatus("expired");
            break;
          case "BAD_SIGNATURE":
            setStatus("invalid_signature");
            break;
          case "ALREADY_REDEEMED":
            setStatus("redeemed");
            break;
          default:
            setStatus("error");
        }
        setError(body?.message || code);
      }
    } catch (e: any) {
      setStatus("error");
      setError(e?.message || "Fallo de red");
    } finally {
      setRedeeming(false);
    }
  }, [token]);

  const info = describeStatus(status, token, redeemedAt);

  return (
    <div className="space-y-6">
      <div className={`rounded-lg border p-5 shadow-sm transition-colors ${info.boxClass}`}>
        <div className="mb-2 flex items-center gap-2 text-lg font-semibold">
          <span className={info.iconClass}>{info.icon}</span>
          <span>{info.title}</span>
        </div>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{info.message}</p>
        {token && status !== "not_found" && (
          <div className="mt-4 grid gap-2 rounded bg-slate-50 p-3 text-xs dark:bg-slate-800/40">
            <div>
              Premio: <strong>{token.prize.label}</strong> ({token.prize.key})
            </div>
            {token.prize.color && (
              <div>
                Color: <span>{token.prize.color}</span>
              </div>
            )}
            <div>
              Expira: {new Date(token.expiresAt).toLocaleString()} ({timeLeft(token.expiresAt)})
            </div>
          </div>
        )}
        {canRedeem && (
          <div className="mt-6">
            <button onClick={doRedeem} disabled={!canRedeem} className="btn">
              {redeeming ? "Canjeando…" : "Canjear ahora"}
            </button>
          </div>
        )}
        {canDeliver && (
          <div className="mt-4">
            <button
              className="btn btn-sm bg-emerald-600 text-white"
              disabled={!canDeliver}
              onClick={async () => {
                if (!token) return;
                setDelivering(true);
                try {
                  const res = await fetch(`/api/token/${token.id}/deliver`, { method: 'POST' });
                  if (res.ok) {
                    // simple refresh to pick delivered state from server
                    location.reload();
                  } else {
                    const b = await res.json().catch(()=>({}));
                    setError(b?.error || b?.message || 'DELIVER_FAILED');
                  }
                } catch (e:any) {
                  setError(e?.message || 'DELIVER_FAILED');
                } finally { setDelivering(false); }
              }}
            >{delivering ? 'Confirmando…' : 'Marcar entregado (staff)'}</button>
          </div>
        )}
        {error && status !== "redeemed" && (
          <div className="mt-4 text-xs text-rose-600">{error}</div>
        )}
      </div>
      {status === "redeemed" && redeemedAt && (
        <div className="text-center text-xs text-emerald-600">
          Canjeado a las {new Date(redeemedAt).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

function describeStatus(status: Status, token: ServerTokenShape | null, redeemedAt: string | null): StatusInfo {
  switch (status) {
    case "revealed_pending":
      return {
        icon: "🎉",
        title: "Premio revelado",
        message: "Tu premio ha sido revelado. Espera a que el staff te lo entregue físicamente.",
        boxClass:
          "border-amber-300 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/20",
        iconClass: "",
      };
    case "delivered":
      return {
        icon: "✅",
        title: "Premio entregado",
        message: "La entrega ha sido confirmada. ¡Disfrútalo!",
        boxClass:
          "border-emerald-300 bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-900/20",
        iconClass: "",
      };
    case "ready":
      return {
        icon: "🎁",
        title: "Premio disponible",
        message: "Presiona el botón para canjear este premio.",
        boxClass:
          "border-emerald-300 bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-900/20",
        iconClass: "",
      };
    case "redeemed":
      return {
        icon: "✅",
        title: "Premio ya canjeado",
        message: redeemedAt
          ? `Fue canjeado el ${new Date(redeemedAt).toLocaleString()}.`
          : "Ya fue canjeado anteriormente.",
        boxClass:
          "border-emerald-300 bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-900/20",
        iconClass: "",
      };
    case "expired":
      return {
        icon: "⌛",
        title: "Token expirado",
        message: "Este token ya no es válido por haber expirado.",
        boxClass: "border-amber-300 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/20",
        iconClass: "",
      };
    case "inactive":
      return {
        icon: "⛔",
        title: "Inactivo",
        message: "El token o su premio asociado está inactivo.",
        boxClass: "border-rose-300 bg-rose-50 dark:border-rose-800/60 dark:bg-rose-900/20",
        iconClass: "",
      };
    case "system_off":
      return {
        icon: "🚧",
        title: "Cargando el drop",
        message: "Aún no soltamos la ruleta. Se enciende a las 5:00 PM. Quédate cerca.",
        boxClass: "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40",
        iconClass: "",
      };
    case "invalid_signature":
      return {
        icon: "⚠️",
        title: "Firma inválida",
        message: "Integridad comprometida: el token fue deshabilitado.",
        boxClass: "border-rose-300 bg-rose-50 dark:border-rose-800/60 dark:bg-rose-900/20",
        iconClass: "",
      };
    case "not_found":
      return {
        icon: "❓",
        title: "No encontrado",
        message: "El token no existe o fue retirado.",
        boxClass: "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40",
        iconClass: "",
      };
    case "error":
    default:
      return {
        icon: "⚠️",
        title: "Error",
        message: "Ocurrió un problema al procesar el canje.",
        boxClass: "border-rose-300 bg-rose-50 dark:border-rose-800/60 dark:bg-rose-900/20",
        iconClass: "",
      };
  }
}

function timeLeft(expiresAtIso: string) {
  const ms = new Date(expiresAtIso).getTime() - Date.now();
  if (ms <= 0) return "expirado";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m restantes`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h restantes`;
  const days = Math.floor(hours / 24);
  return `${days}d restantes`;
}
