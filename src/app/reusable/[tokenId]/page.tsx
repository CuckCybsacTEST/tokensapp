import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { RedeemButton } from '@/components/RedeemButton';

interface PageProps {
  params: { tokenId: string };
}

async function getReusableToken(tokenId: string) {
  const token = await prisma.token.findUnique({
    where: { id: tokenId },
    include: {
      prize: { select: { key: true, label: true, color: true } },
      batch: { select: { id: true, description: true, staticTargetUrl: true, isReusable: true } }
    }
  });

  // Check if it's a reusable token (batch has isReusable = true)
  if (!token || !token.batch.isReusable) {
    notFound();
  }

  return token;
}

async function redeemToken(tokenId: string) {
  const token = await getReusableToken(tokenId);

  // Check if disabled
  if (token.disabled) {
    redirect('/error?message=Token deshabilitado&type=disabled');
  }

  // Check expiration
  if (token.expiresAt <= new Date()) {
    redirect('/error?message=Token expirado&type=expired');
  }

  // Check time windows
  const now = new Date();
  if (token.startTime && now < token.startTime) {
    redirect('/error?message=Aún no disponible&type=too_early');
  }
  if (token.endTime && now > token.endTime) {
    redirect('/error?message=Fuera de horario&type=outside_window');
  }

  // Check uses
  if (token.usedCount >= (token.maxUses || 1)) {
    redirect('/error?message=Token sin usos restantes&type=exhausted');
  }

  // Redeem: increment usedCount
  await prisma.token.update({
    where: { id: tokenId },
    data: { usedCount: { increment: 1 } }
  });

  // Log event
  await prisma.eventLog.create({
    data: {
      type: 'REUSABLE_TOKEN_REDEEMED',
      message: `Token reutilizable canjeado: ${tokenId}`,
      metadata: JSON.stringify({
        tokenId,
        batchId: token.batch.id,
        prizeId: token.prizeId,
        usedCount: token.usedCount + 1,
        maxUses: token.maxUses
      })
    }
  });

  // Redirect to prize page
  redirect(`/prize/${token.prize.key}?source=reusable&token=${tokenId}`);
}

export default async function ReusableTokenPage({ params, searchParams }: PageProps & { searchParams: { redeem?: string } }) {
  const token = await getReusableToken(params.tokenId);

  // If redeem param, process redemption
  if (searchParams.redeem === 'true') {
    return await redeemToken(params.tokenId);
  }

  const isExpired = token.expiresAt <= new Date();
  const isDisabled = token.disabled;
  const maxUses = token.maxUses || 1;
  const canRedeem = !isExpired && !isDisabled && token.usedCount < maxUses;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white text-center">
              Token Reutilizable
            </h1>
          </div>

          <div className="px-6 py-6 space-y-4">
            <div className="text-center">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">Premio</div>
              <div className="text-lg font-semibold text-slate-900 dark:text-white">
                {token.prize.label}
              </div>
            </div>

            <div className="text-center">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">Usos</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {token.usedCount} / {maxUses}
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${(token.usedCount / maxUses) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="text-center">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">Expira</div>
              <div className="text-sm text-slate-900 dark:text-white">
                {token.expiresAt.toLocaleDateString('es-ES')}
              </div>
            </div>

            {isDisabled && (
              <div className="text-center text-red-600 dark:text-red-400 font-medium">
                Token deshabilitado
              </div>
            )}

            {isExpired && (
              <div className="text-center text-yellow-600 dark:text-yellow-400 font-medium">
                Token expirado
              </div>
            )}

            {!canRedeem && (
              <div className="text-center text-gray-600 dark:text-gray-400 font-medium">
                No disponible
              </div>
            )}

            {canRedeem && <RedeemButton tokenId={params.tokenId} />}
          </div>

          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 text-center">
            <Link
              href="/"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              ← Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}