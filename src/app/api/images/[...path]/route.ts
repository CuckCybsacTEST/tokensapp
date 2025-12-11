import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filePath = params.path.join('/');
    console.log('Image request for path:', filePath);
    // Si la path no incluye 'qr-images', agregarlo para compatibilidad con URLs antiguas
    const adjustedPath = filePath.startsWith('qr-images/') ? filePath : `qr-images/${filePath}`;
    console.log('Adjusted path:', adjustedPath);
    const fullPath = path.join(process.cwd(), 'public', 'uploads', adjustedPath);
    console.log('Full filesystem path:', fullPath);

    // Verificar que el path esté dentro de public/uploads
    const normalizedPath = path.normalize(fullPath);
    const uploadsDir = path.normalize(path.join(process.cwd(), 'public', 'uploads'));

    if (!normalizedPath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Verificar que el archivo existe
    try {
      await fs.access(fullPath);
      console.log('File exists at:', fullPath);
    } catch (error) {
      console.error('File not found at:', fullPath, error);
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Leer el archivo
    const fileBuffer = await fs.readFile(fullPath);

    // Determinar el content-type basado en la extensión
    const ext = path.extname(fullPath).toLowerCase();
    let contentType = 'application/octet-stream';

    if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.gif') contentType = 'image/gif';

    // Retornar el archivo con headers apropiados
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (error) {
    console.error('Error serving image:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}