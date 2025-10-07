import { prisma } from "@/lib/prisma";
import { logEvent } from "@/lib/log";
import { NextRequest } from "next/server";
import { apiError, apiOk } from '@/lib/apiError';

// Simple zod-free validation for now (single field)
interface Body { batchId: string }

export async function POST(req: NextRequest) {
  let body: Body | null = null;
  try {
    body = await req.json();
  } catch {
    return apiError('BAD_REQUEST', 'JSON inválido', { reason: 'BAD_JSON' }, 400);
  }
  if (!body || typeof body.batchId !== "string" || body.batchId.length === 0) {
    return apiError('BATCH_ID_REQUIRED', 'batchId requerido', undefined, 400);
  }

  // 1. Verificar batch
  const batch = await prisma.batch.findUnique({ where: { id: body.batchId } });
  if (!batch) {
    return apiError('BATCH_NOT_FOUND', 'Batch no encontrado', undefined, 404);
  }

  // 2. Comprobar si ya existe sesión activa para el batch
  const existing = await (prisma as any).rouletteSession.findFirst({
    where: { batchId: batch.id, status: "ACTIVE" },
    select: { id: true },
  });
  if (existing) {
    return apiError('ALREADY_EXISTS', 'Ya existe sesión activa', { sessionId: existing.id }, 409);
  }

  // 3. Leer query param para modo
  const url = new URL(req.url);
  const requestedMode = url.searchParams.get("mode"); // 'token' para BY_TOKEN

  // 4. Cargar tokens restantes (no redimidos / no deshabilitados)
  const tokensRaw = await prisma.token.findMany({
    where: { batchId: batch.id, redeemedAt: null, disabled: false },
    select: { id: true, prizeId: true, prize: { select: { label: true, color: true } } },
  });
  if (!tokensRaw.length) {
    return apiError('NO_TOKENS', 'No hay tokens disponibles', undefined, 400);
  }

  // BY_TOKEN si solicitado y total tokens <= 12
  if (requestedMode === "token") {
    if (tokensRaw.length > 12) {
      return apiError('NOT_ELIGIBLE', 'Demasiados tokens para modo BY_TOKEN', { reason: 'TOO_MANY_TOKENS', totalTokens: tokensRaw.length }, 400);
    }
    // Necesitamos >=2 tokens distintos en total (ya garantizado length>0, verificamos >1)
    if (tokensRaw.length < 2) {
      return apiError('NOT_ELIGIBLE', 'Se requieren al menos 2 tokens', { reason: 'NEED_AT_LEAST_2_TOKENS' }, 400);
    }
    const prizesDistinct = new Set(tokensRaw.map(t => t.prizeId));
    if (prizesDistinct.size < 1) {
      return apiError('NOT_ELIGIBLE', 'No hay premios elegibles', { reason: 'NO_PRIZES' }, 400);
    }
    const snapshot = {
      mode: "BY_TOKEN" as const,
      tokens: tokensRaw.map(t => ({ tokenId: t.id, prizeId: t.prizeId, label: t.prize.label, color: t.prize.color })),
      createdAt: new Date().toISOString(),
    };
    const session = await (prisma as any).rouletteSession.create({
      data: {
        batchId: batch.id,
        mode: "BY_TOKEN",
        status: "ACTIVE",
        spins: 0,
        maxSpins: tokensRaw.length,
        meta: JSON.stringify(snapshot),
      },
      select: { id: true },
    });
    await logEvent("ROULETTE_CREATE", "Ruleta creada (BY_TOKEN)", {
      batchId: batch.id,
      sessionId: session.id,
      prizes: prizesDistinct.size,
      totalTokens: tokensRaw.length,
      mode: "BY_TOKEN",
    });
    return apiOk({ sessionId: session.id, elements: snapshot.tokens, mode: 'BY_TOKEN', maxSpins: tokensRaw.length }, 201);
  }

  // Default: BY_PRIZE
  const map = new Map<string, { prizeId: string; label: string; color: string | null; count: number }>();
  for (const t of tokensRaw) {
    if (!map.has(t.prizeId)) {
      map.set(t.prizeId, { prizeId: t.prizeId, label: t.prize.label, color: t.prize.color, count: 0 });
    }
    map.get(t.prizeId)!.count++;
  }
  const elements = Array.from(map.values());
  if (elements.length > 12 || elements.length < 2) {
    // Fallback: if BY_PRIZE not eligible but we can run BY_TOKEN (2..12 tokens), create BY_TOKEN session
    const totalTokens = tokensRaw.length;
    if (totalTokens >= 2 && totalTokens <= 12) {
      const snapshot = {
        mode: "BY_TOKEN" as const,
        tokens: tokensRaw.map(t => ({ tokenId: t.id, prizeId: t.prizeId, label: t.prize.label, color: t.prize.color })),
        createdAt: new Date().toISOString(),
      };
      const session = await (prisma as any).rouletteSession.create({
        data: {
          batchId: batch.id,
          mode: "BY_TOKEN",
          status: "ACTIVE",
          spins: 0,
          maxSpins: totalTokens,
          meta: JSON.stringify(snapshot),
        },
        select: { id: true },
      });
      await logEvent("ROULETTE_CREATE", "Ruleta creada (fallback BY_TOKEN)", {
        batchId: batch.id,
        sessionId: session.id,
        prizes: elements.length,
        totalTokens,
        mode: "BY_TOKEN",
      });
      return new Response(
        JSON.stringify({ sessionId: session.id, elements: snapshot.tokens, mode: "BY_TOKEN", maxSpins: totalTokens }),
        { status: 201 }
      );
    }
    return apiError('NOT_ELIGIBLE', 'Número de premios no elegible', { prizes: elements.length }, 400);
  }
  // Optional: add virtual default slots (retry/lose) if enabled and we have room (<=10 real prizes)
  let finalElements = elements.slice();
  try {
    const enableSlots = String(process.env.ROULETTE_DEFAULT_SLOTS || "0").trim() === "1";
    if (enableSlots && elements.length >= 2 && elements.length <= 10) {
      const retryWeight = Math.max(1, Number(process.env.ROULETTE_RETRY_WEIGHT || 1) || 1);
      const loseWeight = Math.max(1, Number(process.env.ROULETTE_LOSE_WEIGHT || 1) || 1);
      const retryColor = (process.env.ROULETTE_RETRY_COLOR || "#3BA7F0").trim();
      const loseColor = (process.env.ROULETTE_LOSE_COLOR || "#8A8A8A").trim();
      // Append two virtual elements
      finalElements.push(
        { prizeId: "virtual:retry", label: "Nuevo intento", color: retryColor, count: retryWeight },
        { prizeId: "virtual:lose", label: "Piña", color: loseColor, count: loseWeight },
      );
    }
  } catch {}

  // Compute spins total including virtuals if present
  const maxSpins = finalElements.reduce((a, e) => a + e.count, 0);
  const snapshot = { mode: "BY_PRIZE" as const, prizes: finalElements, createdAt: new Date().toISOString() };
  const session = await (prisma as any).rouletteSession.create({
    data: { batchId: batch.id, mode: "BY_PRIZE", status: "ACTIVE", spins: 0, maxSpins, meta: JSON.stringify(snapshot) },
    select: { id: true },
  });
  await logEvent("ROULETTE_CREATE", "Ruleta creada", {
    batchId: batch.id,
    sessionId: session.id,
    prizes: finalElements.length,
    totalTokens: maxSpins,
    mode: "BY_PRIZE",
  });
  return apiOk({ sessionId: session.id, elements: finalElements, mode: 'BY_PRIZE', maxSpins }, 201);
}
