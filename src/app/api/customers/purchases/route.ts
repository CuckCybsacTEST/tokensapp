import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import { prisma } from "@/lib/prisma";
import { processPurchaseWithPoints } from "@/lib/customerPoints";

const purchaseSchema = z.object({
  customerId: z.string().min(1, "ID del cliente es requerido"),
  amount: z.number().min(0.01, "El monto debe ser mayor a 0"),
  description: z.string().min(1, "Descripción es requerida"),
  purchaseType: z.enum(["TICKET", "OFFER", "ORDER", "OTHER"]).default("OTHER"),
  referenceId: z.string().optional(), // ID de la compra relacionada (ticket, offer, order)
});

// POST /api/customers/purchases - Register a purchase and award points
export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = purchaseSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("INVALID_BODY", "Datos inválidos", parsed.error.flatten(), 400);
    }

    const data = parsed.data;

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
      select: {
        id: true,
        name: true,
        membershipLevel: true,
        points: true,
        totalSpent: true,
      },
    });

    if (!customer) {
      return apiError("NOT_FOUND", "Cliente no encontrado", {}, 404);
    }

    // Process purchase with points calculation
    const { pointsEarned } = await processPurchaseWithPoints(
      data.customerId,
      data.amount,
      customer.membershipLevel
    );

    // Create purchase record (you might want to create a dedicated Purchase table in the future)
    // For now, we'll log it in EventLog
    await prisma.eventLog.create({
      data: {
        type: 'CUSTOMER_PURCHASE',
        message: `Purchase by customer ${customer.name} (${data.customerId}): ${data.description}`,
        metadata: JSON.stringify({
          customerId: data.customerId,
          customerName: customer.name,
          amount: data.amount,
          pointsEarned,
          description: data.description,
          purchaseType: data.purchaseType,
          referenceId: data.referenceId,
          membershipLevel: customer.membershipLevel,
        }),
      },
    });

    return apiOk({
      customerId: data.customerId,
      amount: data.amount,
      pointsEarned,
      newTotalSpent: customer.totalSpent + data.amount,
      newPoints: customer.points + pointsEarned,
      description: data.description,
    }, 201);
  } catch (error) {
    console.error("Error processing purchase:", error);
    return apiError("INTERNAL_ERROR", "Error interno del servidor", {}, 500);
  }
}
