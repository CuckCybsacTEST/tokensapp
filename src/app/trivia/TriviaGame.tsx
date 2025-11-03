"use client";
import React, { useState, useEffect } from "react";

type TriviaSession = {
  id: string;
  currentQuestionIndex: number;
  completed: boolean;
  startedAt: string;
  completedAt: string | null;
  totalQuestions: number;
  answeredQuestions: number;
};

type TriviaQuestion = {
  id: string;
  question: string;
  answers: Array<{
    id: string;
    answer: string;
  }>;
};

type TriviaProgress = Array<{
  questionId: string;
  isCorrect: boolean;
  answeredAt: string;
}>;

type GameState = {
  session: TriviaSession | null;
  currentQuestion: TriviaQuestion | null;
  progress: TriviaProgress;
  loading: boolean;
  error: string | null;
  completed: boolean;
  prizeToken: any | null;
};

export default function TriviaGame() {
  const [gameState, setGameState] = useState<GameState>({
    session: null,
    currentQuestion: null,
    progress: [],
    loading: false,
    error: null,
    completed: false,
    prizeToken: null
  });

  // Iniciar sesión al cargar el componente
  useEffect(() => {
    startNewSession();
  }, []);

  const startNewSession = async () => {
    setGameState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/trivia/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al iniciar sesión');
      }

      setGameState(prev => ({
        ...prev,
        session: data.session,
        loading: false
      }));

      // Si hay una sesión existente, cargar el estado actual
      if (data.session.id) {
        loadSessionState(data.session.id);
      }
    } catch (error) {
      setGameState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }));
    }
  };

  const loadSessionState = async (sessionId: string) => {
    setGameState(prev => ({ ...prev, loading: true }));

    try {
      const response = await fetch(`/api/trivia/session?sessionId=${sessionId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al cargar sesión');
      }

      setGameState(prev => ({
        ...prev,
        session: data.session,
        currentQuestion: data.nextQuestion,
        progress: data.progress,
        completed: data.session.completed,
        prizeToken: data.prizeToken,
        loading: false
      }));
    } catch (error) {
      setGameState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Error al cargar sesión'
      }));
    }
  };

  const answerQuestion = async (answerId: string) => {
    if (!gameState.session || !gameState.currentQuestion) return;

    setGameState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/trivia/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: gameState.session!.id,
          questionId: gameState.currentQuestion!.id,
          answerId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al responder pregunta');
      }

      setGameState(prev => ({
        ...prev,
        progress: [...prev.progress, {
          questionId: gameState.currentQuestion!.id,
          isCorrect: data.isCorrect,
          answeredAt: new Date().toISOString()
        }],
        completed: data.completed,
        prizeToken: data.prizeToken,
        loading: false
      }));

      // Si no completó, cargar la siguiente pregunta
      if (!data.completed && gameState.session) {
        loadSessionState(gameState.session.id);
      }
    } catch (error) {
      setGameState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Error al responder'
      }));
    }
  };

  const resetGame = () => {
    setGameState({
      session: null,
      currentQuestion: null,
      progress: [],
      loading: false,
      error: null,
      completed: false,
      prizeToken: null
    });
    startNewSession();
  };

  if (gameState.loading && !gameState.session) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (gameState.error) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error
          </h2>
          <p className="text-gray-600 mb-4">{gameState.error}</p>
          <button
            onClick={resetGame}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Intentar de Nuevo
          </button>
        </div>
      </div>
    );
  }

  if (gameState.completed && gameState.prizeToken) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="text-green-500 text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            ¡Felicitaciones!
          </h2>
          <p className="text-gray-600 mb-4">
            Has completado la trivia exitosamente. Aquí está tu premio:
          </p>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h3 className="font-semibold text-gray-900">
              {gameState.prizeToken.prize.label}
            </h3>
            <p className="text-sm text-gray-600">
              {gameState.prizeToken.prize.description}
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              Muestra este código QR en recepción para reclamar tu premio.
            </p>
            {/* Aquí iría el componente QR */}
            <div className="mt-4 bg-white p-4 rounded border-2 border-dashed border-gray-300">
              <p className="text-xs text-gray-500">QR Code Placeholder</p>
              <p className="text-xs text-gray-400 mt-1">
                Token ID: {gameState.prizeToken.id}
              </p>
            </div>
          </div>
          <button
            onClick={resetGame}
            className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Jugar de Nuevo
          </button>
        </div>
      </div>
    );
  }

  if (!gameState.currentQuestion) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="text-blue-500 text-6xl mb-4">🎯</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Trivia No Disponible
          </h2>
          <p className="text-gray-600 mb-4">
            No hay preguntas disponibles en este momento. Vuelve más tarde.
          </p>
          <button
            onClick={resetGame}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progreso */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-medium text-gray-700">
            Pregunta {gameState.session?.currentQuestionIndex || 0 + 1} de {gameState.session?.totalQuestions || 0}
          </span>
          <span className="text-sm text-gray-500">
            {gameState.progress.filter(p => p.isCorrect).length} correctas
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${((gameState.session?.answeredQuestions || 0) / (gameState.session?.totalQuestions || 1)) * 100}%`
            }}
          ></div>
        </div>
      </div>

      {/* Pregunta */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {gameState.currentQuestion.question}
        </h2>

        <div className="space-y-3">
          {gameState.currentQuestion.answers.map((answer) => (
            <button
              key={answer.id}
              onClick={() => answerQuestion(answer.id)}
              disabled={gameState.loading}
              className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-gray-900">{answer.answer}</span>
            </button>
          ))}
        </div>

        {gameState.loading && (
          <div className="flex justify-center mt-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>
    </div>
  );
}