"use client";
import React, { useState, useMemo } from "react";
import type { ActionComponentProps, TriviaPayload } from "./types";

export default function TriviaAction({ payload, tokenId, prizeLabel, onComplete, isStaff }: ActionComponentProps) {
  const data = payload as TriviaPayload;

  // ── Staff / Admin view: show answer key, no interaction ──
  if (isStaff) {
    const questions = data?.questions || [];
    return (
      <div className="text-center">
        <div className="text-5xl mb-4">🧩</div>
        <h2 className="text-xl font-bold text-white mb-4">Trivia — Vista Staff</h2>
        {questions.length === 0 ? (
          <p className="text-white/60 text-sm">No hay preguntas configuradas.</p>
        ) : (
          <div className="space-y-3 text-left mb-4">
            {questions.map((q, i) => {
              const correct = q.answers.find(a => a.correct);
              return (
                <div key={i} className="bg-white/10 border border-white/10 rounded-xl p-4">
                  <p className="text-white text-sm font-bold mb-1">{i + 1}. {q.question}</p>
                  <p className="text-green-400 text-xs">✅ {correct?.text || '—'}</p>
                  <p className="text-white/30 text-[10px] mt-1">+{q.points || 10} pts</p>
                </div>
              );
            })}
          </div>
        )}
        {prizeLabel && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <p className="text-white/60 text-xs">🎁 Premio asignado: <span className="font-bold text-white">{prizeLabel}</span></p>
          </div>
        )}
      </div>
    );
  }

  // ── Client interactive trivia ──
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [notified, setNotified] = useState(false);

  // Shuffle answers once per question using tokenId as seed-like stability
  const questions = useMemo(() => data?.questions || [], [data]);
  const current = questions[currentIndex];

  if (!data?.questions?.length) {
    return (
      <div className="text-center p-4">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-white/60 text-sm">No hay preguntas configuradas.</p>
      </div>
    );
  }

  if (finished) {
    const passed = correctCount > questions.length / 2;
    if (!notified) { setNotified(true); onComplete?.(passed); }
    return (
      <div className="text-center">
        <div className="text-6xl mb-4">{passed ? "🎉" : "😅"}</div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {passed ? "¡Felicidades!" : "¡Buen intento!"}
        </h2>
        <p className="text-white/70 text-sm mb-4">
          {passed ? (data.successMessage || "¡Respuesta correcta!") : (data.failMessage || "Mejor suerte la próxima.")}
        </p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white/10 rounded-xl p-3">
            <div className="text-2xl font-bold text-[#FF4D2E]">{score}</div>
            <div className="text-[10px] text-white/50 uppercase">Puntos</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <div className="text-2xl font-bold text-green-400">{correctCount}/{questions.length}</div>
            <div className="text-[10px] text-white/50 uppercase">Correctas</div>
          </div>
        </div>
        {passed && prizeLabel && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-4">
            <p className="text-green-300 text-sm font-bold">🎁 {prizeLabel}</p>
            <p className="text-green-300/60 text-xs mt-1">Muestra esta pantalla al animador</p>
          </div>
        )}
      </div>
    );
  }

  function handleSelect(answerIdx: number) {
    if (answered) return;
    setSelectedAnswer(answerIdx);
    setAnswered(true);
    const isCorrect = current.answers[answerIdx]?.correct === true;
    if (isCorrect) {
      setScore(s => s + (current.points || 10));
      setCorrectCount(c => c + 1);
    }
  }

  function handleNext() {
    if (currentIndex + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrentIndex(i => i + 1);
      setSelectedAnswer(null);
      setAnswered(false);
    }
  }

  return (
    <div>
      {/* Progress */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#FF4D2E] rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + (answered ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-white/50 shrink-0">{currentIndex + 1}/{questions.length}</span>
      </div>

      {/* Question */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white mb-1">{current.question}</h3>
        <p className="text-xs text-white/40">+{current.points || 10} pts por respuesta correcta</p>
      </div>

      {/* Answers */}
      <div className="space-y-2 mb-4">
        {current.answers.map((a, idx) => {
          let cls = "w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 text-sm font-medium ";
          if (!answered) {
            cls += selectedAnswer === idx
              ? "border-[#FF4D2E] bg-[#FF4D2E]/20 text-white"
              : "border-white/10 bg-white/5 text-white/80 hover:border-white/30 hover:bg-white/10";
          } else {
            if (a.correct) {
              cls += "border-green-500 bg-green-500/20 text-green-300";
            } else if (idx === selectedAnswer && !a.correct) {
              cls += "border-red-500 bg-red-500/20 text-red-300";
            } else {
              cls += "border-white/5 bg-white/5 text-white/30";
            }
          }
          return (
            <button key={idx} onClick={() => handleSelect(idx)} disabled={answered} className={cls}>
              {a.text}
              {answered && a.correct && <span className="ml-2">✅</span>}
              {answered && idx === selectedAnswer && !a.correct && <span className="ml-2">❌</span>}
            </button>
          );
        })}
      </div>

      {/* Next button */}
      {answered && (
        <button
          onClick={handleNext}
          className="w-full py-3 rounded-xl bg-[#FF4D2E] hover:bg-[#FF6542] text-white font-bold transition-colors"
        >
          {currentIndex + 1 >= questions.length ? "Ver resultado" : "Siguiente →"}
        </button>
      )}
    </div>
  );
}
