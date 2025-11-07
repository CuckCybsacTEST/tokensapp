import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import { prisma } from "@/lib/prisma";

const questionSchema = z.object({
  question: z.string().min(1, "La pregunta es requerida"),
  order: z.number().int().min(0).optional().default(0),
  active: z.boolean().optional().default(true),
});

const answerSchema = z.object({
  answer: z.string().min(1, "La respuesta es requerida"),
  isCorrect: z.boolean().optional().default(false),
  order: z.number().int().min(0).optional().default(0),
});

const createQuestionSchema = z.object({
  question: questionSchema.shape.question,
  order: questionSchema.shape.order,
  active: questionSchema.shape.active,
  answers: z.array(answerSchema).min(2, "Debe tener al menos 2 respuestas").max(4, "Máximo 4 respuestas"),
}).refine((data) => {
  const correctAnswers = data.answers.filter(a => a.isCorrect).length;
  return correctAnswers === 1;
}, "Debe tener exactamente una respuesta correcta");

export async function GET() {
  try {
    const questions = await prisma.triviaQuestion.findMany({
      include: {
        answers: {
          orderBy: { order: 'asc' }
        },
        _count: {
          select: { progress: true }
        }
      },
      orderBy: { order: 'asc' }
    });

    return apiOk(questions, 200);
  } catch (error) {
    console.error('Error fetching trivia questions:', error);
    return apiError("DB_ERROR", "Error al obtener preguntas", {}, 500);
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = createQuestionSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("INVALID_BODY", "Datos inválidos", parsed.error.flatten(), 400);
    }

    const { answers, ...questionData } = parsed.data;

    // Crear pregunta y respuestas en transacción
    const result = await prisma.$transaction(async (tx) => {
      const question = await tx.triviaQuestion.create({
        data: questionData,
      });

      const answersData = answers.map(answer => ({
        ...answer,
        questionId: question.id,
      }));

      await tx.triviaAnswer.createMany({
        data: answersData,
      });

      // Retornar pregunta con respuestas
      return await tx.triviaQuestion.findUnique({
        where: { id: question.id },
        include: {
          answers: {
            orderBy: { order: 'asc' }
          }
        }
      });
    });

    return apiOk(result, 201);
  } catch (error) {
    console.error('Error creating trivia question:', error);
    return apiError("CREATE_FAILED", "Error al crear pregunta", {}, 500);
  }
}
