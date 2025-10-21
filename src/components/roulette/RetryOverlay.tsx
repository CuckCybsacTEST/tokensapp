"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";

interface RetryOverlayProps {
  open: boolean;
  functionalTokenId?: string | null;
  onFunctionalTokenReady?: () => void;
  maxPollingTime?: number; // tiempo máximo de polling en ms
}

export default function RetryOverlay({
  open,
  functionalTokenId,
  onFunctionalTokenReady,
  maxPollingTime = 30000 // 30 segundos máximo
}: RetryOverlayProps) {
  const [pollingStatus, setPollingStatus] = useState<'waiting' | 'polling' | 'ready' | 'timeout'>('waiting');
  const [pollCount, setPollCount] = useState(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingStartTimeRef = useRef<number | null>(null);

  // Función para verificar si el token funcional está listo
  const checkFunctionalToken = async () => {
    if (!functionalTokenId) return false;

    try {
      console.log(`🔄 [RetryOverlay] Verificando token funcional: ${functionalTokenId} (intento ${pollCount + 1})`);

      const response = await fetch(`/api/tokens/${functionalTokenId}/roulette-data`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store' // Importante: no cachear en producción
      });

      if (!response.ok) {
        console.warn(`⚠️ [RetryOverlay] Error en respuesta: ${response.status}`);
        return false;
      }

      const data = await response.json();
      const token = data?.token;

      if (!token) {
        console.warn(`⚠️ [RetryOverlay] No se encontró token en respuesta`);
        return false;
      }

      const isDisabled = token.disabled;
      const isReserved = !!token.reservedByRetry;

      console.log(`📊 [RetryOverlay] Token ${functionalTokenId}: disabled=${isDisabled}, reservedByRetry=${isReserved}`);

      // El token está listo si NO está disabled Y NO está reserved
      if (!isDisabled && !isReserved) {
        console.log(`✅ [RetryOverlay] Token funcional listo!`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`❌ [RetryOverlay] Error verificando token:`, error);
      return false;
    }
  };

  // Efecto para manejar el polling
  useEffect(() => {
    if (!open || !functionalTokenId) {
      setPollingStatus('waiting');
      setPollCount(0);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      pollingStartTimeRef.current = null;
      return;
    }

    console.log(`🚀 [RetryOverlay] Iniciando polling para token: ${functionalTokenId}`);
    setPollingStatus('polling');
    setPollCount(0);
    pollingStartTimeRef.current = Date.now();

    // Verificación inicial inmediata
    checkFunctionalToken().then((isReady) => {
      if (isReady) {
        setPollingStatus('ready');
        onFunctionalTokenReady?.();
        return;
      }

      // Si no está listo, iniciar polling cada 1.5 segundos
      pollingIntervalRef.current = setInterval(async () => {
        const elapsed = Date.now() - (pollingStartTimeRef.current || 0);

        // Verificar timeout
        if (elapsed > maxPollingTime) {
          console.error(`⏰ [RetryOverlay] Timeout alcanzado (${maxPollingTime}ms)`);
          setPollingStatus('timeout');
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          return;
        }

        setPollCount(prev => prev + 1);

        const isReady = await checkFunctionalToken();
        if (isReady) {
          console.log(`🎉 [RetryOverlay] Token funcional listo después de ${pollCount + 1} verificaciones`);
          setPollingStatus('ready');
          onFunctionalTokenReady?.();
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      }, 1500); // Polling cada 1.5 segundos
    });

    // Cleanup
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [open, functionalTokenId, onFunctionalTokenReady, maxPollingTime]);

  // Determinar el mensaje y animación basado en el estado
  const getStatusDisplay = () => {
    switch (pollingStatus) {
      case 'waiting':
        return {
          icon: '🔄',
          title: 'Nuevo intento',
          subtitle: 'Preparando tu siguiente giro…',
          pulse: true
        };
      case 'polling':
        return {
          icon: '⏳',
          title: 'Activando token',
          subtitle: `Verificando... (${pollCount})`,
          pulse: true
        };
      case 'ready':
        return {
          icon: '✅',
          title: '¡Listo!',
          subtitle: 'Tu token está activado',
          pulse: false
        };
      case 'timeout':
        return {
          icon: '⚠️',
          title: 'Tiempo agotado',
          subtitle: 'Intenta escanear nuevamente',
          pulse: false
        };
      default:
        return {
          icon: '🔄',
          title: 'Nuevo intento',
          subtitle: 'Preparando tu siguiente giro…',
          pulse: true
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          aria-modal="true"
          role="dialog"
        >
          <div
            className="absolute inset-0"
            style={{ background: "rgba(10,12,16,0.6)", backdropFilter: "blur(10px)" }}
          />
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            className="relative z-10 rounded-2xl px-5 py-4 sm:px-6 sm:py-5 shadow-2xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(20,20,28,0.95), rgba(18,18,24,0.95))",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <div className="flex flex-col items-center gap-3">
              <div className={`w-12 h-12 rounded-full bg-gradient-to-tr from-[#5B86E5] to-[#36D1DC] flex items-center justify-center text-3xl ${statusDisplay.pulse ? 'animate-pulse' : ''}`}>
                {statusDisplay.icon}
              </div>
              <div className="text-white/90 text-lg sm:text-2xl font-bold mt-2">
                {statusDisplay.title}
              </div>
              <div className="mt-2 text-white/70 text-sm sm:text-base text-center">
                {statusDisplay.subtitle}
              </div>
              {pollingStatus === 'polling' && (
                <div className="mt-2 text-white/50 text-xs">
                  Tiempo restante: ~{Math.max(0, Math.round((maxPollingTime - (Date.now() - (pollingStartTimeRef.current || 0))) / 1000))}s
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
