import { NextRequest } from 'next/server';
import { apiError, apiOk } from '@/lib/apiError';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth-user';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const raw = getUserSessionCookieFromRequest(req as unknown as Request);
  const session = await verifyUserSessionCookie(raw);
  if (!session || session.role !== 'STAFF') return apiError('UNAUTHORIZED', undefined, undefined, 401);
  const id = params.id;
  // Busca la reserva y verifica que existan tokens
  const resv = await prisma.birthdayReservation.findUnique({ where: { id }, include: { inviteTokens: true } });
  if (!resv) return apiError('NOT_FOUND', 'Reserva no encontrada', undefined, 404);
  if (!resv.inviteTokens || resv.inviteTokens.length === 0) return apiError('NO_TOKENS', 'No hay tokens generados', undefined, 400);
  // Genera un token de seguridad simple (puedes mejorar esto según tu lógica)
  // Aquí usamos el id de la reserva y el userId del staff para crear un token único
  const token = Buffer.from(`${id}:${session.userId}`).toString('base64');
  return apiOk({ token });
}
