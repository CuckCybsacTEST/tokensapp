import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateQrPngDataUrl } from '@/lib/qr';
import { headers } from 'next/headers';

export async function GET(req: NextRequest, { params }: { params: { tokenId: string } }) {
  try {
    const tokenId = params.tokenId;

    // Verify token exists and is reusable
    const token = await prisma.token.findUnique({
      where: { id: tokenId },
      include: {
        batch: { select: { isReusable: true } }
      }
    });

    if (!token || !token.batch.isReusable) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    // Get the base URL from the request headers
    const headersList = headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = headersList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const baseUrl = `${protocol}://${host}`;

    const qrUrl = `${baseUrl}/reusable/${tokenId}`;
    const qrDataUrl = await generateQrPngDataUrl(qrUrl);

    // Convert data URL to buffer
    const base64Data = qrDataUrl.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error generating QR:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}