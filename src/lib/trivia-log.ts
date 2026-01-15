/**
 * Sistema de logging específico para trivia
 * Aislado del sistema principal de logging
 */

export type TriviaLogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface TriviaLogEntry {
  timestamp: string;
  level: TriviaLogLevel;
  type: string;
  message: string;
  metadata?: any;
  sessionId?: string;
  userId?: string;
}

/**
 * Registra un evento de trivia
 */
export function logTriviaEvent(
  type: string,
  message: string,
  metadata?: any,
  level: TriviaLogLevel = 'INFO',
  sessionId?: string,
  userId?: string
) {
  const entry: TriviaLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    type,
    message,
    metadata,
    sessionId,
    userId
  };

  // Log en consola con formato específico para trivia
  const logMessage = `[${entry.timestamp}] [TRIVIA-${entry.level}] [${entry.type}] ${entry.message}`;
  console.log(logMessage, entry.metadata || '');

  // Aquí podríamos guardar en una tabla TriviaLog si se necesita persistencia
  // Por ahora solo loggeamos en consola para mantener aislamiento

  return entry;
}

/**
 * Logging específico para sesiones de trivia
 */
export function logTriviaSession(
  action: 'START' | 'RESUME' | 'COMPLETE' | 'ABANDON',
  sessionId: string,
  metadata?: any
) {
  const messages = {
    START: 'Sesión de trivia iniciada',
    RESUME: 'Sesión de trivia reanudada',
    COMPLETE: 'Sesión de trivia completada exitosamente',
    ABANDON: 'Sesión de trivia abandonada'
  };

  return logTriviaEvent(
    `SESSION_${action}`,
    messages[action],
    metadata,
    'INFO',
    sessionId
  );
}

/**
 * Logging específico para respuestas de preguntas
 */
export function logTriviaAnswer(
  sessionId: string,
  questionId: string,
  answerId: string,
  isCorrect: boolean,
  pointsEarned: number,
  timeSpent?: number
) {
  return logTriviaEvent(
    'QUESTION_ANSWERED',
    `Pregunta respondida - ${isCorrect ? 'Correcta' : 'Incorrecta'} (+${pointsEarned} puntos)`,
    {
      questionId,
      answerId,
      isCorrect,
      pointsEarned,
      timeSpent
    },
    'INFO',
    sessionId
  );
}

/**
 * Logging para errores de trivia
 */
export function logTriviaError(
  type: string,
  message: string,
  error?: Error,
  sessionId?: string,
  metadata?: any
) {
  return logTriviaEvent(
    `ERROR_${type}`,
    message,
    {
      error: error?.message,
      stack: error?.stack,
      ...metadata
    },
    'ERROR',
    sessionId
  );
}

/**
 * Logging para eventos de rate limiting
 */
export function logTriviaRateLimit(
  sessionId: string,
  ip: string,
  retryAfterSeconds: number
) {
  return logTriviaEvent(
    'RATE_LIMIT_EXCEEDED',
    `Rate limit excedido para sesión ${sessionId}`,
    {
      ip,
      retryAfterSeconds
    },
    'WARN',
    sessionId
  );
}
