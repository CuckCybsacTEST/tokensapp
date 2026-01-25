#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function searchAllTokens() {
  console.log('🔍 Búsqueda amplia de tokens con "rt_"...\n');

  try {
    // Buscar en todas las tablas posibles cualquier campo que contenga "rt_"
    const tables = [
      'token',
      'reusableToken',
      'prize',
      'reusablePrize'
    ];

    for (const table of tables) {
      console.log(`\n📋 Buscando en tabla: ${table}`);

      try {
        // Intentar búsqueda genérica
        const records = await (prisma as any)[table].findMany({
          where: {
            OR: [
              { signature: { contains: 'rt_' } },
              { qrCode: { contains: 'rt_' } },
              { shortCode: { contains: 'rt_' } },
              { id: { contains: 'rt_' } }
            ].filter(condition => Object.keys(condition)[0] in (prisma as any)[table].fields || true)
          },
          select: {
            id: true,
            signature: true,
            qrCode: true,
            shortCode: true,
            expiresAt: true
          },
          take: 10
        });

        if (records.length > 0) {
          console.log(`✅ Encontrados ${records.length} registros:`);
          records.forEach(record => {
            console.log(`   ID: ${record.id}`);
            console.log(`   Signature: ${record.signature || 'N/A'}`);
            console.log(`   QR: ${record.qrCode || 'N/A'}`);
            console.log(`   ShortCode: ${record.shortCode || 'N/A'}`);
            console.log(`   Expira: ${record.expiresAt?.toISOString().split('T')[0] || 'N/A'}`);
            console.log('');
          });
        } else {
          console.log(`❌ No se encontraron registros con "rt_"`);
        }

      } catch (error) {
        console.log(`❌ Error en tabla ${table}: ${error.message}`);
      }
    }

    // Buscar tokens que expiren en enero 2026
    console.log('\n📅 Buscando tokens que expiren en enero 2026...');
    const jan2026Tokens = await prisma.reusableToken.findMany({
      where: {
        expiresAt: {
          gte: new Date('2026-01-01'),
          lt: new Date('2026-02-01')
        }
      },
      select: { id: true, signature: true, expiresAt: true },
      take: 20
    });

    console.log(`📊 Tokens que expiran en enero 2026: ${jan2026Tokens.length}`);
    jan2026Tokens.forEach(token => {
      console.log(`   ${token.signature} -> ${token.expiresAt.toISOString().split('T')[0]}`);
    });

  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await prisma.$disconnect();
  }
}

searchAllTokens();