import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import QrGrid from "./QrGrid";

interface PageProps {
  params: { id: string };
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
          validFrom: true,
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

export default async function StaticBatchPreviewPage({ params }: PageProps) {
  const batch = await getBatchWithTokens(params.id);

  const now = new Date();
  const redeemed = batch.tokens.filter((t: any) => t.redeemedAt).length;
  const disabled = batch.tokens.filter((t: any) => t.disabled).length;
  const upcoming = batch.tokens.filter((t: any) => t.validFrom && new Date(t.validFrom) > now).length;
  const expired = batch.tokens.filter((t: any) => {
    if (t.validFrom && new Date(t.validFrom) > now) return false; // future = not expired
    return t.expiresAt && new Date(t.expiresAt) < now;
  }).length;
  const active = batch.tokens.length - redeemed - expired - disabled - upcoming;

  return (
    <div className="app-container">
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-semibold break-words">Vista Previa: {batch.description || `Batch ${batch.id}`}</h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
              Lote estático creado el {new Date(batch.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <Link href={`/u/statics-batches/${batch.id}`} className="btn-outline !px-2 sm:!px-3 !py-1.5 text-xs sm:text-sm whitespace-nowrap">
              ← Detalles
            </Link>
            <Link href="/u/statics-batches" className="btn-outline !px-2 sm:!px-3 !py-1.5 text-xs sm:text-sm whitespace-nowrap">
              ← Todos los lotes
            </Link>
          </div>
        </div>

        {/* Información del lote */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="card">
            <div className="card-body">
              <h3 className="font-semibold text-indigo-600 dark:text-indigo-400 mb-3 text-sm sm:text-base">
                Configuración del Lote
              </h3>
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">ID:</span>
                  <span className="font-mono text-[10px] sm:text-[11px] break-all">{batch.id}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Tipo:</span>
                  <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded text-[9px] sm:text-[10px] font-medium self-start">
                    ESTÁTICO
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">URL destino:</span>
                  {batch.staticTargetUrl && batch.staticTargetUrl.trim() !== '' ? (
                    <a
                      href={batch.staticTargetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 underline text-[10px] sm:text-[11px] break-all hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      {batch.staticTargetUrl}
                    </a>
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px]">
                      (interfaz interna)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 className="font-semibold text-blue-600 dark:text-blue-400 mb-3 text-sm sm:text-base">
                Estadísticas
              </h3>
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Total tokens:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{batch.tokens.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Activos:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">{active}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Canjeados:</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">{redeemed}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Expirados:</span>
                  <span className="font-medium text-red-600 dark:text-red-400">{expired}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Deshabilitados:</span>
                  <span className="font-medium text-orange-600 dark:text-orange-400">{disabled}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 className="font-semibold text-purple-600 dark:text-purple-400 mb-3 text-sm sm:text-base">
                Premios
              </h3>
              <div className="space-y-2">
                {Array.from(new Set(batch.tokens.map((t: any) => t.prizeId))).map((prizeId) => {
                  const prize = batch.tokens.find((t: any) => t.prizeId === prizeId)?.prize;
                  const count = batch.tokens.filter((t: any) => t.prizeId === prizeId).length;
                  return (
                    <div key={String(prizeId)} className="flex items-center justify-between text-xs sm:text-sm p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: prize?.color || '#666' }}
                        ></div>
                        <span className="text-slate-700 dark:text-slate-300 truncate">{prize?.label}</span>
                      </div>
                      <span className="text-slate-500 dark:text-slate-400 font-medium ml-2 flex-shrink-0">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Grid de códigos QR */}
        <QrGrid tokens={batch.tokens} />

        {/* Lista de tokens */}
        <div className="card">
          <div className="card-body">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
              <h3 className="font-semibold text-base sm:text-lg">Tokens del Lote</h3>
              <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                {batch.tokens.length} tokens
              </span>
            </div>

            {/* Vista móvil: tarjetas */}
            <div className="block sm:hidden space-y-3">
              {batch.tokens.map((token: any) => {
                const now = new Date();
                const isRedeemed = !!token.redeemedAt;
                const isDisabled = token.disabled;
                const isUpcoming = token.validFrom && new Date(token.validFrom) > now;
                const isExpired = !isUpcoming && token.expiresAt && new Date(token.expiresAt) < now;

                let statusText = 'Activo';
                let statusColor = 'text-green-600 dark:text-green-400';

                if (isRedeemed) {
                  statusText = 'Canjeado';
                  statusColor = 'text-blue-600 dark:text-blue-400';
                } else if (isDisabled) {
                  statusText = 'Deshabilitado';
                  statusColor = 'text-orange-600 dark:text-orange-400';
                } else if (isUpcoming) {
                  statusText = 'Próximamente';
                  statusColor = 'text-purple-600 dark:text-purple-400';
                } else if (isExpired) {
                  statusText = 'Expirado';
                  statusColor = 'text-red-600 dark:text-red-400';
                }

                return (
                  <div key={token.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {token.id}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: token.prize?.color || '#666' }}
                          ></div>
                          <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                            {token.prize?.label}
                          </span>
                        </div>
                      </div>
                      <a
                        href={`/static/${token.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-outline !px-2 !py-1 text-[10px] ml-2 flex-shrink-0"
                        title="Ver token"
                      >
                        👁️ Ver
                      </a>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Estado:</span>
                        <span className={`font-medium ${statusColor}`}>{statusText}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Expira:</span>
                        <span className="text-slate-700 dark:text-slate-300">
                          {token.validFrom && new Date(token.validFrom) > new Date() ? (
                            <span className="text-xs">Activa el {new Date(token.validFrom).toLocaleDateString()}</span>
                          ) : (
                            token.expiresAt ? new Date(token.expiresAt).toLocaleDateString() : '-'
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Canjeado:</span>
                        <span className="text-slate-700 dark:text-slate-300">
                          {token.redeemedAt ? new Date(token.redeemedAt).toLocaleDateString() : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Vista desktop: tabla */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-2 px-3 font-medium text-slate-700 dark:text-slate-300">Token ID</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-700 dark:text-slate-300">Premio</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-700 dark:text-slate-300">Estado</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-700 dark:text-slate-300">Expira</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-700 dark:text-slate-300">Canjeado</th>
                    <th className="text-center py-2 px-3 font-medium text-slate-700 dark:text-slate-300">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.tokens.map((token: any) => {
                    const now = new Date();
                    const isRedeemed = !!token.redeemedAt;
                    const isDisabled = token.disabled;
                    const isUpcoming = token.validFrom && new Date(token.validFrom) > now;
                    const isExpired = !isUpcoming && token.expiresAt && new Date(token.expiresAt) < now;

                    let statusText = 'Activo';
                    let statusColor = 'text-green-600 dark:text-green-400';

                    if (isRedeemed) {
                      statusText = 'Canjeado';
                      statusColor = 'text-blue-600 dark:text-blue-400';
                    } else if (isDisabled) {
                      statusText = 'Deshabilitado';
                      statusColor = 'text-orange-600 dark:text-orange-400';
                    } else if (isUpcoming) {
                      statusText = 'Próximamente';
                      statusColor = 'text-purple-600 dark:text-purple-400';
                    } else if (isExpired) {
                      statusText = 'Expirado';
                      statusColor = 'text-red-600 dark:text-red-400';
                    }

                    return (
                      <tr key={token.id} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {token.id}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: token.prize?.color || '#666' }}
                            ></div>
                            <span className="text-slate-700 dark:text-slate-300 text-sm">
                              {token.prize?.label}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <span className={`text-sm font-medium ${statusColor}`}>
                            {statusText}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-sm text-slate-600 dark:text-slate-400">
                          {token.validFrom && new Date(token.validFrom) > new Date() ? (
                            <span>Activa el {new Date(token.validFrom).toLocaleString()}</span>
                          ) : (
                            token.expiresAt ? new Date(token.expiresAt).toLocaleString() : '-'
                          )}
                        </td>
                        <td className="py-2 px-3 text-sm text-slate-600 dark:text-slate-400">
                          {token.redeemedAt ? new Date(token.redeemedAt).toLocaleString() : '-'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <a
                            href={`/static/${token.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-outline !px-2 !py-1 text-[10px]"
                            title="Ver token"
                          >
                            👁️ Ver
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}