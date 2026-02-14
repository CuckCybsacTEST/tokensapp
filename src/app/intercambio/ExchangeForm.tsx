'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Video, Type, BrainCircuit, Upload, X, CheckCircle2, Loader2, AlertCircle, ArrowLeft, Send } from 'lucide-react';
import TriviaPlayer from './TriviaPlayer';

// ── Types ─────────────────────────────────────────────────────────────
interface BatchInfo {
  id: string;
  name: string;
  description: string | null;
  maxExchanges: number | null;
  triviaQuestionSetId: string | null;
  _count: { exchanges: number };
}

interface PolicyInfo {
  allowPhoto: boolean;
  allowVideo: boolean;
  allowText: boolean;
  allowTrivia: boolean;
  requireWhatsapp: boolean;
  requireDni: boolean;
  maxMediaSize: number;
  allowedMediaFormats: string;
  maxVideoSize: number;
  allowedVideoFormats: string;
  triviaSetId: string | null;
}

interface UploadedMedia {
  mediaType: string;
  imageUrl: string;
  originalImageUrl: string;
  thumbnailUrl: string | null;
  mediaMetadata?: any;
}

interface FormState {
  loading: boolean;
  loadingBatch: boolean;
  error: string | null;
  step: 'select-type' | 'fill-form' | 'uploading' | 'submitting' | 'success' | 'error';
  batch: BatchInfo | null;
  policy: PolicyInfo | null;
  available: boolean;
  batches: { id: string; name: string; description: string | null }[];
  // Form fields
  exchangeType: string;
  customerName: string;
  customerWhatsapp: string;
  customerDni: string;
  customerText: string;
  uploadedMedia: UploadedMedia[];
  uploadProgress: number;
  // Trivia
  triviaSessionId: string | null;
  triviaCompleted: boolean;
  triviaTotalPoints: number;
  // Result
  resultMessage: string;
  rewardAssigned: boolean;
  rewardUrl: string | null;
  rewardPrizeLabel: string | null;
  rewardPrizeColor: string | null;
}

const INITIAL_STATE: FormState = {
  loading: false,
  loadingBatch: true,
  error: null,
  step: 'select-type',
  batch: null,
  policy: null,
  available: true,
  batches: [],
  exchangeType: '',
  customerName: '',
  customerWhatsapp: '',
  customerDni: '',
  customerText: '',
  uploadedMedia: [],
  uploadProgress: 0,
  triviaSessionId: null,
  triviaCompleted: false,
  triviaTotalPoints: 0,
  resultMessage: '',
  rewardAssigned: false,
  rewardUrl: null,
  rewardPrizeLabel: null,
  rewardPrizeColor: null,
};

const TYPE_CONFIG: Record<string, { icon: any; label: string; description: string; color: string }> = {
  photo: { icon: Camera, label: 'Foto', description: 'Comparte una foto de tu experiencia', color: 'from-blue-500 to-cyan-400' },
  video: { icon: Video, label: 'Video', description: 'Graba un video corto', color: 'from-purple-500 to-pink-400' },
  text: { icon: Type, label: 'Texto', description: 'Escribe sobre tu experiencia', color: 'from-green-500 to-emerald-400' },
  trivia: { icon: BrainCircuit, label: 'Trivia', description: 'Responde preguntas correctamente', color: 'from-yellow-500 to-orange-400' },
};

export default function ExchangeForm() {
  const searchParams = useSearchParams();
  const batchId = searchParams?.get('batchId') || searchParams?.get('batch') || null;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<FormState>(INITIAL_STATE);

  const updateState = useCallback((updates: Partial<FormState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // ── Load batch info ─────────────────────────────────────────────
  useEffect(() => {
    async function loadBatchInfo() {
      try {
        const url = batchId
          ? `/api/exchange/submit?batchId=${batchId}`
          : '/api/exchange/submit';

        const res = await fetch(url);
        const data = await res.json();

        if (batchId && data.batch) {
          updateState({
            loadingBatch: false,
            batch: data.batch,
            policy: data.policy,
            available: data.available,
          });
        } else if (data.batches) {
          updateState({
            loadingBatch: false,
            batches: data.batches,
          });
        } else {
          updateState({ loadingBatch: false });
        }
      } catch {
        updateState({ loadingBatch: false, error: 'Error cargando información' });
      }
    }

    loadBatchInfo();
  }, [batchId, updateState]);

  // ── File upload handler ─────────────────────────────────────────
  const handleFileUpload = async (file: File) => {
    updateState({ step: 'uploading', uploadProgress: 0, error: null });

    const formData = new FormData();
    formData.append('file', file);
    if (batchId) formData.append('batchId', batchId);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setState(prev => ({
        ...prev,
        uploadProgress: Math.min(prev.uploadProgress + Math.random() * 15, 90)
      }));
    }, 300);

    try {
      const res = await fetch('/api/exchange/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error subiendo archivo');
      }

      const data = await res.json();
      updateState({
        step: 'fill-form',
        uploadProgress: 100,
        uploadedMedia: [...state.uploadedMedia, {
          mediaType: data.mediaType,
          imageUrl: data.imageUrl,
          originalImageUrl: data.originalImageUrl,
          thumbnailUrl: data.thumbnailUrl,
          mediaMetadata: data.metadata,
        }],
      });
    } catch (err: any) {
      clearInterval(progressInterval);
      updateState({ step: 'fill-form', error: err.message, uploadProgress: 0 });
    }
  };

  // ── Submit handler ──────────────────────────────────────────────
  const handleSubmit = async () => {
    updateState({ step: 'submitting', error: null });

    try {
      const body: any = {
        batchId: batchId || state.batch?.id || null,
        customerName: state.customerName,
        customerWhatsapp: state.customerWhatsapp,
        customerDni: state.customerDni || undefined,
        exchangeType: state.exchangeType,
        customerText: state.exchangeType === 'text' ? state.customerText : undefined,
        triviaSessionId: state.triviaSessionId || undefined,
        media: state.uploadedMedia.length > 0 ? state.uploadedMedia : undefined,
      };

      const res = await fetch('/api/exchange/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error enviando intercambio');
      }

      updateState({
        step: 'success',
        resultMessage: data.message,
        rewardAssigned: data.rewardAssigned,
        rewardUrl: data.rewardUrl || null,
        rewardPrizeLabel: data.rewardPrizeLabel || null,
        rewardPrizeColor: data.rewardPrizeColor || null,
      });
    } catch (err: any) {
      updateState({ step: 'fill-form', error: err.message });
    }
  };

  // ── Remove media ────────────────────────────────────────────────
  const removeMedia = (index: number) => {
    updateState({
      uploadedMedia: state.uploadedMedia.filter((_, i) => i !== index)
    });
  };

  // ── Determine allowed types (always from policy) ───────────────
  const getAllowedTypes = (): string[] => {
    if (state.policy) {
      const types: string[] = [];
      if (state.policy.allowPhoto) types.push('photo');
      if (state.policy.allowVideo) types.push('video');
      if (state.policy.allowText) types.push('text');
      if (state.policy.allowTrivia) types.push('trivia');
      return types;
    }
    return ['photo', 'text'];
  };

  // ── Resolve trivia set: batch override > policy default ─────────
  const getTriviaSetId = (): string | null => {
    return state.batch?.triviaQuestionSetId || state.policy?.triviaSetId || null;
  };

  // ── Can submit? ─────────────────────────────────────────────────
  const canSubmit = (): boolean => {
    if (!state.customerName.trim()) return false;
    if (state.policy?.requireWhatsapp && !state.customerWhatsapp.trim()) return false;
    if (state.policy?.requireDni && !state.customerDni.trim()) return false;

    if (state.exchangeType === 'photo' || state.exchangeType === 'video') {
      return state.uploadedMedia.length > 0;
    }
    if (state.exchangeType === 'text') {
      return state.customerText.trim().length >= 5;
    }
    return true;
  };

  // ── Loading state ───────────────────────────────────────────────
  if (state.loadingBatch) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
      </div>
    );
  }

  // ── No batch / batch list ───────────────────────────────────────
  if (!batchId && !state.batch && state.batches.length > 0) {
    return (
      <div className="space-y-4">
        <p className="text-white/70 text-center mb-6">Selecciona una campaña</p>
        {state.batches.map(b => (
          <a
            key={b.id}
            href={`/intercambio?batchId=${b.id}`}
            className="block bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all"
          >
            <h3 className="font-semibold text-lg">{b.name}</h3>
            {b.description && <p className="text-white/50 text-sm mt-1">{b.description}</p>}

          </a>
        ))}
      </div>
    );
  }

  if (!batchId && !state.batch && state.batches.length === 0) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 text-white/30 mx-auto mb-4" />
        <p className="text-white/50">No hay campañas disponibles en este momento</p>
      </div>
    );
  }

  if (!state.available) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
        <p className="text-white/70">Esta campaña ha alcanzado el máximo de participaciones</p>
      </div>
    );
  }

  // ── Success state ───────────────────────────────────────────────
  if (state.step === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold mb-3">
          {state.rewardAssigned ? '¡Premio Asignado!' : '¡Enviado!'}
        </h2>
        <p className="text-white/60 mb-6">{state.resultMessage}</p>

        {/* Show reward QR link */}
        {state.rewardAssigned && state.rewardUrl && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <div className="bg-gradient-to-br from-yellow-500/20 to-red-500/20 border border-yellow-500/30 rounded-2xl p-6 max-w-sm mx-auto">
              <p className="text-yellow-300 font-semibold text-lg mb-2">
                🎉 {state.rewardPrizeLabel || 'Tu Premio'}
              </p>
              <p className="text-white/50 text-sm mb-4">Toca el botón para ver tu QR de premio</p>
              <a
                href={state.rewardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-400 to-red-400 text-black font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                🎫 Ver mi Premio
              </a>
            </div>
          </motion.div>
        )}

        <button
          onClick={() => {
            setState(INITIAL_STATE);
            updateState({ loadingBatch: false, batch: state.batch, policy: state.policy, available: true });
          }}
          className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
        >
          Hacer otro intercambio
        </button>
      </motion.div>
    );
  }

  const allowedTypes = getAllowedTypes();

  // ── Type selection ──────────────────────────────────────────────
  if (state.step === 'select-type' && !state.exchangeType) {
    return (
      <div className="space-y-4">
        {state.batch && (
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold">{state.batch.name}</h2>
            {state.batch.description && (
              <p className="text-white/50 text-sm mt-1">{state.batch.description}</p>
            )}
          </div>
        )}
        <p className="text-white/70 text-center mb-4">¿Cómo quieres participar?</p>
        <div className="grid grid-cols-2 gap-3">
          {allowedTypes.map(type => {
            const cfg = TYPE_CONFIG[type];
            if (!cfg) return null;
            const Icon = cfg.icon;
            return (
              <motion.button
                key={type}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => updateState({ exchangeType: type, step: 'fill-form' })}
                className={`relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center hover:bg-white/10 transition-all`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${cfg.color} flex items-center justify-center mx-auto mb-3`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold">{cfg.label}</h3>
                <p className="text-white/50 text-xs mt-1">{cfg.description}</p>
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Form + Upload ───────────────────────────────────────────────
  const typeCfg = TYPE_CONFIG[state.exchangeType];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => updateState({ exchangeType: '', step: 'select-type', uploadedMedia: [], error: null, triviaSessionId: null, triviaCompleted: false, triviaTotalPoints: 0 })}
        className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Cambiar tipo
      </button>

      {/* Type badge */}
      {typeCfg && (
        <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${typeCfg.color} flex items-center justify-center`}>
            <typeCfg.icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-medium">{typeCfg.label}</span>
            <p className="text-white/40 text-xs">{typeCfg.description}</p>
          </div>
        </div>
      )}

      {/* Error */}
      <AnimatePresence>
        {state.error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{state.error}</span>
            <button onClick={() => updateState({ error: null })} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media upload area (photo/video) */}
      {(state.exchangeType === 'photo' || state.exchangeType === 'video') && (
        <div className="space-y-3">
          {/* Upload progress */}
          {state.step === 'uploading' && (
            <div className="bg-white/5 rounded-xl p-6 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-yellow-400 mx-auto mb-3" />
              <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                <div
                  className="bg-gradient-to-r from-yellow-400 to-red-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${state.uploadProgress}%` }}
                />
              </div>
              <p className="text-white/50 text-sm">Subiendo archivo...</p>
            </div>
          )}

          {/* Uploaded media previews */}
          {state.uploadedMedia.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {state.uploadedMedia.map((m, i) => (
                <div key={i} className="relative group rounded-xl overflow-hidden border border-white/10">
                  {m.mediaType === 'video' ? (
                    <video
                      src={m.imageUrl}
                      className="w-full h-32 object-cover"
                      muted
                    />
                  ) : (
                    <img
                      src={m.thumbnailUrl || m.imageUrl}
                      alt={`Foto ${i + 1}`}
                      className="w-full h-32 object-cover"
                    />
                  )}
                  <button
                    onClick={() => removeMedia(i)}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload button */}
          {state.step !== 'uploading' && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-white/40 hover:bg-white/5 transition-all"
            >
              <Upload className="w-8 h-8 text-white/40 mx-auto mb-2" />
              <p className="text-white/60 text-sm">
                {state.uploadedMedia.length > 0
                  ? 'Agregar otro archivo'
                  : state.exchangeType === 'video' ? 'Toca para subir video' : 'Toca para subir foto'}
              </p>
              {state.policy && (
                <p className="text-white/30 text-xs mt-1">
                  Máx. {Math.round((state.exchangeType === 'video' ? state.policy.maxVideoSize : state.policy.maxMediaSize) / 1048576)}MB
                  — {state.exchangeType === 'video' ? state.policy.allowedVideoFormats : state.policy.allowedMediaFormats}
                </p>
              )}
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={state.exchangeType === 'video' ? 'video/*' : 'image/*'}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
              e.target.value = '';
            }}
          />
        </div>
      )}

      {/* Text input area */}
      {state.exchangeType === 'text' && (
        <div>
          <label className="block text-white/60 text-sm mb-2">Tu mensaje</label>
          <textarea
            value={state.customerText}
            onChange={e => updateState({ customerText: e.target.value })}
            placeholder="Comparte tu experiencia..."
            rows={5}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-none"
          />
          <p className="text-white/30 text-xs mt-1">{state.customerText.length} caracteres (mínimo 5)</p>
        </div>
      )}

      {/* Trivia embedded player */}
      {state.exchangeType === 'trivia' && !state.triviaCompleted && getTriviaSetId() && (
        <TriviaPlayer
          questionSetId={getTriviaSetId()!}
          onComplete={(sessionId, totalPoints) => {
            updateState({
              triviaSessionId: sessionId,
              triviaCompleted: true,
              triviaTotalPoints: totalPoints,
            });
          }}
        />
      )}

      {state.exchangeType === 'trivia' && !getTriviaSetId() && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-center">
          <BrainCircuit className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-white/70">Esta campaña no tiene un set de trivia configurado.</p>
        </div>
      )}

      {/* Customer info fields */}
      {(state.exchangeType !== 'trivia' || state.triviaCompleted) && (
        <div className="space-y-4">
          <div>
            <label className="block text-white/60 text-sm mb-2">Tu nombre *</label>
            <input
              type="text"
              value={state.customerName}
              onChange={e => updateState({ customerName: e.target.value })}
              placeholder="Nombre completo"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/30"
            />
          </div>

          <div>
            <label className="block text-white/60 text-sm mb-2">
              WhatsApp {state.policy?.requireWhatsapp ? '*' : ''}
            </label>
            <input
              type="tel"
              value={state.customerWhatsapp}
              onChange={e => updateState({ customerWhatsapp: e.target.value })}
              placeholder="+51 999 999 999"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/30"
            />
          </div>

          {state.policy?.requireDni && (
            <div>
              <label className="block text-white/60 text-sm mb-2">DNI *</label>
              <input
                type="text"
                value={state.customerDni}
                onChange={e => updateState({ customerDni: e.target.value })}
                placeholder="12345678"
                maxLength={12}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/30"
              />
            </div>
          )}
        </div>
      )}

      {/* Submit button */}
      {(state.exchangeType !== 'trivia' || state.triviaCompleted) && (
        <motion.button
          whileHover={{ scale: canSubmit() ? 1.02 : 1 }}
          whileTap={{ scale: canSubmit() ? 0.98 : 1 }}
          onClick={handleSubmit}
          disabled={!canSubmit() || state.step === 'submitting'}
          className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
            canSubmit()
              ? 'bg-gradient-to-r from-yellow-400 to-red-400 text-black hover:opacity-90'
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          }`}
        >
          {state.step === 'submitting' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Enviar Intercambio
            </>
          )}
        </motion.button>
      )}
    </div>
  );
}
