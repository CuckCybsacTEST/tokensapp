import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import { corsHeadersFor } from "@/lib/cors";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

const searchSchema = z.object({
  dni: z.string().min(1, "DNI es requerido"),
});

export async function GET(req: Request) {
  try {
    const cors = corsHeadersFor(req);
    const { searchParams } = new URL(req.url);
    const dni = searchParams.get('dni');

    if (!dni) {
      return apiError("MISSING_DNI", "DNI es requerido", {}, 400, cors);
    }

    const customer = await prisma.customer.findUnique({
      where: { dni },
      select: {
        id: true,
        dni: true,
        name: true,
        email: true,
        phone: true,
        whatsapp: true,
        birthday: true,
        membershipLevel: true,
        points: true,
        totalSpent: true,
        visitCount: true,
        lastVisit: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!customer) {
      return apiOk({ customer: null }, 200, cors);
    }

    if (!customer.isActive) {
      return apiError("INACTIVE", "Cliente está inactivo", {}, 404, cors);
    }

    return apiOk({ customer }, 200, cors);
  } catch (error) {
    console.error("Error searching customer:", error);
    const cors = corsHeadersFor(req);
    return apiError("INTERNAL_ERROR", "Error interno del servidor", {}, 500, cors);
  }
}