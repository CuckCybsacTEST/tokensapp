import { Token, Prize } from "@prisma/client";

export interface PrizeStat {
  prizeId: string;
  key: string;
  label: string;
  color: string | null;
  total: number;
  redeemed: number; // legacy consumed (mirrors delivered in two-phase)
  expired: number;
  active: number; // neither redeemed/delivered nor expired nor revealed
  revealed: number; // tokens with revealedAt set
  delivered: number; // tokens with deliveredAt set
  revealedPending: number; // revealed - delivered
  redeemedPct: number; // redeemed / total
  deliveredPct: number; // delivered / total
  revealToDeliverAvgMs?: number; // average lead time (optional)
  revealToDeliverP95Ms?: number; // p95 lead time
}

export interface BatchStatsSummary {
  totalTokens: number;
  redeemed: number; // legacy
  delivered: number; // two-phase delivered count
  revealed: number;
  revealedPending: number;
  expired: number;
  active: number;
  redeemedPct: number; // redeemed / totalTokens
  deliveredPct: number; // delivered / totalTokens
  prizeStats: PrizeStat[];
  leadTimeAvgMs?: number;
  leadTimeP95Ms?: number;
}

/**
 * Compute aggregated stats for a batch from its tokens collection.
 * Assumes tokens all belong to same batch.
 */
export function computeBatchStats(tokens: Array<Token & { prize: Prize }>): BatchStatsSummary {
  const now = Date.now();
  const byPrize = new Map<string, PrizeStat>();
  // Collect lead time arrays per prize
  const perPrizeLead: Record<string, number[]> = {};
  const globalLead: number[] = [];

  for (const t of tokens) {
    if (!byPrize.has(t.prizeId)) {
      byPrize.set(t.prizeId, {
        prizeId: t.prizeId,
        key: t.prize.key,
        label: t.prize.label,
        color: t.prize.color,
        total: 0,
        redeemed: 0,
        expired: 0,
        active: 0,
        revealed: 0,
        delivered: 0,
        revealedPending: 0,
        redeemedPct: 0,
        deliveredPct: 0,
      });
    }
    const stat = byPrize.get(t.prizeId)!;
    stat.total++;
    const revealedAt: Date | null = (t as any).revealedAt ?? null;
    const deliveredAt: Date | null = (t as any).deliveredAt ?? null;
    const isRedeemed = !!t.redeemedAt; // legacy mirror
    const isDelivered = !!deliveredAt;
    const isRevealed = !!revealedAt;
    const isExpired = !isDelivered && !isRedeemed && t.expiresAt.getTime() < now;

    if (isDelivered) {
      stat.delivered++;
      stat.redeemed++; // mirror legacy metric
      if (revealedAt && deliveredAt) {
        const lt = deliveredAt.getTime() - revealedAt.getTime();
        if (!perPrizeLead[t.prizeId]) perPrizeLead[t.prizeId] = [];
        perPrizeLead[t.prizeId].push(lt);
        globalLead.push(lt);
      }
    } else if (isRedeemed) {
      // In legacy mode redeemedAt set without deliveredAt
      stat.redeemed++;
    }
    if (isRevealed) stat.revealed++;
    if (isExpired) stat.expired++;
    // Active definition: not expired and not delivered/redeemed and not revealed
    if (!isDelivered && !isRedeemed && !isExpired && !isRevealed) stat.active++;
  }
  let totalTokens = 0;
  let redeemed = 0;
  let delivered = 0;
  let revealed = 0;
  let revealedPending = 0;
  let expired = 0;
  let active = 0;
  for (const s of byPrize.values()) {
    s.revealedPending = Math.max(0, s.revealed - s.delivered);
    s.redeemedPct = s.total === 0 ? 0 : +(s.redeemed / s.total * 100).toFixed(2);
    s.deliveredPct = s.total === 0 ? 0 : +(s.delivered / s.total * 100).toFixed(2);
    totalTokens += s.total;
    redeemed += s.redeemed;
    delivered += s.delivered;
    revealed += s.revealed;
    revealedPending += s.revealedPending;
    expired += s.expired;
    active += s.active;
  }
  const redeemedPct = totalTokens === 0 ? 0 : +(redeemed / totalTokens * 100).toFixed(2);
  const deliveredPct = totalTokens === 0 ? 0 : +(delivered / totalTokens * 100).toFixed(2);
  // Compute lead time metrics per prize
  for (const p of byPrize.values()) {
    const arr = perPrizeLead[p.prizeId];
    if (arr && arr.length) {
      arr.sort((a,b)=>a-b);
      const sum = arr.reduce((a,b)=>a+b,0);
      p.revealToDeliverAvgMs = Math.round(sum / arr.length);
      const idx = Math.min(arr.length -1, Math.floor(0.95 * (arr.length -1)));
      p.revealToDeliverP95Ms = arr[idx];
    }
  }
  const prizeStats = Array.from(byPrize.values()).sort((a,b)=> a.key.localeCompare(b.key));
  let leadTimeAvgMs: number|undefined;
  let leadTimeP95Ms: number|undefined;
  if (globalLead.length) {
    globalLead.sort((a,b)=>a-b);
    const sum = globalLead.reduce((a,b)=>a+b,0);
    leadTimeAvgMs = Math.round(sum / globalLead.length);
    const idx = Math.min(globalLead.length -1, Math.floor(0.95 * (globalLead.length -1)));
    leadTimeP95Ms = globalLead[idx];
  }
  return { totalTokens, redeemed, delivered, revealed, revealedPending, expired, active, redeemedPct, deliveredPct, prizeStats, leadTimeAvgMs, leadTimeP95Ms };
}
