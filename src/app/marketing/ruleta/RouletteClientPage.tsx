"use client";

import React, { useEffect, useState, useRef } from 'react';
import NewRoulette from '@/components/roulette/NewRoulette';
import RouletteHeading from '@/components/roulette/RouletteHeading';
import { RouletteElement } from '@/components/roulette/types';
import { motion, AnimatePresence } from 'framer-motion';

// Simple confetti animation component
const Confetti = ({ active }: { active: boolean }) => {
  // Ajustar cantidad de confetti segun ancho de pantalla para móviles (sin alterar efecto base)
  const isSmall = typeof window !== 'undefined' && window.innerWidth < 480;
  const confettiCount = isSmall ? 60 : 150;
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
  type Phase = 'READY' | 'SPINNING' | 'REVEALED_MODAL' | 'REVEALED_PANEL' | 'DELIVERED';
  const [phase, setPhase] = useState<Phase>('READY');
  const [prizeIndex, setPrizeIndex] = useState<number | null>(null);
  const [prizeWon, setPrizeWon] = useState<RouletteElement | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [deliverError, setDeliverError] = useState<string | null>(null);
  const prizeModalTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Altura dinámica del heading para espaciar ruleta (se usa sólo en render principal, pero declaramos aquí para orden estable de hooks)
  const [rouletteHeadingHeight, setRouletteHeadingHeight] = useState(0);
  // Contador de giros (offset base 420). Se obtiene de métricas del periodo "today".
  const SPIN_BASE_OFFSET = 420;
  const [spinCounter, setSpinCounter] = useState<number | null>(null);

  // Cargar métrica de giros al montar (period today) para inicializar contador.
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/metrics?period=today', { cache: 'no-store' });
        if (!res.ok) return; // silencioso
        const data = await res.json();
        if (!abort && data?.period?.rouletteSpins != null) {
          // Ajustamos el contador visible: base + giros del día (antes de este spin)
          setSpinCounter(SPIN_BASE_OFFSET + Number(data.period.rouletteSpins));
        }
      } catch {
        /* ignorar errores de métrica */
      }
    })();
    return () => { abort = true; };
  }, []);

  // Reconstrucción en recarga: si el token ya está revelado / entregado.
  useEffect(() => {
    if (!token) return;
    if (token.deliveredAt || token.redeemedAt) {
      setPhase('DELIVERED');
      return;
    }
    if (token.revealedAt && phase === 'READY') {
      // Derivar prizeIndex del premio original.
      if (elements.length) {
        const idx = elements.findIndex(e => e.prizeId === token.prize.id);
        if (idx >= 0) {
          setPrizeIndex(idx);
          setPrizeWon(elements[idx]);
          setPhase('REVEALED_PANEL'); // tras recarga no abrimos modal para no confundir usuario
        }
      }
    }
  }, [token, elements, phase]);

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
  setPhase('READY');
    setPrizeIndex(null);
    setPrizeWon(null);
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
    if (phase !== 'READY') return;
    if (!tokenId) return;
    if (token?.revealedAt || token?.redeemedAt || token?.deliveredAt) return;
    setPhase('SPINNING');
    try {
      const response = await fetch(`/api/token/${tokenId}/reveal`, { method: 'POST' });
      if (!response.ok) throw new Error(`Error ${response.status}: ${await response.text()}`);
      const data = await response.json();
      // Guardamos revealedAt pero dejamos que la animación termine (onSpinEnd)
      setToken(t => t ? ({ ...t, revealedAt: data?.timestamps?.revealedAt || new Date().toISOString() }) : t);
      const winIndex = elements.findIndex(e => e.prizeId === data.prizeId);
      if (winIndex < 0) throw new Error('Premio no encontrado en la ruleta');
      setPrizeIndex(winIndex);
      // La animación del componente NewRoulette usará prizeIndex y disparará handleSpinEnd
    } catch (err) {
      console.error('Error al girar:', err);
      setError(err instanceof Error ? err.message : 'Error al girar la ruleta');
      setPhase('READY');
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
  setPhase('DELIVERED');
      setShowConfetti(false);
    } catch (e: any) {
      setDeliverError(e?.message || 'DELIVER_FAILED');
    } finally {
      setDelivering(false);
    }
  };

  const handleSpinEnd = (prize: RouletteElement) => {
    setPrizeWon(prize);
    setPhase('REVEALED_MODAL');
    setShowConfetti(true);
    // Incrementar contador local tras completar un giro exitoso
    setSpinCounter(c => (c == null ? SPIN_BASE_OFFSET + 1 : c + 1));
    
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

  if (phase === 'DELIVERED' || token?.redeemedAt || token?.deliveredAt) {
    return (
      <div className="text-center py-16 max-w-md mx-auto">
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
          <p className="text-green-300 text-lg font-semibold">¡Premio ya canjeado!</p>
          <p className="mt-2 text-white/70">
            Este token ya ha sido utilizado para canjear un premio.
          </p>
          <p className="mt-4 text-xl font-bold">
            {token?.prize?.label}
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
        // Formato determinista DD/MM/AAAA para evitar diferencias de locale entre server y cliente
        // Usamos 'es-ES' fijo para que SSR y CSR produzcan exactamente el mismo string.
        // (Locales implícitos pueden variar y causar hydration mismatch.)
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        availableText = `${day}/${month}/${year}`;
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

  const showRevealedPanel = phase === 'REVEALED_PANEL' || (token?.revealedAt && phase === 'READY');

  // (El fallback prizeWon se maneja ahora en el efecto unificado anterior)

  // Render principal


  return (
    <div className="relative">
      <div className="px-4 pt-10 sm:pt-16 text-center max-w-3xl mx-auto">
        <RouletteHeading
          kicker="Premios exclusivos"
          title="Ruleta de Premios"
          subtitle="Gira la ruleta y descubre qué premio te ha tocado"
          onHeight={(h) => setRouletteHeadingHeight(h)}
        />
      </div>
      {/* Confetti animation */}
      <Confetti active={showConfetti} />
      
      {/* Ruleta solo en READY / SPINNING */}
      {(phase === 'READY' || phase === 'SPINNING') && (
        <div className="flex items-center justify-center py-8 sm:py-10 min-h-[420px] sm:min-h-[520px]">
          <NewRoulette
            elements={elements}
            onSpin={handleSpin}
            onSpinEnd={handleSpinEnd} // mantenemos callback legacy para posible animación futura
            spinning={phase === 'SPINNING'}
            prizeIndex={prizeIndex}
            variant="inline"
          />
        </div>
      )}

      {/* Contador de giros */}
      {spinCounter != null && (
        <div className="mt-3 text-center text-xs sm:text-sm text-white/60 select-none tracking-wide">
          Giro #{spinCounter}
        </div>
      )}

      {/* Panel permanente tras cerrar modal */}
      {showRevealedPanel && prizeWon && (
        <div className="text-center py-10 sm:py-14 max-w-md mx-auto px-4">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-5 sm:p-6">
            <p className="text-blue-300 text-base sm:text-lg font-semibold">Premio revelado</p>
            <p className="mt-2 text-white/80 text-sm sm:text-base leading-relaxed">
              Este token ya ha revelado su premio. Por favor, muestra esta pantalla en barra para reclamarlo.
            </p>
            <p className="mt-4 text-lg sm:text-xl font-bold break-words px-2">{prizeWon.label}</p>
            <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
              <button
                className="px-4 sm:px-5 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-500 transition-colors text-sm sm:text-base"
                onClick={confirmDeliver}
                disabled={delivering}
                title="Para uso del STAFF"
              >
                {delivering ? 'Confirmando…' : 'Entregado (staff)'}
              </button>
            </div>
            {deliverError && (
              <div className="mt-2 text-xs text-rose-400 break-words px-2">{deliverError}</div>
            )}
          </div>
        </div>
      )}

      {/* Modal con el premio ganado - usando AnimatePresence para animaciones de salida */}
      <AnimatePresence>
        {prizeWon && phase === 'REVEALED_MODAL' && (
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
              onClick={() => { setPhase('REVEALED_PANEL'); setShowConfetti(false); }}
            ></motion.div>
            
            <motion.div 
              initial={{ y: 30, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 30, opacity: 0, scale: 0.9, transition: { duration: 0.4 } }}
              className="relative z-10 bg-gradient-to-b from-slate-900 to-slate-950 rounded-xl p-6 sm:p-8 max-w-md w-full border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto"
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
                  onClick={() => { setPhase('REVEALED_PANEL'); setShowConfetti(false); }}
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
                  className="text-5xl sm:text-7xl mb-4 sm:mb-6 inline-block"
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
                    className="text-2xl sm:text-3xl font-bold mb-1"
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
                  <span className="absolute -left-2 -top-2 text-2xl sm:text-3xl opacity-30">❝</span>
                  <motion.p 
                    className="text-2xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-blue-500 my-2 px-2 sm:px-4 break-words"
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
                  <span className="absolute -right-2 -bottom-2 text-2xl sm:text-3xl opacity-30">❞</span>
                </motion.div>
                
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="text-white/80 mb-6 sm:mb-8 text-base sm:text-lg px-1 sm:px-2 leading-relaxed"
                >
                  Tu premio ha sido registrado. Muestra esta pantalla en barra para reclamarlo.
                </motion.p>
                
                <motion.button 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="px-6 sm:px-10 py-3 sm:py-4 rounded-full bg-gradient-to-r from-pink-600 to-blue-600 hover:from-pink-500 hover:to-blue-500 text-white font-bold transition-all shadow-lg hover:shadow-xl text-base sm:text-lg"
                  onClick={() => {
                    setPhase('REVEALED_PANEL');
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
