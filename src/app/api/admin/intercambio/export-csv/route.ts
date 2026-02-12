export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/apiError';

/**
 * GET /api/admin/intercambio/export-csv?batchId=xxx&status=approved
 * Export exchanges as CSV
 */
export async function GET(req: NextRequest) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    const url = new URL(req.url);
    const batchId = url.searchParams.get('batchId');
    const status = url.searchParams.get('status');

    const where: any = {};
    if (batchId) where.batchId = batchId;
    if (status) where.status = status;

    const exchanges = await (prisma as any).clientExchange.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        media: true,
        batch: { select: { id: true, name: true } }
      }
    });

    // Build CSV
    const headers = [
      'ID', 'Nombre', 'WhatsApp', 'DNI', 'Tipo', 'Estado',
      'Lote', 'Texto', 'Token Premio', 'Premio Entregado',
      'Revisado Por', 'Nota Revisión', 'IP',
      'Creado', 'Completado', 'URLs Media'
    ];

    const escapeCSV = (val: string | null | undefined) => {
      if (!val) return '';
      const str = String(val);
      if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
      return str;
    };

    const formatDate = (d: string | null) => {
      if (!d) return '';
      return new Date(d).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'medium' });
    };

    const rows = exchanges.map((ex: any) => [
      escapeCSV(ex.id),
      escapeCSV(ex.customerName),
      escapeCSV(ex.customerWhatsapp),
      escapeCSV(ex.customerDni),
      escapeCSV(ex.exchangeType),
      escapeCSV(ex.status),
      escapeCSV(ex.batch?.name || ''),
      escapeCSV(ex.customerText),
      escapeCSV(ex.rewardTokenId),
      ex.rewardDelivered ? 'Sí' : 'No',
      escapeCSV(ex.reviewedBy),
      escapeCSV(ex.reviewNote),
      escapeCSV(ex.ipAddress),
      escapeCSV(formatDate(ex.createdAt)),
      escapeCSV(formatDate(ex.completedAt)),
      escapeCSV(ex.media?.map((m: any) => m.imageUrl).filter(Boolean).join(' | ')),
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="intercambios-${new Date().toISOString().slice(0, 10)}.csv"`,
      }
    });
  } catch (error: any) {
    console.error('[export-csv] Error:', error);
    return apiError('INTERNAL_ERROR', 'Error exportando CSV', undefined, 500);
  }
}
