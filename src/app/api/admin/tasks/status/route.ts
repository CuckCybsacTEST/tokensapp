export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function isValidDay(day: string | null): day is string {
  return !!day && /^\d{4}-\d{2}-\d{2}$/.test(day);
}

export async function GET(req: Request) {
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const ok = requireRole(session, ['ADMIN']);
  if (!ok.ok) {
    return NextResponse.json({ ok: false, code: ok.error || 'UNAUTHORIZED' }, { status: 401 });
  }

  const url = new URL(req.url);
  const day = url.searchParams.get('day');
  const areaFilter = url.searchParams.get('area') || '';

  if (!isValidDay(day)) {
    return NextResponse.json({ ok: false, code: 'INVALID_DAY' }, { status: 400 });
  }

  try {
    // Obtener todas las tareas activas del día
    const tasks = await prisma.task.findMany({
      where: {
        active: true,
        ...(areaFilter ? {
          OR: [
            { area: null },
            { area: areaFilter }
          ]
        } : {}),
        AND: [
          { OR: [{ startDay: null }, { startDay: { lte: day } }] },
          { OR: [{ endDay: null }, { endDay: { gte: day } }] }
        ]
      },
      select: {
        id: true,
        label: true,
        area: true,
        priority: true,
        measureEnabled: true,
        targetValue: true,
        unitLabel: true
      },
      orderBy: [
        { sortOrder: 'asc' },
        { priority: 'desc' },
        { label: 'asc' }
      ]
    });

    // Obtener todas las personas activas
    const persons = await prisma.person.findMany({
      where: {
        active: true,
        ...(areaFilter ? { area: areaFilter } : {})
      },
      select: {
        id: true,
        code: true,
        name: true,
        area: true,
        user: {
          select: {
            id: true,
            username: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Obtener todos los estados de tarea para el día
    const taskStatuses = await prisma.personTaskStatus.findMany({
      where: {
        day,
        personId: { in: persons.map(p => p.id) }
      },
      select: {
        personId: true,
        taskId: true,
        done: true,
        measureValue: true,
        updatedAt: true,
        user: {
          select: {
            username: true
          }
        }
      }
    });

    // Agrupar estados por persona
    const statusesByPerson = taskStatuses.reduce((acc, status) => {
      if (!acc[status.personId]) {
        acc[status.personId] = {};
      }
      acc[status.personId][status.taskId] = {
        done: status.done,
        value: status.measureValue || 0,
        updatedAt: status.updatedAt,
        updatedBy: status.user?.username
      };
      return acc;
    }, {} as Record<string, Record<string, any>>);

    // Formatear la respuesta
    const users = persons.map(person => {
      const taskStatuses = statusesByPerson[person.id] || {};

      // Filtrar tareas por área del usuario (tareas de su área o tareas generales)
      const userTasks = tasks.filter(task =>
        !task.area || task.area === person.area
      );

      return {
        id: person.id,
        code: person.code,
        name: person.name,
        area: person.area,
        username: person.user?.username,
        tasks: userTasks.map(task => ({
          taskId: task.id,
          label: task.label,
          priority: task.priority,
          measureEnabled: task.measureEnabled,
          targetValue: task.targetValue,
          unitLabel: task.unitLabel,
          status: taskStatuses[task.id] || null
        }))
      };
    });

    return NextResponse.json({
      ok: true,
      day,
      area: areaFilter,
      tasks: tasks.map(t => ({ id: t.id, label: t.label })),
      users
    });

  } catch (error: any) {
    console.error('Error fetching task status:', error);
    return NextResponse.json({
      ok: false,
      code: 'ERROR',
      message: error?.message || 'Error interno'
    }, { status: 500 });
  }
}