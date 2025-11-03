import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import { prisma } from "@/lib/prisma";

const updateQuestionSchema = z.object({
  question: z.string().min(1, "La pregunta es requerida").optional(),
  order: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

const updateAnswerSchema = z.object({
  answer: z.string().min(1, "La respuesta es requerida").optional(),
  isCorrect: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

const updateQuestionWithAnswersSchema = z.object({
  question: updateQuestionSchema.shape.question,
  order: updateQuestionSchema.shape.order,
  active: updateQuestionSchema.shape.active,
  answers: z.array(z.object({
    id: z.string().optional(), // Para respuestas existentes
    answer: z.string().min(1, "La respuesta es requerida"),
    isCorrect: z.boolean().optional().default(false),
    order: z.number().int().min(0).optional().default(0),
  })).min(2, "Debe tener al menos 2 respuestas").max(4, "Máximo 4 respuestas").optional(),
}).refine((data) => {
  if (data.answers) {
    const correctAnswers = data.answers.filter(a => a.isCorrect).length;
    return correctAnswers === 1;
  }
  return true;
}, "Debe tener exactamente una respuesta correcta");

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const question = await prisma.triviaQuestion.findUnique({
      where: { id },
      include: {
        answers: {
          orderBy: { order: 'asc' }
        },
        _count: {
          select: { progress: true }
        }
      }
    });

    if (!question) {
      return apiError("NOT_FOUND", "Pregunta no encontrada", {}, 404);
    }

    return apiOk(question, 200);
  } catch (error) {
    console.error('Error fetching trivia question:', error);
    return apiError("DB_ERROR", "Error al obtener pregunta", {}, 500);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const json = await req.json();
    const parsed = updateQuestionWithAnswersSchema.safeParse(json);

    if (!parsed.success) {
      return apiError("INVALID_BODY", "Datos inválidos", parsed.error.flatten(), 400);
    }

    const { answers, ...questionData } = parsed.data;

    // Verificar que la pregunta existe
    const existingQuestion = await prisma.triviaQuestion.findUnique({
      where: { id },
      include: { answers: true }
    });

    if (!existingQuestion) {
      return apiError("NOT_FOUND", "Pregunta no encontrada", {}, 404);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Actualizar pregunta
      const updatedQuestion = await tx.triviaQuestion.update({
        where: { id },
        data: questionData,
      });

      // Si se proporcionan respuestas, actualizarlas
      if (answers) {
        // Eliminar respuestas existentes
        await tx.triviaAnswer.deleteMany({
          where: { questionId: id }
        });

        // Crear nuevas respuestas
        const answersData = answers.map(answer => ({
          answer: answer.answer,
          isCorrect: answer.isCorrect || false,
          order: answer.order || 0,
          questionId: id,
        }));

        await tx.triviaAnswer.createMany({
          data: answersData,
        });
      }

      // Retornar pregunta actualizada con respuestas
      return await tx.triviaQuestion.findUnique({
        where: { id },
        include: {
          answers: {
            orderBy: { order: 'asc' }
          }
        }
      });
    });

    return apiOk(result, 200);
  } catch (error) {
    console.error('Error updating trivia question:', error);
    return apiError("UPDATE_FAILED", "Error al actualizar pregunta", {}, 500);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Verificar que la pregunta existe
    const existingQuestion = await prisma.triviaQuestion.findUnique({
      where: { id },
      include: {
        _count: {
          select: { progress: true }
        }
      }
    });

    if (!existingQuestion) {
      return apiError("NOT_FOUND", "Pregunta no encontrada", {}, 404);
    }

    // Verificar si tiene progreso (sesiones activas)
    if (existingQuestion._count.progress > 0) {
      return apiError("IN_USE", "No se puede eliminar pregunta con sesiones activas", {}, 409);
    }

    // Eliminar pregunta (las respuestas se eliminan automáticamente por CASCADE)
    await prisma.triviaQuestion.delete({
      where: { id }
    });

    return apiOk({ message: "Pregunta eliminada correctamente" }, 200);
  } catch (error) {
    console.error('Error deleting trivia question:', error);
    return apiError("DELETE_FAILED", "Error al eliminar pregunta", {}, 500);
  }
}