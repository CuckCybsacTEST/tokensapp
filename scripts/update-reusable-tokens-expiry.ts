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

async function checkAndUpdateTokens() {
  console.log('🔍 Buscando tokens específicos...\n');

  const currentExpiry = new Date('2026-01-20');
  const newExpiry = new Date('2026-02-28');

  console.log(`📅 Fecha de expiración actual esperada: ${currentExpiry.toISOString().split('T')[0]}`);
  console.log(`📅 Nueva fecha de expiración: ${newExpiry.toISOString().split('T')[0]}\n`);

  let foundCount = 0;
  let updatedCount = 0;

  for (const tokenId of targetTokens) {
    try {
      // Buscar por ID
      const token = await prisma.reusableToken.findUnique({
        where: { id: tokenId },
        select: {
          id: true,
          signature: true,
          expiresAt: true,
          prizeId: true,
          disabled: true
        }
      });

      if (token) {
        foundCount++;
        console.log(`✅ Token encontrado: ${tokenId}`);
        console.log(`   Signature: ${token.signature}`);
        console.log(`   Expira: ${token.expiresAt.toISOString().split('T')[0]}`);
        console.log(`   Deshabilitado: ${token.disabled}`);

        // Verificar si la fecha actual es 20/1/2026
        const tokenExpiryDate = new Date(token.expiresAt);
        const isCurrentExpiry = tokenExpiryDate.toISOString().split('T')[0] === '2026-01-20';

        if (isCurrentExpiry) {
          console.log(`   ✅ Fecha correcta, actualizando...`);

          // Actualizar la fecha de expiración
          await prisma.reusableToken.update({
            where: { id: token.id },
            data: { expiresAt: newExpiry }
          });

          updatedCount++;
          console.log(`   ✅ Actualizado a: ${newExpiry.toISOString().split('T')[0]}`);
        } else {
          console.log(`   ⚠️ Fecha no coincide con 20/1/2026 (expira: ${tokenExpiryDate.toISOString().split('T')[0]}), saltando...`);
        }

        console.log('');
      } else {
        console.log(`❌ Token NO encontrado: ${tokenId}\n`);
      }

    } catch (error) {
      console.error(`❌ Error procesando token ${tokenId}:`, error);
    }
  }

  console.log('📊 Resumen:');
  console.log(`   Encontrados: ${foundCount}/${targetTokens.length}`);
  console.log(`   Actualizados: ${updatedCount}/${foundCount}`);
}

checkAndUpdateTokens()
  .catch(console.error)
  .finally(() => prisma.$disconnect());