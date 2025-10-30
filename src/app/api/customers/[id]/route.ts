import { z } from "zod";
import { NextRequest } from "next/server";

import { apiError, apiOk } from "@/lib/apiError";
import { prisma } from "@/lib/prisma";

const updateCustomerSchema = z.object({
  name: z.string().min(1, "Nombre es requerido").optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().min(1, "Teléfono es requerido").optional(),
  whatsapp: z.string().optional(),
  birthday: z.string().optional(),
  membershipLevel: z.enum(["VIP", "MEMBER", "GUEST"]).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        ticketPurchases: {
          orderBy: { purchasedAt: "desc" },
          take: 10,
          include: {
            tickets: true,
          },
        },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
        customerVisits: {
          orderBy: { visitDate: "desc" },
          take: 20,
        },
        _count: {
          select: {
            ticketPurchases: true,
            orders: true,
            customerVisits: true,
          },
        },
      },
    });

    if (!customer) {
      return apiError("NOT_FOUND", "Cliente no encontrado", {}, 404);
    }

    return apiOk(customer, 200);
  } catch (error) {
    console.error("Error fetching customer:", error);
    return apiError("INTERNAL_ERROR", "Error interno del servidor", {}, 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const json = await req.json();
    const parsed = updateCustomerSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("INVALID_BODY", "Datos inválidos", parsed.error.flatten(), 400);
    }

    const data = parsed.data;

    // Check if email is provided and already exists (excluding current customer)
    if (data.email && data.email !== "") {
      const existingEmail = await prisma.customer.findFirst({
        where: {
          email: data.email,
          id: { not: params.id },
        },
      });
      if (existingEmail) {
        return apiError("DUPLICATE_EMAIL", "Ya existe un cliente con este email", { email: data.email }, 409);
      }
    }

    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: {
        name: data.name,
        email: data.email || null,
        phone: data.phone,
        whatsapp: data.whatsapp || null,
        birthday: data.birthday ? new Date(data.birthday) : null,
        membershipLevel: data.membershipLevel,
        isActive: data.isActive,
      },
    });

    return apiOk(customer, 200);
  } catch (error) {
    console.error("Error updating customer:", error);
    return apiError("INTERNAL_ERROR", "Error interno del servidor", {}, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
    });

    if (!customer) {
      return apiError("NOT_FOUND", "Cliente no encontrado", {}, 404);
    }

    // Soft delete by setting isActive to false
    await prisma.customer.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return apiOk({ message: "Cliente desactivado exitosamente" }, 200);
  } catch (error) {
    console.error("Error deleting customer:", error);
    return apiError("INTERNAL_ERROR", "Error interno del servidor", {}, 500);
  }
}