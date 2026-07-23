"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

type AdminFanZoneTicket = {
  id: string;
  code: string;
  customerName: string;
  maxUses: number;
  usedCount: number;
  statusLabel: string;
  expiresAtLabel: string;
  showValidateButton: boolean;
};

type RedeemResponse = {
  message: string;
  usedCount: number;
  maxUses: number;
  exhausted: boolean;
};

export function Mundial2026FanZoneAdminClient({ ticket: initialTicket }: { ticket: AdminFanZoneTicket }) {
  const [ticket, setTicket] = useState(initialTicket);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPublicView = !ticket.showValidateButton;
  const isExhausted = ticket.usedCount >= ticket.maxUses || ticket.statusLabel === "Canjeado";

  async function validateRedeem() {
    if (busy || isExhausted) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/custom-qrs/${encodeURIComponent(ticket.id)}/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = (await response.json()) as Partial<RedeemResponse> & { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || "No se pudo validar el canje.");
      }

      setTicket((current) => ({
        ...current,
        usedCount: Number(payload.usedCount ?? current.usedCount),
        maxUses: Number(payload.maxUses ?? current.maxUses),
        statusLabel: payload.exhausted ? "Canjeado" : "Vigente",
      }));
      setMessage(payload.message || "Uso registrado correctamente.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo validar el canje.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col items-center text-center sm:mt-6">
      {message ? (
        <div className="mb-3 w-full rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100 sm:mb-4">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mb-3 w-full rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100 sm:mb-4">
          {error}
        </div>
      ) : null}

      <div className="text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">Token</div>
      <div className="text-3xl font-black uppercase tracking-tight text-[#FF4D2E] sm:text-5xl">Verificado</div>

      <div className="mt-4 w-full rounded-[22px] border border-white/10 bg-white/5 px-4 py-4 sm:mt-5 sm:px-5 sm:py-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">Ganador</div>
        <div className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">{ticket.customerName}</div>
        <div className="mt-1 text-xs text-white/55">Este es el cliente que debe recibir la cortesía.</div>
      </div>

      <div className="mt-5 w-full rounded-[24px] border border-white/10 bg-white/5 px-4 py-5 sm:mt-6 sm:px-5 sm:py-6">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">{isPublicView ? "Premio" : "Entrega"}</div>
        <h2 className="mt-2 text-xl font-black tracking-tight text-white sm:text-3xl">Copa Pisco Sour - GRATIS</h2>
        <div className="mx-auto mt-3 h-1 w-14 rounded-full bg-[#FF4D2E]" />
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/80 sm:mt-4">
          {isPublicView
            ? "Acércate a la barra para canjearlo antes de la fecha de expiración."
            : "Token verificado. Entrega el premio al cliente y confirma abajo."}
        </p>
      </div>

      <div className="mt-4 w-full rounded-[24px] border border-white/10 bg-white/5 px-4 py-5 sm:mt-5 sm:px-5 sm:py-6">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">Disponibilidad</div>
        <div className="mt-3 text-3xl font-black tracking-tight text-[#FF4D2E] sm:text-5xl">
          {ticket.usedCount} / {ticket.maxUses}
        </div>
        <div className="mt-4 h-3 rounded-full bg-white/10">
          <div
            className="h-3 rounded-full bg-[#FF4D2E] transition-all duration-500"
            style={{ width: `${Math.min(100, (ticket.usedCount / Math.max(1, ticket.maxUses)) * 100)}%` }}
          />
        </div>
      </div>

      <div className="mt-4 inline-flex max-w-full rounded-full border border-blue-400/25 bg-blue-400/10 px-4 py-2 text-center text-xs text-blue-200 sm:text-sm">
        Expira: {ticket.expiresAtLabel}
      </div>

      {ticket.showValidateButton ? (
        <>
          <div className="mt-5 h-px w-full bg-white/10 sm:mt-6" />

          <div className="mt-5 flex w-full justify-center sm:mt-6">
            <button
              type="button"
              onClick={validateRedeem}
              disabled={busy || isExhausted}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF4D2E] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#ff6542] disabled:cursor-not-allowed disabled:opacity-60 sm:max-w-md"
            >
              <CheckCircle2 className="h-4 w-4" />
              {busy ? "Procesando..." : isExhausted ? "Canje completado" : "Marcar como Entregado"}
            </button>
          </div>
        </>
      ) : null}

      {!isPublicView ? (
        <div className="mt-5 space-y-1 text-center sm:mt-6">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-mono tracking-[0.18em] text-white/45">
            ID: {ticket.code}
          </div>
          <p className="text-[10px] text-white/35">© 2025 Go Lounge Experience</p>
        </div>
      ) : null}
    </div>
  );
}
