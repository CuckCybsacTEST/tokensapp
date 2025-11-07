import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/inventory/units - Listar unidades de medida
export async function GET() {
  try {
    const units = await prisma.unitOfMeasure.findMany({
      where: { active: true },
      orderBy: { name: "asc" }
    });

    return NextResponse.json(units);
  } catch (error) {
    console.error("Error fetching units:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST /api/inventory/units - Crear unidad de medida
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, symbol, type } = body;

    if (!name?.trim() || !symbol?.trim() || !type) {
      return NextResponse.json(
        { error: "Nombre, símbolo y tipo son obligatorios" },
        { status: 400 }
      );
    }

    const unit = await prisma.unitOfMeasure.create({
      data: {
        name: name.trim(),
        symbol: symbol.trim(),
        type
      }
    });

    return NextResponse.json(unit, { status: 201 });
  } catch (error) {
    console.error("Error creating unit:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// PUT /api/inventory/units - Actualizar unidad de medida
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, symbol, type, active } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID es obligatorio" },
        { status: 400 }
      );
    }

    if (!name?.trim() || !symbol?.trim() || !type) {
      return NextResponse.json(
        { error: "Nombre, símbolo y tipo son obligatorios" },
        { status: 400 }
      );
    }

    const unit = await prisma.unitOfMeasure.update({
      where: { id },
      data: {
        name: name.trim(),
        symbol: symbol.trim(),
        type,
        active: active ?? true
      }
    });

    return NextResponse.json(unit);
  } catch (error) {
    console.error("Error updating unit:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
