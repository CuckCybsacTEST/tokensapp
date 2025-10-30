import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

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
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold">Vista Previa: {batch.description || `Batch ${batch.id}`}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Lote estático creado el {new Date(batch.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href={`/admin/static-batches/${batch.id}`} className="btn-outline !px-3 !py-1.5 text-sm">
            ← Detalles
          </Link>
          <Link href="/admin/static-batches" className="btn-outline !px-3 !py-1.5 text-sm">
            ← Todos los lotes
          </Link>
        </div>
      </div>

      {/* Información del lote */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="card-body">
            <h3 className="font-semibold text-indigo-600 dark:text-indigo-400 mb-3">
              Configuración del Lote
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-slate-600 dark:text-slate-400">ID:</span>
                <span className="ml-2 font-mono text-[11px]">{batch.id}</span>
              </div>
              <div>
                <span className="text-slate-600 dark:text-slate-400">Tipo:</span>
                <span className="ml-2 px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded text-[10px] font-medium">
                  ESTÁTICO
                </span>
              </div>
              <div>
                <span className="text-slate-600 dark:text-slate-400">URL destino:</span>
                {batch.staticTargetUrl && batch.staticTargetUrl.trim() !== '' ? (
                  <a
                    href={batch.staticTargetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 dark:text-blue-400 underline text-[11px] break-all"
                  >
                    {batch.staticTargetUrl}
                  </a>
                ) : (
                  <span className="ml-2 text-slate-500 dark:text-slate-400 text-[11px]">
                    (interfaz interna)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 className="font-semibold text-blue-600 dark:text-blue-400 mb-3">
              Estadísticas
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Total tokens:</span>
                <span className="font-medium">{batch.tokens.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Activos:</span>
                <span className="font-medium text-green-600 dark:text-green-400">{active}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Canjeados:</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">{redeemed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Expirados:</span>
                <span className="font-medium text-red-600 dark:text-red-400">{expired}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Deshabilitados:</span>
                <span className="font-medium text-orange-600 dark:text-orange-400">{disabled}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 className="font-semibold text-purple-600 dark:text-purple-400 mb-3">
              Premios
            </h3>
            <div className="space-y-2">
              {Array.from(new Set(batch.tokens.map((t: any) => t.prizeId))).map((prizeId) => {
                const prize = batch.tokens.find((t: any) => t.prizeId === prizeId)?.prize;
                const count = batch.tokens.filter((t: any) => t.prizeId === prizeId).length;
                return (
                  <div key={String(prizeId)} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: prize?.color || '#666' }}
                      ></div>
                      <span className="text-slate-700 dark:text-slate-300">{prize?.label}</span>
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Lista de tokens */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Tokens del Lote</h3>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {batch.tokens.length} tokens
            </span>
          </div>

          <div className="overflow-x-auto">
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
  );
}