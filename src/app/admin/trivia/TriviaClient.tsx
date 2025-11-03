"use client";
import React, { useState } from "react";

type TriviaQuestion = {
  id: string;
  question: string;
  order: number;
  active: boolean;
  answeredCount: number;
  correctRate: number;
  answers?: Array<{
    id: string;
    answer: string;
    isCorrect: boolean;
    order: number;
  }>;
};

type TriviaStats = {
  totalQuestions: number;
  activeQuestions: number;
  totalSessions: number;
  completedSessions: number;
  averageCompletionRate: number;
};

export default function TriviaClient({
  initialQuestions,
  initialStats
}: {
  initialQuestions: TriviaQuestion[];
  initialStats: TriviaStats;
}) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(false);

  const refreshData = async () => {
    setLoading(true);
    try {
      // Recargar la página para obtener datos frescos
      window.location.reload();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Preguntas</h3>
          <p className="text-2xl font-bold text-blue-600">{stats.totalQuestions}</p>
          <p className="text-sm text-gray-600">{stats.activeQuestions} activas</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Sesiones</h3>
          <p className="text-2xl font-bold text-green-600">{stats.totalSessions}</p>
          <p className="text-sm text-gray-600">{stats.completedSessions} completadas</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Tasa de Finalización</h3>
          <p className="text-2xl font-bold text-purple-600">{stats.averageCompletionRate}%</p>
          <p className="text-sm text-gray-600">promedio</p>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Preguntas de Trivia</h2>
        <div className="flex gap-2">
          <button
            onClick={refreshData}
            disabled={loading}
            className="btn-outline"
          >
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
          <button className="btn-primary">
            Nueva Pregunta
          </button>
        </div>
      </div>

      {/* Lista de preguntas */}
      <div className="bg-white shadow rounded-lg">
        {questions.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No hay preguntas configuradas aún.
            <br />
            Crea la primera pregunta para comenzar.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {questions.map((question) => (
              <div key={question.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-500">
                        #{question.order}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        question.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {question.active ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {question.question}
                    </h3>
                    <div className="space-y-1">
                      {question.answers ? question.answers.map((answer) => (
                        <div
                          key={answer.id}
                          className={`text-sm p-2 rounded ${
                            answer.isCorrect
                              ? 'bg-green-50 border border-green-200'
                              : 'bg-gray-50'
                          }`}
                        >
                          {answer.isCorrect && <span className="text-green-600 mr-2">✓</span>}
                          {answer.answer}
                        </div>
                      )) : (
                        <div className="text-sm text-gray-500 italic">
                          No hay respuestas configuradas
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <div className="text-sm text-gray-500">
                      Respondida {question.answeredCount} veces
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {question.correctRate}% correctas
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}