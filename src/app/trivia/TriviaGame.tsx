"use client";
import React, { useState, useEffect } from "react";

type TriviaQuestionSet = {
  id: string;
  name: string;
  description?: string;
};

type TriviaSession = {
  id: string;
  currentQuestionIndex: number;
  completed: boolean;
  startedAt: string;
  completedAt: string | null;
  totalQuestions: number;
  answeredQuestions: number;
  questionSet: {
    id: string;
    name: string;
  };
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

type TriviaPrize = {
  id: string;
  name: string;
  description?: string;
  qrCode: string;
};

type GameState = {
  session: TriviaSession | null;
  currentQuestion: TriviaQuestion | null;
  progress: TriviaProgress;
  loading: boolean;
  error: string | null;
  completed: boolean;
  prize: TriviaPrize | null;
  questionSets: TriviaQuestionSet[];
  selectedQuestionSet: TriviaQuestionSet | null;
  showQuestionSetSelection: boolean;
};

export default function TriviaGame() {
  const [gameState, setGameState] = useState<GameState>({
    session: null,
    currentQuestion: null,
    progress: [],
    loading: false,
    error: null,
    completed: false,
    prize: null,
    questionSets: [], // array vacío inicialmente para mostrar loading
    selectedQuestionSet: null,
    showQuestionSetSelection: true
  });

  // Cargar sets de preguntas disponibles al iniciar
  useEffect(() => {
    loadAvailableQuestionSets();
  }, []);

  const loadAvailableQuestionSets = async () => {
    try {
      console.log('🔄 Cargando sets de preguntas...');
      const response = await fetch('/api/trivia/available-question-sets');
      const data = await response.json();

      console.log('📡 Respuesta de API:', response.status, data);

      if (response.ok && data.questionSets && Array.isArray(data.questionSets)) {
        console.log('✅ Sets encontrados:', data.questionSets.length);
        setGameState(prev => ({
          ...prev,
          questionSets: data.questionSets
        }));
      } else {
        console.error('❌ Respuesta inválida:', data);
        setGameState(prev => ({
          ...prev,
          questionSets: []
        }));
      }
    } catch (error) {
      console.error('❌ Error cargando sets:', error);
      setGameState(prev => ({
        ...prev,
        questionSets: []
      }));
    }
  };

  const selectQuestionSet = async (questionSet: TriviaQuestionSet) => {
    setGameState(prev => ({
      ...prev,
      selectedQuestionSet: questionSet,
      showQuestionSetSelection: false
    }));
    await startNewSession(questionSet.id);
  };

  const startNewSession = async (questionSetId: string) => {
    setGameState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/trivia/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionSetId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Error al iniciar sesión');
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
        throw new Error(data.error?.message || 'Error al cargar sesión');
      }

      setGameState(prev => ({
        ...prev,
        session: data.session,
        currentQuestion: data.nextQuestion,
        progress: data.progress,
        completed: data.session.completed,
        prize: data.prize,
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
        throw new Error(data.error?.message || 'Error al responder pregunta');
      }

      setGameState(prev => ({
        ...prev,
        progress: [...prev.progress, {
          questionId: gameState.currentQuestion!.id,
          isCorrect: data.isCorrect,
          answeredAt: new Date().toISOString()
        }],
        completed: data.completed,
        prize: data.prize,
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
      prize: null,
      questionSets: gameState.questionSets || [], // Mantener los question sets cargados o usar array vacío
      selectedQuestionSet: null,
      showQuestionSetSelection: true
    });
  };

  if (gameState.loading && !gameState.session) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (gameState.error) {
    return (
      <div className="max-w-md mx-auto bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 border border-slate-200 dark:border-slate-700">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
            Error
          </h2>
          <p className="text-gray-600 dark:text-slate-400 mb-4">{gameState.error}</p>
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

  if (gameState.showQuestionSetSelection) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 border border-slate-200 dark:border-slate-700">
          <div className="text-center mb-6">
            <div className="text-blue-500 dark:text-blue-400 text-6xl mb-4">🎯</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
              ¡Bienvenido a la Trivia!
            </h1>
            <p className="text-gray-600 dark:text-slate-400">
              Selecciona un set de preguntas para comenzar a jugar
            </p>
          </div>

          {gameState.questionSets === undefined ? (
            <div className="text-center text-gray-500 dark:text-slate-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Cargando sets de preguntas...</p>
            </div>
          ) : (!gameState.questionSets || gameState.questionSets.length === 0) ? (
            <div>
              <div className="text-center text-gray-500 dark:text-slate-400">
                <p>No hay sets de preguntas disponibles en este momento.</p>
                <p className="text-sm mt-2">Vuelve más tarde.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {gameState.questionSets.map((questionSet) => (
                <button
                  key={questionSet.id}
                  onClick={() => selectQuestionSet(questionSet)}
                  disabled={gameState.loading}
                  className="w-full text-left p-4 border-2 border-gray-200 dark:border-slate-600 rounded-lg hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-700"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-slate-100">{questionSet.name}</h3>
                      {questionSet.description && (
                        <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">{questionSet.description}</p>
                      )}
                    </div>
                    <div className="text-blue-600 dark:text-blue-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {gameState.loading && (
            <div className="flex justify-center mt-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gameState.completed && gameState.prize) {
    return (
      <div className="max-w-md mx-auto bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 border border-slate-200 dark:border-slate-700">
        <div className="text-center">
          <div className="text-green-500 text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
            ¡Felicitaciones!
          </h2>
          <p className="text-gray-600 dark:text-slate-400 mb-4">
            Has completado la trivia exitosamente. Aquí está tu premio:
          </p>
          <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg mb-4 border border-slate-200 dark:border-slate-600">
            <h3 className="font-semibold text-gray-900 dark:text-slate-100">
              {gameState.prize.name}
            </h3>
            {gameState.prize.description && (
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                {gameState.prize.description}
              </p>
            )}
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">
              Muestra este código QR en recepción para reclamar tu premio.
            </p>
            <div className="bg-white dark:bg-slate-800 p-4 rounded border-2 border-dashed border-gray-300 dark:border-slate-600">
              <div className="text-center">
                <div className="text-4xl font-mono font-bold text-gray-800 dark:text-slate-200 mb-2">
                  {gameState.prize.qrCode}
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Código de premio
                </p>
              </div>
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
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="text-blue-500 text-6xl mb-4">🎯</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Trivia No Disponible
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Set: {gameState.session?.questionSet.name}
          </span>
          <button
            onClick={resetGame}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Cambiar Set
          </button>
        </div>
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Pregunta {gameState.session?.currentQuestionIndex || 0 + 1} de {gameState.session?.totalQuestions || 0}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {gameState.progress.filter(p => p.isCorrect).length} correctas
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${((gameState.session?.answeredQuestions || 0) / (gameState.session?.totalQuestions || 1)) * 100}%`
            }}
          ></div>
        </div>
      </div>

      {/* Pregunta */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {gameState.currentQuestion.question}
        </h2>

        <div className="space-y-3">
          {gameState.currentQuestion.answers.map((answer) => (
            <button
              key={answer.id}
              onClick={() => answerQuestion(answer.id)}
              disabled={gameState.loading}
              className="w-full text-left p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-gray-900 dark:text-white">{answer.answer}</span>
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
