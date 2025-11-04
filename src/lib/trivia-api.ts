/**
 * Helpers de API específicos para trivia
 * Aislados del sistema principal de API helpers
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logTriviaError, logTriviaEvent } from './trivia-log';

/**
 * Tipos de respuesta de API para trivia
 */
export interface TriviaApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

/**
 * Códigos de error específicos para trivia
 */
export const TRIVIA_ERROR_CODES = {
  INVALID_QUESTION_SET: 'INVALID_QUESTION_SET',
  QUESTION_SET_NOT_FOUND: 'QUESTION_SET_NOT_FOUND',
  PRIZE_NOT_AVAILABLE: 'PRIZE_NOT_AVAILABLE',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INVALID_ANSWER: 'INVALID_ANSWER',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const;

/**
 * Crea una respuesta de éxito para API de trivia
 */
export function createTriviaSuccessResponse<T>(
  data: T,
  requestId?: string
): NextResponse<TriviaApiResponse<T>> {
  const response: TriviaApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: requestId || generateRequestId(),
      version: '1.0'
    }
  };

  logTriviaEvent('api_response_success', 'API response sent successfully', { requestId, dataType: typeof data });

  return NextResponse.json(response, { status: 200 });
}

/**
 * Crea una respuesta de error para API de trivia
 */
export function createTriviaErrorResponse(
  code: keyof typeof TRIVIA_ERROR_CODES,
  message: string,
  statusCode: number = 400,
  details?: any,
  requestId?: string
): NextResponse<TriviaApiResponse> {
  const errorCode = TRIVIA_ERROR_CODES[code];
  const responseId = requestId || generateRequestId();

  const response: TriviaApiResponse = {
    success: false,
    error: {
      code: errorCode,
      message,
      details
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: responseId,
      version: '1.0'
    }
  };

  logTriviaError(errorCode, `API Error: ${errorCode}`, undefined, undefined, {
    code: errorCode,
    message,
    statusCode,
    details,
    requestId: responseId
  });

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Maneja errores de validación de Zod
 */
export function handleTriviaValidationError(
  error: z.ZodError,
  requestId?: string
): NextResponse<TriviaApiResponse> {
  const details = error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code
  }));

  return createTriviaErrorResponse(
    'VALIDATION_ERROR',
    'Datos de entrada inválidos',
    400,
    { validationErrors: details },
    requestId
  );
}

/**
 * Maneja errores de rate limiting
 */
export function createTriviaRateLimitResponse(
  retryAfterSeconds: number,
  requestId?: string
): NextResponse<TriviaApiResponse> {
  const response = createTriviaErrorResponse(
    'RATE_LIMIT_EXCEEDED',
    'Demasiadas solicitudes. Intente nuevamente más tarde.',
    429,
    { retryAfterSeconds },
    requestId
  );

  response.headers.set('Retry-After', retryAfterSeconds.toString());
  response.headers.set('X-RateLimit-Reset', (Date.now() + retryAfterSeconds * 1000).toString());

  return response;
}

/**
 * Extrae la IP del cliente de la solicitud
 */
export function getClientIP(request: NextRequest): string {
  // Intentar obtener IP de diferentes headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const clientIP = request.headers.get('x-client-ip');

  // Usar la primera IP válida encontrada
  const ip = forwarded?.split(',')[0]?.trim() ||
             realIP ||
             clientIP ||
             'unknown';

  return ip;
}

/**
 * Genera un ID único para la solicitud
 */
function generateRequestId(): string {
  return `trivia-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Wrapper para manejar errores en handlers de API
 */
export function withTriviaErrorHandler(
  handler: (request: Request, context?: any) => Promise<NextResponse>
) {
  return async (request: Request, context?: any): Promise<NextResponse> => {
    const requestId = generateRequestId();

    try {
      logTriviaEvent('api_request_start', 'API request started', {
        requestId,
        method: request.method,
        url: request.url,
        ip: getClientIP(request as any)
      });

      const response = await handler(request, context);

      logTriviaEvent('api_request_end', 'API request completed', {
        requestId,
        statusCode: response.status
      });

      return response;
    } catch (error) {
      logTriviaError('INTERNAL_ERROR', 'Unhandled API error', error instanceof Error ? error : undefined, undefined, {
        error: error instanceof Error ? error.message : String(error),
        requestId,
        stack: error instanceof Error ? error.stack : undefined
      });

      return createTriviaErrorResponse(
        'INTERNAL_ERROR',
        'Error interno del servidor',
        500,
        undefined,
        requestId
      );
    }
  };
}

/**
 * Valida que el usuario tenga permisos de staff para operaciones admin
 */
export async function validateTriviaStaffAccess(request: Request): Promise<boolean> {
  // Verificar cookie de sesión de admin (admin_session)
  const { getSessionCookieFromRequest, verifySessionCookie } = await import('@/lib/auth');
  const raw = getSessionCookieFromRequest(request);
  const session = await verifySessionCookie(raw);

  if (!session) return false;

  // Verificar que el rol sea ADMIN o STAFF
  return session.role === 'ADMIN' || session.role === 'STAFF';
}

/**
 * Middleware para verificar acceso de staff en rutas admin de trivia
 */
export function requireTriviaStaffAccess(
  handler: (request: Request, context?: any) => Promise<NextResponse>
) {
  return async (request: Request, context?: any): Promise<NextResponse> => {
    if (!(await validateTriviaStaffAccess(request))) {
      return createTriviaErrorResponse(
        'UNAUTHORIZED',
        'Acceso no autorizado. Se requieren permisos de staff.',
        403
      );
    }

    return handler(request, context);
  };
}