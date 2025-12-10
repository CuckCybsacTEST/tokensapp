export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/apiError';
import { generateQrPngDataUrl } from '@/lib/qr';
import { generateRedeemUrl } from '@/lib/qr-custom';
import composeTemplateWithQr from '@/lib/print/compose';
import assemblePages from '@/lib/print/layout';
import composePdfFromPagePngs from '@/lib/print/pdf';

export async function GET(req: Request) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    const url = new URL(req.url);
    const batchId = url.searchParams.get('batchId');
    const campaignName = url.searchParams.get('campaign');
    const theme = url.searchParams.get('theme') || 'default';
    const templateId = url.searchParams.get('templateId');

    if (!templateId) {
      return apiError('MISSING_TEMPLATE', 'Se requiere templateId', undefined, 400);
    }

    // Construir filtro para QR
    const where: any = {
      isActive: true,
      redeemedAt: null
    };

    if (batchId) {
      where.batchId = batchId;
    }

    if (campaignName) {
      where.campaignName = campaignName;
    }

    // Obtener QR para imprimir
    const qrs = await (prisma as any).customQr.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        customerName: true,
        customerWhatsapp: true,
        customerPhrase: true,
        customData: true,
        theme: true,
        expiresAt: true,
        createdAt: true
      }
    });

    if (qrs.length === 0) {
      return apiError('NO_QRS_FOUND', 'No hay QR para imprimir', undefined, 404);
    }

    // Cargar template
    const template = await prisma.printTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      return apiError('TEMPLATE_NOT_FOUND', 'Template no encontrado', undefined, 404);
    }

    // Por ahora, retornar un mensaje indicando que la impresión está en desarrollo
    // TODO: Implementar impresión completa usando el sistema de templates existente
    return NextResponse.json({
      message: 'Impresión de QR personalizados en desarrollo',
      qrCount: qrs.length,
      templateId,
      batchId,
      campaignName,
      note: 'Usar el sistema de impresión existente adaptado para QR personalizados'
    });

  } catch (error: any) {
    console.error('[API] Error generando PDF de QR:', error);
    return apiError('INTERNAL_ERROR', 'Error interno del servidor', undefined, 500);
  }
}