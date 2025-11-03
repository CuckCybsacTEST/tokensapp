import { prisma } from "@/lib/prisma";
import TriviaClient from "./TriviaClient";
import { AdminLayout } from "@/components/AdminLayout";

export const metadata = { title: 'Trivia' };
export const dynamic = "force-dynamic";

type TriviaQuestionWithStats = Awaited<ReturnType<typeof prisma.triviaQuestion.findMany>>[number] & {
  answeredCount: number;
  correctRate: number;
};

type TriviaStats = {
  totalQuestions: number;
  activeQuestions: number;
  totalSessions: number;
  completedSessions: number;
  averageCompletionRate: number;
};

async function getTriviaData(): Promise<{
  questions: TriviaQuestionWithStats[];
  stats: TriviaStats;
}> {
  // Obtener preguntas con estadísticas
  const questions = await prisma.triviaQuestion.findMany({
    include: {
      answers: true,
      progress: {
        include: {
          session: true
        }
      }
    },
    orderBy: { order: 'asc' }
  });

  // Calcular estadísticas por pregunta
  const questionsWithStats = questions.map(question => {
    const totalAnswers = question.progress.length;
    const correctAnswers = question.progress.filter(p => p.isCorrect).length;
    const correctRate = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;

    return {
      ...question,
      answeredCount: totalAnswers,
      correctRate: Math.round(correctRate * 100) / 100
    };
  });

  // Calcular estadísticas generales
  const totalQuestions = questions.length;
  const activeQuestions = questions.filter(q => q.active).length;

  const sessions = await prisma.triviaSession.findMany({
    include: {
      _count: {
        select: { progress: true }
      }
    }
  });

  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.completed).length;
  const averageCompletionRate = totalSessions > 0
    ? (completedSessions / totalSessions) * 100
    : 0;

  const stats: TriviaStats = {
    totalQuestions,
    activeQuestions,
    totalSessions,
    completedSessions,
    averageCompletionRate: Math.round(averageCompletionRate * 100) / 100
  };

  return {
    questions: questionsWithStats,
    stats
  };
}

export default async function TriviaPage() {
  const { questions, stats } = await getTriviaData();

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Administración de Trivia</h1>
          <p className="text-gray-600">Gestiona las preguntas y respuestas de la trivia pública</p>
        </div>

        <TriviaClient initialQuestions={questions} initialStats={stats} />
      </div>
    </AdminLayout>
  );
}