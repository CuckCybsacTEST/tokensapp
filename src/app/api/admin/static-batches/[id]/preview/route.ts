import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('DEBUG API /api/admin/static-batches/[id]/preview: id', params.id);
    const batch = await prisma.batch.findUnique({
      where: { id: params.id },
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

    console.log('DEBUG API batch found:', !!batch, batch?.staticTargetUrl);

    if (!batch || batch.staticTargetUrl === null) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    return NextResponse.json({ batch });
  } catch (error) {
    console.error("Error fetching batch:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}