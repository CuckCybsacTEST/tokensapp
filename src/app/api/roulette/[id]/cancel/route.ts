import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { logEvent } from "@/lib/log";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  if (!id) return new Response(JSON.stringify({ error: "ID_REQUIRED" }), { status: 400 });
  try {
    const session = await (prisma as any).rouletteSession.findUnique({ where: { id } });
    if (!session) return new Response(JSON.stringify({ error: "NOT_FOUND" }), { status: 404 });
    if (session.status === "ACTIVE") {
      const updated = await (prisma as any).rouletteSession.update({
        where: { id },
        data: { status: "CANCELLED", finishedAt: new Date() },
        select: { status: true, finishedAt: true },
      });
  await logEvent("ROULETTE_CANCEL", "Ruleta cancelada", { sessionId: id });
      return new Response(JSON.stringify({ status: updated.status, finishedAt: updated.finishedAt }), { status: 200 });
    }
    return new Response(JSON.stringify({ status: session.status, finishedAt: session.finishedAt }), { status: 200 });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[ROULETTE_CANCEL_ERROR]", e);
    return new Response(JSON.stringify({ error: "CANCEL_FAILED" }), { status: 500 });
  }
}
