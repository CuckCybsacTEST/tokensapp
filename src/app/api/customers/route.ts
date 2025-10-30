import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import { corsHeadersFor } from "@/lib/cors";
import { prisma } from "@/lib/prisma";

const customerSchema = z.object({
  dni: z.string().min(1, "DNI es requerido"),
  name: z.string().min(1, "Nombre es requerido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().min(1, "Teléfono es requerido"),
  whatsapp: z.string().optional(),
  birthday: z.string().optional(),
  membershipLevel: z.enum(["VIP", "MEMBER", "GUEST"]).default("MEMBER"),
});

export async function GET(req: Request) {
  try {
    const cors = corsHeadersFor(req);
    const url = new URL(req.url);
    const range = url.searchParams.get('range');
    const sort = url.searchParams.get('sort');
    const filter = url.searchParams.get('filter');

    // Parse range parameter [start, end]
    let skip = 0;
    let take = 25; // default limit
    if (range) {
      const [start, end] = JSON.parse(range);
      skip = parseInt(start);
      take = parseInt(end) - parseInt(start) + 1;
    }

    // Parse sort parameter ["field", "ASC|DESC"]
    let orderBy: any = { createdAt: "desc" };
    if (sort) {
      const [field, direction] = JSON.parse(sort);
      orderBy = { [field]: direction.toLowerCase() };
    }

    // Parse filter parameter
    let where: any = {};
    if (filter) {
      const filters = JSON.parse(filter);
      if (filters.membershipLevel) {
        where.membershipLevel = filters.membershipLevel;
      }
      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }
      if (filters.q) {
        // Search in name, dni, email
        where.OR = [
          { name: { contains: filters.q, mode: 'insensitive' } },
          { dni: { contains: filters.q } },
          { email: { contains: filters.q, mode: 'insensitive' } },
        ];
      }
    }

    // Get total count for Content-Range header
    const total = await prisma.customer.count({ where });

    // Get paginated results
    const customers = await prisma.customer.findMany({
      skip,
      take,
      where,
      orderBy,
      include: {
        _count: {
          select: {
            ticketPurchases: true,
            orders: true,
            customerVisits: true,
          },
        },
      },
    });

    // Create Content-Range header
    const contentRange = `customers ${skip}-${skip + customers.length - 1}/${total}`;

    return apiOk(customers, 200, {
      ...cors,
      'Content-Range': contentRange,
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    const cors = corsHeadersFor(req);
    return apiError("INTERNAL_ERROR", "Error interno del servidor", {}, 500, cors);
  }
}

export async function POST(req: Request) {
  try {
    const cors = corsHeadersFor(req);
    const json = await req.json();
    const parsed = customerSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("INVALID_BODY", "Datos inválidos", parsed.error.flatten(), 400, cors);
    }

    const data = parsed.data;

    // Check if customer with DNI already exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { dni: data.dni },
    });

    if (existingCustomer) {
      return apiError("DUPLICATE_DNI", "Ya existe un cliente con este DNI", { dni: data.dni }, 409, cors);
    }

    // Check if email is provided and already exists
    if (data.email && data.email !== "") {
      const existingEmail = await prisma.customer.findUnique({
        where: { email: data.email },
      });
      if (existingEmail) {
        return apiError("DUPLICATE_EMAIL", "Ya existe un cliente con este email", { email: data.email }, 409, cors);
      }
    }

    const customer = await prisma.customer.create({
      data: {
        dni: data.dni,
        name: data.name,
        email: data.email || null,
        phone: data.phone,
        whatsapp: data.whatsapp || null,
        birthday: data.birthday ? new Date(data.birthday) : null,
        membershipLevel: data.membershipLevel,
      },
    });

    return apiOk(customer, 201, cors);
  } catch (error) {
    console.error("Error creating customer:", error);
    const cors = corsHeadersFor(req);
    return apiError("INTERNAL_ERROR", "Error interno del servidor", {}, 500, cors);
  }
}