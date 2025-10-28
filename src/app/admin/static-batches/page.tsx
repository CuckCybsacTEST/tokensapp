import Link from "next/link";
import React from "react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getStaticBatches() {
  return (prisma as any).batch.findMany({
    where: {
      staticTargetUrl: {
        not: null
      }
    },
    orderBy: { createdAt: 'desc' },
    include: {
      tokens: {
        select: {
          id: true,
          prizeId: true,
          redeemedAt: true,
          expiresAt: true,
          disabled: true,
          createdAt: true
        }
      }
    },
    take: 50,
  }) as Array<any>;
}

export default async function StaticBatchesListPage() {
  const batches = await getStaticBatches();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold">Lotes Estáticos</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Gestión de lotes estáticos con redirección automática
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/batches" className="btn-outline !px-3 !py-1.5 text-sm">
            ← Todos los lotes
          </Link>
          <Link href="/admin/static-batches/metrics" className="btn-outline !px-3 !py-1.5 text-sm">
            📊 Métricas
          </Link>
        </div>
      </div>

      <div className="grid gap-4">
        {batches.map((b) => {
          const redeemed = b.tokens.filter((t: any) => t.redeemedAt).length;
          const expired = b.tokens.filter((t: any) => t.expiresAt < new Date()).length;
          const disabled = b.tokens.filter((t: any) => t.disabled).length;
          const active = b.tokens.length - redeemed - expired - disabled;
          const distinctPrizeIds = new Set(b.tokens.map((t: any) => t.prizeId)).size;

          // Métricas específicas para estáticos
          const totalViews = b.tokens.length; // Cada token representa una vista potencial
          const redemptionRate = b.tokens.length > 0 ? ((redeemed / b.tokens.length) * 100).toFixed(1) : '0.0';

          return (
            <div
              key={b.id}
              className="card border-indigo-400/60 bg-indigo-50/60 dark:bg-indigo-900/20 dark:border-indigo-500/50 transition-colors hover:border-brand-400/60"
            >
              <div className="card-body space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col min-w-0">
                    {b.description ? (
                      <>
                        <Link
                          href={`/admin/static-batches/${b.id}`}
                          className="text-base font-semibold hover:underline max-w-xl truncate"
                          title={b.description}
                        >
                          {b.description}
                        </Link>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400" title={b.id}>
                          Batch {b.id}
                        </span>
                      </>
                    ) : (
                      <Link
                        href={`/admin/static-batches/${b.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        Batch {b.id}
                      </Link>
                    )}
                    <div className="mt-1 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded bg-indigo-600/90 px-1.5 py-0.5 text-[10px] font-medium text-white dark:bg-indigo-500/90">
                        STATIC
                      </span>
                      {b.staticTargetUrl && b.staticTargetUrl.trim() !== '' ? (
                        <a
                          href={b.staticTargetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-indigo-600 dark:text-indigo-400 underline decoration-indigo-400/40 hover:decoration-indigo-400/80 max-w-[200px] truncate"
                          title={b.staticTargetUrl}
                        >
                          {b.staticTargetUrl.replace(/^https?:\/\//,'')}
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          (sin URL externa)
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] tabular-nums text-slate-500 dark:text-slate-400">
                    {new Date(b.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px] text-slate-600 dark:text-slate-400">
                  <div className="space-y-1">
                    <div className="font-medium text-slate-700 dark:text-slate-300">Tokens</div>
                    <div>Total: {b.tokens.length}</div>
                    <div>Activos: <span className="text-green-600 dark:text-green-400 font-medium">{active}</span></div>
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
                    <div>Vistas potenciales: {totalViews}</div>
                    <div>Tasa canje: {redemptionRate}%</div>
                    <div className="text-[10px] text-slate-500">
                      {b.functionalDate ? `Func: ${new Date(b.functionalDate).toLocaleDateString()}` : 'Sin fecha funcional'}
                    </div>
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
                    </div>
                    <Link
                      href={`/admin/static-batches/${b.id}/preview`}
                      className="btn-outline !px-2 !py-1 text-[10px]"
                      title="Vista previa del lote"
                    >
                      👁️ Vista
                    </Link>
                  </div>
                </div>

                {/* Barra de progreso visual */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                    <span>Progreso del lote</span>
                    <span>{redeemed}/{b.tokens.length} canjeados</span>
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
            No hay lotes estáticos
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Crea tu primer lote estático desde la sección de generación de batches.
          </p>
          <Link href="/admin" className="btn">
            Ir al panel de administración
          </Link>
        </div>
      )}
    </div>
  );
}