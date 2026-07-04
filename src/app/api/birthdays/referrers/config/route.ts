import { NextRequest } from 'next/server';

import { apiOk, apiError } from '@/lib/apiError';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest) {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { id: 1 } }).catch(() => null);
    return apiOk({
      commissionAmount: Number(config?.birthdayReferrerCommissionAmount ?? 10),
      termsVersion: 'birthday-referrer-v1',
    });
  } catch (error) {
    console.error('Error fetching birthday referrer public config:', error);
    return apiError('REFERRER_CONFIG_ERROR', 'No se pudo cargar la configuración pública.', undefined, 500);
  }
}
