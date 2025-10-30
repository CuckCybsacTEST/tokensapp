export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError, apiOk } from '@/lib/apiError';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    // Authn + Authz
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED','UNAUTHORIZED',undefined,401);
    const role = requireRole(session, ['ADMIN', 'STAFF']);
    if (!role.ok) return apiError('FORBIDDEN','FORBIDDEN',undefined,403);

    const person = await prisma.person.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        code: true,
        name: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        dni: true,
        area: true,
        jobTitle: true,
        whatsapp: true,
        birthday: true,
      },
    });

    if (!person) {
      return apiError('NOT_FOUND','Persona no encontrada',undefined,404);
    }

    return apiOk(person);
  } catch (e: any) {
    console.error('admin person GET error', e);
    return apiError('INTERNAL_ERROR','Error interno',{ message: String(e?.message || e) },500);
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    // Authn + Authz
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED','UNAUTHORIZED',undefined,401);
    const role = requireRole(session, ['ADMIN']);
    if (!role.ok) return apiError('FORBIDDEN','FORBIDDEN',undefined,403);

    const body = await req.json().catch(() => null);
    if (!body) {
      return apiError('BAD_REQUEST','Cuerpo requerido',undefined,400);
    }

    // Validate updates
    const allowedFields = ['name', 'active', 'dni', 'area', 'jobTitle', 'whatsapp', 'birthday'];
    const filteredUpdates: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        filteredUpdates[field] = body[field];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return apiError('BAD_REQUEST','No hay campos para actualizar',undefined,400);
    }

    const updated = await prisma.person.update({
      where: { id: params.id },
      data: filteredUpdates,
      select: {
        id: true,
        code: true,
        name: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        dni: true,
        area: true,
        jobTitle: true,
        whatsapp: true,
        birthday: true,
      },
    });

    return apiOk(updated);
  } catch (e: any) {
    console.error('admin person PUT error', e);
    return apiError('INTERNAL_ERROR','Error interno',{ message: String(e?.message || e) },500);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    // Authn + Authz
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED','UNAUTHORIZED',undefined,401);
    const role = requireRole(session, ['ADMIN']);
    if (!role.ok) return apiError('FORBIDDEN','FORBIDDEN',undefined,403);

    // Check if person has associated users
    const userCount = await prisma.user.count({
      where: { personId: params.id },
    });

    if (userCount > 0) {
      return apiError('CONFLICT','No se puede eliminar una persona con usuarios asociados',undefined,409);
    }

    await prisma.person.delete({
      where: { id: params.id },
    });

    return apiOk({ deleted: true });
  } catch (e: any) {
    console.error('admin person DELETE error', e);
    return apiError('INTERNAL_ERROR','Error interno',{ message: String(e?.message || e) },500);
  }
}