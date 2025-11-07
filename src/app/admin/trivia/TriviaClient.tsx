"use client";
import React, { useState } from "react";

type TriviaQuestionSet = {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  questionCount: number;
  prizeCount: number;
  sessionCount: number;
  createdAt: string;
};

type TriviaPrize = {
  id: string;
  name: string;
  description?: string;
  qrCode: string;
  validFrom: string;
  validUntil: string;
  active: boolean;
  questionSet: {
    id: string;
    name: string;
  };
  assignmentCount: number;
  recentAssignments: Array<{
    id: string;
    sessionId: string;
    completedAt: string;
  }>;
};

type TriviaQuestion = {
  id: string;
  question: string;
  order: number;
  active: boolean;
  answerCount: number;
  correctAnswerCount: number;
  attemptCount: number;
  answers?: Array<{
    id: string;
    answer: string;
    isCorrect: boolean;
    order: number;
  }>;
};

type TabType = 'overview' | 'question-sets' | 'prizes' | 'questions';

type TriviaStats = {
  totalQuestionSets: number;
  activeQuestionSets: number;
  totalPrizes: number;
  activePrizes: number;
  totalQuestions: number;
  activeQuestions: number;
  totalSessions: number;
  completedSessions: number;
  averageCompletionRate: number;
};

type NewQuestionSetForm = {
  name: string;
  description: string;
  active: boolean;
};

type NewPrizeForm = {
  questionSetId: string;
  name: string;
  description: string;
  qrCode: string;
  validFrom: string;
  validUntil: string;
  active: boolean;
};

type NewQuestionForm = {
  questionSetId: string;
  question: string;
  order: number;
  active: boolean;
  answers: Array<{
    answer: string;
    isCorrect: boolean;
    order: number;
  }>;
};

type TriviaQuestionSetWithCounts = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  questionCount: number;
  prizeCount: number;
  sessionCount: number;
};

type TriviaPrizeWithCounts = {
  id: string;
  name: string;
  description: string | null;
  qrCode: string;
  imageUrl: string | null;
  value: number | null;
  validFrom: Date;
  validUntil: Date;
  questionSetId: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  questionSet: {
    id: string;
    name: string;
  };
  assignmentCount: number;
  recentAssignments: Array<{
    id: string;
    sessionId: string;
    completedAt: Date | null;
  }>;
};

type TriviaAnswer = {
  id: string;
  questionId: string;
  answer: string;
  isCorrect: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
};

type TriviaQuestionWithStats = {
  id: string;
  questionSetId: string | null;
  question: string;
  order: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  answers: TriviaAnswer[];
  answerCount: number;
  correctAnswerCount: number;
  attemptCount: number;
};

export default function TriviaClient({
  initialQuestionSets,
  initialPrizes,
  initialQuestions,
  initialStats
}: {
  initialQuestionSets: TriviaQuestionSetWithCounts[];
  initialPrizes: TriviaPrizeWithCounts[];
  initialQuestions: TriviaQuestionWithStats[];
  initialStats: TriviaStats;
}) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [questionSets, setQuestionSets] = useState(initialQuestionSets);
  const [prizes, setPrizes] = useState(initialPrizes);
  const [questions, setQuestions] = useState(initialQuestions);
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(false);

  // Estados para modales
  const [showCreateQuestionSetModal, setShowCreateQuestionSetModal] = useState(false);
  const [showCreatePrizeModal, setShowCreatePrizeModal] = useState(false);
  const [showCreateQuestionModal, setShowCreateQuestionModal] = useState(false);

  // Formularios
  const [questionSetForm, setQuestionSetForm] = useState<NewQuestionSetForm>({
    name: '',
    description: '',
    active: true
  });

  const [prizeForm, setPrizeForm] = useState<NewPrizeForm>({
    questionSetId: '',
    name: '',
    description: '',
    qrCode: '',
    validFrom: '',
    validUntil: '',
    active: true
  });

  const [questionForm, setQuestionForm] = useState<NewQuestionForm>({
    questionSetId: '',
    question: '',
    order: 1,
    active: true,
    answers: [
      { answer: '', isCorrect: false, order: 1 },
      { answer: '', isCorrect: false, order: 2 },
      { answer: '', isCorrect: false, order: 3 },
      { answer: '', isCorrect: false, order: 4 }
    ]
  });

  const [formErrors, setFormErrors] = useState<string[]>([]);

  const refreshData = async () => {
    setLoading(true);
    try {
      window.location.reload();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuestionSet = async () => {
    const errors: string[] = [];

    if (!questionSetForm.name.trim()) {
      errors.push('El nombre es requerido');
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    setLoading(true);
    setFormErrors([]);

    try {
      const response = await fetch('/api/trivia/question-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionSetForm)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error al crear set de preguntas');
      }

      setShowCreateQuestionSetModal(false);
      setQuestionSetForm({
        name: '',
        description: '',
        active: true
      });

      await refreshData();
    } catch (error) {
      console.error('Error creating question set:', error);
      setFormErrors([error instanceof Error ? error.message : 'Error desconocido']);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePrize = async () => {
    const errors: string[] = [];

    if (!prizeForm.questionSetId) {
      errors.push('Debe seleccionar un set de preguntas');
    }

    if (!prizeForm.name.trim()) {
      errors.push('El nombre es requerido');
    }

    if (!prizeForm.qrCode.trim()) {
      errors.push('El código QR es requerido');
    }

    if (!prizeForm.validFrom) {
      errors.push('La fecha de inicio es requerida');
    }

    if (!prizeForm.validUntil) {
      errors.push('La fecha de fin es requerida');
    }

    if (prizeForm.validFrom && prizeForm.validUntil) {
      const fromDate = new Date(prizeForm.validFrom);
      const toDate = new Date(prizeForm.validUntil);
      if (fromDate >= toDate) {
        errors.push('La fecha de inicio debe ser anterior a la fecha de fin');
      }
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    setLoading(true);
    setFormErrors([]);

    try {
      const response = await fetch('/api/trivia/prizes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prizeForm)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error al crear premio');
      }

      setShowCreatePrizeModal(false);
      setPrizeForm({
        questionSetId: '',
        name: '',
        description: '',
        qrCode: '',
        validFrom: '',
        validUntil: '',
        active: true
      });

      await refreshData();
    } catch (error) {
      console.error('Error creating prize:', error);
      setFormErrors([error instanceof Error ? error.message : 'Error desconocido']);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuestion = async () => {
    const errors: string[] = [];

    if (!questionForm.questionSetId) {
      errors.push('Debe seleccionar un set de preguntas');
    }

    if (!questionForm.question.trim()) {
      errors.push('La pregunta es requerida');
    }

    const validAnswers = questionForm.answers.filter(a => a.answer.trim());
    if (validAnswers.length < 2) {
      errors.push('Debe tener al menos 2 respuestas');
    }

    const correctAnswers = questionForm.answers.filter(a => a.isCorrect);
    if (correctAnswers.length !== 1) {
      errors.push('Debe tener exactamente una respuesta correcta');
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    setLoading(true);
    setFormErrors([]);

    try {
      const response = await fetch('/api/trivia/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...questionForm,
          answers: questionForm.answers.filter(a => a.answer.trim())
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error al crear pregunta');
      }

      setShowCreateQuestionModal(false);
      setQuestionForm({
        questionSetId: '',
        question: '',
        order: 1,
        active: true,
        answers: [
          { answer: '', isCorrect: false, order: 1 },
          { answer: '', isCorrect: false, order: 2 },
          { answer: '', isCorrect: false, order: 3 },
          { answer: '', isCorrect: false, order: 4 }
        ]
      });

      await refreshData();
    } catch (error) {
      console.error('Error creating question:', error);
      setFormErrors([error instanceof Error ? error.message : 'Error desconocido']);
    } finally {
      setLoading(false);
    }
  };

  const updateQuestionSetForm = (field: keyof NewQuestionSetForm, value: any) => {
    setQuestionSetForm(prev => ({ ...prev, [field]: value }));
  };

  const updatePrizeForm = (field: keyof NewPrizeForm, value: any) => {
    setPrizeForm(prev => ({ ...prev, [field]: value }));
  };

  const updateQuestionForm = (field: keyof NewQuestionForm, value: any) => {
    setQuestionForm(prev => ({ ...prev, [field]: value }));
  };

  const updateQuestionAnswer = (index: number, field: 'answer' | 'isCorrect', value: string | boolean) => {
    setQuestionForm(prev => ({
      ...prev,
      answers: prev.answers.map((answer, i) =>
        i === index ? { ...answer, [field]: value } : field === 'isCorrect' && value ? { ...answer, isCorrect: false } : answer
      )
    }));
  };

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Sets de Preguntas</h3>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalQuestionSets}</p>
          <p className="text-sm text-gray-600 dark:text-slate-400">{stats.activeQuestionSets} activos</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Premios</h3>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.totalPrizes}</p>
          <p className="text-sm text-gray-600 dark:text-slate-400">{stats.activePrizes} activos</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Preguntas</h3>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.totalQuestions}</p>
          <p className="text-sm text-gray-600 dark:text-slate-400">{stats.activeQuestions} activas</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Sesiones</h3>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.totalSessions}</p>
          <p className="text-sm text-gray-600 dark:text-slate-400">{stats.completedSessions} completadas ({stats.averageCompletionRate}%)</p>
        </div>
      </div>

      {/* Pestañas */}
      <div className="border-b border-gray-200 dark:border-slate-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Resumen', count: null },
            { id: 'question-sets', label: 'Sets de Preguntas', count: stats.totalQuestionSets },
            { id: 'prizes', label: 'Premios', count: stats.totalPrizes },
            { id: 'questions', label: 'Preguntas', count: stats.totalQuestions }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido de pestañas */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
          {activeTab === 'overview' && 'Resumen del Sistema de Trivia'}
          {activeTab === 'question-sets' && 'Sets de Preguntas'}
          {activeTab === 'prizes' && 'Premios'}
          {activeTab === 'questions' && 'Preguntas'}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={refreshData}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
          {activeTab === 'question-sets' && (
            <button
              onClick={() => setShowCreateQuestionSetModal(true)}
              className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
            >
              Nuevo Set
            </button>
          )}
          {activeTab === 'prizes' && (
            <button
              onClick={() => setShowCreatePrizeModal(true)}
              className="px-4 py-2 bg-green-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-green-700"
            >
              Nuevo Premio
            </button>
          )}
          {activeTab === 'questions' && (
            <button
              onClick={() => setShowCreateQuestionModal(true)}
              className="px-4 py-2 bg-purple-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-purple-700"
            >
              Nueva Pregunta
            </button>
          )}
        </div>
      </div>

      {/* Contenido de pestañas */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Estado del Sistema</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-2">Sets de Preguntas Recientes</h4>
                <div className="space-y-2">
                  {questionSets.slice(0, 3).map((set) => (
                    <div key={set.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-slate-700 rounded">
                      <span className="text-sm font-medium text-gray-900 dark:text-slate-100">{set.name}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        set.active ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-gray-100 dark:bg-slate-600 text-gray-800 dark:text-slate-300'
                      }`}>
                        {set.questionCount} preguntas
                      </span>
                    </div>
                  ))}
                  {questionSets.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-slate-400 italic">No hay sets de preguntas</p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-2">Premios Recientes</h4>
                <div className="space-y-2">
                  {prizes.slice(0, 3).map((prize) => (
                    <div key={prize.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-slate-700 rounded">
                      <span className="text-sm font-medium text-gray-900 dark:text-slate-100">{prize.name}</span>
                      <span className="text-xs text-gray-600 dark:text-slate-400">{prize.questionSet.name}</span>
                    </div>
                  ))}
                  {prizes.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-slate-400 italic">No hay premios configurados</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'question-sets' && (
        <div className="bg-white dark:bg-slate-800 shadow rounded-lg border border-slate-200 dark:border-slate-700">
          {questionSets.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-slate-400">
              No hay sets de preguntas configurados aún.
              <br />
              Crea el primer set para comenzar.
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {questionSets.map((set) => (
                <div key={set.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">{set.name}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          set.active
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-slate-600 text-gray-800 dark:text-slate-300'
                        }`}>
                          {set.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      {set.description && (
                        <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">{set.description}</p>
                      )}
                      <div className="flex gap-4 text-sm text-gray-500 dark:text-slate-400">
                        <span>{set.questionCount} preguntas</span>
                        <span>{set.prizeCount} premios</span>
                        <span>{set.sessionCount} sesiones</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 dark:text-slate-500">
                      Creado: {new Date(set.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'prizes' && (
        <div className="bg-white dark:bg-slate-800 shadow rounded-lg border border-slate-200 dark:border-slate-700">
          {prizes.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-slate-400">
              No hay premios configurados aún.
              <br />
              Crea el primer premio para comenzar.
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {prizes.map((prize) => (
                <div key={prize.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">{prize.name}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          prize.active
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-slate-600 text-gray-800 dark:text-slate-300'
                        }`}>
                          {prize.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      {prize.description && (
                        <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">{prize.description}</p>
                      )}
                      <div className="flex gap-4 text-sm text-gray-500 dark:text-slate-400 mb-2">
                        <span>Set: {prize.questionSet.name}</span>
                        <span>Asignado: {prize.assignmentCount} veces</span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-slate-400">
                        <span className="font-medium">Válido desde:</span> {new Date(prize.validFrom).toLocaleString()} -
                        <span className="font-medium ml-1">hasta:</span> {new Date(prize.validUntil).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                        <span className="font-medium">QR:</span> {prize.qrCode}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'questions' && (
        <div className="bg-white dark:bg-slate-800 shadow rounded-lg border border-slate-200 dark:border-slate-700">
          {questions.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-slate-400">
              No hay preguntas configuradas aún.
              <br />
              Crea la primera pregunta para comenzar.
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {questions.map((question) => (
                <div key={question.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-500 dark:text-slate-400">
                          #{question.order}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          question.active
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-slate-600 text-gray-800 dark:text-slate-300'
                        }`}>
                          {question.active ? 'Activa' : 'Inactiva'}
                        </span>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                        {question.question}
                      </h3>
                      <div className="space-y-1">
                        {question.answers ? question.answers.map((answer) => (
                          <div
                            key={answer.id}
                            className={`text-sm p-2 rounded ${
                              answer.isCorrect
                                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                                : 'bg-gray-50 dark:bg-slate-700'
                            }`}
                          >
                            {answer.isCorrect && <span className="text-green-600 dark:text-green-400 mr-2">✓</span>}
                            <span className="text-gray-900 dark:text-slate-100">{answer.answer}</span>
                          </div>
                        )) : (
                          <div className="text-sm text-gray-500 dark:text-slate-400 italic">
                            No hay respuestas configuradas
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-sm text-gray-500 dark:text-slate-400">
                        Intentos: {question.attemptCount}
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                        {question.correctAnswerCount} respuesta(s) correcta(s)
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Crear Question Set */}
      {showCreateQuestionSetModal && (
        <div className="fixed inset-0 bg-gray-600 dark:bg-slate-900 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">Nuevo Set de Preguntas</h3>
                <button
                  onClick={() => setShowCreateQuestionSetModal(false)}
                  className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              {formErrors.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <ul className="text-sm text-red-600 dark:text-red-400">
                    {formErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={questionSetForm.name}
                    onChange={(e) => updateQuestionSetForm('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    placeholder="Ej: Trivia Básica"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={questionSetForm.description}
                    onChange={(e) => updateQuestionSetForm('description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    rows={3}
                    placeholder="Descripción opcional del set de preguntas"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="questionSetActive"
                    checked={questionSetForm.active}
                    onChange={(e) => updateQuestionSetForm('active', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600 rounded"
                  />
                  <label htmlFor="questionSetActive" className="ml-2 text-sm text-gray-700 dark:text-slate-300">
                    Set activo
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowCreateQuestionSetModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateQuestionSet}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creando...' : 'Crear Set'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Premio */}
      {showCreatePrizeModal && (
        <div className="fixed inset-0 bg-gray-600 dark:bg-slate-900 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">Nuevo Premio</h3>
                <button
                  onClick={() => setShowCreatePrizeModal(false)}
                  className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              {formErrors.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <ul className="text-sm text-red-600 dark:text-red-400">
                    {formErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Set de Preguntas *
                  </label>
                  <select
                    value={prizeForm.questionSetId}
                    onChange={(e) => updatePrizeForm('questionSetId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                  >
                    <option value="">Seleccionar set...</option>
                    {questionSets.filter(set => set.active).map((set) => (
                      <option key={set.id} value={set.id}>{set.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Nombre del Premio *
                  </label>
                  <input
                    type="text"
                    value={prizeForm.name}
                    onChange={(e) => updatePrizeForm('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    placeholder="Ej: 2x1 en Bebidas"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={prizeForm.description}
                    onChange={(e) => updatePrizeForm('description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    rows={2}
                    placeholder="Descripción del premio"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Código QR *
                  </label>
                  <input
                    type="text"
                    value={prizeForm.qrCode}
                    onChange={(e) => updatePrizeForm('qrCode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    placeholder="Ej: PRIZE-2X1-DRINKS"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Válido Desde *
                    </label>
                    <input
                      type="datetime-local"
                      value={prizeForm.validFrom}
                      onChange={(e) => updatePrizeForm('validFrom', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Válido Hasta *
                    </label>
                    <input
                      type="datetime-local"
                      value={prizeForm.validUntil}
                      onChange={(e) => updatePrizeForm('validUntil', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="prizeActive"
                    checked={prizeForm.active}
                    onChange={(e) => updatePrizeForm('active', e.target.checked)}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 dark:border-slate-600 rounded"
                  />
                  <label htmlFor="prizeActive" className="ml-2 text-sm text-gray-700 dark:text-slate-300">
                    Premio activo
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowCreatePrizeModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreatePrize}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Creando...' : 'Crear Premio'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Pregunta */}
      {showCreateQuestionModal && (
        <div className="fixed inset-0 bg-gray-600 dark:bg-slate-900 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">Nueva Pregunta de Trivia</h3>
                <button
                  onClick={() => setShowCreateQuestionModal(false)}
                  className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              {formErrors.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <ul className="text-sm text-red-600 dark:text-red-400">
                    {formErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Set de Preguntas *
                  </label>
                  <select
                    value={questionForm.questionSetId}
                    onChange={(e) => updateQuestionForm('questionSetId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                  >
                    <option value="">Seleccionar set...</option>
                    {questionSets.filter(set => set.active).map((set) => (
                      <option key={set.id} value={set.id}>{set.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Pregunta *
                  </label>
                  <textarea
                    value={questionForm.question}
                    onChange={(e) => updateQuestionForm('question', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    rows={3}
                    placeholder="Escribe la pregunta aquí..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Orden
                  </label>
                  <input
                    type="number"
                    value={questionForm.order}
                    onChange={(e) => updateQuestionForm('order', parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    min="1"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="questionActive"
                    checked={questionForm.active}
                    onChange={(e) => updateQuestionForm('active', e.target.checked)}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-slate-600 rounded"
                  />
                  <label htmlFor="questionActive" className="ml-2 text-sm text-gray-700 dark:text-slate-300">
                    Pregunta activa
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Respuestas * (marca una como correcta)
                  </label>
                  <div className="space-y-2">
                    {questionForm.answers.map((answer, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correct"
                          checked={answer.isCorrect}
                          onChange={() => {
                            setQuestionForm(prev => ({
                              ...prev,
                              answers: prev.answers.map((a, i) => ({
                                ...a,
                                isCorrect: i === index
                              }))
                            }));
                          }}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                        />
                        <input
                          type="text"
                          value={answer.answer}
                          onChange={(e) => updateQuestionAnswer(index, 'answer', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                          placeholder={`Respuesta ${index + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowCreateQuestionModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateQuestion}
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? 'Creando...' : 'Crear Pregunta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
