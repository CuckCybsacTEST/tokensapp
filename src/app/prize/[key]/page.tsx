import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

interface PageProps {
  params: { key: string };
  searchParams: { source?: string; token?: string };
}

export default async function PrizePage({ params, searchParams }: PageProps) {
  const prize = await prisma.prize.findUnique({
    where: { key: params.key },
    select: {
      id: true,
      key: true,
      label: true,
      color: true,
      description: true
    }
  });

  if (!prize) {
    notFound();
  }

  const source = searchParams.source || 'unknown';
  const tokenId = searchParams.token;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 text-center">
            <div className="text-6xl mb-2">🎉</div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              ¡Premio Canjeado!
            </h1>
          </div>

          <div className="px-6 py-6 space-y-4 text-center">
            <div>
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">Tu Premio</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {prize.label}
              </div>
              {prize.color && (
                <div
                  className="w-16 h-16 rounded-full mx-auto border-4 border-white shadow-lg"
                  style={{ backgroundColor: prize.color }}
                ></div>
              )}
            </div>

            {prize.description && (
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {prize.description}
              </div>
            )}

            <div className="text-sm text-slate-500 dark:text-slate-400">
              Fuente: {source}
              {tokenId && <div className="font-mono text-xs">Token: {tokenId.slice(-8)}</div>}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 text-center">
            <Link
              href="/"
              className="inline-block bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Volver al Inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}