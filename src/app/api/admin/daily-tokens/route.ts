import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeBatchStats } from '@/lib/batchStats';

export const dynamic = 'force-dynamic';

function error(code: string, message: string, status = 400) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

// Convierte YYYY-MM-DD (día Lima) a rango UTC para createdAt y a functionalDate boundaries (05:00 UTC stored) 
function getLimaDayRange(dayISO: string) {
  // dayISO en formato YYYY-MM-DD
  const [y, m, d] = dayISO.split('-').map(Number);
  // Lima offset -5 => local 00:00 = UTC 05:00
  const start = new Date(Date.UTC(y, m - 1, d, 5, 0, 0, 0));
  const end = new Date(Date.UTC(y, m - 1, d + 1, 4, 59, 59, 999)); // justo antes del siguiente 05:00
  return { start, end };
}

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const day = url.searchParams.get('day');
    if (!day) return error('MISSING_DAY', 'Parámetro day (YYYY-MM-DD) requerido');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return error('INVALID_DAY', 'Formato day inválido');

    const { start: functionalStart, end: functionalEnd } = getLimaDayRange(day);
    // Batches cuyo functionalDate cae exactamente en el rango del día Lima
    // Usamos any para evitar problemas de tipado mientras el cliente se regenera
    const anyPrisma = prisma as any;
    const batches = await anyPrisma.batch.findMany({
      where: { functionalDate: { gte: functionalStart, lt: functionalEnd } },
      orderBy: { createdAt: 'asc' },
      include: { tokens: { include: { prize: true } } }
    });

    let basis: 'functionalDate' | 'createdAt-fallback' = 'functionalDate';
    let effectiveBatches = batches;

    if (effectiveBatches.length === 0) {
      // Fallback legacy: usar tokens creados ese día (createdAt dentro de la ventana local)
      // Para eso calculamos rango real de createdAt en UTC: local 00:00 -> UTC +5h, local fin -> UTC +5h
      const startCreated = functionalStart; // coincide con functionalStart
      const endCreated = functionalEnd; // coincide
      const legacyTokens = await anyPrisma.token.findMany({
        where: { createdAt: { gte: startCreated, lt: endCreated }, batch: { functionalDate: null } },
        include: { prize: true, batch: true }
      });
      if (legacyTokens.length) {
        // Agrupar manualmente por batch
        const byBatch: Record<string, any> = {};
        for (const t of legacyTokens as any[]) {
          const b = t.batch;
          if (!byBatch[t.batchId]) byBatch[t.batchId] = { id: t.batchId, createdAt: b.createdAt, description: b.description, tokens: [] as any[] };
          byBatch[t.batchId].tokens.push(t);
        }
        effectiveBatches = Object.values(byBatch);
        basis = 'createdAt-fallback';
      }
    }

    // Agregar métricas agregadas
  let created = 0; // total tokens del día
  let delivered = 0; // delivered tokens
  let active = 0; // from stats.active
  let revealedPending = 0; // tokens revelados pendientes de entrega
  let expired = 0;
  let revealedTotal = 0; // revealed = giros de ruleta totales (entregados + pendientes)
  // Timeline (24 horas locales Lima) para evolución intradía de revelados y entregados
  const hoursRevealed = Array(24).fill(0);
  const hoursDelivered = Array(24).fill(0);
    const perBatch: any[] = [];

    for (const b of effectiveBatches) {
      const stats = computeBatchStats(b.tokens as any);
      created += stats.totalTokens;
      delivered += stats.delivered;
      active += stats.active;
      revealedPending += stats.revealedPending;
      expired += stats.expired;
      revealedTotal += stats.revealed;
      // Timeline: contamos revelados y entregados dentro del rango del día funcional
      for (const t of (b.tokens as any[])) {
        const rev: Date | null = t.revealedAt || null;
        if (rev && rev >= functionalStart && rev < functionalEnd) {
          const h = ((rev.getTime() - 5*3600*1000) % (24*3600*1000) + 24*3600*1000) % (24*3600*1000); // ms dentro del día local
          const hour = new Date(rev.getTime() - 5*3600*1000).getUTCHours();
          hoursRevealed[hour]++;
        }
        const del: Date | null = t.deliveredAt || null;
        if (del && del >= functionalStart && del < functionalEnd) {
          const hour = new Date(del.getTime() - 5*3600*1000).getUTCHours();
          hoursDelivered[hour]++;
        }
      }

      perBatch.push({
        batchId: b.id,
        description: b.description,
        createdAt: b.createdAt,
        totalTokens: stats.totalTokens,
        delivered: stats.delivered,
        active: stats.active,
        revealedPending: stats.revealedPending,
        expired: stats.expired,
        revealed: stats.revealed
      });
    }

    const available = active + revealedPending; // disponibles = no entregados / no expirados (incluye revelados pendientes)

    // Calcular horas pico
    let peakRevealHour = null as string | null;
    let peakDeliveredHour = null as string | null;
    if (revealedTotal > 0) {
      let max = -1; let idx = 0;
      hoursRevealed.forEach((v,i)=>{ if(v>max){ max=v; idx=i; }});
      peakRevealHour = String(idx).padStart(2,'0');
    }
    if (delivered > 0) {
      let max = -1; let idx = 0;
      hoursDelivered.forEach((v,i)=>{ if(v>max){ max=v; idx=i; }});
      peakDeliveredHour = String(idx).padStart(2,'0');
    }

    const timeline = hoursRevealed.map((_,i)=>({
      hour: String(i).padStart(2,'0'),
      revealed: hoursRevealed[i],
      delivered: hoursDelivered[i],
      cumulativeRevealed: hoursRevealed.slice(0,i+1).reduce((a,b)=>a+b,0),
      cumulativeDelivered: hoursDelivered.slice(0,i+1).reduce((a,b)=>a+b,0)
    }));

    // Global historical metrics (cálculo agregado independiente del día seleccionado)
  const now = new Date();
    const [createdAll, expiredAll, revealedAll, deliveredAll, activeAll, revealedPendingAll] = await Promise.all([
  anyPrisma.token.count(),
      anyPrisma.token.count({ where: { deliveredAt: null, redeemedAt: null, expiresAt: { lt: now } } }),
      anyPrisma.token.count({ where: { revealedAt: { not: null } } }),
      anyPrisma.token.count({ where: { deliveredAt: { not: null } } }),
      anyPrisma.token.count({ where: { revealedAt: null, deliveredAt: null, redeemedAt: null, expiresAt: { gte: now } } }),
      anyPrisma.token.count({ where: { revealedAt: { not: null }, deliveredAt: null } })
    ]);
    const undeliveredAll = activeAll + revealedPendingAll; // activos + revelados pendientes

    return NextResponse.json({
      ok: true,
      day,
      basis,
      metrics: {
        created,
        delivered,
        available,
        breakdown: { active, revealedPending },
        expired,
        rouletteSpins: revealedTotal,
        timeline: {
          hours: timeline,
          peakRevealHour,
          peakDeliveredHour
        },
        globalHistorical: {
          createdAll,
            expiredAll,
            rouletteSpinsAll: revealedAll,
            undeliveredAll
        }
      },
      batches: perBatch
    });
  } catch (e: any) {
    console.error('daily-tokens error', e);
    return error('INTERNAL', e?.message || 'internal error', 500);
  }
}
