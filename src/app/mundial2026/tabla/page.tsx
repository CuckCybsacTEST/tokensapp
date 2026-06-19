import Mundial2026TablaClient, { type Mundial2026TablaProps } from "./Mundial2026TablaClient";
import { getMundial2026Insights } from "@/lib/mundial2026/insights";
import { MUNDIAL2026_CLAIM_WINDOW_HOURS } from "@/lib/mundial2026/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Lima",
  }).format(new Date(value));
}

function formatMatchWinner(result: string | null, homeTeam: string, awayTeam: string) {
  if (result === "HOME") return homeTeam;
  if (result === "AWAY") return awayTeam;
  if (result === "DRAW") return "Empate";
  return "Pendiente";
}

function formatClaimStatus(status: string) {
  if (status === "AVAILABLE") return "Disponible";
  if (status === "REDEEMED") return "Canjeado";
  if (status === "EXPIRED") return "Vencido";
  if (status === "REJECTED") return "Sin premio";
  return "Bloqueado";
}

function claimTone(status: string): Mundial2026TablaProps["winners"][number]["claimStatusTone"] {
  if (status === "AVAILABLE") return "emerald";
  if (status === "REDEEMED") return "sky";
  if (status === "EXPIRED") return "rose";
  if (status === "REJECTED") return "amber";
  return "slate";
}

export default async function Mundial2026TablaPage() {
  const insights = await getMundial2026Insights();
  const winners = insights.predictions
    .filter((prediction) => prediction.status === "WON")
    .map((prediction) => ({
      id: prediction.id,
      detailPath: `/mundial2026?recover=1&match=${encodeURIComponent(prediction.match.id)}`,
      participantName: prediction.participant.name,
      matchLabel: `${prediction.match.homeTeam} vs ${prediction.match.awayTeam}`,
      matchStageLabel: prediction.match.stage || "Partido",
      matchStartsAtLabel: formatDate(prediction.match.startsAt),
      pickLabel: formatMatchWinner(prediction.match.result, prediction.match.homeTeam, prediction.match.awayTeam),
      prizeLabel: prediction.assignedPrize?.label || "Sin premio asignado",
      prizeDescription: prediction.assignedPrize?.label ? "Premio desbloqueado" : "La jugada acerto, pero no tiene premio asignado.",
      claimStatusLabel: formatClaimStatus(prediction.claimStatus),
      claimStatusTone: claimTone(prediction.claimStatus),
      claimExpiresAtLabel: prediction.claimExpiresAt ? formatDate(prediction.claimExpiresAt) : null,
    }));

  const pageProps: Mundial2026TablaProps = {
    generatedAtLabel: formatDate(insights.generatedAt),
    winnersTotal: insights.summary.wonTotal,
    aciertosTotal: insights.summary.wonTotal,
    availableTotal: insights.summary.availableTotal,
    claimWindowHours: MUNDIAL2026_CLAIM_WINDOW_HOURS,
    winners,
  };

  return <Mundial2026TablaClient {...pageProps} />;
}
