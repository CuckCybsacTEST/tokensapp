import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { initTestDb } from '@/lib/setupTestDb';
import { createUserSessionCookie } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
// Important: don't statically import the route so it picks up the test prisma after init

let prisma: PrismaClient;
let serverUrl = 'http://localhost:3000';

async function seedBatchWithTokens(batchId: string, count: number) {
  await prisma.token.deleteMany({});
  await prisma.batch.deleteMany({});
  await prisma.prize.deleteMany({});
  await prisma.batch.create({ data: { id: batchId, description: 'test' } });
  await prisma.prize.create({ data: { id: 'p1', key: 'p1', label: 'P1', active: true, emittedTotal: 0 } });
  const expiresAt = new Date(Date.now() + 60_000);
  if (count > 0) {
    await prisma.token.createMany({ data: Array.from({ length: count }).map((_, i) => ({
      id: `t${i + 1}`,
      prizeId: 'p1',
      batchId,
      expiresAt,
      signature: 'sig',
      signatureVersion: 1,
      disabled: false,
    })) });
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

  // Ajuste: createUserSessionCookie espera (userId, role). Para tests podemos usar un id ficticio.
  const cookie = await createUserSessionCookie('test-admin', 'ADMIN');
    const { GET: printControlGet } = await import('@/app/api/print/control/pdf/route');
    const req = new Request(`http://localhost/api/print/control/pdf?batchId=${batchId}&templateId=${templateId}`, { 
      method: 'GET', 
  // Ajustamos el nombre de la cookie a user_session (nuevo esquema unificado)
  headers: { cookie: `user_session=${cookie}` } 
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

    const adminCookie = await createUserSessionCookie('test-admin', 'ADMIN');
    const { GET: printControlGet } = await import('@/app/api/print/control/pdf/route');
    const req = new Request(`http://localhost/api/print/control/pdf?batchId=${batchId}&templateId=${templateId}&maxTokens=5`, {
      method: 'GET',
      headers: { cookie: `user_session=${adminCookie}` }
    });
    
    const res = await printControlGet(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Tokens-Requested')).toBe('10');
  });

  it('should return 404 if batch not found', async () => {
    const batchId = 'nonexistent';
    const templateId = 'template4';
    await seedTemplate(templateId);

    const adminCookie = await createUserSessionCookie('test-admin', 'ADMIN');
    const { GET: printControlGet } = await import('@/app/api/print/control/pdf/route');
    const req = new Request(`http://localhost/api/print/control/pdf?batchId=${batchId}&templateId=${templateId}`, {
      method: 'GET',
      headers: { cookie: `user_session=${adminCookie}` }
    });
    
    const res = await printControlGet(req);
    expect(res.status).toBe(404);
  });

  it('should return 404 if template not found', async () => {
    const batchId = 'batch5';
    const templateId = 'nonexistent';
    await seedBatchWithTokens(batchId, 5);

    const adminCookie = await createUserSessionCookie('test-admin', 'ADMIN');
    const { GET: printControlGet } = await import('@/app/api/print/control/pdf/route');
    const req = new Request(`http://localhost/api/print/control/pdf?batchId=${batchId}&templateId=${templateId}`, {
      method: 'GET',
      headers: { cookie: `user_session=${adminCookie}` }
    });
    
    const res = await printControlGet(req);
    expect(res.status).toBe(404);
  });
});
