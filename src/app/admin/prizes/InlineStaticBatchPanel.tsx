"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { ACTION_LABELS, ACTION_DESCRIPTIONS, PRIZELESS_ACTIONS } from '@/components/token-actions/types';
import type { ActionType } from '@/components/token-actions/types';

interface Props { prizes: any[]; }

type ValidityMode = 'byDays' | 'singleDay' | 'singleHour';

interface PayloadByDays { name: string; targetUrl?: string; includeQr: boolean; lazyQr: boolean; prizes: { prizeId: string; count: number }[]; validity: { mode: 'byDays'; expirationDays: number }; }
interface PayloadSingleDay { name: string; targetUrl?: string; includeQr: boolean; lazyQr: boolean; prizes: { prizeId: string; count: number }[]; validity: { mode: 'singleDay'; date: string }; }
interface PayloadSingleHour { name: string; targetUrl?: string; includeQr: boolean; lazyQr: boolean; prizes: { prizeId: string; count: number }[]; validity: { mode: 'singleHour'; date: string; hour: string; durationMinutes: number }; }

type StaticRequest = PayloadByDays | PayloadSingleDay | PayloadSingleHour;

const EXPIRATION_OPTIONS = [1,3,5,7,15,30];

export default function InlineStaticBatchPanel({ prizes }: Props) {
  const [name, setName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [mode, setMode] = useState<ValidityMode>('byDays');
  const [expirationDays, setExpirationDays] = useState(7);
  const [singleDayDate, setSingleDayDate] = useState('');
  const [hourDate, setHourDate] = useState('');
  const [hourTime, setHourTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [includeQr, setIncludeQr] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [success, setSuccess] = useState<string|null>(null);
  const [postGen, setPostGen] = useState<null | { batchId: string; blobUrl: string; filename: string; displayName?: string }>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [tokenCount, setTokenCount] = useState(50);

  // --- Action Type state ---
  const [actionType, setActionType] = useState<ActionType>('prize');
  // Trivia payload
  const [triviaQuestions, setTriviaQuestions] = useState<Array<{ question: string; answers: Array<{ text: string; correct: boolean }>; points: number }>>(
    [{ question: '', answers: [{ text: '', correct: true }, { text: '', correct: false }, { text: '', correct: false }, { text: '', correct: false }], points: 10 }]
  );
  const [triviaSuccessMsg, setTriviaSuccessMsg] = useState('¡Respuesta correcta! Muestra esta pantalla al animador.');
  const [triviaFailMsg, setTriviaFailMsg] = useState('¡Casi! Mejor suerte la próxima.');
  // Phrase payload
  const [phrases, setPhrases] = useState<string[]>(['']);
  const [phraseStyle, setPhraseStyle] = useState<'motivational' | 'funny' | 'wisdom' | 'custom'>('motivational');
  // Challenge payload
  const [challenges, setChallenges] = useState<string[]>(['']);
  const [challengeDifficulty, setChallengeDifficulty] = useState<'easy'|'medium'|'hard'>('medium');
  const [challengeRequiresValidation, setChallengeRequiresValidation] = useState(true);
  // Raffle payload
  const [raffleName, setRaffleName] = useState('');
  const [raffleMaxParticipants, setRaffleMaxParticipants] = useState(999);
  // Message payload
  const [messageHtml, setMessageHtml] = useState('');
  const [messageCtaLabel, setMessageCtaLabel] = useState('');
  const [messageCtaUrl, setMessageCtaUrl] = useState('');
  // Feedback payload
  const [feedbackPrompt, setFeedbackPrompt] = useState('¿Qué te pareció la noche?');
  const [feedbackPlaceholder, setFeedbackPlaceholder] = useState('Escribe aquí tu mensaje…');
  const [feedbackMinLength, setFeedbackMinLength] = useState(5);
  const [feedbackMaxLength, setFeedbackMaxLength] = useState(500);
  const [feedbackThankYou, setFeedbackThankYou] = useState('¡Gracias por tu mensaje!');

  function buildActionPayload(): string | undefined {
    if (actionType === 'prize') return undefined;
    if (actionType === 'trivia') {
      return JSON.stringify({
        questions: triviaQuestions.filter(q => q.question.trim()),
        successMessage: triviaSuccessMsg,
        failMessage: triviaFailMsg,
      });
    }
    if (actionType === 'phrase') {
      return JSON.stringify({ phrases: phrases.filter(p => p.trim()), style: phraseStyle });
    }
    if (actionType === 'challenge') {
      return JSON.stringify({
        challenges: challenges.filter(c => c.trim()),
        difficulty: challengeDifficulty,
        requiresValidation: challengeRequiresValidation,
      });
    }
    if (actionType === 'raffle') {
      return JSON.stringify({ raffleName, autoNumber: true, maxParticipants: raffleMaxParticipants });
    }
    if (actionType === 'message') {
      return JSON.stringify({
        htmlContent: messageHtml,
        ctaLabel: messageCtaLabel || undefined,
        ctaUrl: messageCtaUrl || undefined,
      });
    }
    if (actionType === 'feedback') {
      return JSON.stringify({
        prompt: feedbackPrompt,
        placeholder: feedbackPlaceholder || undefined,
        minLength: feedbackMinLength,
        maxLength: feedbackMaxLength,
        thankYouMessage: feedbackThankYou || undefined,
      });
    }
    return undefined;
  }

  // Derived
  // Solo mostrar premios activos con stock numérico disponible > 0 (evitar premios ya emitidos o ilimitados/null)
  const activePrizeList = useMemo(() => prizes.filter(p => p.active && typeof p.stock === 'number' && p.stock > 0), [prizes]);
  const isPrizeless = PRIZELESS_ACTIONS.has(actionType);
  const totalRequested = useMemo(() => isPrizeless ? tokenCount : Object.entries(counts).reduce((a,[id,v]) => a + (v||0),0), [counts, isPrizeless, tokenCount]);

  useEffect(() => { if (success||error) { const t = setTimeout(()=>{ setSuccess(null); setError(null); }, 4000); return () => clearTimeout(t);} }, [success,error]);
  useEffect(() => () => { if (postGen?.blobUrl) { try { URL.revokeObjectURL(postGen.blobUrl); } catch {} } }, [postGen?.blobUrl]);

  function setCount(prizeId: string, value: number) {
    setCounts(prev => ({ ...prev, [prizeId]: value }));
  }
  function fillMax() {
    const next: Record<string, number> = {};
    for (const p of activePrizeList) {
      if (typeof p.stock === 'number' && p.stock > 0) next[p.id] = p.stock;
    }
    setCounts(next);
  }
  function clearAll() { setCounts({}); }

  async function generate() {
    if (loading) return;
    const trimmedUrl = targetUrl.trim();
    if (trimmedUrl && !/^https?:\/\//i.test(trimmedUrl)) { setError('URL debe iniciar con http(s)://'); return; }
    if (totalRequested <= 0) { setError(isPrizeless ? 'Define cantidad de tokens' : 'Define cantidades'); return; }
    setLoading(true); setError(null); setSuccess(null);
    try {
      let payload: StaticRequest;
      const base = {
        name: name || 'Lote estático',
        ...(trimmedUrl && { targetUrl: trimmedUrl }),
        includeQr,
        lazyQr: false,
        ...(isPrizeless
          ? { prizes: [] as { prizeId: string; count: number }[], tokenCount }
          : { prizes: Object.entries(counts).filter(([,v]) => v>0).map(([prizeId,v]) => ({ prizeId, count: v })) }),
        actionType,
        actionPayload: buildActionPayload(),
      };
      if (mode === 'byDays') {
        payload = { ...base, validity: { mode: 'byDays', expirationDays } } as PayloadByDays;
      } else if (mode === 'singleDay') {
        if (!singleDayDate) throw new Error('Selecciona fecha');
        payload = { ...base, validity: { mode: 'singleDay', date: singleDayDate } } as PayloadSingleDay;
      } else {
        if (!hourDate) throw new Error('Fecha ventana requerida');
        if (!/^[0-2]\d:[0-5]\d$/.test(hourTime)) throw new Error('Hora inválida');
        payload = { ...base, validity: { mode: 'singleHour', date: hourDate, hour: hourTime, durationMinutes } } as PayloadSingleHour;
      }
      const res = await fetch('/api/batch/generate-static', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const ct = res.headers.get('Content-Type') || '';
      if (!res.ok) {
        if (ct.includes('application/json')) {
          const j = await res.json().catch(()=>({}));
          setError(j.error || 'Error');
        } else setError('Error desconocido');
        return;
      }
      if (ct.includes('application/zip')) {
        const blob = await res.blob();
        let batchId: string | undefined; let totalTokens: number | undefined;
        try {
          const JSZipMod = await import('jszip');
          const zip = await JSZipMod.loadAsync(blob);
            const manifestFile = zip.file('manifest.json');
            if (manifestFile) {
              const txt = await manifestFile.async('text');
              const mf = JSON.parse(txt);
              batchId = mf.batchId; totalTokens = mf.meta?.totalTokens;
            }
        } catch {}
        const url = URL.createObjectURL(blob);
        setPostGen({ batchId: batchId || '', blobUrl: url, filename: `lote_static_${Date.now()}.zip`, displayName: name });
        setSuccess(`Lote estático generado${totalTokens ? ` (${totalTokens} tokens)` : ''}`);
      } else {
        setError('Respuesta inesperada');
      }
    } catch (e: any) {
      setError(e.message || 'Fallo red');
    } finally { setLoading(false); }
  }

  function downloadZip() {
    if (!postGen) return; const a = document.createElement('a'); a.href = postGen.blobUrl; a.download = postGen.filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(postGen.blobUrl); setPostGen(null);
  }

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <span className="text-sm font-medium">Lote Estático (interfaz interna)</span>
        {!isPrizeless && <button type="button" className="text-[10px] underline" onClick={fillMax}>Rellenar máximos</button>}
      </div>
      <div className="card-body grid gap-4 md:grid-cols-4">
        {postGen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="card w-[92%] max-w-md">
              <div className="card-header"><h3 className="text-sm font-medium">Lote estático listo</h3></div>
              <div className="card-body space-y-3 text-sm">
                <p>Puedes descargar el ZIP ahora.</p>
                <div className="flex gap-2">
                  <button className="btn !py-1 !px-3 text-xs" onClick={downloadZip}>Descargar ZIP</button>
                  <button className="btn-outline !py-1 !px-3 text-xs" onClick={() => { if (postGen.blobUrl) URL.revokeObjectURL(postGen.blobUrl); setPostGen(null); }}>Cerrar</button>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="form-row">
          <label className="text-xs font-medium">Nombre</label>
          <input className="input" value={name} maxLength={120} placeholder="Ej: Campaña Octubre" onChange={e=>setName(e.target.value)} />
        </div>
        <div className="form-row md:col-span-2">
          <label className="text-xs font-medium">URL del Premio <span className="text-slate-500">(opcional)</span></label>
          <input className="input" value={targetUrl} placeholder="https://..." onChange={e=>setTargetUrl(e.target.value)} />
        </div>
        <div className="form-row">
          <label className="text-xs font-medium">Incluye QR</label>
          <label className="inline-flex items-center gap-2 text-xs"><input type="checkbox" checked={includeQr} onChange={e=>setIncludeQr(e.target.checked)} /><span>Sí</span></label>
        </div>
        <div className="form-row md:col-span-4">
          <label className="text-xs font-medium">Tipo de Acción del Token</label>
          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            {(Object.keys(ACTION_LABELS) as ActionType[]).map(t => (
              <label key={t} className="inline-flex items-center gap-1 cursor-pointer">
                <input type="radio" name="action-type" value={t} checked={actionType===t} onChange={()=>setActionType(t)} />
                <span>{ACTION_LABELS[t]}</span>
              </label>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">{ACTION_DESCRIPTIONS[actionType]}</p>
        </div>

        {/* --- Action payload editors --- */}
        {actionType === 'trivia' && (
          <div className="md:col-span-4 space-y-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-xs font-medium text-blue-700 dark:text-blue-300">🧩 Configuración de Trivia Rápida</div>
            {triviaQuestions.map((q, qi) => (
              <div key={qi} className="p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex gap-2 items-center">
                  <span className="text-[10px] text-slate-500">P{qi+1}</span>
                  <input className="input flex-1 text-xs" placeholder="Pregunta..." value={q.question} onChange={e=>{ const nq = [...triviaQuestions]; nq[qi] = { ...nq[qi], question: e.target.value }; setTriviaQuestions(nq); }} />
                  <input type="number" min={1} max={100} className="input w-16 text-xs" placeholder="Pts" value={q.points} onChange={e=>{ const nq = [...triviaQuestions]; nq[qi] = { ...nq[qi], points: Number(e.target.value)||10 }; setTriviaQuestions(nq); }} />
                  {triviaQuestions.length > 1 && <button type="button" className="text-rose-500 text-xs" onClick={()=>setTriviaQuestions(triviaQuestions.filter((_,i)=>i!==qi))}>✕</button>}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {q.answers.map((a, ai) => (
                    <div key={ai} className="flex items-center gap-1">
                      <input type="radio" name={`correct-${qi}`} checked={a.correct} onChange={()=>{ const nq = [...triviaQuestions]; nq[qi] = { ...nq[qi], answers: nq[qi].answers.map((x,j)=>({...x, correct: j===ai})) }; setTriviaQuestions(nq); }} title="Correcta" />
                      <input className="input flex-1 text-[10px]" placeholder={`Opción ${ai+1}`} value={a.text} onChange={e=>{ const nq = [...triviaQuestions]; nq[qi] = { ...nq[qi], answers: nq[qi].answers.map((x,j)=> j===ai ? {...x, text: e.target.value} : x) }; setTriviaQuestions(nq); }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button type="button" className="btn-outline !py-1 !px-2 text-[10px]" onClick={()=>setTriviaQuestions([...triviaQuestions, { question: '', answers: [{text:'',correct:true},{text:'',correct:false},{text:'',correct:false},{text:'',correct:false}], points: 10 }])}>+ Agregar pregunta</button>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[10px] text-slate-600">Mensaje si acierta</label><input className="input text-xs" value={triviaSuccessMsg} onChange={e=>setTriviaSuccessMsg(e.target.value)} /></div>
              <div><label className="text-[10px] text-slate-600">Mensaje si falla</label><input className="input text-xs" value={triviaFailMsg} onChange={e=>setTriviaFailMsg(e.target.value)} /></div>
            </div>
          </div>
        )}

        {actionType === 'phrase' && (
          <div className="md:col-span-4 space-y-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="text-xs font-medium text-amber-700 dark:text-amber-300">💬 Configuración de Frases</div>
            <div className="flex gap-3 text-[11px]">
              {(['motivational','funny','wisdom','custom'] as const).map(s => (
                <label key={s} className="inline-flex items-center gap-1"><input type="radio" name="phrase-style" value={s} checked={phraseStyle===s} onChange={()=>setPhraseStyle(s)} /><span className="capitalize">{s === 'motivational' ? 'Motivacional' : s === 'funny' ? 'Divertida' : s === 'wisdom' ? 'Sabiduría' : 'Personalizada'}</span></label>
              ))}
            </div>
            {phrases.map((p, i) => (
              <div key={i} className="flex gap-1 items-center">
                <input className="input flex-1 text-xs" placeholder={`Frase ${i+1}...`} value={p} onChange={e=>{ const np=[...phrases]; np[i]=e.target.value; setPhrases(np); }} />
                {phrases.length > 1 && <button type="button" className="text-rose-500 text-xs" onClick={()=>setPhrases(phrases.filter((_,j)=>j!==i))}>✕</button>}
              </div>
            ))}
            <button type="button" className="btn-outline !py-1 !px-2 text-[10px]" onClick={()=>setPhrases([...phrases,''])}>+ Agregar frase</button>
            <p className="text-[10px] text-slate-500">Cada token mostrará una frase aleatoria del pool.</p>
          </div>
        )}

        {actionType === 'challenge' && (
          <div className="md:col-span-4 space-y-3 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
            <div className="text-xs font-medium text-green-700 dark:text-green-300">🎯 Configuración de Retos</div>
            <div className="flex gap-3 text-[11px]">
              {(['easy','medium','hard'] as const).map(d => (
                <label key={d} className="inline-flex items-center gap-1"><input type="radio" name="challenge-diff" value={d} checked={challengeDifficulty===d} onChange={()=>setChallengeDifficulty(d)} /><span>{d==='easy'?'🟢 Fácil':d==='medium'?'🟡 Medio':'🔴 Difícil'}</span></label>
              ))}
            </div>
            {challenges.map((c, i) => (
              <div key={i} className="flex gap-1 items-center">
                <input className="input flex-1 text-xs" placeholder={`Reto ${i+1}...`} value={c} onChange={e=>{ const nc=[...challenges]; nc[i]=e.target.value; setChallenges(nc); }} />
                {challenges.length > 1 && <button type="button" className="text-rose-500 text-xs" onClick={()=>setChallenges(challenges.filter((_,j)=>j!==i))}>✕</button>}
              </div>
            ))}
            <button type="button" className="btn-outline !py-1 !px-2 text-[10px]" onClick={()=>setChallenges([...challenges,''])}>+ Agregar reto</button>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2"><label className="text-[10px] text-slate-600"><input type="checkbox" checked={challengeRequiresValidation} onChange={e=>setChallengeRequiresValidation(e.target.checked)} className="mr-1" />Requiere validación del animador</label></div>
            </div>
          </div>
        )}

        {actionType === 'raffle' && (
          <div className="md:col-span-4 space-y-3 p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="text-xs font-medium text-purple-700 dark:text-purple-300">🎰 Configuración de Sorteo</div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[10px] text-slate-600">Nombre del sorteo</label><input className="input text-xs" placeholder="Ej: Sorteo Gran Premio 10pm" value={raffleName} onChange={e=>setRaffleName(e.target.value)} /></div>
              <div><label className="text-[10px] text-slate-600">Máximo participantes</label><input type="number" min={10} max={9999} className="input text-xs" value={raffleMaxParticipants} onChange={e=>setRaffleMaxParticipants(Number(e.target.value)||999)} /></div>
            </div>
            <p className="text-[10px] text-slate-500">Cada token genera un número único de participación automáticamente.</p>
          </div>
        )}

        {actionType === 'message' && (
          <div className="md:col-span-4 space-y-3 p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="text-xs font-medium text-orange-700 dark:text-orange-300">📢 Configuración de Mensaje</div>
            <div><label className="text-[10px] text-slate-600">Contenido HTML</label><textarea className="input text-xs" rows={4} placeholder="<h2>¡Bienvenidos!</h2><p>Disfruten la noche...</p>" value={messageHtml} onChange={e=>setMessageHtml(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[10px] text-slate-600">Botón CTA (opcional)</label><input className="input text-xs" placeholder="Ver menú" value={messageCtaLabel} onChange={e=>setMessageCtaLabel(e.target.value)} /></div>
              <div><label className="text-[10px] text-slate-600">URL del CTA</label><input className="input text-xs" placeholder="https://..." value={messageCtaUrl} onChange={e=>setMessageCtaUrl(e.target.value)} /></div>
            </div>
          </div>
        )}

        {actionType === 'feedback' && (
          <div className="md:col-span-4 space-y-3 p-3 bg-teal-50 dark:bg-teal-900/10 rounded-lg border border-teal-200 dark:border-teal-800">
            <div className="text-xs font-medium text-teal-700 dark:text-teal-300">✉️ Configuración de Feedback</div>
            <div><label className="text-[10px] text-slate-600">Pregunta / Prompt</label><input className="input text-xs" placeholder="¿Qué te pareció la noche?" value={feedbackPrompt} onChange={e=>setFeedbackPrompt(e.target.value)} /></div>
            <div><label className="text-[10px] text-slate-600">Placeholder del campo de texto</label><input className="input text-xs" placeholder="Escribe aquí tu mensaje…" value={feedbackPlaceholder} onChange={e=>setFeedbackPlaceholder(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[10px] text-slate-600">Mínimo caracteres</label><input type="number" min={1} max={200} className="input text-xs" value={feedbackMinLength} onChange={e=>setFeedbackMinLength(Number(e.target.value)||5)} /></div>
              <div><label className="text-[10px] text-slate-600">Máximo caracteres</label><input type="number" min={10} max={2000} className="input text-xs" value={feedbackMaxLength} onChange={e=>setFeedbackMaxLength(Number(e.target.value)||500)} /></div>
            </div>
            <div><label className="text-[10px] text-slate-600">Mensaje de agradecimiento</label><input className="input text-xs" placeholder="¡Gracias por tu mensaje!" value={feedbackThankYou} onChange={e=>setFeedbackThankYou(e.target.value)} /></div>
            <p className="text-[10px] text-slate-500">El cliente escribe un mensaje. Al enviarlo, obtiene el QR de su premio.</p>
          </div>
        )}

        <div className="form-row md:col-span-4">
          <label className="text-xs font-medium">Modo de validez</label>
          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <label className="inline-flex items-center gap-1"><input type="radio" name="static-validity" value="byDays" checked={mode==='byDays'} onChange={()=>setMode('byDays')} /><span>Por días</span></label>
            <label className="inline-flex items-center gap-1"><input type="radio" name="static-validity" value="singleDay" checked={mode==='singleDay'} onChange={()=>{setMode('singleDay');}} /><span>Día específico</span></label>
            <label className="inline-flex items-center gap-1"><input type="radio" name="static-validity" value="singleHour" checked={mode==='singleHour'} onChange={()=>{setMode('singleHour');}} /><span>Ventana horaria</span></label>
          </div>
        </div>
        {mode==='byDays' && (
          <div className="form-row">
            <label className="text-xs font-medium">Expiración</label>
            <select className="input" value={expirationDays} onChange={e=>setExpirationDays(Number(e.target.value))}>{EXPIRATION_OPTIONS.map(d=> <option key={d} value={d}>{d} días</option>)}</select>
          </div>) }
        {mode==='singleDay' && (
          <div className="form-row">
            <label className="text-xs font-medium">Fecha</label>
            <input type="date" className="input" value={singleDayDate} onChange={e=>setSingleDayDate(e.target.value)} />
          </div>) }
        {mode==='singleHour' && (
          <>
            <div className="form-row"><label className="text-xs font-medium">Fecha ventana</label><input type="date" className="input" value={hourDate} onChange={e=>setHourDate(e.target.value)} /></div>
            <div className="form-row"><label className="text-xs font-medium">Hora inicio</label><input type="time" className="input" value={hourTime} onChange={e=>setHourTime(e.target.value)} /></div>
            <div className="form-row"><label className="text-xs font-medium">Duración</label><select className="input" value={durationMinutes} onChange={e=>setDurationMinutes(Number(e.target.value))}>{[15,30,45,60,90,120,180,240,360].map(m=> <option key={m} value={m}>{m} min</option>)}</select></div>
          </>) }
        <div className="md:col-span-4">
          {isPrizeless ? (
            <div className="space-y-2">
              <label className="text-xs font-medium">Cantidad de tokens en el lote</label>
              <input type="number" min={1} max={100000} className="input w-40 text-xs" value={tokenCount} onChange={e => setTokenCount(Math.max(1, Number(e.target.value) || 1))} />
              <p className="text-[10px] text-slate-500">Este tipo de acción no consume premios. Los tokens se generan sin premio asociado.</p>
            </div>
          ) : (
            <>
          <table className="w-full text-[11px] border-collapse">
            <thead><tr className="text-left"><th className="py-1 pr-2">Premio</th><th className="py-1 pr-2 w-20">Stock</th><th className="py-1 pr-2 w-28">Cantidad</th></tr></thead>
            <tbody>
              {activePrizeList.map(p => (
                <tr key={p.id} className="border-t border-slate-200 dark:border-slate-700">
                  <td className="py-1 pr-2"><span className="inline-block h-2 w-2 rounded-full align-middle mr-1" style={{ background: p.color || '#999' }} />{p.label}</td>
                  <td className="py-1 pr-2 tabular-nums text-xs">{typeof p.stock === 'number' ? p.stock : '—'}</td>
                  <td className="py-1 pr-2">
                    <input type="number" min={0} max={p.stock || 999999} className="input h-6 text-xs" value={counts[p.id] ?? ''} onChange={e=> setCount(p.id, e.target.value === '' ? 0 : Number(e.target.value))} />
                  </td>
                </tr>
              ))}
              {activePrizeList.length === 0 && <tr><td colSpan={3} className="py-2 text-center italic text-slate-500">No hay premios con stock disponible</td></tr>}
            </tbody>
          </table>
          <div className="mt-2 flex flex-wrap gap-3 text-[10px] items-center">
            <span>Total solicitado: {totalRequested}</span>
            <button type="button" className="btn-outline !py-1 !px-2 text-[10px]" onClick={fillMax}>Usar stock completo</button>
            <button type="button" className="btn-outline !py-1 !px-2 text-[10px]" onClick={clearAll}>Limpiar</button>
          </div>
          <p className="mt-1 text-[10px] text-slate-500">Sólo se listan premios con stock &gt; 0. Los agotados o ilimitados no pueden usarse en lotes estáticos.</p>
            </>
          )}
        </div>
        <div className="col-span-full flex items-center gap-3">
          <button type="button" className="btn text-xs" disabled={loading || totalRequested<=0} onClick={generate}>{loading ? 'Generando…' : 'Generar Lote Estático'}</button>
          {error && <span className="text-[11px] text-rose-600">{error}</span>}
          {success && <span className="text-[11px] text-emerald-600">{success}</span>}
        </div>
        <p className="col-span-full text-[10px] text-slate-500">{isPrizeless ? 'Las frases y mensajes no consumen premios. Solo aplican las reglas de validez (expiración, fecha, ventana horaria).' : 'Los tokens muestran la interfaz según el tipo de acción seleccionado. Tipo "Premio" muestra la interfaz clásica de canje. Los demás tipos muestran experiencias interactivas (trivia, retos, frases, etc.).'}</p>
      </div>
    </div>
  );
}
