"use client";
import React, { useMemo } from "react";
import type { ActionComponentProps, ChallengePayload } from "./types";

const DIFF_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  easy: { emoji: "🟢", label: "Fácil", color: "text-green-400" },
  medium: { emoji: "🟡", label: "Medio", color: "text-yellow-400" },
  hard: { emoji: "🔴", label: "Difícil", color: "text-red-400" },
};

export default function ChallengeAction({ payload, tokenId }: ActionComponentProps) {
  const data = payload as ChallengePayload;

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

      {data.rewardLabel && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-4">
          <p className="text-green-300 text-sm font-bold">🎁 {data.rewardLabel}</p>
        </div>
      )}

      {data.requiresValidation && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
          <p className="text-amber-300 text-xs">⚡ Muestra esta pantalla al animador cuando completes el reto</p>
        </div>
      )}
    </div>
  );
}
