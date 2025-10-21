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
  maxPollingTime = 15000 // 15 segundos para long polling
}: RetryOverlayProps) {
  const [pollingStatus, setPollingStatus] = useState<'waiting' | 'polling' | 'ready' | 'timeout'>('waiting');

  // Efecto para manejar el long polling
  useEffect(() => {
    if (!open || !functionalTokenId) {
      setPollingStatus('waiting');
      return;
    }

    console.log(`🚀 [RetryOverlay] Iniciando long polling para token: ${functionalTokenId}`);
    setPollingStatus('polling');

    // Hacer una sola llamada de long polling
    const checkTokenReady = async () => {
      try {
        console.log(`🔄 [RetryOverlay] Llamando a wait-ready para: ${functionalTokenId}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), maxPollingTime + 1000); // Un poco más que el timeout del servidor

        const response = await fetch(`/api/tokens/${functionalTokenId}/wait-ready`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          cache: 'no-store'
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error(`❌ [RetryOverlay] Error en wait-ready: ${response.status}`, errorData);

          if (response.status === 408) {
            setPollingStatus('timeout');
          } else {
            setPollingStatus('timeout'); // Tratar otros errores como timeout
          }
          return;
        }

        const data = await response.json();
        console.log(`✅ [RetryOverlay] Token listo!`, data);

        setPollingStatus('ready');
        onFunctionalTokenReady?.();

      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          console.warn(`⏰ [RetryOverlay] Timeout en long polling para: ${functionalTokenId}`);
          setPollingStatus('timeout');
        } else {
          console.error(`❌ [RetryOverlay] Error en long polling:`, error);
          setPollingStatus('timeout');
        }
      }
    };

    checkTokenReady();

  }, [open, functionalTokenId, onFunctionalTokenReady, maxPollingTime]);

  // Determinar el mensaje y animación basado en el estado
  const getStatusDisplay = () => {
    switch (pollingStatus) {
      case 'waiting':
        return {
          icon: '🔄',
          title: 'Nuevo intento',
          subtitle: 'Activando tu siguiente giro…',
          pulse: true
        };
      case 'polling':
        return {
          icon: '⏳',
          title: 'Activando token',
          subtitle: 'Conectando con el servidor…',
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
          subtitle: 'Activando tu siguiente giro…',
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
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
