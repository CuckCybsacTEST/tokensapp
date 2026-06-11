import { apiError, apiOk } from "@/lib/apiError";
import { getMundial2026Insights } from "@/lib/mundial2026/insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const insights = await getMundial2026Insights();
    return apiOk(insights);
  } catch (error) {
    console.error("Error loading Mundial 2026 insights:", error);
    const message = error instanceof Error ? error.message : "No se pudieron cargar los insights de Mundial 2026.";
    const status = message.includes("no encontrada") ? 404 : 500;
    return apiError("INSIGHTS_FAILED", message, {}, status);
  }
}