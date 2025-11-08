"use client";
import React, { useState, useTransition } from "react";
import PrizeManager from "./PrizeManager";
import InlineAutoBatchPanel from "./InlineAutoBatchPanel";

export default function PrizesClient({
  initialPrizes,
  lastBatch,
  batchPrizeStats = [], // se usa solo para tabs en la tabla de Emitidos
}: {
  initialPrizes: any[];
  lastBatch: Record<string, { id: string; name: string; createdAt: Date }>;
  batchPrizeStats?: Array<{ batchId: string; description: string; createdAt: string | Date; prizes: Array<{ prizeId: string; label?: string; color?: string|null; count: number; expired: number; valid: number }> }>;
}) {
  const [prizes, setPrizes] = useState(Array.isArray(initialPrizes) ? initialPrizes : []);
  const hasPrizes = Array.isArray(prizes) && prizes.length > 0;

  // Wrapper para setPrizes
  const setPrizesWithLog = React.useCallback((newPrizes: any[]) => {
    setPrizes(newPrizes);
  }, []);

  function SystemPrizesControls() {
    const [pending, startTransition] = useTransition();
    const [msg, setMsg] = useState<string | null>(null);
    const retryPrize = prizes.find((p: any) => p.key === 'retry');
    const losePrize = prizes.find((p: any) => p.key === 'lose');

    async function refreshPrizes() {
      const res = await fetch('/api/prizes');
      if (res.ok) {
        const responseData = await res.json();
        // Handle both direct array response and { data: [...] } format
        const list = Array.isArray(responseData) ? responseData : responseData?.data;
        if (Array.isArray(list)) {
          setPrizesWithLog(list);
        } else {
          console.error('API returned invalid prizes data:', responseData);
          setPrizesWithLog([]);
        }
      }
    }

    function PrizeQuickStock({ prize }: { prize: any }) {
      const [value, setValue] = useState<string>(prize.stock == null ? '' : String(prize.stock));
      const [saving, startSave] = useTransition();
      return (
        <div className="flex items-center gap-2">
          <input
            className="input !w-28"
            placeholder="ilimitado"
            type="number"
            min={0}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            title="Stock (vacío = ilimitado)"
          />
          <button
            className="btn-outline text-xs"
            disabled={saving}
            title="Guardar stock"
            onClick={() => {
              const n = value === '' ? null : Number(value);
              if (n !== null && (isNaN(n) || n < 0)) { setMsg('Stock inválido'); return; }
              startSave(async () => {
                setMsg(null);
                try {
                  const res = await fetch(`/api/prizes/${prize.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ stock: n }),
                  });
                  if (!res.ok) throw new Error('No se pudo actualizar');
                  await refreshPrizes();
                  setMsg('Stock actualizado');
                } catch (e: any) {
                  setMsg(e?.message || 'Fallo');
                }
              });
            }}
          >{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      );
    }

    return (
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Controles de ruleta</span>
            <span className="text-[10px] text-slate-500">Premios del sistema: Nuevo intento (RETRY) y Sin premio (LOSE)</span>
          </div>
          <button
            type="button"
            disabled={pending}
            className="btn-outline text-xs"
            title="Crear si faltan los premios del sistema"
            onClick={() => {
              startTransition(async () => {
                setMsg(null);
                try {
                  const res = await fetch('/api/admin/prizes/ensure-system', { method: 'POST' });
                  if (!res.ok) throw new Error('No se pudo asegurar');
                  await refreshPrizes();
                  setMsg('Premios del sistema verificados');
                } catch (e: any) {
                  setMsg(e?.message || 'Fallo');
                }
              });
            }}
          >{pending ? 'Verificando…' : 'Asegurar premios del sistema'}</button>
        </div>
        <div className="card-body grid gap-4 md:grid-cols-2">
          {retryPrize ? (
            <div className="p-3 rounded border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="uppercase tracking-wide font-semibold">{retryPrize.label}</span>
                  <span className="badge border-blue-400 bg-blue-100 text-blue-700 dark:border-blue-400 dark:bg-blue-900 dark:text-blue-200" title="Premio del sistema">Sistema</span>
                  <span className="font-mono text-[10px] text-blue-500">key: retry</span>
                </div>
                <span className="h-4 w-4 rounded border border-blue-400" style={{ background: retryPrize.color || '#3BA7F0' }} />
              </div>
              <div className="text-xs text-blue-500 mb-2">Acción: reintentar (auto-gira la ruleta)</div>
              <PrizeQuickStock prize={retryPrize} />
            </div>
          ) : (
            <div className="p-3 rounded border border-dashed">
              <div className="text-sm">No existe el premio de reintento. Usa “Asegurar premios del sistema”.</div>
            </div>
          )}

          {losePrize ? (
            <div className="p-3 rounded border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="uppercase tracking-wide font-semibold">{losePrize.label}</span>
                  <span className="badge border-yellow-400 bg-yellow-100 text-yellow-700 dark:border-yellow-400 dark:bg-yellow-900 dark:text-yellow-200" title="Premio del sistema">Sistema</span>
                  <span className="font-mono text-[10px] text-yellow-500">key: lose</span>
                </div>
                <span className="h-4 w-4 rounded border border-yellow-400" style={{ background: losePrize.color || '#FFD600' }} />
              </div>
              <div className="text-xs text-yellow-500 mb-2">Acción: sin premio (muestra mensaje)</div>
              <PrizeQuickStock prize={losePrize} />
            </div>
          ) : (
            <div className="p-3 rounded border border-dashed">
              <div className="text-sm">No existe el premio de "sin premio". Usa "Asegurar premios del sistema".</div>
            </div>
          )}
        </div>
        {msg && <div className="px-5 pb-4 text-xs text-slate-600 dark:text-slate-300">{msg}</div>}
      </div>
    );
  }
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

  {/* Controles de premios del sistema (retry/lose) */}
  <SystemPrizesControls />

  {/* Primero: gestión/creación de premios */}
  <PrizeManager initialPrizes={prizes} onPrizesUpdated={setPrizesWithLog} lastBatch={lastBatch} batchPrizeStats={batchPrizeStats} />

  {/* Luego: generación de tokens (si hay premios) */}
  {hasPrizes && (
    <>
      <InlineAutoBatchPanel prizes={prizes} />
    </>
  )}

    </div>
  );
}
