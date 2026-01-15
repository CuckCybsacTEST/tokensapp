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

const updateQuestionSetSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").optional(),
  description: z.string().optional(),
  regulationContent: z.string().optional(),
  active: z.boolean().optional()
});

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