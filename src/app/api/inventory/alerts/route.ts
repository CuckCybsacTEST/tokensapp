import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

interface Alert {
  id: string;
  type: string;
  severity: "error" | "warning" | "info";
  title: string;
  message: string;
  itemId: string;
  productId: string | null;
  variantId: string | null;
  currentStock?: number;
  minStock?: number;
  expiryDate?: Date | null;
  daysUntilExpiry?: number;
  createdAt: Date;
}

// GET /api/inventory/alerts - Obtener alertas de inventario
export async function GET() {
  try {
    const alerts: Alert[] = [];

    // 1. Productos con stock bajo
    const allItems = await prisma.inventoryItem.findMany({
      include: {
        product: { select: { id: true, name: true, minStock: true } },
        variant: { select: { id: true, name: true, product: { select: { minStock: true } } } }
      }
    });

    // Filtrar items con stock bajo
    const lowStockItems = allItems.filter(item => {
      const minStock = item.product?.minStock || item.variant?.product?.minStock || 0;
      return minStock > 0 && item.currentStock <= minStock;
    });

    lowStockItems.forEach(item => {
      const minStock = item.product?.minStock || item.variant?.product?.minStock || 0;
      alerts.push({
        id: `low-stock-${item.id}`,
        type: "LOW_STOCK",
        severity: "warning",
        title: "Stock Bajo",
        message: `${item.product?.name || item.variant?.name} tiene ${item.currentStock} unidades (mínimo: ${minStock})`,
        itemId: item.id,
        productId: item.productId,
        variantId: item.variantId,
        currentStock: item.currentStock,
        minStock,
        createdAt: new Date()
      });
    });

    // 2. Productos próximos a caducar (30 días)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringItems = await prisma.inventoryItem.findMany({
      where: {
        expiryDate: {
          lte: thirtyDaysFromNow,
          gte: new Date()
        },
        currentStock: { gt: 0 }
      },
      include: {
        product: { select: { id: true, name: true } },
        variant: { select: { id: true, name: true } }
      }
    });

    expiringItems.forEach(item => {
      const daysUntilExpiry = Math.ceil(
        (item.expiryDate!.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      alerts.push({
        id: `expiring-${item.id}`,
        type: "EXPIRING",
        severity: daysUntilExpiry <= 7 ? "error" : "warning",
        title: "Producto Próximo a Caducar",
        message: `${item.product?.name || item.variant?.name} caduca en ${daysUntilExpiry} días`,
        itemId: item.id,
        productId: item.productId,
        variantId: item.variantId,
        expiryDate: item.expiryDate,
        daysUntilExpiry,
        createdAt: new Date()
      });
    });

    // 3. Productos caducados
    const expiredItems = await prisma.inventoryItem.findMany({
      where: {
        expiryDate: {
          lt: new Date()
        },
        currentStock: { gt: 0 }
      },
      include: {
        product: { select: { id: true, name: true } },
        variant: { select: { id: true, name: true } }
      }
    });

    expiredItems.forEach(item => {
      alerts.push({
        id: `expired-${item.id}`,
        type: "EXPIRED",
        severity: "error",
        title: "Producto Caducado",
        message: `${item.product?.name || item.variant?.name} está caducado`,
        itemId: item.id,
        productId: item.productId,
        variantId: item.variantId,
        expiryDate: item.expiryDate,
        createdAt: new Date()
      });
    });

    // Ordenar por severidad y fecha
    alerts.sort((a, b) => {
      const severityOrder = { error: 0, warning: 1, info: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json(alerts);
  } catch (error) {
    console.error("Error fetching inventory alerts:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}