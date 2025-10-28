import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids')?.split(',') || [];

    if (ids.length === 0) {
      return NextResponse.json([]);
    }

    const servicePoints = await prisma.servicePoint.findMany({
      where: {
        id: { in: ids },
        active: true
      },
      select: {
        id: true,
        number: true,
        name: true,
        type: true,
        capacity: true,
        location: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    });

    return NextResponse.json(servicePoints);
  } catch (error) {
    console.error("Error fetching service points:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}