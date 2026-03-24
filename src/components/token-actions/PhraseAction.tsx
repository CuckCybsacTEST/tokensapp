"use client";
import React, { useMemo } from "react";
import type { ActionComponentProps, PhrasePayload } from "./types";

const STYLE_CONFIG: Record<string, { emoji: string; gradient: string; border: string }> = {
  motivational: { emoji: "💪", gradient: "from-amber-500/10 to-orange-500/10", border: "border-amber-500/20" },
  funny: { emoji: "😂", gradient: "from-pink-500/10 to-purple-500/10", border: "border-pink-500/20" },
  wisdom: { emoji: "🧠", gradient: "from-blue-500/10 to-cyan-500/10", border: "border-blue-500/20" },
  custom: { emoji: "✨", gradient: "from-white/5 to-white/10", border: "border-white/20" },
};

export default function PhraseAction({ payload, tokenId }: ActionComponentProps) {
  const data = payload as PhrasePayload;

  // Pick a deterministic phrase using tokenId hash
  const phrase = useMemo(() => {
    if (!data?.phrases?.length) return null;
    let hash = 0;
    for (let i = 0; i < tokenId.length; i++) {
      hash = ((hash << 5) - hash + tokenId.charCodeAt(i)) | 0;
    }
    const idx = Math.abs(hash) % data.phrases.length;
    return data.phrases[idx];
  }, [data, tokenId]);

  if (!phrase) {
    return (
      <div className="text-center p-4">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-white/60 text-sm">No hay frases configuradas.</p>
      </div>
    );
  }

  const style = STYLE_CONFIG[data?.style || "custom"] || STYLE_CONFIG.custom;

  return (
    <div className="text-center">
      <div className="text-5xl mb-6 animate-bounce">{style.emoji}</div>
      <div className={`bg-gradient-to-b ${style.gradient} border ${style.border} rounded-2xl p-6 mb-4`}>
        <blockquote className="text-xl font-bold text-white leading-relaxed italic">
          &ldquo;{phrase}&rdquo;
        </blockquote>
      </div>
      <p className="text-white/40 text-xs">Tu frase del momento</p>
    </div>
  );
}
