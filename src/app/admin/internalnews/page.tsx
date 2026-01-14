import { prisma } from "@/lib/prisma";
import TriviaClient from "./TriviaClient";

export const metadata = { title: 'Trivia' };
export const dynamic = "force-dynamic";

type TriviaQuestionSetWithCounts = {
  id: string;
  name: string;
  description: string | null;
  regulationContent: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  questionCount: number;
  sessionCount: number;
};

type TriviaAnswer = {
  id: string;
  questionId: string;
  answer: string;
  isCorrect: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
};

type TriviaQuestionWithStats = {
  id: string;
  questionSetId: string | null;
  question: string;
  order: number;
  pointsForCorrect: number;
  pointsForIncorrect: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  answers: TriviaAnswer[];
  answerCount: number;
  correctAnswerCount: number;
  attemptCount: number;
};

type TriviaStats = {
  totalQuestionSets: number;
  activeQuestionSets: number;
  totalQuestions: number;
  activeQuestions: number;
  totalSessions: number;
  completedSessions: number;
  averageCompletionRate: number;
};

async function getTriviaData(): Promise<{
  questionSets: TriviaQuestionSetWithCounts[];
  questions: TriviaQuestionWithStats[];
  stats: TriviaStats;
}> {
  // Obtener sets de preguntas con conteos
  const questionSets = await prisma.triviaQuestionSet.findMany({
    include: {
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

  // Obtener preguntas con estadísticas
  const questions = await prisma.triviaQuestion.findMany({
    include: {
      answers: {
        orderBy: { order: 'asc' }
      },
      _count: {
        select: {
          progress: true,
          answers: true
        }
      }
    },
    orderBy: { order: 'asc' }
  });

  const questionsWithStats = questions.map(question => ({
    ...question,
    answerCount: question._count.answers,
    correctAnswerCount: question.answers.filter(a => a.isCorrect).length,
    attemptCount: question._count.progress
  }));

  // Calcular estadísticas generales
  const totalQuestionSets = questionSets.length;
  const activeQuestionSets = questionSets.filter(s => s.active).length;
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
    totalQuestionSets,
    activeQuestionSets,
    totalQuestions,
    activeQuestions,
    totalSessions,
    completedSessions,
    averageCompletionRate: Math.round(averageCompletionRate * 100) / 100
  };

  return {
    questionSets: questionSetsWithCounts,
    questions: questionsWithStats,
    stats
  };
}

export default async function TriviaPage() {
  const { questionSets, questions, stats } = await getTriviaData();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Administración de Trivia</h1>
        <p className="text-gray-600">Gestiona sets de preguntas y preguntas de la trivia pública</p>
      </div>

      <TriviaClient
        initialQuestionSets={questionSets}
        initialQuestions={questions}
        initialStats={stats}
      />
    </div>
  );
}
