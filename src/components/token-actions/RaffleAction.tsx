"use client";
import React, { useMemo } from "react";
import type { ActionComponentProps, RafflePayload } from "./types";

export default function RaffleAction({ payload, tokenId }: ActionComponentProps) {
  const data = payload as RafflePayload;

  // Generate a deterministic raffle number from tokenId
  const raffleNumber = useMemo(() => {
    if (!data?.autoNumber) return null;
    let hash = 0;
    for (let i = 0; i < tokenId.length; i++) {
      hash = ((hash << 5) - hash + tokenId.charCodeAt(i)) | 0;
    }
    const max = data.maxParticipants || 999;
    const num = (Math.abs(hash) % max) + 1;
    return String(num).padStart(String(max).length, "0");
  }, [data, tokenId]);

  return (
    <div className="text-center">
      <div className="text-5xl mb-4">🎰</div>
      <h2 className="text-xl font-bold text-white mb-1">¡Participas en el Sorteo!</h2>
      {data?.raffleName && (
        <p className="text-white/60 text-sm mb-6">{data.raffleName}</p>
      )}

      {raffleNumber && (
        <div className="bg-gradient-to-b from-[#FF4D2E]/20 to-[#FF4D2E]/5 border-2 border-[#FF4D2E]/40 rounded-2xl p-8 mb-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] opacity-50" />
          <div className="relative">
            <div className="text-xs text-white/40 uppercase tracking-widest mb-2">Tu Número</div>
            <div className="text-5xl font-black text-[#FF4D2E] tracking-[0.2em] font-mono">
              {raffleNumber}
            </div>
          </div>
        </div>
      )}

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
        <p className="text-amber-300 text-xs">🔔 Mantén esta pantalla abierta. El animador anunciará al ganador.</p>
      </div>
    </div>
  );
}
