import { apiError, apiOk } from "@/lib/apiError";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      prisma.triviaSession.findMany({
        include: {
          progress: {
            include: {
              question: true,
              selectedAnswer: true
            },
            orderBy: { answeredAt: 'asc' }
          },
          _count: {
            select: { progress: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.triviaSession.count()
    ]);

    // Calcular estadísticas
    const stats = {
      totalSessions: total,
      completedSessions: sessions.filter(s => s.completed).length,
      averageProgress: sessions.length > 0
        ? sessions.reduce((acc, s) => acc + (s._count.progress / 10), 0) / sessions.length // Asumiendo 10 preguntas
        : 0
    };

    return apiOk({
      sessions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats
    }, 200);
  } catch (error) {
    console.error('Error fetching trivia sessions:', error);
    return apiError("DB_ERROR", "Error al obtener sesiones", {}, 500);
  }
}