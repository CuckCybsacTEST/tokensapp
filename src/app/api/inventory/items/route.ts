import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/inventory/items - Listar items de inventario
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const supplierId = searchParams.get("supplierId");
    const lowStock = searchParams.get("lowStock") === "true";
    const expiring = searchParams.get("expiring") === "true";

    let where: any = {};

    if (productId) where.productId = productId;
    if (supplierId) where.supplierId = supplierId;

    // Filtro para stock bajo
    if (lowStock) {
      where.OR = [
        {
          product: {
            minStock: { gt: 0 }
          },
          currentStock: { lte: prisma.$queryRaw`product.min_stock` }
        },
        {
          variant: {
            product: {
              minStock: { gt: 0 }
            }
          },
          currentStock: { lte: prisma.$queryRaw`variant.product.min_stock` }
        }
      ];
    }

    // Filtro para productos próximos a caducar (30 días)
    if (expiring) {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      where.expiryDate = {
        lte: thirtyDaysFromNow,
        gte: new Date()
      };
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        product: { 
          select: { 
            id: true, 
            name: true, 
            minStock: true,
            maxStock: true,
            unitOfMeasure: { select: { id: true, name: true, symbol: true } }
          } 
        },
        variant: { select: { id: true, name: true, product: { select: { minStock: true, maxStock: true } } } },
        supplier: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching inventory items:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST /api/inventory/items - Crear item de inventario
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      productId,
      variantId,
      supplierId,
      batchNumber,
      purchaseDate,
      expiryDate,
      quantity,
      costPrice,
      unitOfMeasureId,
      location,
      minStock,
      maxStock
    } = body;

    if (!productId) {
      return NextResponse.json(
        { error: "Debe especificar un producto" },
        { status: 400 }
      );
    }

    if (!quantity) {
      return NextResponse.json(
        { error: "La cantidad es obligatoria" },
        { status: 400 }
      );
    }

    const totalCost = costPrice ? parseFloat(quantity) * parseFloat(costPrice) : 0;

    const item = await prisma.inventoryItem.create({
      data: {
        productId: productId || null,
        variantId: variantId || null,
        supplierId: supplierId || null,
        batchNumber,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        quantity: parseFloat(quantity),
        unitCost: costPrice ? parseFloat(costPrice) : 0,
        totalCost,
        currentStock: parseFloat(quantity), // Inicialmente todo está disponible
        minStock: minStock !== undefined ? parseFloat(minStock) : 0,
        maxStock: maxStock !== undefined ? parseFloat(maxStock) : null,
        location
      },
      include: {
        product: { 
          select: { 
            id: true, 
            name: true,
            unitOfMeasure: { select: { id: true, name: true, symbol: true } }
          } 
        },
        variant: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error creating inventory item:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// PUT /api/inventory/items - Actualizar item de inventario
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      productId,
      variantId,
      supplierId,
      batchNumber,
      purchaseDate,
      expiryDate,
      currentStock,
      costPrice,
      location,
      minStock,
      maxStock
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Debe especificar el ID del item" },
        { status: 400 }
      );
    }

    if (!productId) {
      return NextResponse.json(
        { error: "Debe especificar un producto" },
        { status: 400 }
      );
    }

    if (currentStock === undefined) {
      return NextResponse.json(
        { error: "El stock actual es obligatorio" },
        { status: 400 }
      );
    }

    const totalCost = costPrice ? parseFloat(currentStock) * parseFloat(costPrice) : 0;

    const item = await prisma.inventoryItem.update({
      where: { id },
      data: {
        productId: productId || null,
        variantId: variantId || null,
        supplierId: supplierId || null,
        batchNumber,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        currentStock: parseFloat(currentStock),
        unitCost: costPrice ? parseFloat(costPrice) : 0,
        totalCost,
        location,
        minStock: minStock !== undefined ? parseFloat(minStock) : undefined,
        maxStock: maxStock !== undefined ? parseFloat(maxStock) : undefined
      },
      include: {
        product: { 
          select: { 
            id: true, 
            name: true,
            unitOfMeasure: { select: { id: true, name: true, symbol: true } }
          } 
        },
        variant: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error updating inventory item:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
