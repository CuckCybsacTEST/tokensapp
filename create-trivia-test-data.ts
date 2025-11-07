import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTriviaTestData() {
  try {
    console.log('Creando datos de prueba para trivia...');

    // Crear set de preguntas
    const questionSet = await prisma.triviaQuestionSet.create({
      data: {
        id: 'test-set-1',
        name: 'Trivia de Conocimientos Generales',
        description: 'Preguntas sobre cultura general y conocimientos básicos',
        active: true,
      },
    });

    console.log('Set de preguntas creado:', questionSet.name);

    // Crear preguntas
    const questions = await Promise.all([
      prisma.triviaQuestion.create({
        data: {
          id: 'q1',
          questionSetId: questionSet.id,
          question: '¿Cuál es la capital de Francia?',
          active: true,
          order: 1,
          answers: {
            create: [
              { id: 'a1-1', answer: 'París', isCorrect: true },
              { id: 'a1-2', answer: 'Londres', isCorrect: false },
              { id: 'a1-3', answer: 'Madrid', isCorrect: false },
              { id: 'a1-4', answer: 'Roma', isCorrect: false },
            ],
          },
        },
      }),
      prisma.triviaQuestion.create({
        data: {
          id: 'q2',
          questionSetId: questionSet.id,
          question: '¿Cuántos planetas tiene el sistema solar?',
          active: true,
          order: 2,
          answers: {
            create: [
              { id: 'a2-1', answer: '8', isCorrect: true },
              { id: 'a2-2', answer: '9', isCorrect: false },
              { id: 'a2-3', answer: '7', isCorrect: false },
              { id: 'a2-4', answer: '10', isCorrect: false },
            ],
          },
        },
      }),
      prisma.triviaQuestion.create({
        data: {
          id: 'q3',
          questionSetId: questionSet.id,
          question: '¿Quién escribió "Don Quijote de la Mancha"?',
          active: true,
          order: 3,
          answers: {
            create: [
              { id: 'a3-1', answer: 'Miguel de Cervantes', isCorrect: true },
              { id: 'a3-2', answer: 'Gabriel García Márquez', isCorrect: false },
              { id: 'a3-3', answer: 'Pablo Neruda', isCorrect: false },
              { id: 'a3-4', answer: 'Jorge Luis Borges', isCorrect: false },
            ],
          },
        },
      }),
    ]);

    console.log(`${questions.length} preguntas creadas`);

    // Crear premios
    const prizes = await Promise.all([
      prisma.triviaPrize.create({
        data: {
          id: 'prize-1',
          questionSetId: questionSet.id,
          name: 'Descuento 20% en consumición',
          description: 'Vale por un descuento del 20% en cualquier consumición',
          qrCode: 'TRIVIA-DESC20',
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
          active: true,
        },
      }),
      prisma.triviaPrize.create({
        data: {
          id: 'prize-2',
          questionSetId: questionSet.id,
          name: 'Entrada gratis al próximo evento',
          description: 'Entrada gratuita para el próximo evento especial',
          qrCode: 'TRIVIA-FREE',
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
          active: true,
        },
      }),
    ]);

    console.log(`${prizes.length} premios creados`);

    console.log('✅ Datos de prueba creados exitosamente!');
    console.log('Ahora puedes probar la trivia en http://localhost:3003/trivia');

  } catch (error) {
    console.error('Error creando datos de prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTriviaTestData();
