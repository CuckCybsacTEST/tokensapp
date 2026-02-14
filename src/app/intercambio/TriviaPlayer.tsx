'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TriviaQuestion {
  id: string;
  question: string;
  answers: { id: string; answer: string }[];
}

interface TriviaPlayerProps {
  questionSetId: string;
  onComplete: (sessionId: string, totalPoints: number) => void;
}

type TriviaState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'playing'; sessionId: string; totalQuestions: number; questionIndex: number; question: TriviaQuestion; totalPoints: number }
  | { phase: 'feedback'; sessionId: string; totalQuestions: number; questionIndex: number; correct: boolean; correctAnswerId: string; selectedId: string; points: number; totalPoints: number; nextQuestion: TriviaQuestion | null; completed: boolean }
  | { phase: 'done'; sessionId: string; totalPoints: number; totalQuestions: number; correctCount: number }
  | { phase: 'error'; message: string };

export default function TriviaPlayer({ questionSetId, onComplete }: TriviaPlayerProps) {
  const [state, setState] = useState<TriviaState>({ phase: 'idle' });
  const [correctCount, setCorrectCount] = useState(0);

  const startTrivia = async () => {
    setState({ phase: 'loading' });
    try {
      const res = await fetch('/api/exchange/trivia/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionSetId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState({ phase: 'error', message: data.error || 'Error iniciando trivia' });
        return;
      }
      setState({
        phase: 'playing',
        sessionId: data.sessionId,
        totalQuestions: data.totalQuestions,
        questionIndex: data.currentQuestionIndex,
        question: data.question,
        totalPoints: 0,
      });
    } catch {
      setState({ phase: 'error', message: 'Error de conexión' });
    }
  };

  const submitAnswer = async (answerId: string) => {
    if (state.phase !== 'playing') return;

    const { sessionId, question, totalQuestions, questionIndex } = state;

    try {
      const res = await fetch('/api/exchange/trivia/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, questionId: question.id, answerId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState({ phase: 'error', message: data.error || 'Error enviando respuesta' });
        return;
      }

      if (data.correct) setCorrectCount(prev => prev + 1);

      setState({
        phase: 'feedback',
        sessionId,
        totalQuestions,
        questionIndex: data.questionIndex,
        correct: data.correct,
        correctAnswerId: data.correctAnswerId,
        selectedId: answerId,
        points: data.points,
        totalPoints: data.totalPoints,
        nextQuestion: data.nextQuestion || null,
        completed: data.completed,
      });
    } catch {
      setState({ phase: 'error', message: 'Error de conexión' });
    }
  };

  const goNext = () => {
    if (state.phase !== 'feedback') return;
    if (state.completed) {
      const finalCorrect = correctCount;
      setState({ phase: 'done', sessionId: state.sessionId, totalPoints: state.totalPoints, totalQuestions: state.totalQuestions, correctCount: finalCorrect });
      onComplete(state.sessionId, state.totalPoints);
      return;
    }
    if (state.nextQuestion) {
      setState({
        phase: 'playing',
        sessionId: state.sessionId,
        totalQuestions: state.totalQuestions,
        questionIndex: state.questionIndex + 1,
        question: state.nextQuestion,
        totalPoints: state.totalPoints,
      });
    }
  };

  // ── Idle ─────────────────────────────────────────────────────────
  if (state.phase === 'idle') {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-400 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🧠</span>
        </div>
        <h3 className="text-lg font-semibold mb-2">Trivia</h3>
        <p className="text-white/50 text-sm mb-6">Responde correctamente para completar tu intercambio</p>
        <button
          onClick={startTrivia}
          className="px-8 py-3 bg-gradient-to-r from-yellow-400 to-red-400 text-black font-semibold rounded-xl hover:opacity-90 transition-opacity"
        >
          Comenzar Trivia
        </button>
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────
  if (state.phase === 'loading') {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
        <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/60">Cargando trivia...</p>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────
  if (state.phase === 'error') {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
        <p className="text-red-300 mb-4">{state.message}</p>
        <button
          onClick={() => setState({ phase: 'idle' })}
          className="px-6 py-2 bg-white/10 rounded-xl text-sm hover:bg-white/20 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // ── Done ─────────────────────────────────────────────────────────
  if (state.phase === 'done') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center"
      >
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🎉</span>
        </div>
        <h3 className="text-xl font-bold mb-2">¡Trivia completada!</h3>
        <div className="flex items-center justify-center gap-6 my-4">
          <div>
            <p className="text-2xl font-bold text-yellow-400">{state.totalPoints}</p>
            <p className="text-xs text-white/50">Puntos</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">{state.correctCount}/{state.totalQuestions}</p>
            <p className="text-xs text-white/50">Correctas</p>
          </div>
        </div>
        <p className="text-white/50 text-sm">Ahora completa tus datos para registrar el intercambio</p>
      </motion.div>
    );
  }

  // ── Playing & Feedback ───────────────────────────────────────────
  const currentQ = state.phase === 'playing' ? state.question : null;
  const qIndex = state.phase === 'playing' ? state.questionIndex : state.questionIndex;
  const total = state.totalQuestions;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      {/* Progress bar */}
      <div className="h-1.5 bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-yellow-400 to-red-400 transition-all duration-500"
          style={{ width: `${((qIndex + (state.phase === 'feedback' ? 1 : 0)) / total) * 100}%` }}
        />
      </div>

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs text-white/40">
            Pregunta {qIndex + 1} de {total}
          </span>
          <span className="text-xs text-yellow-400">
            {state.totalPoints} pts
          </span>
        </div>

        <AnimatePresence mode="wait">
          {state.phase === 'playing' && currentQ && (
            <motion.div
              key={currentQ.id}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
            >
              <h3 className="text-lg font-semibold mb-6">{currentQ.question}</h3>
              <div className="space-y-3">
                {currentQ.answers.map(a => (
                  <button
                    key={a.id}
                    onClick={() => submitAnswer(a.id)}
                    className="w-full text-left px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all text-sm"
                  >
                    {a.answer}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {state.phase === 'feedback' && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className={`text-center mb-6 ${state.correct ? 'text-green-400' : 'text-red-400'}`}>
                <span className="text-4xl">{state.correct ? '✅' : '❌'}</span>
                <p className="font-semibold mt-2">{state.correct ? '¡Correcto!' : 'Incorrecto'}</p>
                {state.points !== 0 && (
                  <p className="text-sm text-white/50">{state.points > 0 ? '+' : ''}{state.points} puntos</p>
                )}
              </div>

              <button
                onClick={goNext}
                className="w-full py-3 bg-gradient-to-r from-yellow-400 to-red-400 text-black font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                {state.completed ? 'Ver resultados' : 'Siguiente pregunta →'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
