import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiOk, apiError } from '@/lib/apiError';
import { z } from 'zod';
import { corsHeadersFor } from '@/lib/cors';

const CreateReferrerSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Slug debe contener solo letras minúsculas, números y guiones'),
  email: z.string().optional(),
  phone: z.string().optional(),
  commissionAmount: z.number().min(0).max(1000).optional(),
}).refine((data) => {
  // Si se proporciona email, debe ser válido
  if (data.email && data.email.trim()) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email.trim());
  }
  return true;
}, {
  message: 'Email debe ser válido',
  path: ['email'],
});

const UpdateReferrerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Slug debe contener solo letras minúsculas, números y guiones').optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  active: z.boolean().optional(),
  commissionAmount: z.number().min(0).max(1000).optional(),
});

export async function GET(req: NextRequest) {
  const cors = corsHeadersFor(req as unknown as Request);

  try {
    const referrers = await prisma.birthdayReferrer.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { reservations: true }
        }
      }
    });

    // Convert Decimal to number for commissionAmount
    const formattedReferrers = referrers.map(referrer => ({
      ...referrer,
      commissionAmount: Number(referrer.commissionAmount || 10.00)
    }));

    return apiOk({ referrers: formattedReferrers }, 200, cors);
  } catch (error) {
    console.error('Error fetching referrers:', error);
    return apiError('INTERNAL_ERROR', 'Failed to fetch referrers', undefined, 500, cors);
  }
}

export async function POST(req: NextRequest) {
  const cors = corsHeadersFor(req as unknown as Request);

  try {
    const body = await req.json();

    const parsed = CreateReferrerSchema.safeParse(body);
    if (!parsed.success) {
      console.log('Validation failed:', parsed.error.flatten());
      return apiError('INVALID_BODY', 'Validation failed', parsed.error.flatten(), 400, cors);
    }

    const { name, slug, email, phone, commissionAmount } = parsed.data;

    // Verificar que el slug sea único
    const existing = await prisma.birthdayReferrer.findUnique({
      where: { slug }
    });
    if (existing) {
      return apiError('SLUG_EXISTS', 'Slug already exists', undefined, 400, cors);
    }

    // Generar código único
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const referrer = await prisma.birthdayReferrer.create({
      data: {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        code,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        commissionAmount: commissionAmount || 10.00,
        active: true,
      }
    });

    return apiOk({ referrer }, 201, cors);
  } catch (error) {
    console.error('Error creating referrer:', error);
    return apiError('CREATE_ERROR', 'Failed to create referrer', undefined, 500, cors);
  }
}