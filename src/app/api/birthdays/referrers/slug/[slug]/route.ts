import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiOk, apiError } from '@/lib/apiError';
import { corsHeadersFor } from '@/lib/cors';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const cors = corsHeadersFor(req as unknown as Request);

  try {
    const slug = params.slug;

    if (!slug) {
      return apiError('INVALID_SLUG', 'Slug is required', undefined, 400, cors);
    }

    const referrer = await prisma.birthdayReferrer.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        active: true,
      },
    });

    if (!referrer) {
      return apiError('NOT_FOUND', 'Referrer not found', undefined, 404, cors);
    }

    if (!referrer.active) {
      return apiError('INACTIVE', 'Referrer is not active', undefined, 404, cors);
    }

    return apiOk({ referrer }, 200, cors);
  } catch (error) {
    console.error('Error fetching referrer by slug:', error);
    return apiError('INTERNAL_ERROR', 'Failed to fetch referrer', undefined, 500, cors);
  }
}