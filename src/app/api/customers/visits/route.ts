import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import { prisma } from "@/lib/prisma";
import { processVisitWithPoints } from "@/lib/customerPoints";

const visitSchema = z.object({
  customerId: z.string().min(1, "ID del cliente es requerido"),
  visitType: z.enum(["VISIT", "BIRTHDAY", "SPECIAL_EVENT"]).default("VISIT"),
  notes: z.string().optional(),
  spent: z.number().min(0, "El gasto debe ser mayor o igual a 0").default(0),
  pointsEarned: z.number().int().min(0, "Los puntos deben ser mayor o igual a 0").optional(), // Ahora opcional, se calcula automáticamente
});

// GET /api/customers/visits - List customer visits
export async function GET() {
  try {
    const visits = await prisma.customerVisit.findMany({
      orderBy: { visitDate: "desc" },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            membershipLevel: true,
          },
        },
      },
    });
    return apiOk(visits, 200);
  } catch (error) {
    console.error("Error fetching visits:", error);
    return apiError("INTERNAL_ERROR", "Error interno del servidor", {}, 500);
  }
}

// POST /api/customers/visits - Create new visit
export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = visitSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("INVALID_BODY", "Datos inválidos", parsed.error.flatten(), 400);
    }

    const data = parsed.data;

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });

    if (!customer) {
      return apiError("NOT_FOUND", "Cliente no encontrado", {}, 404);
    }

    // Create visit in transaction to update customer stats
    const result = await prisma.$transaction(async (tx) => {
      // Create the visit
      const visit = await tx.customerVisit.create({
        data: {
          customerId: data.customerId,
          visitType: data.visitType,
          notes: data.notes,
          spent: data.spent,
          pointsEarned: 0, // Will be calculated and updated below
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              membershipLevel: true,
            },
          },
        },
      });

      // Calculate and update points using the points system
      const { pointsEarned } = await processVisitWithPoints(
        data.customerId,
        data.visitType,
        visit.customer.membershipLevel,
        data.spent
      );

      // Update the visit with the actual points earned
      await tx.customerVisit.update({
        where: { id: visit.id },
        data: { pointsEarned },
      });

      return { ...visit, pointsEarned };
    });

    return apiOk(result, 201);
  } catch (error) {
    console.error("Error creating visit:", error);
    return apiError("INTERNAL_ERROR", "Error interno del servidor", {}, 500);
  }
}