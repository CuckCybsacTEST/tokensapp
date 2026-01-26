"use client";
import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { CURRENT_REGULATION, TriviaQuestion } from '@/lib/regulations/constants';

interface Props {
  userId: string;
  initialAcceptedVersion: number;
  requiredVersion: number;
}

type Step = 'READING' | 'ACCEPT' | 'TRIVIA' | 'RESULT' | 'ALREADY_COMPLETED';

interface DynamicContent {
  title: string;
  paragraphs: string[];
}

interface AssignmentData {
  id: string;
  status: string;
  completedAt: string | null;
  includeTrivia: boolean;
  questionSet: any;
}

export default function CommitmentModal({ userId, initialAcceptedVersion, requiredVersion }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('READING');
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [assignmentData, setAssignmentData] = useState<AssignmentData | null>(null);
  const [includeTrivia, setIncludeTrivia] = useState(false);
  const [dynamicContent, setDynamicContent] = useState<DynamicContent | null>(null);
  const [manuallyClosed, setManuallyClosed] = useState(false);
  
  // Trivia state
  const [selectedQuestions, setSelectedQuestions] = useState<TriviaQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [triviaError, setTriviaError] = useState<string | null>(null);
  
  // Scrolling requirement
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  const needsByVersion = (initialAcceptedVersion || 0) < requiredVersion;

  const loadQuestionsFromAssignment = (assignment: any) => {
    const qSet = assignment.questionSet;
    
    // Set dynamic regulation content if available
    if (qSet.regulationContent) {
      setDynamicContent({
        title: qSet.name,
        paragraphs: [qSet.regulationContent] // Pass HTML as single paragraph
      });
    }

    // Use questions from the dynamic assignment
    const questions = qSet.questions.map((q: any) => ({
      id: q.id,
      question: q.question,
      options: q.answers.sort((a: any, b: any) => a.order - b.order).map((a: any) => a.answer),
      correctIndex: q.answers.findIndex((a: any) => a.isCorrect)
    }));
    
    setSelectedQuestions(questions);
  };

  useEffect(() => {
    // Acceso directo al reglamento base (REGLAMENTO INTERNO 2026)
    if (searchParams && searchParams.get('view-regulation') === '1') {
      // Limpiar cualquier contenido dinámico previo
      setDynamicContent(null);
      setAssignmentId(null);
      setAssignmentData(null);
      setIncludeTrivia(false);
      setHasScrolledToBottom(false);
      
      // Mostrar siempre el reglamento base
      setOpen(true);
      setStep(initialAcceptedVersion >= requiredVersion ? 'ALREADY_COMPLETED' : 'READING');
      
      if (initialAcceptedVersion < requiredVersion) {
        const shuffled = [...CURRENT_REGULATION.trivia].sort(() => 0.5 - Math.random());
        setSelectedQuestions(shuffled.slice(0, 2));
      }
    }
  }, [searchParams, initialAcceptedVersion, requiredVersion]);

  useEffect(() => { 
    async function checkAssignments() {
      // Si estamos en modo view-regulation, NO buscar asignaciones dinámicas
      const isViewRegulation = searchParams && searchParams.get('view-regulation') === '1';
      if (isViewRegulation) return;
      
      try {
        const res = await fetch('/api/user/commitment/pending');
        const data = await res.json();
        
        if (data.ok && data.assignment) {
          const assignment = data.assignment;
          
          // Solo procesar asignaciones PENDIENTES
          if (assignment.status !== 'PENDING') {
            return;
          }
          
          // Cargar datos de la asignación
          setAssignmentId(assignment.id);
          setAssignmentData(assignment);
          setIncludeTrivia(!!assignment.includeTrivia);
          loadQuestionsFromAssignment(assignment);
          
          // Mostrar el comunicado
          setManuallyClosed(false);
          setHasScrolledToBottom(false);
          setOpen(true);
          setStep('READING');
          return;
        }
        
        // Sin asignaciones dinámicas pendientes, verificar si necesita aceptar versión del reglamento base
        if (needsByVersion) {
          setOpen(true);
          const shuffled = [...CURRENT_REGULATION.trivia].sort(() => 0.5 - Math.random());
          setSelectedQuestions(shuffled.slice(0, 2));
          setStep('READING');
        }
      } catch (err) {
        console.error("Assignment check failed", err);
      }
    }
    
    // Ejecutar inmediatamente al montar
    checkAssignments();

    // Polling cada 30 segundos solo si el modal está cerrado y no fue cerrado manualmente
    const pollInterval = setInterval(() => {
      if (!open && !manuallyClosed) {
        checkAssignments();
      }
    }, 30000);

    return () => clearInterval(pollInterval);
  }, [needsByVersion, requiredVersion, searchParams, manuallyClosed]);

  useEffect(() => {
    const handleOpen = () => {
      setManuallyClosed(false); // Reset manual close state
      setOpen(true);
      if (selectedQuestions.length === 0) {
        const shuffled = [...CURRENT_REGULATION.trivia].sort(() => 0.5 - Math.random());
        setSelectedQuestions(shuffled.slice(0, 2));
      }
    };
    window.addEventListener('open-commitment-modal', handleOpen);
    return () => window.removeEventListener('open-commitment-modal', handleOpen);
  }, [selectedQuestions]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  async function finishCommitment() {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/user/commitment/accept', { 
        method: 'POST', 
        headers: { 'Content-Type':'application/json' }, 
        body: JSON.stringify({ 
          version: requiredVersion,
          assignmentId: assignmentId 
        }) 
      });
      const j = await res.json().catch(()=>({}));
      if (!res.ok || !j?.ok) throw new Error(j?.code || 'ERROR');
      setOpen(false);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally { setLoading(false); }
  }

  const handleTriviaSubmit = async () => {
    setTriviaError(null);
    const allCorrect = selectedQuestions.every(q => answers[q.id] === q.correctIndex);
    if (allCorrect) {
      // Complete the assignment since trivia was passed
      setLoading(true);
      try {
        const res = await fetch('/api/user/commitment/accept', { 
          method: 'POST', 
          headers: { 'Content-Type':'application/json' }, 
          body: JSON.stringify({ 
            version: requiredVersion,
            assignmentId: assignmentId 
          }) 
        });
        const j = await res.json().catch(()=>({}));
        if (!res.ok || !j?.ok) throw new Error(j?.code || 'ERROR');
        setStep('RESULT');
      } catch (e: any) {
        setTriviaError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    } else {
      setTriviaError("Algunas respuestas son incorrectas. Por favor, revisa el reglamento y vuelve a intentarlo.");
      // Opcionalmente reiniciar trivia o devolver al inicio
    }
  };

  if (!open) return null;

  return (
    <>
      <style jsx global>{`
        .commitment-modal-content ul {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
          list-style-type: disc;
        }
        
        .commitment-modal-content ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
          list-style-type: decimal;
        }
        
        .commitment-modal-content li {
          margin: 0.25rem 0;
        }
        
        .commitment-modal-content p {
          margin: 0.5rem 0;
        }
        
        .commitment-modal-content strong, .commitment-modal-content b {
          font-weight: 700;
        }
        
        .commitment-modal-content em, .commitment-modal-content i {
          font-style: italic;
        }
        
        .commitment-modal-content u {
          text-decoration: underline;
        }
        
        .commitment-modal-content br {
          display: block;
          content: "";
          margin: 0.5rem 0;
        }
      `}</style>

      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-2 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-xl max-h-[92dvh] sm:max-h-[85dvh] rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col relative overflow-hidden"
      >
        {(!assignmentId && !needsByVersion) && (
          <button 
            onClick={() => {
              setManuallyClosed(true);
              setOpen(false);
            }}
            className="absolute top-4 right-4 z-10 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/20">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {step === 'READING' && (assignmentId ? "📢 Comunicado Interno" : "📖 Reglamento Interno")}
            {step === 'ACCEPT' && (assignmentId ? "🤝 Confirmar Lectura" : "🤝 Aceptación del Reglamento")}
            {step === 'TRIVIA' && "🧠 Trivia de Verificación"}
            {step === 'RESULT' && (assignmentId ? "✅ ¡Comunicado Aceptado!" : "✅ ¡Reglamento Aceptado!")}
            {step === 'ALREADY_COMPLETED' && (assignmentId ? "✅ Comunicado Ya Leído" : "✅ Reglamento Ya Aceptado")}
          </h2>
        </div>

        {/* Content Area */}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-6 custom-scroll"
        >
          {step === 'READING' && (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                  {assignmentId 
                    ? "Tienes un comunicado importante que requiere tu atención. Por favor, lee el contenido completo."
                    : "Para continuar usando la plataforma, es obligatorio leer y aceptar el nuevo reglamento."}
                </p>
              </div>
              
              <h3 className="font-bold text-lg text-indigo-600 dark:text-indigo-400">
                {dynamicContent ? dynamicContent.title : CURRENT_REGULATION.title}
              </h3>
              
                {dynamicContent ? (
                  <div 
                    className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 prose prose-sm max-w-none dark:prose-invert commitment-modal-content"
                    dangerouslySetInnerHTML={{ __html: dynamicContent.paragraphs.join('<br>') }}
                    style={{
                      '--tw-prose-body': 'rgb(71 85 105)',
                      '--tw-prose-headings': 'rgb(30 58 138)',
                      '--tw-prose-lead': 'rgb(71 85 105)',
                      '--tw-prose-links': 'rgb(30 58 138)',
                      '--tw-prose-bold': 'rgb(15 23 42)',
                      '--tw-prose-counters': 'rgb(71 85 105)',
                      '--tw-prose-bullets': 'rgb(71 85 105)',
                      '--tw-prose-hr': 'rgb(226 232 240)',
                      '--tw-prose-quotes': 'rgb(71 85 105)',
                      '--tw-prose-quote-borders': 'rgb(226 232 240)',
                      '--tw-prose-captions': 'rgb(71 85 105)',
                      '--tw-prose-code': 'rgb(15 23 42)',
                      '--tw-prose-pre-code': 'rgb(241 245 249)',
                      '--tw-prose-pre-bg': 'rgb(15 23 42)',
                      '--tw-prose-th-borders': 'rgb(226 232 240)',
                      '--tw-prose-td-borders': 'rgb(226 232 240)',
                    } as React.CSSProperties}
                  />
                ) : (
                CURRENT_REGULATION.content.map((p, i) => (
                  <p key={i} className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {p}
                  </p>
                ))
              )}

              <div className="pt-10 pb-4 text-center">
                {!hasScrolledToBottom && (
                  <p className="text-xs text-slate-400 animate-pulse">
                    Desliza hasta el final para habilitar la trivia...
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 'TRIVIA' && (
            <div className="space-y-8">
              <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                Responde correctamente estas preguntas sobre el reglamento para finalizar.
              </p>
              
              {selectedQuestions.map((q, idx) => (
                <div key={q.id} className="space-y-4">
                  <h4 className="font-semibold text-slate-900 dark:text-white text-base">
                    {idx + 1}. {q.question}
                  </h4>
                  <div className="grid gap-2">
                    {q.options.map((opt, optIdx) => (
                      <button
                        key={optIdx}
                        onClick={() => setAnswers({...answers, [q.id]: optIdx})}
                        className={`text-left p-3 rounded-lg border text-sm transition-all ${
                          answers[q.id] === optIdx
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-500 dark:text-indigo-300'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 dark:bg-slate-900/40 dark:border-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {triviaError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                  {triviaError}
                </div>
              )}
            </div>
          )}

          {step === 'ACCEPT' && (
            <div className="space-y-6">
              {/* Resumen del reglamento */}
              <div className="space-y-4">
                <h3 className="font-bold text-lg text-indigo-600 dark:text-indigo-400">
                  {dynamicContent ? dynamicContent.title : CURRENT_REGULATION.title}
                </h3>
                
                <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {(dynamicContent ? dynamicContent.paragraphs : CURRENT_REGULATION.content).slice(0, 1).join(' ')}
                    {(dynamicContent ? dynamicContent.paragraphs : CURRENT_REGULATION.content).length > 1 && '...'}
                  </p>
                </div>
              </div>

              {/* Declaración de compromiso */}
              <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl p-4 sm:p-5">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    <div className="w-5 h-5 rounded-full border-2 border-indigo-500 flex items-center justify-center p-0.5">
                      <div className="w-full h-full bg-indigo-500 rounded-full" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Declaración de Compromiso</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                      "Confirmo que he leído y comprendido el reglamento presentado. Me comprometo a cumplir con todas las normas 
                      establecidas, actuar con responsabilidad en la plataforma y reportar cualquier anomalía. Entiendo que la 
                      aceptación de este reglamento es obligatoria para el desempeño de mis funciones."
                    </p>
                    {includeTrivia && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 font-medium">
                        ⚠️ Después de aceptar, deberás completar una trivia de conocimiento sobre el reglamento.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'RESULT' && (
            <div className="py-10 text-center space-y-4">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto text-4xl mb-6">
                ✓
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">¡Excelente!</h3>
              <p className="text-slate-600 dark:text-slate-400">
                {includeTrivia 
                  ? "Has demostrado conocer las normas. Tu compromiso ha sido registrado correctamente."
                  : "Has aceptado el reglamento. Tu compromiso ha sido registrado correctamente."}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-8">
                Haz clic abajo para guardar y acceder a tu panel.
              </p>
            </div>
          )}

          {step === 'ALREADY_COMPLETED' && (
            <div className="space-y-6">
              {/* Contenido completo del reglamento primero */}
              <div className="space-y-4">
                <h3 className="font-bold text-lg text-indigo-600 dark:text-indigo-400">
                  {dynamicContent ? dynamicContent.title : CURRENT_REGULATION.title}
                </h3>
                
                {dynamicContent ? (
                  <div 
                    className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 prose prose-sm max-w-none dark:prose-invert commitment-modal-content"
                    dangerouslySetInnerHTML={{ __html: dynamicContent.paragraphs[0] }}
                    style={{
                      '--tw-prose-body': 'rgb(71 85 105)',
                      '--tw-prose-headings': 'rgb(30 58 138)',
                      '--tw-prose-lead': 'rgb(71 85 105)',
                      '--tw-prose-links': 'rgb(30 58 138)',
                      '--tw-prose-bold': 'rgb(15 23 42)',
                      '--tw-prose-counters': 'rgb(71 85 105)',
                      '--tw-prose-bullets': 'rgb(71 85 105)',
                      '--tw-prose-hr': 'rgb(226 232 240)',
                      '--tw-prose-quotes': 'rgb(71 85 105)',
                      '--tw-prose-quote-borders': 'rgb(226 232 240)',
                      '--tw-prose-captions': 'rgb(71 85 105)',
                      '--tw-prose-code': 'rgb(15 23 42)',
                      '--tw-prose-pre-code': 'rgb(241 245 249)',
                      '--tw-prose-pre-bg': 'rgb(15 23 42)',
                      '--tw-prose-th-borders': 'rgb(226 232 240)',
                      '--tw-prose-td-borders': 'rgb(226 232 240)',
                    } as React.CSSProperties}
                  />
                ) : (
                  CURRENT_REGULATION.content.map((p, i) => (
                    <p key={i} className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                      {p}
                    </p>
                  ))
                )}
              </div>

              {/* Información de aceptación más abajo */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto text-4xl">
                    ℹ️
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white">Reglamento Ya Aceptado</h4>
                  <p className="text-slate-600 dark:text-slate-400">
                    Ya has completado este compromiso anteriormente.
                  </p>
                  {assignmentData?.completedAt && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                        Aceptado el {new Date(assignmentData.completedAt).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col gap-3">
          {step === 'READING' && (
            <button
              disabled={!hasScrolledToBottom}
              onClick={() => {
                setStep('ACCEPT');
              }}
              className={`w-full py-3 rounded-lg font-bold text-center transition-all ${
                hasScrolledToBottom 
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20' 
                : 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500'
              }`}
            >
              Continuar a Aceptación
            </button>
          )}

          {step === 'ACCEPT' && (
            <div className="flex gap-3">
              <button
                onClick={() => setStep('READING')}
                className="flex-1 py-3 px-4 rounded-lg font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                Volver a leer
              </button>
              <button
                onClick={async () => {
                  setLoading(true);
                  setError(null);
                  try {
                    if (includeTrivia && selectedQuestions.length > 0) {
                      // Si tiene trivia, solo registrar lectura y pasar a trivia
                      const res = await fetch('/api/user/commitment/accept', { 
                        method: 'POST', 
                        headers: { 'Content-Type':'application/json' }, 
                        body: JSON.stringify({ 
                          version: requiredVersion,
                          assignmentId: assignmentId,
                          acceptOnly: true // Solo marcar lectura, NO completar
                        }) 
                      });
                      const j = await res.json().catch(()=>({}));
                      if (!res.ok || !j?.ok) throw new Error(j?.code || 'ERROR');
                      setStep('TRIVIA');
                    } else {
                      // Sin trivia: completar directamente la asignación
                      const res = await fetch('/api/user/commitment/accept', { 
                        method: 'POST', 
                        headers: { 'Content-Type':'application/json' }, 
                        body: JSON.stringify({ 
                          version: requiredVersion,
                          assignmentId: assignmentId,
                          acceptOnly: false // Completar la asignación
                        }) 
                      });
                      const j = await res.json().catch(()=>({}));
                      if (!res.ok || !j?.ok) throw new Error(j?.code || 'ERROR');
                      setStep('RESULT');
                    }
                  } catch (e: any) {
                    setError(e.message || String(e));
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="flex-[2] py-3 px-4 rounded-lg font-bold text-center transition-all bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              >
                {loading ? 'Aceptando...' : 'ACEPTO el Comunicado'}
              </button>
            </div>
          )}

          {step === 'TRIVIA' && (
            <div className="flex gap-3">
               <button
                onClick={() => setStep('READING')}
                className="flex-1 py-3 px-4 rounded-lg font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                Volver a leer
              </button>
              <button
                disabled={Object.keys(answers).length < selectedQuestions.length || loading}
                onClick={handleTriviaSubmit}
                className={`flex-[2] py-3 px-4 rounded-lg font-bold text-center transition-all ${
                  Object.keys(answers).length >= selectedQuestions.length && !loading
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500'
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 inline mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Validando...
                  </>
                ) : (
                  'Validar Respuestas'
                )}
              </button>
            </div>
          )}

          {step === 'RESULT' && (
            <div className="flex flex-col gap-4">
              <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 sm:p-5">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    <div className="w-5 h-5 rounded-full border-2 border-green-500 flex items-center justify-center p-0.5">
                      <div className="w-full h-full bg-green-500 rounded-full" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Comunicado Aceptado</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                      Has leído y aceptado este comunicado correctamente. Tu confirmación ha sido registrada.
                    </p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => {
                  setManuallyClosed(true);
                  setOpen(false);
                  // Recargar para reflejar el estado actualizado
                  window.location.reload();
                }}
                className="w-full py-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 group"
              >
                <span>Continuar a mi panel</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          )}

          {step === 'ALREADY_COMPLETED' && (
            <button
              onClick={() => {
                setManuallyClosed(true);
                // Navegar primero, luego cerrar el modal
                window.location.href = '/u';
              }}
              className="w-full py-3 px-4 rounded-lg font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              Cerrar y volver a mi panel
            </button>
          )}

          {error && <p className="text-[10px] text-red-500 text-center">{error}</p>}
        </div>
      </div>
    </div>
    </>
  );
}
