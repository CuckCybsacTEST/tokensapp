import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;

    // Buscar el show por slug
    const show = await prisma.show.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        startsAt: true,
        endsAt: true,
        slot: true,
        imageWebpPath: true,
        imageBlurData: true,
        width: true,
        height: true,
        bytesOriginal: true,
        bytesOptimized: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        details: true,
        notes: true,
        specialGuests: true,
      }
    });

    if (!show) {
      return NextResponse.json(
        { error: 'Show not found' },
        { status: 404 }
      );
    }

    // Verificar que el show esté publicado
    if (show.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Show not available' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      show
    });

  } catch (error: any) {
    console.error('Error fetching show by slug:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}