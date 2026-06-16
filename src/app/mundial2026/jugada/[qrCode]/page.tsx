import Link from "next/link";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";

import Mundial2026PublicView from "./Mundial2026PublicView";
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
  REJECTED: "Sin premio disponible",
};

const claimStatusCompactLabelByStatus: Record<string, string> = {
  BLOCKED: "Bloqueado",
  AVAILABLE: "Disponible",
  REDEEMED: "Canjeado",
  EXPIRED: "Expirado",
  REJECTED: "Sin premio",
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

  if (args.predictionStatus === "WON" && args.claimStatus === "REJECTED") {
    return {
      label: "Acertaste, pero te quedaste sin premio",
      compactLabel: "Sin premio disponible",
      className: "text-amber-200",
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

  if (prediction.status === "WON" && prediction.claimStatus === "REJECTED") {
    return {
      title: `Hola ${firstName}, acertaste la jugada.`,
      description: "Esta vez el premio asignado al partido ya no tuvo cupos disponibles, por eso tu jugada quedó sin premio para reclamar.",
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
  const displayPrize = prediction.assignedPrize ?? globalPrize;
  const publicPrizeLabel = prediction.assignedPrize?.label || (globalPrize.label !== "Premio por confirmar" ? globalPrize.label : null);
  const isPredictionInCourse = prediction.match.status !== "SETTLED" && prediction.status === "PENDING";
  const isLostPrediction = prediction.status === "LOST";
  const isWinnerWithoutPrize = prediction.status === "WON" && prediction.claimStatus === "REJECTED";
  const uiClaimState = getUiClaimState({
    matchStatus: prediction.match.status,
    predictionStatus: prediction.status,
    claimStatus: prediction.claimStatus,
  });
  const publicOutcomeCopy = getPublicOutcomeCopy({
    status: prediction.status,
    claimStatus: prediction.claimStatus,
    participantName: prediction.participant.name,
    assignedPrizeLabel: publicPrizeLabel,
  });
  const shouldShowClaimDates = ["AVAILABLE", "REDEEMED", "EXPIRED"].includes(prediction.claimStatus);
  const qrDownloadName = `${slugifyDownloadPart(prediction.participant.name || "jugada") || "jugada"}_${prediction.qrCode.toLowerCase()}_mundialktdral.png`;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(94,28,106,0.22),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(37,99,235,0.18),_transparent_30%),linear-gradient(180deg,_#14070b_0%,_#10070a_42%,_#0b1330_100%)] text-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-3 py-5 sm:gap-6 sm:px-6 sm:py-8 lg:px-8">
        {isOperationalSession ? (
          <section className="mx-auto w-full max-w-[26rem] lg:max-w-lg">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1 sm:mb-4 sm:px-2">
              <Link href="/u" className="flex items-center gap-1.5 text-xs text-white/60 transition hover:text-white sm:gap-2 sm:text-sm">
                <span aria-hidden="true">‹</span>
                <span>Volver</span>
              </Link>
              <div className="text-xs font-bold tracking-[0.18em] text-white/45 sm:text-sm sm:tracking-[0.22em]">GO LOUNGE</div>
            </div>

            <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.06] px-4 py-4 shadow-2xl shadow-black/35 backdrop-blur-xl sm:rounded-[32px] sm:px-7 sm:py-7">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,_rgba(255,255,255,0.04),_transparent_26%)]" />

              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="mb-3 relative sm:mb-6">
                  <div className="absolute inset-0 bg-[#FF4D2E] blur-2xl opacity-20 rounded-full" />
                  <h1 className="relative text-[clamp(2.3rem,12vw,4rem)] leading-[0.9] font-black text-white tracking-tight drop-shadow-sm">
                    TOKEN<br />
                    <span className="text-[#FF4D2E]">MUNDIALISTA</span>
                  </h1>
                </div>

                <p className="max-w-[28rem] text-sm leading-7 text-white/80 sm:text-base sm:leading-relaxed">
                  Vista operativa para validar y registrar el canje de esta jugada.
                </p>

                <div className="mt-4 grid w-full gap-3 sm:mt-5">
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-4 text-left sm:px-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">Estado</div>
                    <div className={["mt-2 break-words text-lg font-bold leading-tight sm:text-xl", uiClaimState.className].join(" ")}>
                      {uiClaimState.compactLabel}
                    </div>
                  </div>

                  <div className="grid gap-3 min-[420px]:grid-cols-2">
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

                {isPredictionInCourse ? (
                  <div className="mt-3 w-full rounded-[22px] border border-sky-300/20 bg-sky-400/10 px-4 py-4 sm:rounded-[24px] sm:px-6 sm:py-6 text-left">
                    <div className="mb-2 text-xs sm:text-sm font-medium uppercase tracking-wider text-sky-100/80">Jugada en curso</div>
                    <h2 className="text-lg font-bold leading-tight break-words text-sky-50 sm:text-xl lg:text-2xl">
                      Esta jugada no se puede canjear todavia.
                    </h2>
                    <div className="mt-3 text-xs leading-6 text-sky-100/80 sm:text-sm sm:leading-relaxed">
                      El partido aun no termina. Cuando el juego cierre y se liquide el resultado, recien se definira si esta jugada queda disponible para canje.
                    </div>
                    <div className="mt-3 text-[11px] sm:text-sm text-sky-100/60">WhatsApp {maskMundial2026WhatsApp(prediction.participant.whatsappNormalized)}</div>
                  </div>
                ) : (
                  <>
                    {isLostPrediction ? (
                      <div className="mt-3 w-full rounded-[22px] border border-rose-300/20 bg-rose-400/10 px-4 py-4 sm:rounded-[24px] sm:px-6 sm:py-6 text-left">
                        <div className="mb-2 text-xs sm:text-sm font-medium uppercase tracking-wider text-rose-100/80">Resultado</div>
                        <h2 className="text-lg font-bold leading-tight break-words text-rose-50 sm:text-xl lg:text-2xl">
                          No acerto el resultado.
                        </h2>
                        <div className="mt-3 text-xs leading-6 text-rose-100/85 sm:text-sm sm:leading-relaxed">
                          Esta jugada no tiene premio para canje. Mejor suerte para la proxima.
                        </div>
                      </div>
                    ) : null}

                    {isWinnerWithoutPrize ? (
                      <div className="mt-3 w-full rounded-[22px] border border-amber-300/20 bg-amber-400/10 px-4 py-4 sm:rounded-[24px] sm:px-6 sm:py-6 text-left">
                        <div className="mb-2 text-xs sm:text-sm font-medium uppercase tracking-wider text-amber-100/80">Resultado</div>
                        <h2 className="text-lg font-bold leading-tight break-words text-amber-50 sm:text-xl lg:text-2xl">
                          Acertaste, pero el premio ya no tuvo cupo.
                        </h2>
                        <div className="mt-3 text-xs leading-6 text-amber-100/85 sm:text-sm sm:leading-relaxed">
                          Tu jugada fue correcta, pero el premio asignado al partido ya alcanzó su capacidad máxima antes de llegar a esta jugada.
                        </div>
                      </div>
                    ) : null}

                    <div
                      className={[
                        "mt-3 w-full rounded-[22px] px-4 py-4 sm:rounded-[24px] sm:px-6 sm:py-6 text-left",
                        (isLostPrediction || isWinnerWithoutPrize)
                          ? "border border-white/8 bg-white/[0.03]"
                          : "border border-white/10 bg-gradient-to-b from-white/10 to-transparent",
                      ].join(" ")}
                    >
                      <div className={[
                        "mb-2 text-xs sm:text-sm font-medium uppercase tracking-wider",
                        (isLostPrediction || isWinnerWithoutPrize) ? "text-white/40" : "text-white/60",
                      ].join(" ")}>
                        {(isLostPrediction || isWinnerWithoutPrize) ? "Premio del partido" : "Premio"}
                      </div>
                      <h2
                        className={[
                          "break-words font-bold leading-tight",
                          (isLostPrediction || isWinnerWithoutPrize) ? "text-lg sm:text-xl text-white/72" : "text-xl sm:text-2xl lg:text-3xl text-white",
                        ].join(" ")}
                        style={!(isLostPrediction || isWinnerWithoutPrize) && displayPrize.color ? { color: displayPrize.color } : undefined}
                      >
                        {displayPrize.label}
                      </h2>
                      {displayPrize.description ? (
                        <div
                          className={[
                          "mt-3 text-xs sm:text-sm leading-relaxed",
                          (isLostPrediction || isWinnerWithoutPrize) ? "text-white/60" : "text-white/80",
                        ].join(" ")}
                        >
                          {displayPrize.description}
                        </div>
                      ) : null}
                      <div
                        className={[
                          "mt-3 text-[11px] sm:text-sm",
                          (isLostPrediction || isWinnerWithoutPrize) ? "text-white/45" : "text-white/55",
                        ].join(" ")}
                      >
                        WhatsApp {maskMundial2026WhatsApp(prediction.participant.whatsappNormalized)}
                      </div>
                    </div>
                  </>
                )}

                <div className="mt-4 flex w-full flex-wrap items-center justify-center gap-2 sm:mt-5">
                  {shouldShowClaimDates && prediction.claimExpiresAt ? (
                    <div className="inline-flex max-w-full items-center justify-center rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1.5 text-center text-xs leading-5 text-sky-200/90 sm:py-2 sm:text-sm">
                      Expira: {formatShortDate(prediction.claimExpiresAt)}
                    </div>
                  ) : null}
                  {prediction.redeemedAt ? (
                    <div className="inline-flex max-w-full items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-center text-[11px] leading-5 text-emerald-200 sm:py-2 sm:text-sm">
                      Canjeado {formatShortDate(prediction.redeemedAt)}
                    </div>
                  ) : null}
                </div>

                {!isPredictionInCourse && !isLostPrediction && !isWinnerWithoutPrize ? (
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
                ) : null}
              </div>
            </div>
          </section>
        ) : (
          <Mundial2026PublicView
            publicOutcomeCopy={publicOutcomeCopy}
            qrCode={prediction.qrCode}
            qrImage={qrImage}
            qrDownloadName={qrDownloadName}
            isClaimBlocked={isClaimBlocked}
            predictionStatus={prediction.status}
            claimStatus={prediction.claimStatus}
            uiClaimState={uiClaimState}
            matchLabel={`${prediction.match.homeTeam} vs ${prediction.match.awayTeam}`}
            pickLabel={pickLabel(prediction.pick, prediction.match.homeTeam, prediction.match.awayTeam)}
            globalPrize={globalPrize}
            claimExpiresAtLabel={shouldShowClaimDates && prediction.claimExpiresAt ? formatShortDate(prediction.claimExpiresAt) : null}
          />
        )}
      </div>
    </div>
  );
}