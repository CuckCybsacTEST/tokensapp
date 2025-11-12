import React from "react";
import { prisma } from "@/lib/prisma";
import StaticBatchesClient, { StaticBatchItem } from "./StaticBatchesClient";

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
  const raw = await getStaticBatches();
  const batches: StaticBatchItem[] = raw.map((b: any) => {
    const redeemed = b.tokens.filter((t: any) => t.redeemedAt).length;
    const expired = b.tokens.filter((t: any) => t.expiresAt < new Date()).length;
    const disabled = b.tokens.filter((t: any) => t.disabled).length;
    const active = Math.max(0, b.tokens.length - redeemed - expired - disabled);
    const distinctPrizeIds = new Set(b.tokens.map((t: any) => t.prizeId)).size;
    return {
      id: b.id,
      description: b.description || null,
      staticTargetUrl: b.staticTargetUrl || null,
      createdAt: new Date(b.createdAt).toISOString(),
      functionalDate: b.functionalDate ? new Date(b.functionalDate).toISOString() : null,
      totals: {
        total: b.tokens.length,
        redeemed,
        expired,
        disabled,
        active,
        distinctPrizeIds,
      },
    } satisfies StaticBatchItem;
  });

  return <StaticBatchesClient batches={batches} />;
}