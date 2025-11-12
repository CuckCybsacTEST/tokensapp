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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">

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
      </div>
    </div>
  );
}