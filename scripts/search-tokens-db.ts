#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const targetTokens = [
  'rt_6161098154FA9327',
  'rt_79582A5AB6171929',
  'rt_A3A30E6F3CF9A8B6',
  'rt_7F5FFBDFDB1FE88B',
  'rt_D1702DAFA1453B0B',
  'rt_7118A0B1D9009750',
  'rt_8C514CFADE9FC66F',
  'rt_79169395BB23E865',
  'rt_A323F48C1C9B3DE0',
  'rt_D5BB62E74EF262C8',
  'rt_E6E60B5F92F4AA13',
  'rt_7A4B68343420C834'
];

async function searchTokensInDatabase() {
  console.log('🔍 Buscando tokens en todas las tablas...\n');

  try {
    // Buscar en ReusableToken por signature completa (con rt_)
    console.log('1. Buscando en ReusableToken con signature completa...');
    for (const token of targetTokens) {
      const found = await prisma.reusableToken.findFirst({
        where: { signature: token },
        select: { id: true, signature: true, expiresAt: true }
      });
      if (found) {
        console.log(`✅ Encontrado: ${token} -> Expira: ${found.expiresAt.toISOString().split('T')[0]}`);
      }
    }

    // Buscar en Token por cualquier campo que contenga rt_
    console.log('\n2. Buscando en Token por campos que contengan "rt_"...');
    const tokenFields = ['id', 'qrCode', 'signature', 'shortCode'] as const;

    for (const field of tokenFields) {
      for (const token of targetTokens) {
        try {
          const whereClause = { [field]: { contains: token } };
          const found = await prisma.token.findFirst({
            where: whereClause,
            select: { id: true, [field]: true, expiresAt: true }
          });
          if (found) {
            console.log(`✅ Encontrado en Token.${field}: ${token} -> Expira: ${found.expiresAt?.toISOString().split('T')[0] || 'N/A'}`);
          }
        } catch (error) {
          // Ignorar errores de campos que no existen
        }
      }
    }

    // Buscar en cualquier tabla que tenga expiresAt
    console.log('\n3. Buscando tokens con expiración 19/1/2026...');
    const tokensWithExpiry = await prisma.reusableToken.findMany({
      where: {
        expiresAt: {
          gte: new Date('2026-01-19T00:00:00Z'),
          lt: new Date('2026-01-20T00:00:00Z')
        }
      },
      select: { id: true, signature: true, expiresAt: true },
      take: 20
    });

    console.log(`📊 Tokens con expiración 19/1/2026: ${tokensWithExpiry.length}`);
    tokensWithExpiry.forEach(token => {
      console.log(`   ${token.signature} -> ${token.expiresAt.toISOString().split('T')[0]}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

searchTokensInDatabase();