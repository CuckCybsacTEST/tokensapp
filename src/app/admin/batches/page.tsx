import Link from "next/link";
import React from "react";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function getBatches() {
  return (prisma as any).batch.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      tokens: { select: { id: true, prizeId: true, redeemedAt: true, expiresAt: true, disabled: true } },
      rouletteSessions: { where: { status: 'ACTIVE' }, select: { id: true, mode: true } },
    },
    take: 50,
  }) as Array<any>;
}

export default async function BatchesListPage({ searchParams }: { searchParams?: Record<string,string|undefined> }) {
  // Server-side fast creation flow via query (?createRoulette=1&batch=<id>&mode=token?)
  if (searchParams?.createRoulette === '1' && searchParams.batch) {
    const batchId = searchParams.batch;
    // Verificar batch
    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (batch) {
      // Ver si ya hay sesión activa
      const existing = await (prisma as any).rouletteSession.findFirst({ where: { batchId, status: 'ACTIVE' }, select: { id: true } });
  if (existing) redirect(`/admin/roulette/session/${existing.id}`);
      const modeToken = searchParams.mode === 'token';
      // Cargar tokens
      const tokensRaw = await prisma.token.findMany({ where: { batchId, redeemedAt: null, disabled: false }, select: { id: true, prizeId: true, prize: { select: { label: true, color: true } } } });
      if (tokensRaw.length >= 2) {
        if (modeToken) {
          if (tokensRaw.length <= 12) {
            const snapshot = { mode: 'BY_TOKEN' as const, tokens: tokensRaw.map(t => ({ tokenId: t.id, prizeId: t.prizeId, label: t.prize.label, color: t.prize.color })), createdAt: new Date().toISOString() };
            const session = await (prisma as any).rouletteSession.create({ data: { batchId, mode: 'BY_TOKEN', status: 'ACTIVE', spins: 0, maxSpins: tokensRaw.length, meta: JSON.stringify(snapshot) }, select: { id: true } });
            redirect(`/admin/roulette/session/${session.id}`);
          }
        } else {
          // BY_PRIZE
            const map = new Map<string, { prizeId: string; label: string; color: string|null; count: number }>();
            for (const t of tokensRaw) {
              if (!map.has(t.prizeId)) map.set(t.prizeId, { prizeId: t.prizeId, label: t.prize.label, color: t.prize.color, count: 0 });
              map.get(t.prizeId)!.count++;
            }
            const elements = Array.from(map.values());
            if (elements.length >=2 && elements.length <=12) {
              const maxSpins = elements.reduce((a,e)=>a+e.count,0);
              const snapshot = { mode:'BY_PRIZE' as const, prizes: elements, createdAt: new Date().toISOString() };
              const session = await (prisma as any).rouletteSession.create({ data: { batchId, mode: 'BY_PRIZE', status: 'ACTIVE', spins: 0, maxSpins, meta: JSON.stringify(snapshot) }, select: { id: true } });
              redirect(`/admin/roulette/session/${session.id}`);
            }
        }
      }
    }
    // Fallback: quitar query para no loop
    redirect('/admin/batches');
  }
  const batches = await getBatches();
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Batches</h1>
        <Link href="/admin/print" className="btn-outline !px-3 !py-1.5 text-sm">Control de Impresión</Link>
      </div>
      <div className="grid gap-4">
        {batches.map((b) => {
          const redeemed = b.tokens.filter((t: any) => t.redeemedAt).length;
          const expired = b.tokens.filter((t: any) => t.expiresAt < new Date()).length;
          const active = b.tokens.length - redeemed - expired;
          const distinctPrizeIds = new Set(b.tokens.map((t: any) => t.prizeId)).size;
          const eligibleByPrize = distinctPrizeIds >= 2 && distinctPrizeIds <= 12;
          const eligibleByToken = b.tokens.length >= 2 && b.tokens.length <= 12;
          const session = b.rouletteSessions[0] || null;
          return (
            <div key={b.id} className="card transition-colors hover:border-brand-400/60">
              <div className="card-body space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col">
                    <Link href={`/admin/batches/${b.id}`} className="text-sm font-medium hover:underline">Batch {b.id}</Link>
                    {b.description && (
                      <span className="max-w-xs truncate text-[11px] text-slate-500 dark:text-slate-400">{b.description}</span>
                    )}
                  </div>
                  <span className="text-[10px] tabular-nums text-slate-500 dark:text-slate-400">{new Date(b.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex flex-wrap gap-4 text-[11px] text-slate-600 dark:text-slate-400">
                  <span>Total: {b.tokens.length}</span>
                  <span>Canjeados: {redeemed}</span>
                  <span>Expirados: {expired}</span>
                  <span>Activos: {active < 0 ? 0 : active}</span>
                  <span>Premios: {distinctPrizeIds}</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1 items-center">
                  <a href={`/api/batch/${b.id}/download?qr=1`} className="btn-outline !px-2 !py-1 text-[10px]">ZIP+QR</a>
                  <a href={`/api/batch/${b.id}/download`} className="btn-outline !px-2 !py-1 text-[10px]">ZIP</a>
                  <a href={`/api/batch/${b.id}/export`} className="btn-outline !px-2 !py-1 text-[10px]">CSV</a>
                  <Link href={`/admin/print?preselect=${b.id}`} className="btn-outline !px-2 !py-1 text-[10px]">Imprimir</Link>
                  {!session && eligibleByPrize && (
                    <Link href={`/admin/batches?createRoulette=1&batch=${b.id}`} className="btn-outline !px-2 !py-1 text-[10px]">Ruleta</Link>
                  )}
                  {!session && !eligibleByPrize && eligibleByToken && (
                    <Link href={`/admin/batches?createRoulette=1&batch=${b.id}&mode=token`} className="btn-outline !px-2 !py-1 text-[10px]">Ruleta tokens</Link>
                  )}
                  {session && (
                    <Link href={`/admin/roulette/session/${session.id}`} className="btn !px-2 !py-1 text-[10px]">Ruleta ({session.mode})</Link>
                  )}
                  {!session && (
                    <span className="text-[10px] text-slate-500">pr:{distinctPrizeIds} tok:{b.tokens.length}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
