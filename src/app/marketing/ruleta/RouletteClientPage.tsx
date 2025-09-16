"use client";

import React, { useEffect, useState, useRef } from 'react';
import NewRoulette from '@/components/roulette/NewRoulette';
import { RouletteElement } from '@/components/roulette/types';
import { motion, AnimatePresence } from 'framer-motion';

// Simple confetti animation component
const Confetti = ({ active }: { active: boolean }) => {
  const confettiCount = 150;
  const confettiColors = ['#FF8A00', '#FF5252', '#E040FB', '#7C4DFF', '#448AFF', '#18FFFF', '#B2FF59', '#EEFF41', '#FFC400', '#FF6D00'];
  
  if (!active) return null;
  
  return (
    <div style={{ position: 'fixed', zIndex: 999, top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      {Array.from({ length: confettiCount }).map((_, i) => {
        const size = Math.random() * 10 + 5; // Random size between 5-15px
        const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
        const left = Math.random() * 100; // Random horizontal position (0-100%)
        const animDuration = Math.random() * 3 + 2; // Random animation duration (2-5s)
        const animDelay = Math.random() * 1.5; // Random delay (0-1.5s)
        
        return (
          <motion.div
            key={i}
            initial={{ 
              y: -20,
              x: `${left}%`,
              opacity: 1,
              rotateZ: 0
            }}
            animate={{ 
              y: '100vh',
              x: [
                `${left}%`, 
                `${left + (Math.random() * 20 - 10)}%`, 
                `${left + (Math.random() * 40 - 20)}%`
              ],
              opacity: [1, 1, 0],
              rotateZ: Math.random() * 360
            }}
            transition={{ 
              duration: animDuration,
              delay: animDelay,
              ease: 'easeIn'
            }}
            style={{
              position: 'absolute',
              top: 0,
              width: size,
              height: size * (Math.random() * 0.6 + 0.4), // Random aspect ratio
              backgroundColor: color,
              borderRadius: Math.random() > 0.5 ? '50%' : '0%', // Mix of circles and squares
              zIndex: 999
            }}
          />
        );
      })}
    </div>
  );
};

// Función para obtener colores variados para los segmentos de la ruleta
function getSegmentColor(index: number): string {
  const colors = [
    '#FF8A00', // Naranja
    '#FF5252', // Rojo
    '#E040FB', // Morado
    '#7C4DFF', // Índigo
    '#448AFF', // Azul
    '#18FFFF', // Cyan
    '#B2FF59', // Verde lima
    '#EEFF41', // Amarillo claro
    '#FFC400', // Ámbar
    '#FF6D00', // Naranja oscuro
  ];
  
  return colors[index % colors.length];
}

interface TokenShape {
  id: string;
  expiresAt: string;
  redeemedAt: string | null;
  revealedAt?: string | null;
  deliveredAt?: string | null;
  disabled: boolean;
  availableFrom?: string | null;
  batchId?: string;
  prize: { id: string; key: string; label: string; color: string | null; active: boolean };
}

interface RouletteClientPageProps {
  tokenId: string;
}

export default function RouletteClientPage({ tokenId }: RouletteClientPageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<TokenShape | null>(null);
  const [elements, setElements] = useState<RouletteElement[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [spun, setSpun] = useState(false);
  const [prizeIndex, setPrizeIndex] = useState<number | null>(null);
  const [prizeWon, setPrizeWon] = useState<RouletteElement | null>(null);
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [deliverError, setDeliverError] = useState<string | null>(null);
  const prizeModalTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!tokenId) {
      setError("No se ha proporcionado un token");
      setLoading(false);
      return;
    }

    // Reset UI state on token change to avoid showing previous token's state
    setLoading(true);
    setError(null);
    setToken(null);
    setElements([]);
    setSpinning(false);
    setSpun(false);
    setPrizeIndex(null);
    setPrizeWon(null);
    setShowPrizeModal(false);
    setShowConfetti(false);
    setDelivering(false);
    setDeliverError(null);

    async function loadToken() {
      try {
        // Obtenemos los datos del token desde la API existente
        const response = await fetch(`/api/tokens/${tokenId}/roulette-data`);
        const raw = await response.text();
        if (!response.ok) {
          // Intenta parsear JSON desde el texto una sola vez
          let msg = '';
          try {
            const j = JSON.parse(raw || '{}');
            msg = j.message || j.error || '';
          } catch {}
          if (response.status === 404) throw new Error('Token no encontrado');
          if (response.status === 403) throw new Error('El sistema de tokens está temporalmente desactivado. Por favor, inténtalo más tarde.');
          throw new Error(msg || `Error ${response.status}${raw ? `: ${raw}` : ''}`);
        }

        const data = raw ? JSON.parse(raw) : {};
        
        setToken(data.token);
        
        // Verificamos si hay elementos antes de intentar mapearlos
        if (data.elements && Array.isArray(data.elements)) {
          // Convertimos los elementos del backend al formato que espera la ruleta
          const rouletteElements = data.elements.map((e: any, index: number) => ({
            label: e.label,
            // Usamos un array de colores predefinidos para asegurar que cada segmento tenga un color distinto
            color: e.color || getSegmentColor(index),
            prizeId: e.prizeId,
          }));
          
          setElements(rouletteElements);
        }
        setLoading(false);
      } catch (err) {
        console.error("Error cargando datos:", err);
        setError(err instanceof Error ? err.message : "Error desconocido");
        setLoading(false);
      }
    }

    loadToken();
  }, [tokenId]);

  const handleSpin = async () => {
    // Evitar doble clic, giros repetidos o intento sin token
    if (spinning || spun || !tokenId) {
      return;
    }
    // Si el token ya fue revelado o canjeado/entregado, bloquear giro
    if (token?.revealedAt || token?.redeemedAt || token?.deliveredAt) {
      return;
    }

    setSpinning(true);
    
    try {
      // Enviamos petición para girar la ruleta (revela el premio) usando endpoint singular existente
      const response = await fetch(`/api/token/${tokenId}/reveal`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }
      
      const data = await response.json();
      
      // Encontramos el índice del premio ganado
      const winIndex = elements.findIndex(e => e.prizeId === data.prizeId);
      if (winIndex >= 0) {
        setPrizeIndex(winIndex);
      } else {
        throw new Error("Premio no encontrado en la ruleta");
      }
    } catch (err) {
      console.error("Error al girar:", err);
      setError(err instanceof Error ? err.message : "Error al girar la ruleta");
      setSpinning(false);
    }
  };

  const confirmDeliver = async () => {
    if (!tokenId) return;
    setDeliverError(null);
    setDelivering(true);
    try {
      const res = await fetch(`/api/token/${tokenId}/deliver`, { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = body?.error || body?.message || `Error ${res.status}`;
        setDeliverError(msg);
        return;
      }
      // Update local token state to reflect delivery (mirror redeemedAt)
      setToken((t) => t ? ({ ...t, deliveredAt: body?.timestamps?.deliveredAt || new Date().toISOString(), redeemedAt: body?.timestamps?.deliveredAt || new Date().toISOString() } as any) : t);
      setShowPrizeModal(false);
      setShowConfetti(false);
    } catch (e: any) {
      setDeliverError(e?.message || 'DELIVER_FAILED');
    } finally {
      setDelivering(false);
    }
  };

  const handleSpinEnd = (prize: RouletteElement) => {
    setSpun(true);
    setSpinning(false);
    setPrizeWon(prize);
    setShowPrizeModal(true);
    setShowConfetti(true);
    
    // Limpiamos cualquier timeout anterior
    if (prizeModalTimeoutRef.current) {
      clearTimeout(prizeModalTimeoutRef.current);
    }
    
    // Temporizador para detener el confetti después de unos segundos
    setTimeout(() => {
      setShowConfetti(false);
    }, 5000); // Detiene el confetti después de 5 segundos
    
    // Reproducir efecto de sonido (si está disponible en el navegador)
    try {
      const audio = new Audio('/win-sound.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.log('No se pudo reproducir el sonido', e));
    } catch (err) {
      // Silenciar errores si el navegador no soporta audio
      console.log('Audio no soportado');
    }

    // Importante: NO auto-canjear. La confirmación de entrega debe hacerla el STAFF.
    // En el flujo two-phase, sólo revelamos aquí; el canje/entrega se confirma desde interfaces de staff.
  };


  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="inline-block w-16 h-16 border-t-4 border-l-4 border-white rounded-full animate-spin"></div>
        <p className="mt-4 text-white/70">Cargando ruleta...</p>
      </div>
    );
  }

  if (error) {
    // Comprobar si el error está relacionado con tokens desactivados para mostrar un mensaje más amigable
    const isTokensDisabledError = error.includes("desactivado") || error.includes("fuera de servicio");
    
    return (
      <div className="text-center py-16 max-w-md mx-auto">
        <div className={`${isTokensDisabledError ? 'bg-amber-500/10 border-amber-500/30' : 'bg-red-500/10 border-red-500/30'} border rounded-lg p-6`}>
          <p className={`${isTokensDisabledError ? 'text-amber-300' : 'text-red-300'} text-lg font-semibold`}>
            {isTokensDisabledError ? 'Sistema en mantenimiento' : 'Error'}
          </p>
          <p className="mt-2 text-white/70">{error}</p>
          {isTokensDisabledError && (
            <p className="mt-3 text-white/50 text-sm">
              El sistema de tokens está temporalmente deshabilitado. Por favor, vuelve a intentarlo más tarde.
            </p>
          )}
          <button 
            className="mt-4 px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={() => window.location.reload()}
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    );
  }

  if (token?.redeemedAt || token?.deliveredAt) {
    return (
      <div className="text-center py-16 max-w-md mx-auto">
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
          <p className="text-green-300 text-lg font-semibold">¡Premio ya canjeado!</p>
          <p className="mt-2 text-white/70">
            Este token ya ha sido utilizado para canjear un premio.
          </p>
          <p className="mt-4 text-xl font-bold">
            {token.prize.label}
          </p>
        </div>
      </div>
    );
  }

  if (token?.disabled) {
    let availableText: string | null = null;
    try {
      if (token.availableFrom) {
        const d = new Date(token.availableFrom);
        // Formato DD/MM/AAAA
        availableText = d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
    } catch {}
    return (
      <div className="text-center py-16 max-w-md mx-auto">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6">
          <p className="text-amber-300 text-lg font-semibold">Token no disponible</p>
          <p className="mt-2 text-white/70">
            {availableText
              ? <>Este token estará habilitado el <span className="font-semibold">{availableText}</span>.</>
              : <>Este token no está activo o ha sido deshabilitado.</>
            }
          </p>
        </div>
      </div>
    );
  }

  if (new Date(token?.expiresAt || 0) < new Date()) {
    return (
      <div className="text-center py-16 max-w-md mx-auto">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6">
          <p className="text-amber-300 text-lg font-semibold">Token expirado</p>
          <p className="mt-2 text-white/70">
            Este token ha expirado y ya no puede ser utilizado.
          </p>
        </div>
      </div>
    );
  }

  // Si el token ya fue revelado (two-phase) pero aún no entregado, mostrar aviso
  // Importante: no bloquear durante el giro ni mientras mostramos el modal de premio.
  if (!spinning && !showPrizeModal && token?.revealedAt && !token?.deliveredAt && !token?.redeemedAt) {
    return (
      <div className="text-center py-16 max-w-md mx-auto">
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
          <p className="text-blue-300 text-lg font-semibold">Premio revelado</p>
          <p className="mt-2 text-white/70">
            Este token ya ha revelado su premio. Por favor, muestra esta pantalla en barra para reclamarlo.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              className="px-5 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
              onClick={confirmDeliver}
              disabled={delivering}
              title="Para uso del STAFF"
            >
              {delivering ? 'Confirmando…' : 'Marcar entregado (staff)'}
            </button>
          </div>
          {deliverError && (
            <div className="mt-2 text-xs text-rose-400">{deliverError}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Confetti animation */}
      <Confetti active={showConfetti} />
      
      {/* La ruleta */}
      <div className="min-h-[600px] flex items-center justify-center">
        <NewRoulette
          elements={elements}
          onSpin={handleSpin}
          onSpinEnd={handleSpinEnd}
          spinning={spinning}
          prizeIndex={prizeIndex}
        />
      </div>

      {/* Modal con el premio ganado - usando AnimatePresence para animaciones de salida */}
      <AnimatePresence>
        {prizeWon && showPrizeModal && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.3 } }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.5, delay: 0.2 } }}
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
              onClick={() => {
                setShowPrizeModal(false);
                setShowConfetti(false);
              }}
            ></motion.div>
            
            <motion.div 
              initial={{ y: 30, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 30, opacity: 0, scale: 0.9, transition: { duration: 0.4 } }}
              className="relative z-10 bg-gradient-to-b from-slate-900 to-slate-950 rounded-xl p-8 max-w-md w-full border border-white/10 shadow-2xl"
              style={{
                boxShadow: '0 0 30px rgba(219, 39, 119, 0.3), 0 0 15px rgba(59, 130, 246, 0.3)'
              }}
            >
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute -top-4 -right-4"
              >
                <button
                  onClick={() => {
                    setShowPrizeModal(false);
                    setShowConfetti(false);
                  }}
                  className="bg-white/10 hover:bg-white/20 rounded-full p-2 text-white/80 hover:text-white transition-colors"
                  aria-label="Cerrar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </motion.div>
              
              <div className="text-center">
                <motion.div 
                  initial={{ scale: 0.2, y: -20, rotateZ: -20 }}
                  animate={{ scale: 1, y: 0, rotateZ: 0 }}
                  transition={{ 
                    type: "spring", 
                    damping: 8, 
                    stiffness: 100,
                    delay: 0.1
                  }}
                  className="text-7xl mb-6 inline-block"
                >
                  🎉
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="mb-2"
                >
                  <motion.h2 
                    initial={{ y: 10 }}
                    animate={{ y: 0 }}
                    transition={{ type: "spring", damping: 12 }}
                    className="text-3xl font-bold mb-1"
                  >
                    ¡Felicidades!
                  </motion.h2>
                  <motion.div className="w-16 h-1 bg-gradient-to-r from-pink-500 to-blue-500 mx-auto rounded-full"/>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className="my-6 relative"
                >
                  <span className="absolute -left-2 -top-2 text-3xl opacity-30">❝</span>
                  <motion.p 
                    className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-blue-500 my-2 px-4"
                    animate={{ 
                      backgroundPosition: ['0% center', '100% center', '0% center'],
                    }}
                    transition={{ 
                      duration: 5,
                      repeat: Infinity,
                      ease: 'linear'
                    }}
                    style={{
                      backgroundSize: '200% 100%'
                    }}
                  >
                    {prizeWon.label}
                  </motion.p>
                  <span className="absolute -right-2 -bottom-2 text-3xl opacity-30">❞</span>
                </motion.div>
                
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="text-white/80 mb-8 text-lg px-2 leading-relaxed"
                >
                  Tu premio ha sido registrado. Muestra esta pantalla en barra para reclamarlo.
                </motion.p>
                
                <motion.button 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="px-10 py-4 rounded-full bg-gradient-to-r from-pink-600 to-blue-600 hover:from-pink-500 hover:to-blue-500 text-white font-bold transition-all shadow-lg hover:shadow-xl text-lg"
                  onClick={() => {
                    setShowPrizeModal(false);
                    setShowConfetti(false);
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  ¡Entendido!
                </motion.button>
                <div className="mt-4 flex items-center justify-center">
                  <button
                    className="px-5 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                    onClick={confirmDeliver}
                    disabled={delivering}
                    title="Para uso del STAFF"
                  >
                    {delivering ? 'Confirmando…' : 'Marcar entregado (staff)'}
                  </button>
                </div>
                {deliverError && (
                  <div className="mt-2 text-xs text-rose-400">{deliverError}</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
