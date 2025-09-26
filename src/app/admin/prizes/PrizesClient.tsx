"use client";
import React, { useState } from "react";
import PrizeManager from "./PrizeManager";
import InlineAutoBatchPanel from "./InlineAutoBatchPanel";

export default function PrizesClient({
  initialPrizes,
  lastBatch,
  batchPrizeStats = [], // se usa solo para tabs en la tabla de Emitidos
}: {
  initialPrizes: any[];
  lastBatch: Record<string, { id: string; name: string; createdAt: Date }>;
  batchPrizeStats?: Array<{ batchId: string; description: string; createdAt: string | Date; prizes: Array<{ prizeId: string; label: string; color: string|null; count: number }> }>;
}) {
  const [prizes, setPrizes] = useState(initialPrizes);
  const hasPrizes = prizes && prizes.length > 0;
  return (
    <div className="space-y-6">
      {/* Estado vacío: sin premios creados */}
      {!hasPrizes && (
        <div className="card border-dashed">
          <div className="card-body flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Aún no has registrado premios</h2>
              <p className="text-sm text-slate-500 mt-1">Crea al menos un premio antes de generar lotes.</p>
            </div>
            <a href="#prize-form" className="btn">Crear primer premio</a>
          </div>
        </div>
      )}

  {/* Primero: gestión/creación de premios */}
  <PrizeManager initialPrizes={prizes} onPrizesUpdated={setPrizes} lastBatch={lastBatch} batchPrizeStats={batchPrizeStats} />

  {/* Luego: generación de tokens (si hay premios) */}
  {hasPrizes && <InlineAutoBatchPanel prizes={prizes} />}

    </div>
  );
}
