import { prisma } from "@/lib/prisma";
import { buildTitle } from '@/lib/seo/title';
import { isTwoPhaseRedemptionEnabled } from "@/lib/featureFlags";
import DeliveryForm from './DeliveryForm';
export const revalidate = 0;

function format(ts?: Date|null) { return ts ? ts.toLocaleString() : "—"; }

export async function generateMetadata({ params }: { params: { tokenId: string } }) {
  const tokenId = params.tokenId;
  try {
    const t = await (prisma as any).token.findUnique({ where: { id: tokenId }, select: { prize: { select: { label: true } } } });
    if (t?.prize?.label) return { title: buildTitle(['Token', t.prize.label]) };
  } catch {}
  return { title: buildTitle(['Token', tokenId.slice(0,8)]) };
}

export default async function AdminTokenLookup({ params }: { params: { tokenId: string } }) {
  const { tokenId } = params;
  const twoPhase = isTwoPhaseRedemptionEnabled();
  const token = await (prisma as any).token.findUnique({ where: { id: tokenId }, include: { prize: true, batch: true } });
  if (!token) {
    return <div className="p-6 text-sm">Token no encontrado.</div>;
  }
  const state = (token as any).deliveredAt ? 'DELIVERED' : ((token as any).revealedAt ? 'REVEALED' : ((token as any).redeemedAt ? 'LEGACY_REDEEMED' : 'PENDING'));
  return <div className="max-w-lg p-6 space-y-6">
    <h1 className="text-lg font-semibold">Token #{token.id.slice(0,8)}…</h1>
    <div className="rounded border p-4 text-sm space-y-3 bg-slate-50 dark:bg-slate-800/40">
      <div><span className="font-medium">Premio:</span> {token.prize.label} <span className="text-xs text-slate-500">({token.prize.key})</span></div>
      <div className="grid grid-cols-2 gap-2 text-xs">
  <div>Revealed: {format((token as any).revealedAt)}</div>
  <div>Delivered: {format((token as any).deliveredAt)}</div>
  <div>Redeemed (legacy mirror): {format((token as any).redeemedAt)}</div>
        <div>Expires: {format(token.expiresAt)}</div>
      </div>
      <div className="text-xs">Estado actual: <StateBadge state={state} /></div>
      {twoPhase && state === 'REVEALED' && <DeliveryForm tokenId={token.id} />}
      {twoPhase && state === 'DELIVERED' && (token as any).deliveryNote && (
        <div className="rounded bg-emerald-500/10 border border-emerald-500/30 p-2 text-xs"><strong>Nota entrega:</strong><br/>{(token as any).deliveryNote}</div>
      )}
    </div>
  </div>;
}

function StateBadge({ state }: { state: string }) {
  const map: Record<string,{cls:string;label:string}> = {
    PENDING: { cls: 'bg-slate-500/15 text-slate-600', label: 'Pendiente' },
    REVEALED: { cls: 'bg-amber-500/15 text-amber-600', label: 'Revelado' },
    DELIVERED: { cls: 'bg-emerald-500/15 text-emerald-600', label: 'Entregado' },
    LEGACY_REDEEMED: { cls: 'bg-emerald-500/15 text-emerald-600', label: 'Canjeado' },
  };
  const m = map[state] || map.PENDING;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${m.cls}`}>{m.label}</span>;
}

// DeliveryForm ahora es un componente cliente separado en ./DeliveryForm.tsx
