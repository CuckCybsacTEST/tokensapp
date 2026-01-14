/**
 * API para gestión de preguntas de trivia
 * Solo accesible para staff
 */

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createTriviaSuccessResponse,
  createTriviaErrorResponse,
  handleTriviaValidationError,
  withTriviaErrorHandler,
  requireTriviaStaffAccess
} from "@/lib/trivia-api";
import { logTriviaEvent } from "@/lib/trivia-log";

const createQuestionSchema = z.object({
  questionSetId: z.string(),
  question: z.string().min(1, "La pregunta es requerida"),
  order: z.number().int().min(1, "El orden debe ser mayor a 0"),
  pointsForCorrect: z.number().int().min(0, "Los puntos deben ser mayor o igual a 0").default(10),
  pointsForIncorrect: z.number().int().default(0),
  active: z.boolean().default(true),
  answers: z.array(z.object({
    answer: z.string().min(1, "La respuesta es requerida"),
    isCorrect: z.boolean(),
    order: z.number().int().min(1, "El orden debe ser mayor a 0")
  })).min(2, "Debe haber al menos 2 respuestas").max(4, "No puede haber más de 4 respuestas")
});

const updateQuestionSchema = z.object({
  question: z.string().min(1, "La pregunta es requerida").optional(),
  order: z.number().int().min(1, "El orden debe ser mayor a 0").optional(),
  pointsForCorrect: z.number().int().min(0, "Los puntos deben ser mayor o igual a 0").optional(),
  pointsForIncorrect: z.number().int().optional(),
  active: z.boolean().optional(),
  answers: z.array(z.object({
    id: z.string().optional(), // Para actualizar respuestas existentes
    answer: z.string().min(1, "La respuesta es requerida"),
    isCorrect: z.boolean(),
    order: z.number().int().min(1, "El orden debe ser mayor a 0")
  })).min(2, "Debe haber al menos 2 respuestas").max(4, "No puede haber más de 4 respuestas").optional()
});

// GET /api/trivia/questions - Listar preguntas
export const GET = withTriviaErrorHandler(
  requireTriviaStaffAccess(async (req: Request) => {
    const url = new URL(req.url);
    const questionSetId = url.searchParams.get('questionSetId');
    const includeInactive = url.searchParams.get('includeInactive') === 'true';

    if (!questionSetId) {
      return createTriviaErrorResponse('VALIDATION_ERROR', 'Se requiere questionSetId', 400);
    }

    // Verificar que el question set existe
    const questionSet = await prisma.triviaQuestionSet.findUnique({
      where: { id: questionSetId }
    });

    if (!questionSet) {
      return createTriviaErrorResponse('QUESTION_SET_NOT_FOUND', 'Set de preguntas no encontrado', 404);
    }

    const questions = await prisma.triviaQuestion.findMany({
      where: {
        questionSetId,
        ...(includeInactive ? {} : { active: true })
      },
      include: {
        answers: {
          orderBy: { order: 'asc' }
        },
        _count: {
          select: {
            progress: true
          }
        }
      },
      orderBy: { order: 'asc' }
    });

    logTriviaEvent('questions_listed', `Listed ${questions.length} questions`, {
      questionSetId,
      count: questions.length,
      includeInactive
    });

    return createTriviaSuccessResponse({
      questionSet: {
        id: questionSet.id,
        name: questionSet.name
      },
      questions: questions.map(q => ({
        ...q,
        answerCount: q.answers.length,
        correctAnswerCount: q.answers.filter(a => a.isCorrect).length,
        attemptCount: q._count.progress
      }))
    });
  })
);

// POST /api/trivia/questions - Crear nueva pregunta
export const POST = withTriviaErrorHandler(
  requireTriviaStaffAccess(async (req: Request) => {
    const json = await req.json();
    const parsed = createQuestionSchema.safeParse(json);

    if (!parsed.success) {
      return handleTriviaValidationError(parsed.error);
    }

    const { questionSetId, question, order, pointsForCorrect, pointsForIncorrect, active, answers } = parsed.data;

    // Verificar que el question set existe
    const questionSet = await prisma.triviaQuestionSet.findUnique({
      where: { id: questionSetId }
    });

    if (!questionSet) {
      return createTriviaErrorResponse('QUESTION_SET_NOT_FOUND', 'Set de preguntas no encontrado', 404);
    }

    // Validar que haya exactamente una respuesta correcta
    const correctAnswers = answers.filter(a => a.isCorrect);
    if (correctAnswers.length !== 1) {
      return createTriviaErrorResponse(
        'VALIDATION_ERROR',
        'Debe haber exactamente una respuesta correcta',
        400
      );
    }

    // Verificar que no exista otra pregunta con el mismo orden en el set
    const existingOrder = await prisma.triviaQuestion.findFirst({
      where: {
        questionSetId,
        order
      }
    });

    if (existingOrder) {
      return createTriviaErrorResponse(
        'VALIDATION_ERROR',
        'Ya existe una pregunta con este orden en el set',
        409
      );
    }

    // Crear la pregunta y sus respuestas en una transacción
    const result = await prisma.$transaction(async (tx) => {
      const createdQuestion = await tx.triviaQuestion.create({
        data: {
          questionSetId,
          question,
          order,
          pointsForCorrect,
          pointsForIncorrect,
          active
        }
      });

      const createdAnswers = await Promise.all(
        answers.map(answerData =>
          tx.triviaAnswer.create({
            data: {
              questionId: createdQuestion.id,
              answer: answerData.answer,
              isCorrect: answerData.isCorrect,
              order: answerData.order
            }
          })
        )
      );

      return {
        question: createdQuestion,
        answers: createdAnswers
      };
    });

    logTriviaEvent('question_created', `Question "${result.question.question}" created`, {
      questionId: result.question.id,
      questionSetId,
      order,
      answerCount: answers.length
    });

    return createTriviaSuccessResponse({
      question: {
        ...result.question,
        answers: result.answers
      },
      message: 'Pregunta creada exitosamente'
    });
  })
);

// PUT /api/trivia/questions/[id] - Actualizar pregunta
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  return withTriviaErrorHandler(
    requireTriviaStaffAccess(async (req: Request) => {
      const { id } = params;
      const json = await req.json();
      const parsed = updateQuestionSchema.safeParse(json);

      if (!parsed.success) {
        return handleTriviaValidationError(parsed.error);
      }

      const updateData = parsed.data;

      // Verificar que la pregunta existe
      const existingQuestion = await prisma.triviaQuestion.findUnique({
        where: { id },
        include: {
          questionSet: true,
          answers: true
        }
      });

      if (!existingQuestion) {
        return createTriviaErrorResponse('INVALID_QUESTION_SET', 'Pregunta no encontrada', 404);
      }

      // Si se están actualizando las respuestas, validar que haya exactamente una correcta
      if (updateData.answers) {
        const correctAnswers = updateData.answers.filter(a => a.isCorrect);
        if (correctAnswers.length !== 1) {
          return createTriviaErrorResponse(
            'VALIDATION_ERROR',
            'Debe haber exactamente una respuesta correcta',
            400
          );
        }
      }

      // Si se está cambiando el orden, verificar que no exista otra pregunta con el mismo orden
      if (updateData.order && updateData.order !== existingQuestion.order) {
        const orderConflict = await prisma.triviaQuestion.findFirst({
          where: {
            questionSetId: existingQuestion.questionSetId,
            order: updateData.order,
            id: { not: id }
          }
        });

        if (orderConflict) {
          return createTriviaErrorResponse(
            'VALIDATION_ERROR',
            'Ya existe otra pregunta con este orden en el set',
            409
          );
        }
      }

      // Actualizar la pregunta y sus respuestas en una transacción
      const result = await prisma.$transaction(async (tx) => {
        const updatedQuestion = await tx.triviaQuestion.update({
          where: { id },
          data: {
            question: updateData.question,
            order: updateData.order,
            pointsForCorrect: updateData.pointsForCorrect,
            pointsForIncorrect: updateData.pointsForIncorrect,
            active: updateData.active
          }
        });

        // Si se están actualizando las respuestas, eliminar las existentes y crear las nuevas
        if (updateData.answers) {
          await tx.triviaAnswer.deleteMany({
            where: { questionId: id }
          });

          const updatedAnswers = await Promise.all(
            updateData.answers.map(answerData =>
              tx.triviaAnswer.create({
                data: {
                  questionId: id,
                  answer: answerData.answer,
                  isCorrect: answerData.isCorrect,
                  order: answerData.order
                }
              })
            )
          );

          return {
            question: updatedQuestion,
            answers: updatedAnswers
          };
        } else {
          // Si no se actualizan las respuestas, obtener las existentes
          const existingAnswers = await tx.triviaAnswer.findMany({
            where: { questionId: id },
            orderBy: { order: 'asc' }
          });

          return {
            question: updatedQuestion,
            answers: existingAnswers
          };
        }
      });

      logTriviaEvent('question_updated', `Question "${existingQuestion.question}" updated`, {
        questionId: id,
        questionSetId: existingQuestion.questionSetId,
        changes: {
          hasQuestionChange: !!updateData.question,
          hasOrderChange: !!updateData.order,
          hasPointsForCorrectChange: updateData.pointsForCorrect !== undefined,
          hasPointsForIncorrectChange: updateData.pointsForIncorrect !== undefined,
          hasActiveChange: updateData.active !== undefined,
          hasAnswersChange: !!updateData.answers
        }
      });

      return createTriviaSuccessResponse({
        question: {
          ...result.question,
          answers: result.answers
        },
        message: 'Pregunta actualizada exitosamente'
      });
    })
  )(req);
}

// DELETE /api/trivia/questions/[id] - Eliminar pregunta
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  return withTriviaErrorHandler(
    requireTriviaStaffAccess(async (req: Request) => {
      const { id } = params;

      // Verificar que la pregunta existe
      const question = await prisma.triviaQuestion.findUnique({
        where: { id },
        include: {
          questionSet: {
            select: {
              id: true,
              name: true
            }
          },
          progress: { take: 1 },
          answers: true
        }
      });

      if (!question) {
        return createTriviaErrorResponse('INVALID_QUESTION_SET', 'Pregunta no encontrada', 404);
      }

      // Verificar que no haya sido respondida por nadie
      if (question.progress.length > 0) {
        return createTriviaErrorResponse(
          'VALIDATION_ERROR',
          'No se puede eliminar una pregunta que ya ha sido respondida',
          409
        );
      }

      // Eliminar respuestas y luego la pregunta
      await prisma.triviaAnswer.deleteMany({
        where: { questionId: id }
      });

      await prisma.triviaQuestion.delete({
        where: { id }
      });

      logTriviaEvent('question_deleted', `Question "${question.question}" deleted`, {
        questionId: id,
        questionSetId: question.questionSet?.id || null,
        question: question.question,
        answersDeleted: question.answers.length
      });

      return createTriviaSuccessResponse({
        message: 'Pregunta eliminada exitosamente'
      });
    })
  )(req);
}
