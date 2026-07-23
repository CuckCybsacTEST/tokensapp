import { MUNDIAL2026_FANZONE_CAMPAIGN_NAME } from "@/lib/mundial2026/fanzone";
import { prisma } from "@/lib/prisma";

const EXPIRING_SOON_DAYS = 7;

type FanZoneTicket = {
  id: string;
  code: string;
  customerName: string;
  customerWhatsapp: string;
  customerPhrase: string | null;
  campaignName: string | null;
  createdAt: Date;
  redeemedAt: Date | null;
  extendedCount: number;
  lastExtendedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date | null;
  redeemedBy: string | null;
  metadata: string | null;
};

type FanZoneMetadata = {
  redemptionHistory?: Array<{
    date: string;
    admin: string;
    usedCount: number;
    maxUses: number;
    exhausted: boolean;
  }>;
};

function parseMetadata(value: string | null): FanZoneMetadata {
  if (!value) return {};
  try {
    return JSON.parse(value) as FanZoneMetadata;
  } catch {
    return {};
  }
}

export async function getMundial2026FanZoneDashboard() {
  const tickets = await prisma.customQr.findMany({
    where: {
      campaignName: MUNDIAL2026_FANZONE_CAMPAIGN_NAME,
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      code: true,
      customerName: true,
      customerWhatsapp: true,
      customerPhrase: true,
      campaignName: true,
      createdAt: true,
      redeemedAt: true,
      extendedCount: true,
      lastExtendedAt: true,
      revokedAt: true,
      expiresAt: true,
      redeemedBy: true,
      metadata: true,
    },
  });

  const now = new Date();
  const expiringSoonMs = EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000;

  const grouped = new Map<
    string,
    {
      whatsapp: string;
      name: string;
      issuedCount: number;
      redeemedCount: number;
      activeCount: number;
      revokedCount: number;
      expiredCount: number;
      firstIssuedAt: Date;
      lastIssuedAt: Date;
      lastRedeemedAt: Date | null;
      lastRedeemedBy: string | null;
      lastActivityAt: Date | null;
      lastActivityBy: string | null;
    }
  >();

  let totalIssued = 0;
  let totalRedeemed = 0;
  let totalActive = 0;
  let totalRevoked = 0;
  let totalExpired = 0;

  const recentRedeemed = [];
  const expiringSoon = [];

  for (const ticket of tickets as FanZoneTicket[]) {
    totalIssued += 1;

    const metadata = parseMetadata(ticket.metadata);
    const redemptionHistory = metadata.redemptionHistory || [];
    const lastRedemptionHistory = redemptionHistory.length > 0 ? redemptionHistory[redemptionHistory.length - 1] : null;
    const usageCount = Math.max(0, ticket.extendedCount || 0);
    const lastActivityAt = ticket.lastExtendedAt || ticket.redeemedAt || (lastRedemptionHistory ? new Date(lastRedemptionHistory.date) : null);
    const lastActivityBy = lastRedemptionHistory?.admin || ticket.redeemedBy || null;
    const isRedeemed = !!ticket.redeemedAt;
    const isRevoked = !!ticket.revokedAt;
    const isExpired = !isRedeemed && !isRevoked && !!ticket.expiresAt && ticket.expiresAt.getTime() <= now.getTime();
    const isActive = !isRedeemed && !isRevoked && !isExpired;

    totalRedeemed += usageCount;
    if (isRevoked) totalRevoked += 1;
    if (isExpired) totalExpired += 1;
    if (isActive) totalActive += 1;

    const current = grouped.get(ticket.customerWhatsapp) || {
      whatsapp: ticket.customerWhatsapp,
      name: ticket.customerName,
      issuedCount: 0,
      redeemedCount: 0,
      activeCount: 0,
      revokedCount: 0,
      expiredCount: 0,
      firstIssuedAt: ticket.createdAt,
      lastIssuedAt: ticket.createdAt,
      lastRedeemedAt: null,
      lastRedeemedBy: null,
      lastActivityAt: null,
      lastActivityBy: null,
    };

    current.issuedCount += 1;
    current.redeemedCount += usageCount;
    if (isActive) current.activeCount += 1;
    if (isRevoked) current.revokedCount += 1;
    if (isExpired) current.expiredCount += 1;
    if (ticket.createdAt < current.firstIssuedAt) current.firstIssuedAt = ticket.createdAt;
    if (ticket.createdAt > current.lastIssuedAt) current.lastIssuedAt = ticket.createdAt;
    if (lastActivityAt && (!current.lastActivityAt || lastActivityAt > current.lastActivityAt)) {
      current.lastActivityAt = lastActivityAt;
      current.lastActivityBy = lastActivityBy;
    }
    if (ticket.redeemedAt && (!current.lastRedeemedAt || ticket.redeemedAt > current.lastRedeemedAt)) {
      current.lastRedeemedAt = ticket.redeemedAt;
      current.lastRedeemedBy = ticket.redeemedBy;
    }
    current.name = ticket.customerName;

    grouped.set(ticket.customerWhatsapp, current);

    if (usageCount > 0) {
      recentRedeemed.push(ticket);
    }
    if (ticket.expiresAt && !isRedeemed && !isRevoked && ticket.expiresAt.getTime() - now.getTime() <= expiringSoonMs && ticket.expiresAt.getTime() >= now.getTime()) {
      expiringSoon.push(ticket);
    }
  }

  const rows = Array.from(grouped.values())
    .map((row) => ({
      ...row,
      firstIssuedAt: row.firstIssuedAt.toISOString(),
      lastIssuedAt: row.lastIssuedAt.toISOString(),
      lastActivityAt: row.lastActivityAt ? row.lastActivityAt.toISOString() : null,
      lastActivityBy: row.lastActivityBy,
      lastRedeemedAt: row.lastRedeemedAt ? row.lastRedeemedAt.toISOString() : row.lastActivityAt ? row.lastActivityAt.toISOString() : null,
      lastRedeemedBy: row.lastRedeemedBy || row.lastActivityBy,
    }))
    .sort((left, right) => right.issuedCount - left.issuedCount || right.lastIssuedAt.localeCompare(left.lastIssuedAt));

  const recentRedeemedRows = recentRedeemed.slice(0, 25).map((ticket) => ({
    id: ticket.id,
    code: ticket.code,
    name: ticket.customerName,
    whatsapp: ticket.customerWhatsapp,
    customerPhrase: ticket.customerPhrase,
    createdAt: ticket.createdAt.toISOString(),
    redeemedAt: ticket.redeemedAt ? ticket.redeemedAt.toISOString() : ticket.lastExtendedAt ? ticket.lastExtendedAt.toISOString() : null,
    redeemedBy: ticket.redeemedBy || parseMetadata(ticket.metadata).redemptionHistory?.slice(-1)[0]?.admin || null,
    usageCount: Math.max(0, ticket.extendedCount || 0),
    extendedCount: ticket.extendedCount,
    lastExtendedAt: ticket.lastExtendedAt ? ticket.lastExtendedAt.toISOString() : null,
    expiresAt: ticket.expiresAt ? ticket.expiresAt.toISOString() : null,
  }));

  const expiringSoonRows = expiringSoon.slice(0, 25).map((ticket) => ({
    id: ticket.id,
    code: ticket.code,
    name: ticket.customerName,
    whatsapp: ticket.customerWhatsapp,
    createdAt: ticket.createdAt.toISOString(),
    expiresAt: ticket.expiresAt ? ticket.expiresAt.toISOString() : null,
  }));

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      issued: totalIssued,
      redeemed: totalRedeemed,
      active: totalActive,
      revoked: totalRevoked,
      expired: totalExpired,
      uniqueWhatsapps: rows.length,
    },
    rows,
    recentRedeemed: recentRedeemedRows,
    expiringSoon: expiringSoonRows,
  };
}

export type Mundial2026FanZoneDashboard = Awaited<ReturnType<typeof getMundial2026FanZoneDashboard>>;
