import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/inventory/suppliers/[id] - Obtener proveedor específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: params.id },
      include: {
        inventoryItems: {
          include: {
            product: { select: { id: true, name: true } },
            variant: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: "desc" },
          take: 10 // Últimos 10 items
        },
        _count: {
          select: { inventoryItems: true }
        }
      }
    });

    if (!supplier) {
      return NextResponse.json(
        { error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(supplier);
  } catch (error) {
    console.error("Error fetching supplier:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// PUT /api/inventory/suppliers/[id] - Actualizar proveedor
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, contactName, email, phone, address, taxId, active } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    const supplier = await prisma.supplier.update({
      where: { id: params.id },
      data: {
        name: name.trim(),
        contactName: contactName?.trim(),
        email: email?.trim(),
        phone: phone?.trim(),
        address: address?.trim(),
        taxId: taxId?.trim(),
        active: active ?? true,
      },
    });

    return NextResponse.json(supplier);
  } catch (error) {
    console.error("Error updating supplier:", error);
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json(
        { error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// DELETE /api/inventory/suppliers/[id] - Eliminar proveedor (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar si el proveedor tiene items de inventario
    const inventoryCount = await prisma.inventoryItem.count({
      where: { supplierId: params.id }
    });

    if (inventoryCount > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar un proveedor que tiene items de inventario asociados" },
        { status: 400 }
      );
    }

    // Soft delete - marcar como inactivo
    const supplier = await prisma.supplier.update({
      where: { id: params.id },
      data: { active: false },
    });

    return NextResponse.json({ message: "Proveedor eliminado exitosamente" });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json(
        { error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}