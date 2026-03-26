import { prisma } from '@/lib/prisma';
import { apiError, apiOk } from '@/lib/apiError';

export async function POST(req: Request, { params }: { params: { tokenId: string } }) {
  const { tokenId } = params;
  if (!tokenId || tokenId.length < 10) return apiError('BAD_TOKEN', 'Token inválido', undefined, 400);

  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return apiError('BAD_BODY', 'Body inválido', undefined, 400);
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text || text.length < 1) return apiError('EMPTY', 'Texto vacío', undefined, 400);
  // Limit length server-side
  const safeText = text.slice(0, 2000);

  try {
    await prisma.token.update({
      where: { id: tokenId },
      data: { clientResponse: safeText },
    });
    return apiOk({ saved: true });
  } catch {
    return apiError('DB_ERROR', 'Error al guardar', undefined, 500);
  }
}
