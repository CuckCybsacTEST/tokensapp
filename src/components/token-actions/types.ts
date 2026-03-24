// Shared types for Dynamic Token Actions

export type ActionType = 'prize' | 'trivia' | 'phrase' | 'challenge' | 'raffle' | 'message';

export interface TriviaPayload {
  questions: Array<{
    question: string;
    answers: Array<{ text: string; correct: boolean }>;
    points: number;
  }>;
  successMessage: string;
  failMessage: string;
  prizeOnSuccess?: string;
}

export interface PhrasePayload {
  phrases: string[];
  style: 'motivational' | 'funny' | 'wisdom' | 'custom';
  bgColor?: string;
}

export interface ChallengePayload {
  challenges: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  rewardLabel?: string;
  requiresValidation: boolean;
}

export interface RafflePayload {
  raffleName: string;
  autoNumber: boolean;
  maxParticipants?: number;
}

export interface MessagePayload {
  htmlContent: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export interface ActionComponentProps {
  payload: any;
  tokenId: string;
  prizeLabel: string;
  prizeColor: string | null;
}

export const ACTION_LABELS: Record<ActionType, string> = {
  prize: '🎁 Premio',
  trivia: '🧩 Trivia Rápida',
  phrase: '💬 Frase / Consejo',
  challenge: '🎯 Reto / Desafío',
  raffle: '🎰 Sorteo',
  message: '📢 Mensaje / Anuncio',
};

export const ACTION_DESCRIPTIONS: Record<ActionType, string> = {
  prize: 'Token clásico: el cliente recibe un premio directo.',
  trivia: 'Preguntas rápidas embebidas. Si acierta, gana.',
  phrase: 'Muestra una frase motivacional, divertida o consejo del día.',
  challenge: 'Un reto o desafío que el cliente debe completar.',
  raffle: 'Genera un número/código de participación para sorteo en vivo.',
  message: 'Muestra un mensaje HTML personalizado con formato.',
};
