import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

interface PageProps {
  params: { batchId: string };
}

async function getBatchWithTokens(batchId: string) {
  const batch = await (prisma as any).batch.findUnique({
    where: { id: batchId },
    include: {
      tokens: {
        select: {
          id: true,
          prizeId: true,
          prize: { select: { key: true, label: true, color: true } },
          redeemedAt: true,
          expiresAt: true,
          disabled: true,
          createdAt: true
        },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!batch || batch.staticTargetUrl === null) {
    notFound();
  }

  return batch;
}

export default async function PublicStaticBatchPage({ params }: PageProps) {
  const batch = await getBatchWithTokens(params.batchId);

  const redeemed = batch.tokens.filter((t: any) => t.redeemedAt).length;
  const expired = batch.tokens.filter((t: any) => t.expiresAt < new Date()).length;
  const disabled = batch.tokens.filter((t: any) => t.disabled).length;
  const active = batch.tokens.length - redeemed - expired - disabled;

  const redemptionRate = batch.tokens.length > 0 ? Math.round((redeemed / batch.tokens.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 rounded-full text-sm font-medium mb-4">
            <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
            Lote Estático
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
            {batch.description || `Lote ${batch.id.slice(-8)}`}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Creado el {new Date(batch.createdAt).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{batch.tokens.length}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Total Tokens</div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{active}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Activos</div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{redeemed}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Canjeados</div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{redemptionRate}%</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Tasa Canje</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">Progreso del Lote</h3>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {redeemed} de {batch.tokens.length} canjeados
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${batch.tokens.length > 0 ? (redeemed / batch.tokens.length) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        {/* Prizes Distribution */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 mb-8">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Premios Disponibles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from(new Set(batch.tokens.map((t: any) => t.prizeId))).map((prizeId) => {
              const prize = batch.tokens.find((t: any) => t.prizeId === prizeId)?.prize;
              const count = batch.tokens.filter((t: any) => t.prizeId === prizeId).length;
              const redeemedCount = batch.tokens.filter((t: any) => t.prizeId === prizeId && t.redeemedAt).length;
              const availableCount = count - redeemedCount;

              return (
                <div key={String(prizeId)} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: prize?.color || '#666' }}
                    ></div>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">{prize?.label}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {availableCount} disponibles
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-900 dark:text-white">{count}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">total</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Token List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-900 dark:text-white">Tokens del Lote</h3>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {batch.tokens.length} tokens
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {batch.tokens.slice(0, 12).map((token: any) => {  // Limit to first 12 tokens for performance
              const isExpired = token.expiresAt < new Date();
              const isRedeemed = !!token.redeemedAt;
              const isDisabled = token.disabled;

              let statusText = 'Disponible';
              let statusColor = 'text-green-600 dark:text-green-400';
              let bgColor = 'bg-green-50 dark:bg-green-900/20';
              let borderColor = 'border-green-200 dark:border-green-800';

              if (isRedeemed) {
                statusText = 'Canjeado';
                statusColor = 'text-blue-600 dark:text-blue-400';
                bgColor = 'bg-blue-50 dark:bg-blue-900/20';
                borderColor = 'border-blue-200 dark:border-blue-800';
              } else if (isDisabled) {
                statusText = 'Deshabilitado';
                statusColor = 'text-orange-600 dark:text-orange-400';
                bgColor = 'bg-orange-50 dark:bg-orange-900/20';
                borderColor = 'border-orange-200 dark:border-orange-800';
              } else if (isExpired) {
                statusText = 'Expirado';
                statusColor = 'text-red-600 dark:text-red-400';
                bgColor = 'bg-red-50 dark:bg-red-900/20';
                borderColor = 'border-red-200 dark:border-red-800';
              }

              return (
                <div key={token.id} className={`p-4 rounded-lg border ${bgColor} ${borderColor}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: token.prize?.color || '#666' }}
                      ></div>
                      <span className="font-medium text-slate-900 dark:text-white text-sm">
                        {token.prize?.label}
                      </span>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor} ${bgColor} border ${borderColor}`}>
                      {statusText}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                    <div>Token: <span className="font-mono text-[10px]">{token.id.slice(-8)}</span></div>
                    <div>Expira: {new Date(token.expiresAt).toLocaleDateString('es-ES')}</div>
                    {token.redeemedAt && (
                      <div>Canjeado: {new Date(token.redeemedAt).toLocaleDateString('es-ES')}</div>
                    )}
                  </div>

                  {!isRedeemed && !isDisabled && !isExpired && (
                    <div className="mt-3">
                      <a
                        href={`/static/${token.id}`}
                        className="inline-block w-full text-center px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-md transition-colors"
                      >
                        Ver Token
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {batch.tokens.length > 12 && (
            <div className="text-center mt-6">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Mostrando 12 de {batch.tokens.length} tokens
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-slate-500 dark:text-slate-400">
          <p>Este lote estático fue generado automáticamente por el sistema de tokens.</p>
        </div>
      </div>
    </div>
  );
}