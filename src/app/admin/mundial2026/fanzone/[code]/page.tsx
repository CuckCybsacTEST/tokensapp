import Link from "next/link";
import { notFound } from "next/navigation";

import { Mundial2026FanZoneAdminClient } from "./Mundial2026FanZoneAdminClient";
import { MUNDIAL2026_FANZONE_CAMPAIGN_NAME, MUNDIAL2026_FANZONE_MAX_QR_PER_PARTICIPANT, formatMundial2026FanZoneExpiresAt } from "@/lib/mundial2026/fanzone";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseCustomData(value: string | null) {
  if (!value) return {};
  try {
    return JSON.parse(value) as { maxUses?: number; usedCount?: number };
  } catch {
    return {};
  }
}

export default async function AdminMundial2026FanZoneCodePage({ params }: { params: { code: string } }) {
  const ticket = await prisma.customQr.findFirst({
    where: {
      code: params.code,
      campaignName: MUNDIAL2026_FANZONE_CAMPAIGN_NAME,
    },
    select: {
      id: true,
      code: true,
      customerName: true,
      customData: true,
      isActive: true,
      redeemedAt: true,
      revokedAt: true,
      extendedCount: true,
    },
  });

  if (!ticket) notFound();

  const metadata = parseCustomData(ticket.customData);
  const maxUses = Math.min(MUNDIAL2026_FANZONE_MAX_QR_PER_PARTICIPANT, Math.max(1, metadata.maxUses ?? 1));
  const usedCount = Math.min(maxUses, Math.max(0, metadata.usedCount ?? ticket.extendedCount ?? 0));
  const statusLabel = ticket.revokedAt ? "Revocado" : ticket.redeemedAt || usedCount >= maxUses ? "Canjeado" : ticket.isActive ? "Vigente" : "Inactivo";
  const expiresAtLabel = formatMundial2026FanZoneExpiresAt();

  return (
    <div className="min-h-screen bg-[#0E0606] px-3 py-4 text-white sm:px-5 sm:py-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col justify-center gap-4 sm:min-h-[calc(100vh-3rem)] sm:gap-5">
        <div className="flex items-center justify-between gap-3 px-1">
          <Link href="/admin/mundial2026/fanzone" className="text-sm font-medium text-white/65 transition hover:text-white">
            Volver
          </Link>
          <div className="text-xs font-bold tracking-[0.22em] text-white/40">GO LOUNGE</div>
        </div>

        <section className="relative isolate rounded-[46px] bg-[linear-gradient(135deg,rgba(255,196,112,0.34),rgba(255,255,255,0.14),rgba(255,83,46,0.30))] p-[3px] shadow-[0_42px_140px_rgba(0,0,0,0.96)] ring-1 ring-white/10 ring-offset-4 ring-offset-[#0B0404] sm:rounded-[52px]">
          <div className="absolute inset-[3px] rounded-[43px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.04),_transparent_34%),linear-gradient(180deg,_rgba(26,12,12,0.99)_0%,_rgba(14,6,6,0.99)_100%)] sm:rounded-[49px]" />
          <div className="relative rounded-[43px] px-4 py-4 sm:rounded-[49px] sm:px-5 sm:py-5">
            <Mundial2026FanZoneAdminClient
              ticket={{
                id: ticket.id,
                code: ticket.code,
                customerName: ticket.customerName,
                maxUses,
                usedCount,
                statusLabel,
                expiresAtLabel,
                showValidateButton: true,
              }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
