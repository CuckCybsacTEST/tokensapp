import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiOk, apiError } from '@/lib/apiError';
import { corsHeadersFor } from '@/lib/cors';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const cors = corsHeadersFor(req as unknown as Request);

  try {
    const id = params.id;

    if (!id) {
      return apiError('INVALID_ID', 'ID is required', undefined, 400, cors);
    }

    const referrer = await prisma.birthdayReferrer.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        active: true,
      },
    });

    if (!referrer) {
      return apiError('NOT_FOUND', 'Referrer not found', undefined, 404, cors);
    }

    return apiOk({ referrer }, 200, cors);
  } catch (error) {
    console.error('Error fetching referrer by id:', error);
    return apiError('INTERNAL_ERROR', 'Failed to fetch referrer', undefined, 500, cors);
  }
}