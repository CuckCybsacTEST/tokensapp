import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const orders = await prisma.order.findMany({
      include: {
        table: true,
        servicePoint: {
          include: { location: true }
        },
        location: true,
        staff: true,
        items: {
          include: { product: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}