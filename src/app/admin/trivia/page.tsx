import { prisma } from "@/lib/prisma";
import TriviaClient from "./TriviaClient";
import { AdminLayout } from "@/components/AdminLayout";

export const metadata = { title: 'Trivia' };
export const dynamic = "force-dynamic";

type TriviaQuestionSetWithCounts = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  questionCount: number;
  prizeCount: number;
  sessionCount: number;
};

type TriviaPrizeWithCounts = {
  id: string;
  name: string;
  description: string | null;
  qrCode: string;
  imageUrl: string | null;
  value: number | null;
  validFrom: Date;
  validUntil: Date;
  questionSetId: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  questionSet: {
    id: string;
    name: string;
  };
  assignmentCount: number;
  recentAssignments: Array<{
    id: string;
    sessionId: string;
    completedAt: Date | null;
  }>;
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
  totalPrizes: number;
  activePrizes: number;
  totalQuestions: number;
  activeQuestions: number;
  totalSessions: number;
  completedSessions: number;
  averageCompletionRate: number;
};

async function getTriviaData(): Promise<{
  questionSets: TriviaQuestionSetWithCounts[];
  prizes: TriviaPrizeWithCounts[];
  questions: TriviaQuestionWithStats[];
  stats: TriviaStats;
}> {
  // Obtener sets de preguntas con conteos
  const questionSets = await prisma.triviaQuestionSet.findMany({
    include: {
      _count: {
        select: {
          questions: true,
          prizes: true
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
          prize: {
            questionSetId: set.id
          }
        }
      });

      return {
        ...set,
        questionCount: set._count.questions,
        prizeCount: set._count.prizes,
        sessionCount
      };
    })
  );

  // Obtener premios con estadísticas
  const prizes = await prisma.triviaPrize.findMany({
    include: {
      questionSet: {
        select: {
          id: true,
          name: true
        }
      },
      sessions: {
        select: {
          id: true,
          sessionId: true,
          completedAt: true
        },
        orderBy: { completedAt: 'desc' },
        take: 5
      },
      _count: {
        select: {
          sessions: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const prizesWithCounts = prizes.map(prize => ({
    ...prize,
    assignmentCount: prize._count.sessions,
    recentAssignments: prize.sessions
  }));

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
  const totalPrizes = prizes.length;
  const activePrizes = prizes.filter(p => p.active).length;
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
    totalPrizes,
    activePrizes,
    totalQuestions,
    activeQuestions,
    totalSessions,
    completedSessions,
    averageCompletionRate: Math.round(averageCompletionRate * 100) / 100
  };

  return {
    questionSets: questionSetsWithCounts,
    prizes: prizesWithCounts,
    questions: questionsWithStats,
    stats
  };
}

export default async function TriviaPage() {
  const { questionSets, prizes, questions, stats } = await getTriviaData();

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Administración de Trivia</h1>
          <p className="text-gray-600">Gestiona sets de preguntas, premios y preguntas de la trivia pública</p>
        </div>

        <TriviaClient
          initialQuestionSets={questionSets}
          initialPrizes={prizes}
          initialQuestions={questions}
          initialStats={stats}
        />
      </div>
    </AdminLayout>
  );
}