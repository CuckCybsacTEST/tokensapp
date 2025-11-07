import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/menu/variants - Listar variantes de productos
export async function GET() {
  try {
    const variants = await prisma.productVariant.findMany({
      where: { active: true },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { product: { name: "asc" } },
        { name: "asc" }
      ],
    });

    return NextResponse.json(variants);
  } catch (error) {
    console.error("Error fetching variants:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST /api/menu/variants - Crear variante
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, name, multiplier, sku, barcode } = body;

    if (!productId || !name?.trim()) {
      return NextResponse.json(
        { error: "Producto y nombre son obligatorios" },
        { status: 400 }
      );
    }

    const variant = await prisma.productVariant.create({
      data: {
        productId,
        name: name.trim(),
        multiplier: parseFloat(multiplier) || 1.0,
        sku: sku?.trim(),
        barcode: barcode?.trim(),
      },
      include: {
        product: {
          select: { id: true, name: true }
        }
      }
    });

    return NextResponse.json(variant, { status: 201 });
  } catch (error) {
    console.error("Error creating variant:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// PUT /api/menu/variants - Actualizar variante
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, productId, name, multiplier, sku, barcode, active } = body;

    if (!id || !name?.trim()) {
      return NextResponse.json(
        { error: "ID y nombre son obligatorios" },
        { status: 400 }
      );
    }

    const variant = await prisma.productVariant.update({
      where: { id },
      data: {
        productId,
        name: name.trim(),
        multiplier: parseFloat(multiplier) || 1.0,
        sku: sku?.trim(),
        barcode: barcode?.trim(),
        active: active ?? true,
      },
      include: {
        product: {
          select: { id: true, name: true }
        }
      }
    });

    return NextResponse.json(variant);
  } catch (error) {
    console.error("Error updating variant:", error);
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json(
        { error: "Variante no encontrada" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
