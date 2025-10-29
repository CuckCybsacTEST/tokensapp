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
    const token = await prisma.token.update({
      where: { id: tokenId },
      data: { deliveredAt: new Date() },
    });
    return res.status(200).json({ success: true, token });
  } catch (err) {
    return res.status(500).json({ error: 'No se pudo marcar entrega' });
  }
}
