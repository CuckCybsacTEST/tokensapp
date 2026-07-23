"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import JSZip from "jszip";
import { Copy, Download, Search, Sparkles, Ticket } from "lucide-react";

type TicketItem = {
  id: string;
  code: string;
  createdAt: string;
  redeemedAt: string | null;
  isActive: boolean;
  revokedAt: string | null;
  customerName: string;
  customerWhatsapp: string;
  customerPhrase: string | null;
  campaignName: string | null;
  redeemUrl: string;
};

type FanZoneResponse = {
  participant: {
    id: string;
    name: string;
    whatsappRaw: string;
    whatsappNormalized: string;
    createdAt: string;
  };
  stats: {
    totalPredictions: number;
    won: number;
    lost: number;
    pending: number;
    voided: number;
    expired: number;
  };
  entitlement: {
    eligibleQrCount: number;
    issuedQrCount: number;
    remainingQrCount: number;
  };
  tickets: TicketItem[];
  verificationOptions: string[];
  courtesy: {
    label: string;
    theme: string;
  };
  createdCount?: number;
};

type PreviewMap = Record<string, string>;

const placeholderQr = "";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Lima",
  }).format(new Date(value));
}

function statTone(value: number) {
  if (value <= 0) return "text-slate-400";
  if (value < 3) return "text-amber-200";
  return "text-emerald-300";
}

function TicketCard(props: {
  ticket: TicketItem;
  previewUrl: string;
  onCopy: (value: string) => void;
  onDownload: (ticket: TicketItem) => void;
}) {
  const { ticket, previewUrl } = props;

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">QR emitido</div>
          <div className="mt-1 text-lg font-black text-white">{ticket.customerName}</div>
          <div className="mt-1 text-sm text-slate-300">{ticket.customerWhatsapp}</div>
          <div className="mt-2 text-sm font-semibold text-amber-200">{ticket.customerPhrase || "Copa Pisco Sour — GRATIS"}</div>
          <div className="mt-2 text-xs text-slate-500">Emitido {formatDate(ticket.createdAt)}</div>
          <div className="mt-1 text-xs text-slate-500 break-all">{ticket.redeemUrl}</div>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span
            className={[
              "inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]",
              ticket.revokedAt
                ? "bg-rose-500/15 text-rose-200"
                : ticket.redeemedAt
                  ? "bg-emerald-500/15 text-emerald-200"
                  : ticket.isActive
                    ? "bg-sky-500/15 text-sky-200"
                    : "bg-slate-500/15 text-slate-200",
            ].join(" ")}
          >
            {ticket.revokedAt ? "Revocado" : ticket.redeemedAt ? "Canjeado" : ticket.isActive ? "Activo" : "Inactivo"}
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

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => props.onCopy(ticket.redeemUrl)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <Copy className="h-4 w-4" />
            Copiar link
          </button>
          <button
            type="button"
            onClick={() => props.onDownload(ticket)}
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

function QrPreview({
  redeemUrl,
  code,
  onReady,
}: {
  redeemUrl: string;
  code: string;
  onReady: (code: string, dataUrl: string) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState(placeholderQr);

  useEffect(() => {
    let mounted = true;
    QRCode.toDataURL(redeemUrl, { errorCorrectionLevel: "M", margin: 1, scale: 6 })
      .then((dataUrl) => {
        if (!mounted) return;
        setPreviewUrl(dataUrl);
        onReady(code, dataUrl);
      })
      .catch(() => {
        if (!mounted) return;
        setPreviewUrl(placeholderQr);
      });

    return () => {
      mounted = false;
    };
  }, [code, onReady, redeemUrl]);

  if (!previewUrl) {
    return <div className="flex aspect-square items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-500">Generando QR</div>;
  }

  return <img src={previewUrl} alt={`QR ${code}`} className="h-full w-full rounded-xl" />;
}

export default function FanZoneClient() {
  const [whatsapp, setWhatsapp] = useState("");
  const [count, setCount] = useState("0");
  const [loading, setLoading] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<FanZoneResponse | null>(null);
  const [previewMap, setPreviewMap] = useState<PreviewMap>({});
  const [selectedVerificationName, setSelectedVerificationName] = useState("");

  const remaining = summary?.entitlement.remainingQrCount || 0;
  useEffect(() => {
    if (summary) {
      setCount(String(Math.max(1, summary.entitlement.remainingQrCount || 1)));
      setSelectedVerificationName(summary.verificationOptions.length === 1 ? summary.verificationOptions[0] : "");
    }
  }, [summary]);

  async function searchParticipant() {
    const cleaned = whatsapp.trim();
    if (!cleaned) {
      setError("Ingresa un WhatsApp para buscar.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/mundial2026/fanzone?whatsapp=${encodeURIComponent(cleaned)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || "No se pudo cargar el participante.");
      setSummary(payload as FanZoneResponse);
      setCount(String(Math.max(1, payload.entitlement.remainingQrCount || 1)));
      setPreviewMap({});
    } catch (searchError) {
      setSummary(null);
      setError(searchError instanceof Error ? searchError.message : "No se pudo cargar el participante.");
    } finally {
      setLoading(false);
    }
  }

  async function issueTickets() {
    if (!summary) return;

    const rawCount = Number(count || 0);
    if (!Number.isFinite(rawCount) || rawCount <= 0) {
      setError("Ingresa una cantidad valida de QR a emitir.");
      return;
    }

    setIssuing(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/mundial2026/fanzone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          whatsapp: summary.participant.whatsappNormalized,
          count: rawCount,
          verifiedName: selectedVerificationName,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || "No se pudieron emitir los QR.");
      setSummary(payload as FanZoneResponse);
      setMessage(`Se emitieron ${(payload as FanZoneResponse).createdCount || 0} QR(s) para la fan zone.`);
      setSelectedVerificationName("");
      setPreviewMap({});
      setCount(String(Math.max(1, (payload as FanZoneResponse).entitlement.remainingQrCount || 1)));
    } catch (issueError) {
      setError(issueError instanceof Error ? issueError.message : "No se pudieron emitir los QR.");
    } finally {
      setIssuing(false);
    }
  }

  async function onDownload(ticket: TicketItem) {
    const dataUrl = previewMap[ticket.code] || (await QRCode.toDataURL(ticket.redeemUrl, { errorCorrectionLevel: "M", margin: 1, scale: 6 }));
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `mundial2026-fanzone-${ticket.code}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function downloadAll() {
    if (!summary?.tickets.length) return;

    try {
      setMessage(null);
      setError(null);
      const zip = new JSZip();
      const qrItems = await Promise.all(
        summary.tickets.map(async (ticket) => {
          const dataUrl =
            previewMap[ticket.code] || (await QRCode.toDataURL(ticket.redeemUrl, { errorCorrectionLevel: "M", margin: 1, scale: 6 }));
          return { ticket, dataUrl };
        })
      );

      await Promise.all(
        qrItems.map(async ({ ticket, dataUrl }) => {
          const blob = await fetch(dataUrl).then((response) => response.blob());
          zip.file(`mundial2026-fanzone-${ticket.code}.png`, blob);
        })
      );

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `mundial2026-fanzone-${summary.participant.whatsappNormalized}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "No se pudo descargar el paquete.");
    }
  }

  function handleCopy(value: string) {
    void navigator.clipboard.writeText(value);
    setMessage("Link copiado al portapapeles.");
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_28%),linear-gradient(180deg,_rgba(15,23,42,0.98)_0%,_rgba(2,6,23,0.96)_100%)] p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">/admin/mundial2026/fanzone</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Fan Zone Mundial 2026</h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Busca el WhatsApp, revisa cuántas jugadas tiene y emite los QR de cortesía para{" "}
              <span className="font-semibold text-amber-200">Copa Pisco Sour — GRATIS</span>.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/admin/mundial2026" className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
              Volver al panel
            </Link>
            <Link href="/mundial2026" className="inline-flex rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              Ver mini app
            </Link>
          </div>
        </div>
      </section>

      {message ? <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

      <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Buscar participante</div>
          <div className="mt-2 text-2xl font-black text-white">Consulta por WhatsApp</div>
          <p className="mt-2 text-sm text-slate-300">
            Regla actual: 1 QR por cada 2 jugadas, redondeando hacia arriba. Si un WhatsApp tiene 3 o 4 jugadas, puede emitir 2 QR.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              value={whatsapp}
              onChange={(event) => setWhatsapp(event.target.value)}
              placeholder="+51 9XX XXX XXX"
              className="input w-full bg-slate-950/45 text-white"
            />
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

          {summary ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Jugadas" value={summary.stats.totalPredictions} tone={statTone(summary.stats.totalPredictions)} />
              <StatCard label="QR elegibles" value={summary.entitlement.eligibleQrCount} tone={statTone(summary.entitlement.eligibleQrCount)} />
              <StatCard label="Emitidos" value={summary.entitlement.issuedQrCount} tone={statTone(summary.entitlement.issuedQrCount)} />
              <StatCard label="Restantes" value={summary.entitlement.remainingQrCount} tone={statTone(summary.entitlement.remainingQrCount)} />
            </div>
          ) : null}
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Lógica operativa</div>
          <div className="mt-2 text-2xl font-black text-white">Cupo automático por participación</div>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
            <p>1. Se consolida el WhatsApp y se cuenta la cantidad de jugadas en Mundial 2026.</p>
            <p>2. El cupo base se calcula con la regla de redondeo hacia arriba.</p>
            <p>3. Los QR ya emitidos para esa fan zone se descuentan del remanente.</p>
            <p>4. El resultado se puede descargar en PNG individual o como ZIP.</p>
          </div>

          <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-slate-950/25 p-4 text-sm text-slate-300">
            <div className="font-semibold text-white">Cortesía activa</div>
            <div className="mt-1 text-amber-200">{summary?.courtesy.label || "Copa Pisco Sour — GRATIS"}</div>
            <div className="mt-1 text-xs text-slate-500">Cada QR apunta a una URL pública propia de la fan zone.</div>
          </div>
        </div>
      </section>

      {summary ? (
        <>
          <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Resultado de búsqueda</div>
                  <h2 className="mt-2 text-2xl font-black text-white">{summary.participant.name}</h2>
                  <p className="mt-2 text-sm text-slate-300">{summary.participant.whatsappNormalized}</p>
                </div>
                <div className="text-xs text-slate-400">Participa desde {formatDate(summary.participant.createdAt)}</div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <MiniStat label="Ganadas" value={summary.stats.won} />
                <MiniStat label="Perdidas" value={summary.stats.lost} />
                <MiniStat label="Pendientes" value={summary.stats.pending} />
                <MiniStat label="Void" value={summary.stats.voided} />
                <MiniStat label="Expiradas" value={summary.stats.expired} />
                <MiniStat label="Cortesías" value={summary.entitlement.eligibleQrCount} />
              </div>

              <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/35 p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Verificación de nombre</div>
                <div className="mt-2 text-sm text-slate-300">
                  {summary.verificationOptions.length > 1
                    ? "Elige la forma en la que el cliente confirma su nombre antes de emitir el QR."
                    : "El nombre fue detectado con una sola forma válida. Confirma y continúa."}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {summary.verificationOptions.map((option) => {
                    const active = selectedVerificationName === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setSelectedVerificationName(option)}
                        className={[
                          "rounded-full border px-4 py-2 text-sm font-semibold transition",
                          active
                            ? "border-amber-300/35 bg-amber-300/15 text-amber-100"
                            : "border-white/10 bg-white/5 text-white hover:bg-white/10",
                        ].join(" ")}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  Selección actual: {selectedVerificationName || "sin confirmar"}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void issueTickets()}
                  disabled={issuing || summary.entitlement.remainingQrCount <= 0 || !selectedVerificationName}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Ticket className="h-4 w-4" />
                  {issuing
                    ? "Emitiendo..."
                    : summary.entitlement.remainingQrCount > 0
                      ? !selectedVerificationName
                        ? "Confirma el nombre"
                        : `Emitir ${Math.max(1, Number(count || 1))} QR`
                      : "Sin cupo"}
                </button>
                <button
                  type="button"
                  onClick={() => void downloadAll()}
                  disabled={!summary.tickets.length}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Descargar todos
                </button>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Cantidad a emitir</div>
              <div className="mt-2 text-2xl font-black text-white">Ajusta el lote antes de descargar</div>
              <p className="mt-2 text-sm text-slate-300">Puedes emitir menos que el remanente si el operador quiere repartir una parte de las cortesías en varias etapas.</p>

              <div className="mt-5 flex gap-3">
                <input
                  value={count}
                  onChange={(event) => setCount(event.target.value)}
                  className="input w-full bg-slate-950/45 text-white"
                  inputMode="numeric"
                />
                <button
                  type="button"
                  onClick={() => setCount(String(summary.entitlement.remainingQrCount || 1))}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Usar remanente
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-sm text-slate-300">
                <div className="flex items-center gap-2 text-white">
                  <Sparkles className="h-4 w-4 text-amber-200" />
                  QR visibles en esta sesión
                </div>
                <div className="mt-2">{summary.tickets.length} QR listos para descargar.</div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">QR generados</div>
                <h3 className="mt-2 text-2xl font-black text-white">Paquete de cortesías</h3>
              </div>
              <div className="text-xs text-slate-400">{summary.tickets.length} elementos</div>
            </div>

            {summary.tickets.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-white/15 bg-white/[0.03] p-8 text-sm text-slate-400">
                Aún no se emitió ningún QR para este WhatsApp.
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {summary.tickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                    <div className="hidden">
                      <QrPreview
                        code={ticket.code}
                        redeemUrl={ticket.redeemUrl}
                        onReady={(code, dataUrl) =>
                          setPreviewMap((current) => ({
                            ...current,
                            [code]: dataUrl,
                          }))
                        }
                      />
                    </div>
                    <TicketCard ticket={ticket} previewUrl={previewMap[ticket.code] || placeholderQr} onCopy={handleCopy} onDownload={(currentTicket) => void onDownload(currentTicket)} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</div>
      <div className={`mt-2 text-3xl font-black ${tone}`}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-black text-white">{value}</div>
    </div>
  );
}
