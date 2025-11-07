/**
 * API para obtener sets de preguntas disponibles para el público
 * Solo retorna sets activos
 */

import { prisma } from "@/lib/prisma";
import { createTriviaSuccessResponse, withTriviaErrorHandler } from "@/lib/trivia-api";

// GET /api/trivia/available-question-sets - Listar sets de preguntas activos para el público
export const GET = withTriviaErrorHandler(async (req: Request) => {
  const questionSets = await prisma.triviaQuestionSet.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return createTriviaSuccessResponse({
    questionSets
  });
});
