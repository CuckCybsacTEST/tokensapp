import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  const { tokenId } = req.body;
  if (!tokenId) {
    return res.status(400).json({ error: 'Falta tokenId' });
  }
  try {
    // Primero verificar si el token pertenece a un lote estático
    const tokenWithBatch = await prisma.token.findUnique({
      where: { id: tokenId },
      include: {
        batch: {
          select: {
            staticTargetUrl: true
          }
        }
      }
    });

    if (!tokenWithBatch) {
      return res.status(404).json({ error: 'Token no encontrado' });
    }

    const isStaticBatch = !!(tokenWithBatch.batch?.staticTargetUrl && tokenWithBatch.batch.staticTargetUrl.trim() !== '');

    // Para tokens estáticos, marcar como entregado Y canjeado
    const updateData = isStaticBatch
      ? { deliveredAt: new Date(), redeemedAt: new Date() }
      : { deliveredAt: new Date() };

    const token = await prisma.token.update({
      where: { id: tokenId },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      token,
      isStaticBatch,
      autoRedeemed: isStaticBatch
    });
  } catch (err) {
    return res.status(500).json({ error: 'No se pudo marcar entrega' });
  }
}
