import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateQrPngDataUrl } from '@/lib/qr';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { tokenId: string } }) {
  try {
    const tokenId = params.tokenId;

    // Check if it's a reusable token (starts with 'rt_')
    let qrUrl: string;
    if (tokenId.startsWith('rt_')) {
      // It's a reusable token - check ReusableToken table
      const reusableToken = await prisma.reusableToken.findUnique({
        where: { id: tokenId },
        select: { id: true }
      });

      if (!reusableToken) {
        return NextResponse.json({ error: 'Token not found' }, { status: 404 });
      }

      // Use QR base URL if defined, otherwise construct from headers
      const qrBaseUrl = process.env.NEXT_PUBLIC_QR_BASE_URL;
      let baseUrl: string;
      if (qrBaseUrl) {
        baseUrl = qrBaseUrl;
      } else {
        const headersList = headers();
        const host = headersList.get('host') || 'localhost:3000';
        const protocol = headersList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
        baseUrl = `${protocol}://${host}`;
      }

      qrUrl = `${baseUrl}/reusable/${tokenId}`;
    } else {
      // It's a regular token - check Token table
      const token = await prisma.token.findUnique({
        where: { id: tokenId },
        include: {
          batch: { select: { isReusable: true } }
        }
      });

      if (!token || !token.batch?.isReusable) {
        return NextResponse.json({ error: 'Token not found' }, { status: 404 });
      }

      // Use QR base URL if defined, otherwise construct from headers
      const qrBaseUrl = process.env.NEXT_PUBLIC_QR_BASE_URL;
      let baseUrl: string;
      if (qrBaseUrl) {
        baseUrl = qrBaseUrl;
      } else {
        const headersList = headers();
        const host = headersList.get('host') || 'localhost:3000';
        const protocol = headersList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
        baseUrl = `${protocol}://${host}`;
      }

      qrUrl = `${baseUrl}/r/${tokenId}`;
    }
    const qrDataUrl = await generateQrPngDataUrl(qrUrl);

    // Convert data URL to buffer
    const base64Data = qrDataUrl.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': process.env.NODE_ENV === 'development' ? 'no-cache' : 'public, max-age=3600', // No cache in development
      },
    });
  } catch (error) {
    console.error('Error generating QR:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}