#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSpecificToken() {
  console.log('🔍 Verificando token específico: rt_E6E60B5F92F4AA13\n');

  const tokenSignature = 'E6E60B5F92F4AA13'; // Sin el prefijo rt_

  try {
    // Buscar en ReusableToken
    console.log('1. Buscando en ReusableToken...');
    const reusableToken = await prisma.reusableToken.findFirst({
      where: { signature: tokenSignature },
      select: {
        id: true,
        signature: true,
        expiresAt: true,
        prizeId: true,
        disabled: true,
        createdAt: true,
        prize: {
          select: {
            id: true,
            key: true,
            label: true,
            description: true
          }
        }
      }
    });

    if (reusableToken) {
      console.log('✅ Token encontrado en ReusableToken:');
      console.log(`   ID: ${reusableToken.id}`);
      console.log(`   Signature: ${reusableToken.signature}`);
      console.log(`   Expira: ${reusableToken.expiresAt.toISOString().split('T')[0]}`);
      console.log(`   Creado: ${reusableToken.createdAt.toISOString().split('T')[0]}`);
      console.log(`   Deshabilitado: ${reusableToken.disabled}`);
      console.log(`   Prize ID: ${reusableToken.prizeId}`);
      console.log(`   Prize Name: ${reusableToken.prize?.label || 'N/A'}`);

      // Verificar si expira el 19/1/2026
      const expiryDate = reusableToken.expiresAt.toISOString().split('T')[0];
      if (expiryDate === '2026-01-19') {
        console.log('   ✅ Expira el 19/1/2026 - CANDIDATO PARA ACTUALIZACIÓN');

        // Actualizar a 28/02/2026
        const newExpiry = new Date('2026-02-28');
        await prisma.reusableToken.update({
          where: { id: reusableToken.id },
          data: { expiresAt: newExpiry }
        });

        console.log(`   ✅ ACTUALIZADO: Nueva expiración ${newExpiry.toISOString().split('T')[0]}`);
      } else {
        console.log(`   ⚠️ No expira el 19/1/2026 (expira: ${expiryDate})`);
      }
    } else {
      console.log('❌ Token NO encontrado en ReusableToken');
    }

    // Buscar en Token regular también
    console.log('\n2. Buscando en Token regular...');
    const regularToken = await prisma.token.findFirst({
      where: { signature: tokenSignature },
      select: {
        id: true,
        signature: true,
        expiresAt: true,
        prizeId: true,
        disabled: true
      }
    });

    if (regularToken) {
      console.log('✅ Token encontrado en Token regular:');
      console.log(`   ID: ${regularToken.id}`);
      console.log(`   Signature: ${regularToken.signature}`);
      console.log(`   Expira: ${regularToken.expiresAt?.toISOString().split('T')[0] || 'N/A'}`);
      console.log(`   Deshabilitado: ${regularToken.disabled}`);
    } else {
      console.log('❌ Token NO encontrado en Token regular');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSpecificToken();