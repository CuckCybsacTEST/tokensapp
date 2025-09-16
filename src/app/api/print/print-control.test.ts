import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { initTestDb } from '@/test/setupTestDb';
import { createSessionCookie } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
// Important: don't statically import the route so it picks up the test prisma after init

let prisma: PrismaClient;
let serverUrl = 'http://localhost:3000';

async function seedBatchWithTokens(batchId: string, count: number) {
  await prisma.$executeRawUnsafe(`DELETE FROM Prize;`);
  await prisma.$executeRawUnsafe(`DELETE FROM Batch;`);
  await prisma.$executeRawUnsafe(`DELETE FROM Token;`);
  await prisma.$executeRawUnsafe(`INSERT INTO Batch (id, description) VALUES (?, 'test');`, batchId);
  const expiresAt = new Date(Date.now() + 60_000).toISOString();
  await prisma.$executeRawUnsafe(`INSERT INTO Prize (id,key,label,active,emittedTotal) VALUES (?,?,?,1,0);`, 'p1', 'p1', 'P1');
  for (let i = 0; i < count; i++) {
    const tokenId = `t${i + 1}`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO Token (id,prizeId,batchId,expiresAt,signature,signatureVersion) VALUES (?,?,?,?,?,1);`,
      tokenId, 'p1', batchId, expiresAt, 'sig'
    );
  }
}

async function seedTemplate(templateId: string) {
  // Asegurar que existe un template para las pruebas
  const templatePath = 'public/templates/default.png';
  // Crear el directorio si no existe
  const templateDir = path.resolve(process.cwd(), 'public/templates');
  if (!fs.existsSync(templateDir)) {
    fs.mkdirSync(templateDir, { recursive: true });
  }
  // Crear un archivo de imagen básico si no existe
  const fullPath = path.resolve(process.cwd(), templatePath);
  if (!fs.existsSync(fullPath)) {
    // Crear una imagen PNG básica de prueba (1x1 blanco)
    const png1x1 = Buffer.from(
      '89504E470D0A1A0A0000000D4948445200000001000000010802000000907724' +
      '0000000A49444154789C6360000002000154A24F650000000049454E44AE426082',
      'hex'
    );
    fs.writeFileSync(fullPath, new Uint8Array(png1x1));
  }
  
  // Crear template en la base de datos
  await prisma.printTemplate.upsert({
    where: { id: templateId },
    update: {
      name: 'Test Template',
      filePath: templatePath,
      meta: JSON.stringify({
        dpi: 300,
        cols: 1,
        rows: 8,
        qr: { xMm: 150, yMm: 230, widthMm: 30, rotationDeg: 0 }
      })
    },
    create: {
      id: templateId,
      name: 'Test Template',
      filePath: templatePath,
      meta: JSON.stringify({
        dpi: 300,
        cols: 1,
        rows: 8,
        qr: { xMm: 150, yMm: 230, widthMm: 30, rotationDeg: 0 }
      })
    }
  });
}

beforeAll(async () => {
  prisma = await initTestDb('prisma/test_print_control.db');
  // Assign to global for endpoint code that does lazy loading
  (global as any)._prisma = prisma;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Print Control PDF', () => {
  it('should require authentication', async () => {
    const batchId = 'batch1';
    const templateId = 'template1';
    await seedBatchWithTokens(batchId, 5);
    await seedTemplate(templateId);
    
  const { GET: printControlGet } = await import('@/app/api/print/control/pdf/route');
  const req = new Request(`http://localhost/api/print/control/pdf?batchId=${batchId}&templateId=${templateId}`, { method: 'GET' });
  const res = await printControlGet(req);
    expect(res.status).toBe(401);
  });

  it('should generate a PDF for an admin user', async () => {
    const batchId = 'batch2';
    const templateId = 'template2';
    await seedBatchWithTokens(batchId, 5);
    await seedTemplate(templateId);

    const cookie = await createSessionCookie({ role: 'ADMIN', email: 'test@example.com' });
    const { GET: printControlGet } = await import('@/app/api/print/control/pdf/route');
    const req = new Request(`http://localhost/api/print/control/pdf?batchId=${batchId}&templateId=${templateId}`, { 
      method: 'GET', 
      headers: { cookie: `admin_session=${cookie}` } 
    });
    
    const res = await printControlGet(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    
    // Verificar que la respuesta es un PDF válido
    const buffer = await res.arrayBuffer();
    const pdf = await PDFDocument.load(buffer);
    expect(pdf.getPageCount()).toBeGreaterThan(0);
  });

  it('should limit tokens processed by maxTokens', async () => {
    const batchId = 'batch3';
    const templateId = 'template3';
    await seedBatchWithTokens(batchId, 10);
    await seedTemplate(templateId);

    const cookie = await createSessionCookie({ role: 'ADMIN', email: 'test@example.com' });
    const { GET: printControlGet } = await import('@/app/api/print/control/pdf/route');
    const req = new Request(`http://localhost/api/print/control/pdf?batchId=${batchId}&templateId=${templateId}&maxTokens=5`, { 
      method: 'GET', 
      headers: { cookie: `admin_session=${cookie}` } 
    });
    
    const res = await printControlGet(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Tokens-Processed')).toBe('5');
    expect(res.headers.get('X-Tokens-Requested')).toBe('10');
  });

  it('should return 404 if batch not found', async () => {
    const batchId = 'nonexistent';
    const templateId = 'template4';
    await seedTemplate(templateId);

    const cookie = await createSessionCookie({ role: 'ADMIN', email: 'test@example.com' });
    const { GET: printControlGet } = await import('@/app/api/print/control/pdf/route');
    const req = new Request(`http://localhost/api/print/control/pdf?batchId=${batchId}&templateId=${templateId}`, { 
      method: 'GET', 
      headers: { cookie: `admin_session=${cookie}` } 
    });
    
    const res = await printControlGet(req);
    expect(res.status).toBe(404);
  });

  it('should return 404 if template not found', async () => {
    const batchId = 'batch5';
    const templateId = 'nonexistent';
    await seedBatchWithTokens(batchId, 5);

    const cookie = await createSessionCookie({ role: 'ADMIN', email: 'test@example.com' });
    const { GET: printControlGet } = await import('@/app/api/print/control/pdf/route');
    const req = new Request(`http://localhost/api/print/control/pdf?batchId=${batchId}&templateId=${templateId}`, { 
      method: 'GET', 
      headers: { cookie: `admin_session=${cookie}` } 
    });
    
    const res = await printControlGet(req);
    expect(res.status).toBe(404);
  });
});
