import Link from "next/link";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";

import Mundial2026RedeemPanel from "./Mundial2026RedeemPanel";
import { verifyUserSessionCookie } from "@/lib/auth";
import { generateQrPngDataUrl } from "@/lib/qr";
import { buildMundial2026PredictionQrPayload } from "@/lib/mundial2026/signing";
import { maskMundial2026WhatsApp } from "@/lib/mundial2026/whatsapp";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDate(value: Date | null) {
  if (!value) return "Pendiente";
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(value);
}

function pickLabel(pick: string, homeTeam: string, awayTeam: string) {
  if (pick === "HOME") return `${homeTeam} gana`;
  if (pick === "AWAY") return `${awayTeam} gana`;
  return "Empate";
}

function formatShortDate(value: Date | null) {
  if (!value) return "Pendiente";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function slugifyDownloadPart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function getGlobalPrizeCopy(
  prizes: Array<{ label: string; description: string | null; color: string | null }>
) {
  const [firstPrize, ...rest] = prizes;

  if (!firstPrize) {
    return {
      label: "Premio por confirmar",
      description: null as string | null,
      color: null as string | null,
      badge: null as string | null,
    };
  }

  return {
    label: firstPrize.label,
    description: firstPrize.description,
    color: firstPrize.color,
    badge: rest.length > 0 ? `+${rest.length} premio${rest.length > 1 ? "s" : ""}` : null,
  };
}

const claimBadgeByStatus: Record<string, string> = {
  BLOCKED: "bg-amber-300/18 text-amber-100",
  AVAILABLE: "bg-emerald-300/18 text-emerald-100",
  REDEEMED: "bg-sky-300/18 text-sky-100",
  EXPIRED: "bg-rose-300/18 text-rose-100",
  REJECTED: "bg-slate-400/18 text-slate-200",
};

const claimStatusLabelByStatus: Record<string, string> = {
  BLOCKED: "Bloqueado",
  AVAILABLE: "Jugada ganadora",
  REDEEMED: "Canjeado",
  EXPIRED: "Expirado",
  REJECTED: "Rechazado",
};

const claimStatusCompactLabelByStatus: Record<string, string> = {
  BLOCKED: "Bloqueado",
  AVAILABLE: "Disponible",
  REDEEMED: "Canjeado",
  EXPIRED: "Expirado",
  REJECTED: "Rechazado",
};

const claimStatusCompactClassByStatus: Record<string, string> = {
  BLOCKED: "text-amber-200",
  AVAILABLE: "text-emerald-300",
  REDEEMED: "text-sky-200",
  EXPIRED: "text-rose-200",
  REJECTED: "text-slate-300",
};

function getUiClaimState(args: { matchStatus: string; predictionStatus: string; claimStatus: string }) {
  if (args.matchStatus !== "SETTLED" && args.predictionStatus === "PENDING") {
    return {
      label: "Jugada en curso",
      compactLabel: "Jugada en curso",
      className: "text-sky-200",
    };
  }

  return {
    label: claimStatusLabelByStatus[args.claimStatus] || args.claimStatus,
    compactLabel: claimStatusCompactLabelByStatus[args.claimStatus] || args.claimStatus,
    className: claimStatusCompactClassByStatus[args.claimStatus] || "text-white/75",
  };
}

function getPublicOutcomeCopy(prediction: { status: string; claimStatus: string; participantName: string; assignedPrizeLabel: string | null }) {
  const firstName = prediction.participantName.trim().split(/\s+/)[0] || "mundialista";

  if (prediction.status === "WON" && (prediction.claimStatus === "AVAILABLE" || prediction.claimStatus === "REDEEMED")) {
    return {
      title: `Hola ${firstName}, buena jugada: acertaste.`,
      description: prediction.claimStatus === "REDEEMED"
        ? "Tu premio ya fue reclamado en Ktdral Lounge."
        : prediction.assignedPrizeLabel
          ? `Acércate a Ktdral Lounge, muestra tu QR y reclama ${prediction.assignedPrizeLabel}.`
          : "Acércate a Ktdral Lounge, muestra tu QR y reclama tu premio.",
    };
  }

  if (prediction.status === "LOST") {
    return {
      title: `Hola ${firstName}, esta fue tu jugada.`,
      description: "Esta vez no se abrió el premio. Puedes volver a jugar en el próximo partido.",
    };
  }

  return {
    title: `¡Hola ${firstName}, esta es tu jugada!`,
    description: "El premio se desbloquea si aciertas.",
  };
}

export default async function Mundial2026PredictionPage({ params }: { params: { qrCode: string } }) {
  const prediction = await prisma.mundial2026Prediction.findUnique({
    where: { qrCode: params.qrCode },
    select: {
      id: true,
      qrCode: true,
      signature: true,
      signatureVersion: true,
      pick: true,
      status: true,
      claimStatus: true,
      availableAt: true,
      claimExpiresAt: true,
      redeemedAt: true,
      createdAt: true,
      match: {
        select: {
          homeTeam: true,
          awayTeam: true,
          startsAt: true,
          stage: true,
          status: true,
          settledAt: true,
          result: true,
          matchPrizes: {
            where: { active: true },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: {
              prize: {
                select: {
                  label: true,
                  description: true,
                  color: true,
                },
              },
            },
          },
        },
      },
      participant: {
        select: {
          name: true,
          whatsappNormalized: true,
        },
      },
      assignedPrize: {
        select: {
          label: true,
          description: true,
          color: true,
        },
      },
    },
  });

  if (!prediction) {
    notFound();
  }

  const headersList = headers();
  const host = headersList.get("x-forwarded-host") || headersList.get("host") || "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const requestBaseUrl = `${protocol}://${host}`;
  const rawSession = cookies().get("user_session")?.value || null;
  const session = await verifyUserSessionCookie(rawSession);
  const isOperationalSession = !!session;

  const qrPayload = buildMundial2026PredictionQrPayload({
    predictionId: prediction.id,
    qrCode: prediction.qrCode,
    signature: prediction.signature,
    signatureVersion: prediction.signatureVersion,
    urlOrReq: requestBaseUrl,
  });
  const qrImage = await generateQrPngDataUrl(qrPayload);
  const isClaimBlocked = prediction.claimStatus === "BLOCKED";
  const globalPrize = getGlobalPrizeCopy(prediction.match.matchPrizes.map((item) => item.prize));
  const uiClaimState = getUiClaimState({
    matchStatus: prediction.match.status,
    predictionStatus: prediction.status,
    claimStatus: prediction.claimStatus,
  });
  const publicOutcomeCopy = getPublicOutcomeCopy({
    status: prediction.status,
    claimStatus: prediction.claimStatus,
    participantName: prediction.participant.name,
    assignedPrizeLabel: prediction.assignedPrize?.label || null,
  });
  const shouldShowClaimDates = ["AVAILABLE", "REDEEMED", "EXPIRED"].includes(prediction.claimStatus);
  const qrDownloadName = `${slugifyDownloadPart(prediction.participant.name || "jugada") || "jugada"}_${prediction.qrCode.toLowerCase()}_mundialktdral.png`;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(94,28,106,0.22),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(37,99,235,0.18),_transparent_30%),linear-gradient(180deg,_#14070b_0%,_#10070a_42%,_#0b1330_100%)] text-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        {isOperationalSession ? (
          <section className="mx-auto w-full max-w-[22rem] sm:max-w-md">
            <div className="mb-3 flex items-center justify-between px-1.5 sm:mb-4 sm:px-2">
              <Link href="/u" className="flex items-center gap-1.5 text-xs text-white/60 transition hover:text-white sm:gap-2 sm:text-sm">
                <span aria-hidden="true">‹</span>
                <span>Volver</span>
              </Link>
              <div className="text-xs font-bold tracking-[0.18em] text-white/45 sm:text-sm sm:tracking-[0.22em]">GO LOUNGE</div>
            </div>

            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.06] px-3.5 py-4 shadow-2xl shadow-black/35 backdrop-blur-xl sm:rounded-[32px] sm:px-7 sm:py-7">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,_rgba(255,255,255,0.04),_transparent_26%)]" />

              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="mb-3 relative sm:mb-6">
                  <div className="absolute inset-0 bg-[#FF4D2E] blur-2xl opacity-20 rounded-full" />
                  <h1 className="relative text-[1.7rem] sm:text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow-sm">
                    TOKEN<br />
                    <span className="text-[#FF4D2E]">MUNDIALISTA</span>
                  </h1>
                </div>

                <p className="max-w-[20rem] text-sm leading-snug text-white/80 sm:max-w-[24rem] sm:leading-relaxed sm:text-base">
                  Vista operativa para validar y registrar el canje de esta jugada.
                </p>

                <div className="mt-4 grid w-full gap-3 sm:mt-5">
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-4 text-left sm:px-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">Estado</div>
                    <div className={["mt-2 text-lg sm:text-xl font-bold leading-tight", uiClaimState.className].join(" ")}>
                      {uiClaimState.compactLabel}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-4 text-left sm:px-5">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">Participante</div>
                      <div className="mt-2 text-base sm:text-lg font-semibold leading-tight text-white/85 break-words">{prediction.participant.name}</div>
                    </div>

                    <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-4 text-left sm:px-5">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">Pronóstico</div>
                      <div className="mt-2 text-base sm:text-lg font-semibold leading-tight text-amber-200 break-words">{pickLabel(prediction.pick, prediction.match.homeTeam, prediction.match.awayTeam)}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 w-full rounded-[22px] border border-white/10 bg-gradient-to-b from-white/10 to-transparent px-4 py-4 sm:rounded-[24px] sm:px-6 sm:py-6 text-left">
                  <div className="mb-2 text-xs sm:text-sm font-medium uppercase tracking-wider text-white/60">Premio asignado</div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold leading-tight break-words text-white" style={prediction.assignedPrize?.color ? { color: prediction.assignedPrize.color } : undefined}>
                    {prediction.assignedPrize?.label || "Sin premio asignado"}
                  </h2>
                  {prediction.assignedPrize?.description ? <div className="mt-3 text-xs sm:text-sm leading-relaxed text-white/80">{prediction.assignedPrize.description}</div> : null}
                  <div className="mt-3 text-[11px] sm:text-sm text-white/55">WhatsApp {maskMundial2026WhatsApp(prediction.participant.whatsappNormalized)}</div>
                </div>

                <div className="mt-4 flex max-w-full flex-wrap items-center justify-center gap-2 sm:mt-5">
                  {shouldShowClaimDates && prediction.claimExpiresAt ? (
                    <div className="inline-flex max-w-full items-center justify-center rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1.5 text-center text-xs text-sky-200/90 sm:py-2 sm:text-sm">
                      Expira: {formatShortDate(prediction.claimExpiresAt)}
                    </div>
                  ) : null}
                  {shouldShowClaimDates && prediction.availableAt ? (
                    <div className="inline-flex max-w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-center text-[11px] text-white/60 sm:py-2 sm:text-sm">
                      Disponible desde {formatShortDate(prediction.availableAt)}
                    </div>
                  ) : null}
                  {prediction.redeemedAt ? (
                    <div className="inline-flex max-w-full items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-center text-[11px] text-emerald-200 sm:py-2 sm:text-sm">
                      Canjeado {formatShortDate(prediction.redeemedAt)}
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 w-full sm:mt-5">
                  <Mundial2026RedeemPanel
                    qrPayload={qrPayload}
                    role={session?.role || null}
                    claimStatus={prediction.claimStatus}
                    predictionStatus={prediction.status}
                    assignedPrizeLabel={prediction.assignedPrize?.label || null}
                    availableAt={prediction.availableAt ? prediction.availableAt.toISOString() : null}
                    claimExpiresAt={prediction.claimExpiresAt ? prediction.claimExpiresAt.toISOString() : null}
                    redeemedAt={prediction.redeemedAt ? prediction.redeemedAt.toISOString() : null}
                  />
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="mx-auto w-full max-w-[22.5rem] sm:max-w-lg">
            <div className="mb-3 flex items-center justify-between px-1.5 sm:mb-4 sm:px-2">
              <Link href="/mundial2026" className="flex items-center gap-1.5 text-xs text-white/60 transition hover:text-white sm:gap-2 sm:text-sm">
                <span aria-hidden="true">‹</span>
                <span>Volver</span>
              </Link>
              <div className="text-xs font-bold tracking-[0.18em] text-white/45 sm:text-sm sm:tracking-[0.22em]">GO LOUNGE</div>
            </div>

            <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.06] px-3.5 py-4 shadow-2xl shadow-black/35 backdrop-blur-xl sm:rounded-[32px] sm:px-7 sm:py-7">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,_rgba(255,255,255,0.04),_transparent_26%)]" />

              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="mb-3 relative sm:mb-6">
                  <div className="absolute inset-0 bg-[#FF4D2E] blur-2xl opacity-20 rounded-full" />
                  <h1 className="relative text-[1.7rem] sm:text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow-sm">
                    TOKEN<br />
                    <span className="text-[#FF4D2E]">MUNDIALISTA</span>
                  </h1>
                </div>

                <p className="max-w-[19rem] text-sm leading-6 text-white/80 sm:max-w-[24rem] sm:leading-relaxed sm:text-base">{publicOutcomeCopy.title}</p>

                <p className="mt-2 max-w-[19rem] text-xs leading-6 text-white/60 sm:max-w-[24rem] sm:text-sm sm:leading-relaxed">{publicOutcomeCopy.description}</p>

                <div className={[
                  "mt-4 w-full max-w-[17.75rem] rounded-[18px] border-2 p-2.5 shadow-[0_0_0_1px_rgba(255,90,47,0.08)] transition-all sm:mt-5 sm:max-w-[21rem] sm:rounded-[20px] sm:p-5",
                  isClaimBlocked
                    ? "border-slate-300/20 bg-slate-200/90"
                    : "border-[#FF5A2F]/25 bg-white",
                ].join(" ")}>
                  <div className="relative">
                    <img
                      alt={`QR ${prediction.qrCode}`}
                      className={[
                        "mx-auto h-auto w-full max-w-[14.75rem] transition-all sm:max-w-[18rem]",
                        isClaimBlocked ? "grayscale opacity-55 contrast-75" : "grayscale-0 opacity-100",
                      ].join(" ")}
                      src={qrImage}
                    />
                    {isClaimBlocked ? (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="rounded-full border border-slate-700/15 bg-slate-900/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm sm:text-[11px]">
                          {uiClaimState.label}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  {!isClaimBlocked ? (
                    <a
                      className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#111827] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-black sm:mt-4 sm:min-h-12 sm:px-4 sm:text-sm sm:tracking-[0.18em]"
                      download={qrDownloadName}
                      href={qrImage}
                    >
                      Descargar QR
                    </a>
                  ) : null}
                </div>

                <div className="mt-4 grid w-full gap-2 rounded-[18px] border border-white/10 bg-white/[0.04] px-3 py-3 text-left sm:mt-5 sm:gap-3 sm:rounded-[20px] sm:px-4.5 sm:py-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35 sm:text-[11px]">Tu jugada registrada</div>
                  <div className="min-w-0 text-base font-semibold leading-6 text-white/80 sm:text-[1.05rem]">{prediction.match.homeTeam} vs {prediction.match.awayTeam}</div>
                  <div className="min-w-0 text-[12px] sm:text-sm font-semibold leading-6 text-amber-200 break-words">Pronóstico: {pickLabel(prediction.pick, prediction.match.homeTeam, prediction.match.awayTeam)}</div>
                  <div className={["min-w-0 text-[12px] sm:text-sm font-medium leading-6", uiClaimState.className].join(" ")}>
                    Estado: {uiClaimState.label}
                  </div>
                </div>

                <div className="mt-3 w-full rounded-[22px] border border-white/10 bg-gradient-to-b from-white/10 to-transparent px-3.5 py-3.5 text-left sm:rounded-[24px] sm:px-6 sm:py-6">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs sm:text-sm font-medium uppercase tracking-wider text-white/60">JUGANDO POR</div>
                    {globalPrize.badge ? (
                      <span className="rounded-full border border-sky-300/20 bg-sky-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-100">
                        {globalPrize.badge}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold leading-tight break-words text-white" style={globalPrize.color ? { color: globalPrize.color } : undefined}>
                    {globalPrize.label}
                  </h2>
                  {globalPrize.description ? (
                    <div className="mt-3 text-xs sm:text-sm leading-relaxed text-white/80">{globalPrize.description}</div>
                  ) : null}
                </div>

                <div className="mt-4 grid w-full gap-2 sm:mt-5 sm:grid-cols-2">
                  {shouldShowClaimDates && prediction.claimExpiresAt ? (
                    <div className="inline-flex w-full items-center justify-center rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-2 text-center text-xs text-sky-200/90 sm:text-sm">
                      Expira: {formatShortDate(prediction.claimExpiresAt)}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}