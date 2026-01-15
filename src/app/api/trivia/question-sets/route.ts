/**
 * API para gestión de sets de preguntas de trivia
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

const createQuestionSetSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  regulationContent: z.string().optional(),
  active: z.boolean().default(true)
});

const updateQuestionSetSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").optional(),
  description: z.string().optional(),
  regulationContent: z.string().optional(),
  active: z.boolean().optional()
});

// GET /api/trivia/question-sets - Listar todos los question sets
export const GET = withTriviaErrorHandler(
  requireTriviaStaffAccess(async (req: Request) => {
    const url = new URL(req.url);
    const includeInactive = url.searchParams.get('includeInactive') === 'true';

    const questionSets = await prisma.triviaQuestionSet.findMany({
      where: includeInactive ? {} : { active: true },
      include: {
        questions: {
          where: { active: true },
          select: {
            id: true,
            question: true,
            order: true,
            active: true
          },
          orderBy: { order: 'asc' }
        },
        _count: {
          select: {
            questions: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calcular conteo de sesiones por question set
    const questionSetsWithCounts = await Promise.all(
      questionSets.map(async (set) => {
        const sessionCount = await prisma.triviaSession.count({
          where: {
            questionSetId: set.id
          }
        });

        return {
          ...set,
          questionCount: set._count.questions,
          sessionCount
        };
      })
    );

    logTriviaEvent('question_sets_listed', `Listed ${questionSets.length} question sets`, {
      count: questionSets.length,
      includeInactive
    });

    return createTriviaSuccessResponse({
      questionSets: questionSetsWithCounts
    });
  })
);

// POST /api/trivia/question-sets - Crear nuevo question set
export const POST = withTriviaErrorHandler(
  requireTriviaStaffAccess(async (req: Request) => {
    const json = await req.json();
    const parsed = createQuestionSetSchema.safeParse(json);

    if (!parsed.success) {
      return handleTriviaValidationError(parsed.error);
    }

    const { name, description, active } = parsed.data;

    // Verificar que no exista un set con el mismo nombre
    const existingSet = await prisma.triviaQuestionSet.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } }
    });

    if (existingSet) {
      return createTriviaErrorResponse(
        'VALIDATION_ERROR',
        'Ya existe un set de preguntas con este nombre',
        409
      );
    }

    const questionSet = await prisma.triviaQuestionSet.create({
      data: {
        name,
        description,
        active
      }
    });

    logTriviaEvent('question_set_created', `Question set "${questionSet.name}" created`, {
      questionSetId: questionSet.id,
      name: questionSet.name
    });

    return createTriviaSuccessResponse({
      questionSet,
      message: 'Set de preguntas creado exitosamente'
    });
  })
);

// PUT /api/trivia/question-sets/[id] - Actualizar question set
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  return withTriviaErrorHandler(
    requireTriviaStaffAccess(async (req: Request) => {
      const { id } = params;
      const json = await req.json();
      const parsed = updateQuestionSetSchema.safeParse(json);

      if (!parsed.success) {
        return handleTriviaValidationError(parsed.error);
      }

      const updateData = parsed.data;

      // Verificar que el set existe
      const existingSet = await prisma.triviaQuestionSet.findUnique({
        where: { id }
      });

      if (!existingSet) {
        return createTriviaErrorResponse('QUESTION_SET_NOT_FOUND', 'Set de preguntas no encontrado', 404);
      }

      // Si se está cambiando el nombre, verificar que no exista otro con el mismo nombre
      if (updateData.name && updateData.name !== existingSet.name) {
        const nameConflict = await prisma.triviaQuestionSet.findFirst({
          where: {
            name: { equals: updateData.name, mode: 'insensitive' },
            id: { not: id }
          }
        });

        if (nameConflict) {
          return createTriviaErrorResponse(
            'VALIDATION_ERROR',
            'Ya existe otro set de preguntas con este nombre',
            409
          );
        }
      }

      const updatedSet = await prisma.triviaQuestionSet.update({
        where: { id },
        data: updateData
      });

      logTriviaEvent('question_set_updated', `Question set "${existingSet.name}" updated`, {
        questionSetId: id,
        changes: updateData
      });

      return createTriviaSuccessResponse({
        questionSet: updatedSet,
        message: 'Set de preguntas actualizado exitosamente'
      });
    })
  )(req);
}

// DELETE /api/trivia/question-sets/[id] - Eliminar question set (solo si no tiene sesiones)
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  return withTriviaErrorHandler(
    requireTriviaStaffAccess(async (req: Request) => {
      const { id } = params;

      // Verificar que el set existe
      const questionSet = await prisma.triviaQuestionSet.findUnique({
        where: { id },
        include: {
          questions: { take: 1 }
        }
      });

      if (!questionSet) {
        return createTriviaErrorResponse('QUESTION_SET_NOT_FOUND', 'Set de preguntas no encontrado', 404);
      }

      // Verificar que no tenga sesiones activas
      const activeSessions = await prisma.triviaSession.count({
        where: {
          questionSetId: id,
          completed: false
        }
      });

      if (activeSessions > 0) {
        return createTriviaErrorResponse(
          'VALIDATION_ERROR',
          'No se puede eliminar un set que tiene sesiones activas',
          409
        );
      }

      // Eliminar preguntas asociadas primero
      await prisma.triviaQuestion.deleteMany({
        where: { questionSetId: id }
      });

      // Eliminar el set
      await prisma.triviaQuestionSet.delete({
        where: { id }
      });

      logTriviaEvent('question_set_deleted', `Question set "${questionSet.name}" deleted`, {
        questionSetId: id,
        name: questionSet.name,
        questionsDeleted: questionSet.questions.length
      });

      return createTriviaSuccessResponse({
        message: 'Set de preguntas eliminado exitosamente'
      });
    })
  )(req);
}
