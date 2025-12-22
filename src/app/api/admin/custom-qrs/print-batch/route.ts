export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/apiError';
import { generateRedeemUrl } from '@/lib/qr-custom';
import { PDFDocument } from 'pdf-lib';
import { DateTime } from 'luxon';

export async function GET(req: Request) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    const url = new URL(req.url);
    const batchId = url.searchParams.get('batchId');
    const statesParam = url.searchParams.get('states');

    if (!batchId) {
      return apiError('MISSING_BATCH_ID', 'Se requiere batchId', undefined, 400);
    }

    if (!statesParam) {
      return apiError('MISSING_STATES', 'Se requieren estados a incluir', undefined, 400);
    }

    const states = statesParam.split(',').filter(s => s.trim());
    const validStates = ['active', 'redeemed', 'revoked', 'expired'];
    
    if (states.some(s => !validStates.includes(s))) {
      return apiError('INVALID_STATES', 'Estados inválidos', undefined, 400);
    }

    // Construir filtro dinámico basado en estados
    const where: any = {
      batchId
    };

    const now = new Date();
    const statusConditions = [];

    if (states.includes('active')) {
      statusConditions.push({
        isActive: true,
        redeemedAt: null,
        revokedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ]
      });
    }

    if (states.includes('redeemed')) {
      statusConditions.push({
        redeemedAt: { not: null }
      });
    }

    if (states.includes('revoked')) {
      statusConditions.push({
        revokedAt: { not: null }
      });
    }

    if (states.includes('expired')) {
      statusConditions.push({
        expiresAt: { lte: now },
        redeemedAt: null,
        revokedAt: null
      });
    }

    if (statusConditions.length > 0) {
      where.OR = statusConditions;
    }

    // Obtener QR filtrados
    const qrs = await (prisma as any).customQr.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        code: true,
        customerName: true,
        isActive: true,
        redeemedAt: true,
        revokedAt: true,
        expiresAt: true
      }
    });

    if (qrs.length === 0) {
      return apiError('NO_QRS_FOUND', 'No hay QR codes que coincidan con los filtros', undefined, 404);
    }

    // Generar PDF simple con QR codes en grid
    const pdfBuffer = await generateSimpleQrPdf(qrs);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="qr-batch-${batchId}.pdf"`
      }
    });

  } catch (error: any) {
    console.error('[API] Error generando PDF de QR:', error);
    return apiError('INTERNAL_ERROR', 'Error interno del servidor', undefined, 500);
  }
}

// Función para generar PDF simple con QR codes en grid
async function generateSimpleQrPdf(qrs: any[]): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  
  // Configuración de layout
  const qrSize = 150; // tamaño del QR en puntos
  const margin = 50; // margen en puntos
  const cols = 3; // QR por fila
  const rows = 4; // filas por página
  const spacing = 20; // espacio entre QR
  
  // Dimensiones de página A4
  const pageWidth = 595; // A4 width in points
  const pageHeight = 842; // A4 height in points
  
  // Calcular posiciones
  const totalPerPage = cols * rows;
  const pages = Math.ceil(qrs.length / totalPerPage);
  
  for (let pageIndex = 0; pageIndex < pages; pageIndex++) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    const startIndex = pageIndex * totalPerPage;
    const endIndex = Math.min(startIndex + totalPerPage, qrs.length);
    const pageQrs = qrs.slice(startIndex, endIndex);
    
    for (let i = 0; i < pageQrs.length; i++) {
      const qr = pageQrs[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      
      // Generar QR como PNG buffer
      const redeemUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/sorteos-qr/${qr.code}`;
      const qrBuffer = await generateQrPngBuffer(redeemUrl, qrSize * 2); // generar a mayor resolución
      
      // Insertar QR en PDF
      const qrImage = await pdfDoc.embedPng(qrBuffer);
      
      const x = margin + col * (qrSize + spacing);
      const y = pageHeight - margin - (row + 1) * (qrSize + spacing) + spacing;
      
      page.drawImage(qrImage, {
        x,
        y,
        width: qrSize,
        height: qrSize
      });
      
      // Agregar texto debajo del QR
      const fontSize = 8;
      const textY = y - 15;
      
      // Nombre del cliente
      page.drawText(qr.customerName, {
        x: x,
        y: textY,
        size: fontSize,
        maxWidth: qrSize
      });
      
      // Código
      page.drawText(qr.code, {
        x: x,
        y: textY - 12,
        size: fontSize - 1,
        maxWidth: qrSize
      });
      
      // Estado
      let statusText = 'Activo';
      if (qr.redeemedAt) statusText = 'Redimido';
      else if (qr.revokedAt) statusText = 'Revocado';
      else if (qr.expiresAt && new Date(qr.expiresAt) < new Date()) statusText = 'Expirado';
      
      page.drawText(statusText, {
        x: x,
        y: textY - 24,
        size: fontSize - 1,
        maxWidth: qrSize
      });
    }
  }
  
  return Buffer.from(await pdfDoc.save());
}

// Función auxiliar para generar QR como PNG buffer
async function generateQrPngBuffer(url: string, size: number): Promise<Buffer> {
  const QRCode = (await import('qrcode')).default;
  
  return new Promise((resolve, reject) => {
    QRCode.toBuffer(url, {
      type: 'png',
      width: size,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    }, (err, buffer) => {
      if (err) reject(err);
      else resolve(buffer);
    });
  });
}