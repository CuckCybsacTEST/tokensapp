"use client";
import React, { useState } from "react";
import type { ActionComponentProps } from "./types";

export interface FeedbackPayload {
  prompt: string;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  thankYouMessage?: string;
}

export default function FeedbackAction({ payload, tokenId, prizeLabel, onComplete, isStaff, clientResponse }: ActionComponentProps) {
  const data = payload as FeedbackPayload;
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const minLen = data?.minLength ?? 5;
  const maxLen = data?.maxLength ?? 500;
  const canSubmit = text.trim().length >= minLen;

  // ── Staff / Admin view ──
  if (isStaff) {
    return (
      <div className="text-center">
        <div className="text-5xl mb-4">✉️</div>
        <h2 className="text-xl font-bold text-white mb-2">Feedback del Cliente</h2>
        {data?.prompt && (
          <p className="text-white/50 text-xs mb-4">Pregunta: {data.prompt}</p>
        )}
        {clientResponse ? (
          <div className="bg-white/10 border border-white/20 rounded-2xl p-5 mb-4 text-left">
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Respuesta del cliente</div>
            <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{clientResponse}</p>
          </div>
        ) : (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4">
            <p className="text-amber-300 text-sm">⏳ El cliente aún no ha enviado su feedback</p>
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

  // ── Client: already submitted ──
  async function handleSubmit() {
    if (!canSubmit || submitted) return;
    setSubmitted(true);
    // Persist feedback server-side
    try {
      await fetch(`/api/static/${tokenId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });
    } catch { /* best-effort */ }
    onComplete?.(true);
  }

  if (submitted) {
    return (
      <div className="text-center">
        <div className="text-5xl mb-4 animate-bounce">🎉</div>
        <h2 className="text-xl font-bold text-white mb-2">
          {data?.thankYouMessage || "¡Gracias por tu mensaje!"}
        </h2>
        {prizeLabel && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-4">
            <p className="text-green-300 text-sm font-bold">🎁 {prizeLabel}</p>
            <p className="text-green-300/60 text-xs mt-1">Muestra el QR al animador para canjear</p>
          </div>
        )}
      </div>
    );
  }

  // ── Client: already responded previously (page reload) ──
  if (clientResponse) {
    onComplete?.(true);
    return (
      <div className="text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-white mb-2">
          {data?.thankYouMessage || "¡Gracias por tu mensaje!"}
        </h2>
        <p className="text-white/50 text-xs mb-4">Ya enviaste tu feedback</p>
        {prizeLabel && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-4">
            <p className="text-green-300 text-sm font-bold">🎁 {prizeLabel}</p>
            <p className="text-green-300/60 text-xs mt-1">Muestra el QR al animador para canjear</p>
          </div>
        )}
      </div>
    );
  }

  // ── Client: input form ──
  return (
    <div className="text-center">
      <div className="text-5xl mb-4">💌</div>
      <h2 className="text-lg font-bold text-white mb-1">
        {data?.prompt || "Escríbenos un mensaje"}
      </h2>
      <p className="text-white/50 text-xs mb-4">
        Envíanos tu mensaje y obtén tu premio
      </p>
      <textarea
        className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/40 resize-none"
        rows={4}
        maxLength={maxLen}
        placeholder={data?.placeholder || "Escribe aquí tu mensaje…"}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex justify-between items-center mt-2 mb-4 text-[10px] text-white/40">
        <span>{text.length}/{maxLen}</span>
        {text.trim().length > 0 && text.trim().length < minLen && (
          <span className="text-amber-400">Mínimo {minLen} caracteres</span>
        )}
      </div>
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={`w-full py-3 rounded-xl font-bold transition-colors ${
          canSubmit
            ? "bg-[#FF4D2E] hover:bg-[#FF6542] text-white"
            : "bg-white/10 text-white/30 cursor-not-allowed"
        }`}
      >
        Enviar mensaje
      </button>
    </div>
  );
}
