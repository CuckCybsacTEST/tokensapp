export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema de validación para login
const loginSchema = z.object({
  dni: z.string().min(8).max(12).regex(/^\d+$/, 'DNI debe contener solo números')
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { ok: false, code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { ok: false, code: 'INVALID_DNI', errors: validation.error.issues },
        { status: 400 }
      );
    }

    const { dni } = validation.data;

    // Buscar cliente por DNI
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
        isActive: true
      }
    });

    if (!customer) {
      return NextResponse.json(
        { ok: false, code: 'CUSTOMER_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (!customer.isActive) {
      return NextResponse.json(
        { ok: false, code: 'CUSTOMER_INACTIVE' },
        { status: 403 }
      );
    }

    // Crear sesión
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    const session = await prisma.customerSession.create({
      data: {
        customerId: customer.id,
        sessionToken,
        expiresAt,
        ipAddress: req.ip || req.headers.get('x-forwarded-for') as string,
        userAgent: req.headers.get('user-agent') || undefined
      }
    });

    // Crear respuesta con cookie segura
    const response = NextResponse.json({
      ok: true,
      customer: {
        id: customer.id,
        name: customer.name,
        membershipLevel: customer.membershipLevel,
        points: customer.points
      }
    });

    // Configurar cookie segura
    response.cookies.set('customer_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 días en segundos
      path: '/'
    });

    // Actualizar lastVisit del cliente
    await prisma.customer.update({
      where: { id: customer.id },
      data: { lastVisit: new Date() }
    });

    return response;

  } catch (error) {
    console.error('Customer login error:', error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}