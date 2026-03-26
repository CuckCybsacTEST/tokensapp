"use client";
import React, { useEffect, useMemo, useState } from "react";
import type { ActionComponentProps, ChallengePayload } from "./types";

const DIFF_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  easy: { emoji: "🟢", label: "Fácil", color: "text-green-400" },
  medium: { emoji: "🟡", label: "Medio", color: "text-yellow-400" },
  hard: { emoji: "🔴", label: "Difícil", color: "text-red-400" },
};

export default function ChallengeAction({ payload, tokenId, prizeLabel, onComplete, isStaff, clientResponse }: ActionComponentProps) {
  const data = payload as ChallengePayload;
  const [completed, setCompleted] = useState(!!clientResponse);
  const [saving, setSaving] = useState(false);

  // Notify parent when already completed (persisted in DB from a prior visit)
  useEffect(() => {
    if (clientResponse) onComplete?.(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pick a deterministic challenge using tokenId hash
  const challenge = useMemo(() => {
    if (!data?.challenges?.length) return null;
    let hash = 0;
    for (let i = 0; i < tokenId.length; i++) {
      hash = ((hash << 5) - hash + tokenId.charCodeAt(i)) | 0;
    }
    const idx = Math.abs(hash) % data.challenges.length;
    return data.challenges[idx];
  }, [data, tokenId]);

  if (!challenge) {
    return (
      <div className="text-center p-4">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-white/60 text-sm">No hay retos configurados.</p>
      </div>
    );
  }

  const diff = DIFF_CONFIG[data?.difficulty || "medium"] || DIFF_CONFIG.medium;

  // ── Staff / Admin view ──
  if (isStaff) {
    async function handleStaffComplete() {
      setSaving(true);
      try {
        await fetch(`/api/static/${tokenId}/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'CHALLENGE_COMPLETED' }),
        });
      } catch { /* best-effort */ }
      setCompleted(true);
      setSaving(false);
      onComplete?.(true);
    }

    return (
      <div className="text-center">
        <div className="text-5xl mb-4">🎯</div>
        <h2 className="text-xl font-bold text-white mb-2">
          {completed ? '✅ Reto Completado' : 'Reto — Vista Staff'}
        </h2>
        <div className="flex items-center justify-center gap-2 mb-4">
          <span>{diff.emoji}</span>
          <span className={`text-xs font-bold uppercase ${diff.color}`}>{diff.label}</span>
        </div>

        <div className="bg-white/10 border border-white/20 rounded-2xl p-6 mb-4">
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Reto asignado</div>
          <p className="text-lg font-bold text-white leading-relaxed">{challenge}</p>
        </div>

        {!completed ? (
          <button
            onClick={handleStaffComplete}
            disabled={saving}
            className={`w-full py-3 rounded-xl font-bold transition-colors ${
              saving
                ? 'bg-gray-600 cursor-not-allowed opacity-50'
                : 'bg-[#FF4D2E] hover:bg-[#FF6542] text-white'
            }`}
          >
            {saving ? 'Guardando…' : '✅ Marcar reto completado'}
          </button>
        ) : (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <p className="text-green-300 text-sm font-bold">🎉 Reto marcado como completado</p>
            {prizeLabel && (
              <p className="text-green-300/60 text-xs mt-2">🎁 Premio: {prizeLabel}</p>
            )}
            <p className="text-green-300/60 text-xs mt-1">El QR está disponible abajo para enviar al cliente</p>
          </div>
        )}
      </div>
    );
  }

  // ── Client view: sees the challenge, NO completion button ──
  return (
    <div className="text-center">
      <div className="text-5xl mb-4">🎯</div>
      <h2 className="text-xl font-bold text-white mb-2">¡Tu Reto!</h2>
      <div className="flex items-center justify-center gap-2 mb-4">
        <span>{diff.emoji}</span>
        <span className={`text-xs font-bold uppercase ${diff.color}`}>{diff.label}</span>
      </div>

      <div className="bg-white/10 border border-white/20 rounded-2xl p-6 mb-4">
        <p className="text-lg font-bold text-white leading-relaxed">{challenge}</p>
      </div>

      {completed ? (
        <>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-4">
            <p className="text-green-300 text-sm font-bold">🎉 ¡Reto completado!</p>
          </div>
          {prizeLabel && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
              <p className="text-green-300 text-sm font-bold">🎁 {prizeLabel}</p>
              <p className="text-green-300/60 text-xs mt-1">Muestra el QR al animador para canjear</p>
            </div>
          )}
        </>
      ) : (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
          <p className="text-amber-300 text-xs">⚡ Completa el reto y espera que el staff lo valide</p>
        </div>
      )}
    </div>
  );
}
