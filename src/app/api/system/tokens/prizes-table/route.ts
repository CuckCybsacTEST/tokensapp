import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { verifyUserSessionCookie } from '@/lib/auth-user';

// Usa cookies/headers para auth -> impedir prerender
export const dynamic = 'force-dynamic';

function err(code: string, message: string, status = 400) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

// Lightweight listing for staff visibility (no mutations)
export async function GET(req: NextRequest) {
  try {
    // Allow ADMIN/STAFF (admin_session) or STAFF (user_session)
    const rawAdmin = getSessionCookieFromRequest(req as any);
    const adminSession = await verifySessionCookie(rawAdmin).catch(()=>null);
    const rawUser = req.cookies.get('user_session')?.value;
    const userSession = await verifyUserSessionCookie(rawUser).catch(()=>null);
    const adminOk = adminSession && requireRole(adminSession, ['ADMIN','STAFF']).ok;
    const userOk = userSession && userSession.role === 'STAFF';
    if (!adminOk && !userOk) return err('FORBIDDEN','Forbidden',403);

    // Últimos batches (limit 8) para tabs
    const recentBatches = await prisma.batch.findMany({
      orderBy:{ createdAt:'desc'},
      take: 8,
      select:{ id:true, description:true, tokens:{ select:{ prizeId:true }, take: 2000 } }
    });
    const batchPrizeStats = recentBatches.map(b=>({ batchId: b.id, description: b.description, prizes: Object.entries(b.tokens.reduce((m: Record<string, number>, t)=>{ m[t.prizeId]=(m[t.prizeId]||0)+1; return m;},{})).map(([prizeId,count])=>({ prizeId, count })) }));

    // Prizes con contadores agregados (emittedTotal ya está; sumar revealed y delivered)
    const prizes = await prisma.prize.findMany({
      orderBy:{ key:'asc' },
      select:{ id:true, key:true, label:true, color:true, active:true, emittedTotal:true }
    });

    // Aggregate revealed / delivered counts
    const tokenAgg = await prisma.token.groupBy({ by:['prizeId'], _count:{ _all:true }, where:{ redeemedAt:null }}).catch(()=>[]);
    // revealed = tokens con revealedAt not null y deliveredAt null
    const revealedAgg = await prisma.token.groupBy({ by:['prizeId'], where:{ revealedAt:{ not:null }, deliveredAt: null }, _count:{ _all:true }}).catch(()=>[]);
    // delivered = tokens con deliveredAt not null
    const deliveredAgg = await prisma.token.groupBy({ by:['prizeId'], where:{ deliveredAt:{ not:null } }, _count:{ _all:true }}).catch(()=>[]);

    const revealedMap = new Map(revealedAgg.map(r=>[r.prizeId, r._count._all]));
    const deliveredMap = new Map(deliveredAgg.map(r=>[r.prizeId, r._count._all]));

    // last batch per prize (most recent token emission)
    const lastTokens = await prisma.token.findMany({ orderBy:{ createdAt:'desc'}, take: 4000, select:{ prizeId:true, batchId:true, batch:{ select:{ id:true, description:true, createdAt:true } } } });
    const lastBatchByPrize: Record<string,{ id:string; name:string }> = {};
    for (const t of lastTokens) if (!lastBatchByPrize[t.prizeId]) lastBatchByPrize[t.prizeId] = { id: t.batchId, name: t.batch.description || t.batch.id };

    const prizeRows = prizes.map(p=>({
      id: p.id,
      key: p.key,
      label: p.label,
      color: p.color,
      active: p.active,
      emittedTotal: p.emittedTotal || 0,
      revealedCount: revealedMap.get(p.id) || 0,
      deliveredCount: deliveredMap.get(p.id) || 0,
      lastBatch: lastBatchByPrize[p.id] || null,
    }));

    return NextResponse.json({ ok:true, prizes: prizeRows, batches: batchPrizeStats });
  } catch (e:any) {
    console.error('prizes-table error', e);
    return err('INTERNAL', e?.message || 'internal error', 500);
  }
}
