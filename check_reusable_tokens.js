import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkReusableTokens() {
  console.log('🔍 Revisando tokens reusables existentes...\n');

  try {
    // Buscar tokens reusables (id empieza con 'rt_')
    const reusableTokens = await prisma.token.findMany({
      where: {
        id: {
          startsWith: 'rt_'
        }
      },
      select: {
        id: true,
        expiresAt: true,
        createdAt: true,
        startTime: true,
        endTime: true,
        batchId: true,
        batch: {
          select: {
            description: true,
            createdAt: true,
            isReusable: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Encontrados ${reusableTokens.length} tokens reusables:\n`);

    reusableTokens.forEach((token, index) => {
      console.log(`${index + 1}. Token: ${token.id}`);
      console.log(`   Creado: ${token.createdAt?.toISOString()}`);
      console.log(`   Expira: ${token.expiresAt?.toISOString()}`);
      if (token.startTime) {
        console.log(`   Inicio: ${token.startTime?.toISOString()}`);
      }
      if (token.endTime) {
        console.log(`   Fin:    ${token.endTime?.toISOString()}`);
      }
      console.log(`   Batch:  ${token.batchId} (${token.batch?.description})`);
      console.log('');
    });

    // Analizar si las fechas parecen correctas
    console.log('🔧 Análisis de fechas:');
    const now = new Date();
    const limaOffset = -5 * 60; // UTC-5 en minutos

    reusableTokens.forEach(token => {
      if (token.expiresAt) {
        const expiresAt = token.expiresAt;
        const createdAt = token.createdAt || new Date();

        // Calcular diferencia en horas
        const diffHours = (expiresAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

        console.log(`Token ${token.id}:`);
        console.log(`  - Creado: ${createdAt.toISOString()}`);
        console.log(`  - Expira: ${expiresAt.toISOString()}`);
        console.log(`  - Diferencia: ${diffHours.toFixed(1)} horas`);

        // Verificar si parece ser zona horaria incorrecta
        // Si la expiración es exactamente a medianoche UTC, podría ser incorrecta
        if (expiresAt.getUTCHours() === 0 && expiresAt.getUTCMinutes() === 0 && expiresAt.getUTCSeconds() === 0) {
          console.log(`  ⚠️  POSIBLE ERROR: Expira a medianoche UTC (${expiresAt.toISOString()})`);
          console.log(`     Esto sugiere que se calculó sin zona horaria Lima`);
        } else {
          console.log(`  ✅ Parece correcto`);
        }
        console.log('');
      }
    });

  } catch (error) {
    console.error('❌ Error al consultar tokens:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkReusableTokens();