// d:\FINAL_FINAL_TOJKENSAPP\src\app\r\[tokenId]\TokenPlayRedeem.tsx

"use client";
import * as React from "react";
import RedeemView, { Status } from "./RedeemView";
import NewRoulette from "@/components/roulette/NewRoulette";
import { RouletteElement } from "@/components/roulette/types";

interface ServerTokenShape {
  id: string;
  expiresAt: string;
  redeemedAt: string | null;
  disabled: boolean;
  batchId?: string;
  prize: { id: string; key: string; label: string; color: string | null; active: boolean };
}

export default function TokenPlayRedeem({
  token,
  elements,
  initialStatus,
  twoPhase = false,
}: {
  token: ServerTokenShape;
  elements: { prizeId: string; label: string; color: string | null; count: number }[];
  initialStatus: Status;
  twoPhase?: boolean;
}) {
  const [spun, setSpun] = React.useState(false); // ya se giró
  const [showRedeem, setShowRedeem] = React.useState(false); // mostrar vista (ya canjeado)
  const [spinning, setSpinning] = React.useState(false);
  const [redeemedToken, setRedeemedToken] = React.useState<ServerTokenShape | null>(token);
  const [autoRedeemError, setAutoRedeemError] = React.useState<string | null>(null);
  const [showModal, setShowModal] = React.useState(false);
  const [redeemedPrize, setRedeemedPrize] = React.useState<RouletteElement | null>(null);
  const [modalDelivering, setModalDelivering] = React.useState(false);
  const [modalError, setModalError] = React.useState<string | null>(null);
  const [prizeIndex, setPrizeIndex] = React.useState<number | null>(null);

  const rouletteElements = React.useMemo(() => {
    const colors = ['#F9A602', '#EC407A', '#8E44AD', '#3498DB', '#16A085', '#1ABC9C', '#2ECC71', '#F1C40F'];
    return elements.map((e, i) => ({
      label: e.label,
      color: e.color || colors[i % colors.length],
      prizeId: e.prizeId,
    }));
  }, [elements]);

  const handleSpin = React.useCallback(async () => {
    if (spinning || spun) return;
    setSpinning(true);

    try {
      // Usamos la API de ruleta existente para obtener un premio
      // En un entorno real, usaríamos una API dedicada para esto, pero
      // para la demostración, simplemente seleccionaremos un premio aleatorio
      // Esto se puede reemplazar con la API real cuando esté disponible
      
      // Simulamos una llamada a la API con un resultado aleatorio
      // pero con preferencia por el premio asociado al token, si existe
      let chosenIndex: number;
      
      // Intentamos priorizar el premio del token actual si está en la lista
      const tokenPrizeIndex = rouletteElements.findIndex(e => e.prizeId === token.prize.id);
      
      if (tokenPrizeIndex !== -1) {
        // 70% de probabilidad de que salga el premio del token
        chosenIndex = Math.random() < 0.7 ? tokenPrizeIndex : Math.floor(Math.random() * rouletteElements.length);
      } else {
        // Selección completamente aleatoria
        chosenIndex = Math.floor(Math.random() * rouletteElements.length);
      }
      
      setPrizeIndex(chosenIndex);
      
      // En un futuro, cuando la API esté disponible:
      /*
      const res = await fetch(`/api/v1/tokens/${token.id}/spin`, { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        const winningPrizeId = data.prizeId;
        const index = rouletteElements.findIndex(e => e.prizeId === winningPrizeId);
        if (index !== -1) {
          setPrizeIndex(index);
        } else {
          setPrizeIndex(Math.floor(Math.random() * rouletteElements.length));
        }
      } else {
        setPrizeIndex(Math.floor(Math.random() * rouletteElements.length));
      }
      */
    } catch (error) {
      console.error("Error spinning roulette:", error);
      setPrizeIndex(Math.floor(Math.random() * rouletteElements.length));
    }
  }, [spinning, spun, token.prize.id, rouletteElements]);


  async function handleRedeem(prize: RouletteElement) {
    setSpinning(false);
    setSpun(true);
    setRedeemedPrize(prize);

    // Auto-redeem logic that was previously in handleEnd
    try {
      if (twoPhase) {
        const r = await fetch(`/api/token/${token.id}/reveal`, { method: 'POST' });
        const body = await r.json().catch(()=>({}));
        if (r.ok) {
          setRedeemedToken({ ...token });
        } else {
          setAutoRedeemError(body?.error || body?.code || 'AUTO_REVEAL_FAILED');
        }
      } else {
        const r = await fetch(`/api/redeem/${token.id}`, { method: 'POST' });
        const body = await r.json().catch(()=>({}));
        if (r.ok) {
          setRedeemedToken({ ...token, redeemedAt: body.redeemedAt || new Date().toISOString() });
        } else {
          setAutoRedeemError(body?.code || 'AUTO_REDEEM_FAILED');
        }
      }
    } catch (e:any) {
      setAutoRedeemError(e.message || (twoPhase ? 'AUTO_REVEAL_FAILED' : 'AUTO_REDEEM_FAILED'));
    } finally {
      setTimeout(()=> {
        setShowRedeem(true);
        setShowModal(true);
      }, 600);
    }
  }

  if (showRedeem) {
    // Forzamos estado a redeemed si spun (aunque backend fallara, mostramos intento)
    const status = redeemedToken?.redeemedAt ? 'redeemed' : (autoRedeemError ? 'error' : initialStatus);
    return (
      <div className="space-y-4">
        {showModal && redeemedPrize && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
            <div className="relative z-10 max-w-md rounded bg-white p-6 shadow-lg dark:bg-slate-900">
              <div className="text-2xl font-bold">¡Has ganado: {redeemedPrize.label}!</div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Puedes reclamar tu premio en barra.</p>
              {twoPhase && (
                <div className="mt-3">
                  <button
                    className="btn btn-sm bg-amber-600 text-white mr-2"
                    disabled={modalDelivering}
                    onClick={async () => {
                      if (!token) return;
                      setModalDelivering(true);
                      setModalError(null);
                      try {
                        const res = await fetch(`/api/token/${token.id}/deliver`, { method: 'POST' });
                        if (res.ok) {
                          setShowModal(false);
                          location.reload();
                        } else {
                          const b = await res.json().catch(()=>({}));
                          setModalError(b?.error || b?.message || 'DELIVER_FAILED');
                        }
                      } catch (e:any) {
                        setModalError(e?.message || 'DELIVER_FAILED');
                      } finally { setModalDelivering(false); }
                    }}
                  >{modalDelivering ? 'Confirmando…' : 'Marcar entregado (staff)'}</button>
                  <button className="btn btn-sm" onClick={() => setShowModal(false)}>Cerrar</button>
                  {modalError && <div className="mt-2 text-xs text-rose-600">{modalError}</div>}
                </div>
              )}
              {!twoPhase && (
                <div className="mt-4 text-right">
                  <button className="btn" onClick={() => setShowModal(false)}>Cerrar</button>
                </div>
              )}
            </div>
          </div>
        )}
        {autoRedeemError && !redeemedToken?.redeemedAt && (
          <div className="rounded border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300">Fallo auto-canje: {autoRedeemError}. Puedes intentar manualmente abajo.</div>
        )}
        <RedeemView initialStatus={status} token={redeemedToken} twoPhase={twoPhase} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showModal && redeemedPrize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative z-10 max-w-md rounded bg-white p-6 shadow-lg dark:bg-slate-900">
            <div className="text-2xl font-bold">¡Has ganado: {redeemedPrize.label}!</div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Puedes reclamar tu premio en barra.</p>
            <div className="mt-4 text-right">
              <button className="btn" onClick={() => setShowModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
      {/* This is where the new roulette is rendered */}
      <div className="flex justify-center">
        <NewRoulette
          elements={rouletteElements}
          onSpin={handleSpin}
          onSpinEnd={handleRedeem}
          spinning={spinning}
          prizeIndex={prizeIndex}
        />
      </div>
      <div className="mt-2 text-center text-[10px] text-slate-500">Tras el giro se canjeará automáticamente.</div>
    </div>
  );
}