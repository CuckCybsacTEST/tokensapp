/**
 * API para gestión de premios de trivia
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
import { parseInLima, isValidInLima } from "@/lib/trivia-time";

const createPrizeSchema = z.object({
  questionSetId: z.string(),
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  qrCode: z.string().min(1, "El código QR es requerido"),
  imageUrl: z.string().url().optional(),
  value: z.number().optional(),
  validFrom: z.string().refine((val) => {
    // Aceptar tanto datetime-local (2025-11-03T10:30) como datetime completo
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, "Fecha de inicio inválida"),
  validUntil: z.string().refine((val) => {
    // Aceptar tanto datetime-local (2025-11-03T10:30) como datetime completo
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, "Fecha de fin inválida"),
  active: z.boolean().default(true)
});

const updatePrizeSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").optional(),
  description: z.string().optional(),
  qrCode: z.string().min(1, "El código QR es requerido").optional(),
  imageUrl: z.string().url().optional(),
  value: z.number().optional(),
  validFrom: z.string().refine((val) => {
    // Aceptar tanto datetime-local (2025-11-03T10:30) como datetime completo
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, "Fecha de inicio inválida").optional(),
  validUntil: z.string().refine((val) => {
    // Aceptar tanto datetime-local (2025-11-03T10:30) como datetime completo
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, "Fecha de fin inválida").optional(),
  active: z.boolean().optional()
});

// GET /api/trivia/prizes - Listar todos los premios
export const GET = withTriviaErrorHandler(
  requireTriviaStaffAccess(async (req: Request) => {
    const url = new URL(req.url);
    const questionSetId = url.searchParams.get('questionSetId');
    const includeInactive = url.searchParams.get('includeInactive') === 'true';

    const whereClause = {
      ...(questionSetId && { questionSetId }),
      ...(includeInactive ? {} : { active: true })
    };

    const prizes = await prisma.triviaPrize.findMany({
      where: whereClause,
      include: {
        questionSet: {
          select: {
            id: true,
            name: true,
            active: true
          }
        },
        sessions: {
          select: {
            id: true,
            sessionId: true,
            completedAt: true
          },
          orderBy: { completedAt: 'desc' },
          take: 5 // Últimas 5 asignaciones
        },
        _count: {
          select: {
            sessions: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    logTriviaEvent('prizes_listed', `Listed ${prizes.length} prizes`, {
      count: prizes.length,
      questionSetId,
      includeInactive
    });

    return createTriviaSuccessResponse({
      prizes: prizes.map(prize => ({
        ...prize,
        assignmentCount: prize.sessions.length,
        recentAssignments: prize.sessions
      }))
    });
  })
);

// POST /api/trivia/prizes - Crear nuevo premio
export const POST = withTriviaErrorHandler(
  requireTriviaStaffAccess(async (req: Request) => {
    const json = await req.json();
    const parsed = createPrizeSchema.safeParse(json);

    if (!parsed.success) {
      return handleTriviaValidationError(parsed.error);
    }

    const { questionSetId, name, description, qrCode, imageUrl, value, validFrom, validUntil, active } = parsed.data;

    // Verificar que el question set existe
    const questionSet = await prisma.triviaQuestionSet.findUnique({
      where: { id: questionSetId }
    });

    if (!questionSet) {
      return createTriviaErrorResponse('QUESTION_SET_NOT_FOUND', 'Set de preguntas no encontrado', 404);
    }

    // Parsear y validar fechas en zona horaria de Lima
    const validFromLima = parseInLima(validFrom);
    const validUntilLima = parseInLima(validUntil);

    if (!validFromLima || !validUntilLima) {
      return createTriviaErrorResponse('VALIDATION_ERROR', 'Fechas inválidas', 400);
    }

    if (validFromLima >= validUntilLima) {
      return createTriviaErrorResponse('VALIDATION_ERROR', 'La fecha de inicio debe ser anterior a la fecha de fin', 400);
    }

    // Verificar que no exista un premio con el mismo QR en el mismo question set
    const existingPrize = await prisma.triviaPrize.findFirst({
      where: {
        questionSetId,
        qrCode: { equals: qrCode, mode: 'insensitive' }
      }
    });

    if (existingPrize) {
      return createTriviaErrorResponse(
        'VALIDATION_ERROR',
        'Ya existe un premio con este código QR en este set de preguntas',
        409
      );
    }

    const prize = await prisma.triviaPrize.create({
      data: {
        questionSetId,
        name,
        description,
        qrCode,
        imageUrl,
        value,
        validFrom: validFromLima.toJSDate(),
        validUntil: validUntilLima.toJSDate(),
        active
      },
      include: {
        questionSet: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    logTriviaEvent('prize_created', `Prize "${prize.name}" created for question set`, {
      prizeId: prize.id,
      questionSetId,
      name: prize.name,
      qrCode: prize.qrCode
    });

    return createTriviaSuccessResponse({
      prize,
      message: 'Premio creado exitosamente'
    });
  })
);

// PUT /api/trivia/prizes/[id] - Actualizar premio
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  return withTriviaErrorHandler(
    requireTriviaStaffAccess(async (req: Request) => {
      const { id } = params;
      const json = await req.json();
      const parsed = updatePrizeSchema.safeParse(json);

      if (!parsed.success) {
        return handleTriviaValidationError(parsed.error);
      }

      const updateData = parsed.data;

      // Verificar que el premio existe
      const existingPrize = await prisma.triviaPrize.findUnique({
        where: { id },
        include: {
          questionSet: true
        }
      });

      if (!existingPrize) {
        return createTriviaErrorResponse('PRIZE_NOT_AVAILABLE', 'Premio no encontrado', 404);
      }

      // Parsear fechas si se proporcionan
      let validFromDate: Date | undefined;
      let validUntilDate: Date | undefined;

      if (updateData.validFrom) {
        validFromDate = parseInLima(updateData.validFrom)?.toJSDate();
        if (!validFromDate) {
          return createTriviaErrorResponse('VALIDATION_ERROR', 'Fecha de inicio inválida', 400);
        }
      }

      if (updateData.validUntil) {
        validUntilDate = parseInLima(updateData.validUntil)?.toJSDate();
        if (!validUntilDate) {
          return createTriviaErrorResponse('VALIDATION_ERROR', 'Fecha de fin inválida', 400);
        }
      }

      // Validar que las fechas sean coherentes
      const finalValidFrom = validFromDate || existingPrize.validFrom;
      const finalValidUntil = validUntilDate || existingPrize.validUntil;

      if (finalValidFrom >= finalValidUntil) {
        return createTriviaErrorResponse('VALIDATION_ERROR', 'La fecha de inicio debe ser anterior a la fecha de fin', 400);
      }

      // Si se está cambiando el QR, verificar que no exista otro con el mismo QR en el mismo question set
      if (updateData.qrCode && updateData.qrCode !== existingPrize.qrCode) {
        const qrConflict = await prisma.triviaPrize.findFirst({
          where: {
            questionSetId: existingPrize.questionSetId,
            qrCode: { equals: updateData.qrCode, mode: 'insensitive' },
            id: { not: id }
          }
        });

        if (qrConflict) {
          return createTriviaErrorResponse(
            'VALIDATION_ERROR',
            'Ya existe otro premio con este código QR en este set de preguntas',
            409
          );
        }
      }

      const updatedPrize = await prisma.triviaPrize.update({
        where: { id },
        data: {
          ...updateData,
          validFrom: validFromDate,
          validUntil: validUntilDate
        },
        include: {
          questionSet: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      logTriviaEvent('prize_updated', `Prize "${existingPrize.name}" updated`, {
        prizeId: id,
        questionSetId: existingPrize.questionSetId,
        changes: updateData
      });

      return createTriviaSuccessResponse({
        prize: updatedPrize,
        message: 'Premio actualizado exitosamente'
      });
    })
  )(req);
}

// DELETE /api/trivia/prizes/[id] - Eliminar premio (solo si no ha sido asignado)
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  return withTriviaErrorHandler(
    requireTriviaStaffAccess(async (req: Request) => {
      const { id } = params;

      // Verificar que el premio existe
      const prize = await prisma.triviaPrize.findUnique({
        where: { id },
        include: {
          sessions: { take: 1 },
          questionSet: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (!prize) {
        return createTriviaErrorResponse('PRIZE_NOT_AVAILABLE', 'Premio no encontrado', 404);
      }

      // Verificar que no haya sido asignado a ninguna sesión
      if (prize.sessions.length > 0) {
        return createTriviaErrorResponse(
          'VALIDATION_ERROR',
          'No se puede eliminar un premio que ya ha sido asignado',
          409
        );
      }

      // Eliminar el premio
      await prisma.triviaPrize.delete({
        where: { id }
      });

      logTriviaEvent('prize_deleted', `Prize "${prize.name}" deleted`, {
        prizeId: id,
        questionSetId: prize.questionSet.id,
        name: prize.name,
        qrCode: prize.qrCode
      });

      return createTriviaSuccessResponse({
        message: 'Premio eliminado exitosamente'
      });
    })
  )(req);
}