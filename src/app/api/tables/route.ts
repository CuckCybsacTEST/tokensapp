import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const tables = await prisma.table.findMany({
      where: { active: true },
      orderBy: [
        { zone: "asc" },
        { number: "asc" }
      ],
      select: {
        id: true,
        number: true,
        name: true,
        zone: true,
        capacity: true,
        active: true,
        qrCode: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orders: true
          }
        }
      },
    });

    return NextResponse.json(tables);
  } catch (error) {
    console.error("Error fetching tables:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { number, name, zone, capacity, qrCode } = body;

    // Validar que el número de mesa sea único
    const existingTable = await prisma.table.findUnique({
      where: { number }
    });

    if (existingTable) {
      return NextResponse.json(
        { error: "Ya existe una mesa con ese número" },
        { status: 400 }
      );
    }

    const table = await prisma.table.create({
      data: {
        number,
        name,
        zone,
        capacity: capacity || 4,
        qrCode,
      },
    });

    return NextResponse.json(table, { status: 201 });
  } catch (error) {
    console.error("Error creating table:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, number, name, zone, capacity, qrCode, active } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Se requiere el ID de la mesa" },
        { status: 400 }
      );
    }

    // Si se está cambiando el número, validar que no exista otra mesa con ese número
    if (number !== undefined) {
      const existingTable = await prisma.table.findFirst({
        where: {
          number,
          id: { not: id }
        }
      });

      if (existingTable) {
        return NextResponse.json(
          { error: "Ya existe otra mesa con ese número" },
          { status: 400 }
        );
      }
    }

    const table = await prisma.table.update({
      where: { id },
      data: {
        ...(number !== undefined && { number }),
        ...(name !== undefined && { name }),
        ...(zone !== undefined && { zone }),
        ...(capacity !== undefined && { capacity }),
        ...(qrCode !== undefined && { qrCode }),
        ...(active !== undefined && { active }),
      },
    });

    return NextResponse.json(table);
  } catch (error) {
    console.error("Error updating table:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Se requiere el ID de la mesa" },
        { status: 400 }
      );
    }

    // Verificar si la mesa tiene pedidos activos
    const tableWithOrders = await prisma.table.findUnique({
      where: { id },
      include: {
        orders: {
          where: {
            status: {
              notIn: ["DELIVERED", "CANCELLED"]
            }
          }
        }
      }
    });

    if (!tableWithOrders) {
      return NextResponse.json(
        { error: "Mesa no encontrada" },
        { status: 404 }
      );
    }

    if (tableWithOrders.orders && tableWithOrders.orders.length > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar una mesa con pedidos activos" },
        { status: 400 }
      );
    }

    // Desactivar la mesa en lugar de eliminarla
    const table = await prisma.table.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ message: "Mesa desactivada exitosamente", table });
  } catch (error) {
    console.error("Error deleting table:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}