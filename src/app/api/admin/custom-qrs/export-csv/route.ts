export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/apiError';
import { formatDateForLima } from '@/lib/qr-custom';

export async function GET(req: Request) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    // Obtener todos los QR sin paginación (para export completo)
    const qrs = await (prisma as any).customQr.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        customerName: true,
        customerWhatsapp: true,
        customerPhrase: true,
        customData: true,
        theme: true,
        isActive: true,
        expiresAt: true,
        redeemedAt: true,
        redeemedBy: true,
        createdAt: true,
        campaignName: true,
        batchId: true,
        batch: {
          select: {
            name: true
          }
        },
        ipAddress: true,
        userAgent: true
      }
    });

    // Crear CSV
    const headers = [
      'ID',
      'Código',
      'Nombre Cliente',
      'WhatsApp',
      'Frase Personal',
      'Dato Adicional',
      'Tema',
      'Activo',
      'Fecha Expiración',
      'Fecha Redención',
      'Redimido Por',
      'Fecha Creación',
      'Campaña',
      'Lote',
      'IP Creación',
      'User Agent'
    ];

    const csvRows = [
      headers.join(','), // Header row
      ...qrs.map((qr: any) => [
        qr.id,
        qr.code,
        `"${qr.customerName.replace(/"/g, '""')}"`, // Escape quotes
        qr.customerWhatsapp,
        qr.customerPhrase ? `"${qr.customerPhrase.replace(/"/g, '""')}"` : '',
        qr.customData ? `"${qr.customData.replace(/"/g, '""')}"` : '',
        qr.theme,
        qr.isActive ? 'Sí' : 'No',
        qr.expiresAt ? formatDateForLima(qr.expiresAt) : '',
        qr.redeemedAt ? formatDateForLima(qr.redeemedAt) : '',
        qr.redeemedBy || '',
        formatDateForLima(qr.createdAt),
        qr.campaignName || '',
        qr.batch?.name || '',
        qr.ipAddress || '',
        `"${(qr.userAgent || '').replace(/"/g, '""')}"`
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');

    // Retornar como archivo CSV
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="custom-qrs-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error: any) {
    console.error('[API] Error exportando CSV de QR:', error);
    return apiError('INTERNAL_ERROR', 'Error interno del servidor', undefined, 500);
  }
}