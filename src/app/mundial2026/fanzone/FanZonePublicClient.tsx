"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, Search, Ticket } from "lucide-react";

import { Modal } from "@/components/Modal";
import { formatMundial2026FanZoneExpiresAt, normalizeMundial2026FanZoneVerifiedName } from "@/lib/mundial2026/fanzone-public";

type TicketItem = {
  id: string;
  code: string;
  createdAt: string;
  redeemedAt: string | null;
  revokedAt: string | null;
  expiresAt: string | null;
  redeemedBy: string | null;
  isActive: boolean;
  customerName: string;
  customerWhatsapp: string;
  customerPhrase: string | null;
  campaignName: string | null;
  redeemUrl: string;
  maxUses: number;
  usedCount: number;
};

type FanZoneResponse = {
  participant: {
    id: string;
    name: string;
    whatsappRaw: string;
    whatsappNormalized: string;
    createdAt: string;
  };
  verificationOptions: string[];
  tickets: TicketItem[];
  courtesy: {
    label: string;
    theme: string;
  };
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Lima",
  }).format(new Date(value));
}

function TicketCard({
  ticket,
  onDownload,
}: {
  ticket: TicketItem;
  onDownload: (ticket: TicketItem, previewUrl?: string) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    let mounted = true;
    QRCode.toDataURL(ticket.redeemUrl, { errorCorrectionLevel: "M", margin: 1, scale: 6 })
      .then((value) => {
        if (mounted) setPreviewUrl(value);
      })
      .catch(() => {
        if (mounted) setPreviewUrl("");
      });
    return () => {
      mounted = false;
    };
  }, [ticket.redeemUrl]);

  return (
    <div className="rounded-[24px] border border-white/10 bg-slate-950/45 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Recompensa FAN ZONE</div>
          <div className="mt-1 text-lg font-black text-white">{ticket.customerName}</div>
          <div className="mt-1 text-sm text-slate-300">{ticket.customerWhatsapp}</div>
          <div className="mt-2 text-sm font-semibold text-amber-200">{ticket.customerPhrase || "Copa Pisco Sour — GRATIS"}</div>

          <div className="mt-2 text-sm font-semibold text-emerald-200">USOS DISPONIBLES: {ticket.maxUses} veces</div>
          <div className="mt-1 text-xs text-emerald-100/70">({ticket.usedCount} usadas)</div>

          <div className="mt-2 text-xs text-slate-500">Vence {ticket.expiresAt ? formatDate(ticket.expiresAt) : formatMundial2026FanZoneExpiresAt()}</div>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span className="inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Activo
          </span>
          <div className="text-[11px] font-mono tracking-[0.2em] text-slate-400">{ticket.code}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[160px_1fr] lg:items-center">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white p-3">
          {previewUrl ? (
            <img src={previewUrl} alt={`QR ${ticket.code}`} className="h-full w-full rounded-xl" />
          ) : (
            <div className="flex aspect-square items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-500">Generando QR</div>
          )}
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => onDownload(ticket, previewUrl || undefined)}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
          >
            <Download className="h-4 w-4" />
            Descargar QR
          </button>
        </div>
      </div>
    </div>
  );
}

const MAX_VERIFICATION_ATTEMPTS = 2;
const VERIFICATION_COOLDOWN_MS = 60_000;

export default function FanZonePublicClient() {
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [summary, setSummary] = useState<FanZoneResponse | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const [verificationRetryUntil, setVerificationRetryUntil] = useState(0);

  useEffect(() => {
    if (!summary) return;
    const storageKey = `mundial2026-fanzone-verification:${summary.participant.whatsappNormalized}`;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { attempts?: number; retryUntil?: number };
      setVerificationAttempts(Math.max(0, Number(parsed.attempts || 0)));
      setVerificationRetryUntil(Math.max(0, Number(parsed.retryUntil || 0)));
    } catch {
      setVerificationAttempts(0);
      setVerificationRetryUntil(0);
    }
  }, [summary?.participant.whatsappNormalized]);

  useEffect(() => {
    if (!summary) return;
    const storageKey = `mundial2026-fanzone-verification:${summary.participant.whatsappNormalized}`;
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        attempts: verificationAttempts,
        retryUntil: verificationRetryUntil,
      })
    );
  }, [summary, verificationAttempts, verificationRetryUntil]);

  async function searchParticipant() {
    const cleaned = whatsapp.trim();
    if (!cleaned) {
      setError("Ingresa un WhatsApp para buscar.");
      return;
    }

    setLoading(true);
    setError(null);
    setModalError(null);
    setMessage(null);
    setIsVerified(false);
    setVerificationAttempts(0);
    setVerificationRetryUntil(0);

    try {
      const response = await fetch(`/api/mundial2026/fanzone?whatsapp=${encodeURIComponent(cleaned)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || "No se pudo cargar el participante.");
      setSummary(payload as FanZoneResponse);
      setShowVerificationModal(true);
    } catch (searchError) {
      setSummary(null);
      setShowVerificationModal(false);
      setError(searchError instanceof Error ? searchError.message : "No se pudo cargar el participante.");
    } finally {
      setLoading(false);
    }
  }

  function formatRetryMessage(retryUntil: number) {
    const seconds = Math.max(1, Math.ceil((retryUntil - Date.now()) / 1000));
    return seconds >= 60 ? "Espera 1 minuto para volver a intentar." : `Espera ${seconds} segundo${seconds === 1 ? "" : "s"} para volver a intentar.`;
  }

  async function issueQr(verifiedName: string) {
    if (!summary) return;
    setIssuing(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/mundial2026/fanzone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsapp: summary.participant.whatsappNormalized,
          verifiedName,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || "No se pudo generar el QR.");
      setSummary(payload as FanZoneResponse);
      setIsVerified(true);
      setShowVerificationModal(false);
    } catch (issueError) {
      setError(issueError instanceof Error ? issueError.message : "No se pudo generar el QR.");
    } finally {
      setIssuing(false);
    }
  }

  function handleVerificationPick(option: string) {
    if (!summary) return;
    const now = Date.now();
    if (verificationRetryUntil > now) {
      setModalError(formatRetryMessage(verificationRetryUntil));
      return;
    }

    const isCorrect = normalizeMundial2026FanZoneVerifiedName(option) === normalizeMundial2026FanZoneVerifiedName(summary.participant.name);
    if (isCorrect) {
      setModalError(null);
      void issueQr(option);
      return;
    }

    const nextAttempts = verificationAttempts + 1;
    if (nextAttempts >= MAX_VERIFICATION_ATTEMPTS) {
      const retryUntil = now + VERIFICATION_COOLDOWN_MS;
      setVerificationAttempts(nextAttempts);
      setVerificationRetryUntil(retryUntil);
      setModalError("Demasiados intentos. Intenta nuevamente en 1 minuto.");
      return;
    }

    setVerificationAttempts(nextAttempts);
    setModalError(`Nombre incorrecto. Te queda ${MAX_VERIFICATION_ATTEMPTS - nextAttempts} intento.`);
  }

  async function downloadSingle(ticket: TicketItem, previewUrl?: string) {
    const dataUrl = previewUrl || (await QRCode.toDataURL(ticket.redeemUrl, { errorCorrectionLevel: "M", margin: 1, scale: 6 }));
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `mundial2026-fanzone-${ticket.code}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const ticket = isVerified ? summary?.tickets[0] : null;

  return (
    <div className="space-y-6">
      {message ? <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">{message}</div> : null}
      {error && !showVerificationModal ? <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

      {!ticket ? (
        <>
          <section className="overflow-hidden rounded-[24px] border border-amber-300/20 bg-[linear-gradient(180deg,_rgba(251,191,36,0.12)_0%,_rgba(8,15,30,0.86)_40%,_rgba(2,6,23,0.94)_100%)] p-5 shadow-2xl shadow-black/30 sm:p-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-200/80">Canjea</div>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Copa Pisco Sour <span className="text-amber-300">— GRATIS</span>
            </h2>
          </section>

          <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Buscar mi recompensa</div>
            <div className="mt-2 text-2xl font-black text-white">Ingresa tu WhatsApp</div>
            <p className="mt-2 text-sm text-slate-300">Ingresa el número whatsapp de tu jugada, verifica tu nombre y genera tu qr con el premio</p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} placeholder="9XX XXX XXX" className="input w-full bg-slate-950/45 text-white" />
              <button
                type="button"
                onClick={() => void searchParticipant()}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Search className="h-4 w-4" />
                {loading ? "Buscando..." : "Buscar"}
              </button>
            </div>
          </section>
        </>
      ) : null}

      {ticket ? (
        <section className="space-y-4">
          <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Ticket className="h-4 w-4 text-emerald-200" />
              Muestra este QR en la barra de Ktdral Lounge
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">El equipo lo escaneará para validar tu recompensa y registrar el uso correspondiente.</p>
          </div>

          <TicketCard ticket={ticket} onDownload={(currentTicket, previewUrl) => void downloadSingle(currentTicket, previewUrl)} />
        </section>
      ) : null}

      <Modal isOpen={showVerificationModal} onClose={() => setShowVerificationModal(false)} title="Confirma tu nombre" size="lg">
        <div className="space-y-5 text-white">
          {modalError ? <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{modalError}</div> : null}
          <div className="flex flex-wrap gap-2">
            {summary?.verificationOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleVerificationPick(option)}
                disabled={issuing || verificationRetryUntil > Date.now()}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}