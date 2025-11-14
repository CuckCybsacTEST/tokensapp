import Link from "next/link";
import React from "react";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
// AdminLayout removido: el root layout ya envuelve esta página.

export const dynamic = "force-dynamic";

async function getBatches() {
  return (prisma as any).batch.findMany({
    where: {
      staticTargetUrl: null, // Solo batches de ruleta (sin staticTargetUrl)
    },
    orderBy: { createdAt: 'desc' },
    include: {
      tokens: { select: { id: true, prizeId: true, redeemedAt: true, revealedAt: true, expiresAt: true, disabled: true } },
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
    redirect('/admin/roulettebatches');
  }
  const batches = await getBatches();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold">Todos los Lotes</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Gestión completa de lotes de tokens y ruleta
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/static-batches" className="btn-outline !px-3 !py-1.5 text-sm">
            📊 Lotes Estáticos
          </Link>
          <Link href="/admin/roulettebatches/purge" className="btn-outline !px-3 !py-1.5 text-sm" title="Eliminar batches">
            🗑️ Purgar
          </Link>
          <Link href="/admin/printroulette" className="btn-outline !px-3 !py-1.5 text-sm">
            🖨️ Impresión
          </Link>
        </div>
      </div>
      <div className="grid gap-4">
        {batches.map((b) => {
          const redeemed = b.tokens.filter((t: any) => t.redeemedAt).length;
          const revealed = b.tokens.filter((t: any) => t.revealedAt).length;
          const expired = b.tokens.filter((t: any) => t.expiresAt < new Date()).length;
          const disabled = b.tokens.filter((t: any) => t.disabled).length;
          const active = b.tokens.length - redeemed - expired - disabled;
          const distinctPrizeIds = new Set(b.tokens.map((t: any) => t.prizeId)).size;
          const eligibleByPrize = distinctPrizeIds >= 2 && distinctPrizeIds <= 12;
          const eligibleByToken = b.tokens.length >= 2 && b.tokens.length <= 12;
          const session = b.rouletteSessions[0] || null;
          const isStatic = !!b.staticTargetUrl;
          return (
            <div
              key={b.id}
              className={
                "card transition-colors hover:border-brand-400/60 " +
                (isStatic
                  ? "border-indigo-400/60 bg-indigo-50/60 dark:bg-indigo-900/20 dark:border-indigo-500/50"
                  : "")
              }
            >
              <div className="card-body space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col min-w-0">
                    {b.description ? (
                      <>
                        <Link
                          href={`/admin/roulettebatches/${b.id}`}
                          className="text-base font-semibold hover:underline max-w-xl truncate"
                          title={b.description}
                        >
                          {b.description}
                        </Link>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400" title={b.id}>Batch {b.id}</span>
                      </>
                    ) : (
                      <Link href={`/admin/roulettebatches/${b.id}`} className="text-sm font-medium hover:underline">Batch {b.id}</Link>
                    )}
                    {isStatic && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded bg-indigo-600/90 px-1.5 py-0.5 text-[10px] font-medium text-white dark:bg-indigo-500/90" title={b.staticTargetUrl || ''}>
                        STATIC
                        {b.staticTargetUrl && (
                          <a
                            href={b.staticTargetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline decoration-white/40 hover:decoration-white/80 ml-1 max-w-[160px] truncate"
                          >
                            {b.staticTargetUrl.replace(/^https?:\/\//,'')}
                          </a>
                        )}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] tabular-nums text-slate-500 dark:text-slate-400">
                    {new Date(b.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px] text-slate-600 dark:text-slate-400">
                  <div className="space-y-1">
                    <div className="font-medium text-slate-700 dark:text-slate-300">Tokens</div>
                    <div>Total: {b.tokens.length}</div>
                    <div>Activos: <span className="text-green-600 dark:text-green-400 font-medium">{active < 0 ? 0 : active}</span></div>
                    <div>Canjeados: <span className="text-blue-600 dark:text-blue-400 font-medium">{redeemed}</span></div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium text-slate-700 dark:text-slate-300">Estado</div>
                    <div>Expirados: <span className="text-red-600 dark:text-red-400 font-medium">{expired}</span></div>
                    <div>Deshabilitados: <span className="text-orange-600 dark:text-orange-400 font-medium">{disabled}</span></div>
                    <div>Premios: {distinctPrizeIds}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium text-slate-700 dark:text-slate-300">Métricas</div>
                    <div>Tasa canje: {b.tokens.length > 0 ? ((redeemed / b.tokens.length) * 100).toFixed(1) : '0.0'}%</div>
                    <div className="text-[10px] text-slate-500">
                      {b.functionalDate ? `Func: ${new Date(b.functionalDate).toLocaleDateString()}` : 'Sin fecha funcional'}
                    </div>
                    {isStatic && <div className="text-indigo-600 dark:text-indigo-400 font-medium">Estático</div>}
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium text-slate-700 dark:text-slate-300">Acciones</div>
                    <div className="flex flex-wrap gap-1">
                      <a
                        href={`/api/batch/${b.id}/download?qr=1`}
                        className="btn-outline !px-2 !py-1 text-[10px]"
                        title="Descargar ZIP con códigos QR"
                      >
                        ZIP+QR
                      </a>
                      <a
                        href={`/api/batch/${b.id}/export`}
                        className="btn-outline !px-2 !py-1 text-[10px]"
                        title="Exportar a CSV"
                      >
                        CSV
                      </a>
                      <Link
                        href={`/admin/printroulette?preselect=${b.id}`}
                        className="btn-outline !px-2 !py-1 text-[10px]"
                        title="Imprimir lote"
                      >
                        🖨️ Imprimir
                      </Link>
                    </div>
                    {/* Acciones de ruleta en fila separada */}
                    {!isStatic && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {!session && eligibleByPrize && (
                          <Link href={`/admin/roulettebatches?createRoulette=1&batch=${b.id}`} className="btn-outline !px-2 !py-1 text-[10px]" title="Crear ruleta por premios">
                            🎡 Ruleta
                          </Link>
                        )}
                        {!session && !eligibleByPrize && eligibleByToken && (
                          <Link href={`/admin/roulettebatches?createRoulette=1&batch=${b.id}&mode=token`} className="btn-outline !px-2 !py-1 text-[10px]" title="Crear ruleta por tokens">
                            🎯 Tokens
                          </Link>
                        )}
                        {session && (
                          <Link href={`/admin/roulette/session/${session.id}`} className="btn !px-2 !py-1 text-[10px]" title="Ir a sesión activa">
                            🎪 Activa ({session.mode})
                          </Link>
                        )}
                        {!session && (
                          <span className="text-[9px] text-slate-500" title="Premios:Tokens">
                            {distinctPrizeIds}:{b.tokens.length}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Barra de progreso de escaneadas */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                    <span>Pulseras escaneadas</span>
                    <span>{revealed}/{b.tokens.length} escaneadas</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${b.tokens.length > 0 ? (revealed / b.tokens.length) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* Barra de progreso de canjeadas */}
                <div className="pt-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                    <span>Pulseras canjeadas</span>
                    <span>{redeemed}/{b.tokens.length} canjeadas</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${b.tokens.length > 0 ? (redeemed / b.tokens.length) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {batches.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
            No hay lotes disponibles
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Crea tu primer lote desde la sección de tokens o ruleta.
          </p>
          <Link href="/admin" className="btn">
            Ir al panel de administración
          </Link>
        </div>
      )}
    </div>
  );
}
