import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugTriviaAPI() {
  try {
    console.log('🔍 Depurando API de trivia...\n');

    // 1. Verificar conexión a BD
    console.log('1. Verificando conexión a base de datos...');
    await prisma.$connect();
    console.log('✅ Conexión exitosa\n');

    // 2. Contar registros totales
    console.log('2. Conteo de registros:');
    const counts = await Promise.all([
      prisma.triviaQuestionSet.count(),
      prisma.triviaQuestion.count(),
      prisma.triviaAnswer.count(),
      prisma.triviaPrize.count()
    ]);

    console.log(`   - Sets de preguntas: ${counts[0]}`);
    console.log(`   - Preguntas: ${counts[1]}`);
    console.log(`   - Respuestas: ${counts[2]}`);
    console.log(`   - Premios: ${counts[3]}\n`);

    // 3. Verificar sets activos
    console.log('3. Sets de preguntas activos:');
    const activeSets = await prisma.triviaQuestionSet.findMany({
      where: { active: true },
      include: {
        _count: {
          select: {
            questions: { where: { active: true } },
            prizes: true
          }
        }
      }
    });

    if (activeSets.length === 0) {
      console.log('❌ No hay sets activos\n');

      // Mostrar todos los sets para depuración
      console.log('4. Todos los sets (incluyendo inactivos):');
      const allSets = await prisma.triviaQuestionSet.findMany({
        include: {
          _count: {
            select: {
              questions: true,
              prizes: true
            }
          }
        }
      });

      allSets.forEach(set => {
        console.log(`   - ${set.name} (ID: ${set.id})`);
        console.log(`     Activo: ${set.active}`);
        console.log(`     Preguntas: ${set._count.questions}`);
        console.log(`     Premios: ${set._count.prizes}`);
        console.log(`     Creado: ${set.createdAt}`);
      });

      if (allSets.length > 0) {
        console.log('\n💡 Sugerencia: Activa los sets usando la interfaz de administración');
      }

    } else {
      console.log(`✅ Encontrados ${activeSets.length} sets activos:`);
      activeSets.forEach(set => {
        console.log(`   - ${set.name}`);
        console.log(`     Preguntas activas: ${set._count.questions}`);
        console.log(`     Premios: ${set._count.prizes}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugTriviaAPI();
