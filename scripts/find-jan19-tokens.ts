#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findTokensExpiringJan19() {
  console.log('🔍 Buscando todos los tokens que expiran el 19/1/2026...\n');

  try {
    // Buscar en ReusableToken
    const reusableTokens = await prisma.reusableToken.findMany({
      where: {
        expiresAt: {
          gte: new Date('2026-01-19T00:00:00Z'),
          lt: new Date('2026-01-20T00:00:00Z')
        }
      },
      select: {
        id: true,
        signature: true,
        expiresAt: true,
        prizeId: true,
        disabled: true
      }
    });

    console.log(`📊 ReusableToken con expiración 19/1/2026: ${reusableTokens.length}`);
    reusableTokens.forEach(token => {
      console.log(`   ${token.signature} -> ${token.expiresAt.toISOString().split('T')[0]} (ID: ${token.id})`);
    });

    // Buscar en Token regular
    const regularTokens = await prisma.token.findMany({
      where: {
        expiresAt: {
          gte: new Date('2026-01-19T00:00:00Z'),
          lt: new Date('2026-01-20T00:00:00Z')
        }
      },
      select: {
        id: true,
        signature: true,
        expiresAt: true
      }
    });

    console.log(`\n📊 Token regular con expiración 19/1/2026: ${regularTokens.length}`);
    regularTokens.forEach(token => {
      console.log(`   ${token.signature} -> ${token.expiresAt?.toISOString().split('T')[0] || 'N/A'} (ID: ${token.id})`);
    });

    // Mostrar todos los tokens que contienen alguna de las signatures buscadas
    const targetSignatures = [
      '6161098154FA9327',
      '79582A5AB6171929',
      'A3A30E6F3CF9A8B6',
      '7F5FFBDFDB1FE88B',
      'D1702DAFA1453B0B',
      '7118A0B1D9009750',
      '8C514CFADE9FC66F',
      '79169395BB23E865',
      'A323F48C1C9B3DE0',
      'D5BB62E74EF262C8',
      'E6E60B5F92F4AA13',
      '7A4B68343420C834'
    ];

    console.log('\n🔍 Buscando signatures específicas en cualquier tabla...');
    let foundInReusable = 0;
    let foundInRegular = 0;

    for (const sig of targetSignatures) {
      // Buscar en ReusableToken
      const reusable = await prisma.reusableToken.findFirst({
        where: { signature: sig },
        select: { id: true, signature: true, expiresAt: true }
      });

      if (reusable) {
        foundInReusable++;
        console.log(`✅ ReusableToken: ${sig} -> Expira: ${reusable.expiresAt.toISOString().split('T')[0]}`);
      }

      // Buscar en Token
      const regular = await prisma.token.findFirst({
        where: { signature: sig },
        select: { id: true, signature: true, expiresAt: true }
      });

      if (regular) {
        foundInRegular++;
        console.log(`✅ Token: ${sig} -> Expira: ${regular.expiresAt?.toISOString().split('T')[0] || 'N/A'}`);
      }
    }

    console.log(`\n📊 Resumen de búsqueda específica:`);
    console.log(`   Encontrados en ReusableToken: ${foundInReusable}/12`);
    console.log(`   Encontrados en Token: ${foundInRegular}/12`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findTokensExpiringJan19();