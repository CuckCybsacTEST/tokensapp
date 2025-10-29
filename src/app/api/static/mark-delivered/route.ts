import { prisma } from '@/lib/prisma';
import { apiOk, apiError } from '@/lib/apiError';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tokenId } = body;
    if (!tokenId) {
      return apiError('NO_TOKEN_ID', 'Falta tokenId', undefined, 400);
    }
    const token = await prisma.token.update({
      where: { id: tokenId },
      data: { deliveredAt: new Date() },
    });
    return apiOk({ success: true, token });
  } catch (err) {
    return apiError('DELIVERY_ERROR', 'No se pudo marcar entrega', err, 500);
  }
}
