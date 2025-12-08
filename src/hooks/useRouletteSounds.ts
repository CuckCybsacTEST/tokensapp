import { useRef, useEffect, useCallback } from 'react';

export interface RouletteSounds {
  playSpinStart: () => void;
  playSpinLoop: () => void;
  stopSpinLoop: () => void;
  playSpinStop: () => void;
  playWin: () => void;
  playLose: () => void;
  cleanup: () => void;
}

const SPIN_LOOP_TICK_DURATION = 0.18; // segundos que dura cada golpe de bola
const SPIN_LOOP_INTERVAL_MS = 160; // separación entre golpes para sonido clásico

export const useRouletteSounds = (): RouletteSounds => {
  // AudioContext para sonidos procedurales
  const audioContextRef = useRef<AudioContext | null>(null);
  const isInitializedRef = useRef<boolean>(false);

  // Inicializar solo la activación automática (AudioContext se crea lazy)
  useEffect(() => {
    console.log('🎵 Inicializando sistema de sonidos procedurales');

    // Listener para cerrar AudioContext cuando la página se descargue
    const handleBeforeUnload = () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
        console.log('🎵 AudioContext closed on page unload');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup básico para el useEffect - NO cerrar AudioContext aquí
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      isInitializedRef.current = false;
    };
  }, []);

  // Función para asegurar que el AudioContext esté activo (lazy initialization)
  const ensureAudioContext = useCallback(async () => {
    console.log('🔊 Ensuring AudioContext is active...');

    // Si ya está inicializado y funcionando, retornar temprano
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      console.log('✅ AudioContext already active');
      return true;
    }

    // Crear AudioContext si no existe
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('🎵 AudioContext created, state:', audioContextRef.current.state);
        isInitializedRef.current = true;
      } catch (e) {
        console.warn('❌ Web Audio API not supported');
        return false;
      }
    }

    const ctx = audioContextRef.current;
    console.log('🎵 AudioContext state before resume:', ctx.state);

    // Intentar resumir si está suspendido
    if (ctx.state === 'suspended') {
      console.log('🎵 Resuming AudioContext...');
      try {
        await ctx.resume();
        console.log('✅ AudioContext resumed, new state:', ctx.state);
      } catch (e) {
        console.warn('❌ Failed to resume AudioContext:', e);
        return false;
      }
    }

    const isActive = ctx.state === 'running';
    console.log('🎵 AudioContext active:', isActive);
    return isActive;
  }, []);

  // Función para activar AudioContext con interacción del usuario
  const activateAudioContext = useCallback(async () => {
    console.log('🎵 Activating AudioContext on user interaction');
    const success = await ensureAudioContext();
    if (success) {
      console.log('✅ AudioContext activated successfully');
    } else {
      console.warn('❌ Failed to activate AudioContext');
    }
  }, [ensureAudioContext]);

  // Activar AudioContext en la primera interacción del usuario
  useEffect(() => {
    const handleUserInteraction = () => {
      activateAudioContext();
      // Remover listeners después de la primera activación
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [activateAudioContext]);

  // Función para crear sonidos procedurales usando Web Audio API
  const createProceduralSound = useCallback(async (
    type: 'spinStart' | 'spinLoop' | 'spinStop' | 'win' | 'lose',
    duration: number = 1000,
    retryCount: number = 0
  ): Promise<{ oscillator: OscillatorNode; gainNode: GainNode } | null> => {
    // Máximo 2 reintentos para activar AudioContext
    if (retryCount > 2) {
      console.warn('❌ Max retries reached for AudioContext activation');
      return null;
    }

    // Asegurar que el AudioContext esté activo
    const isActive = await ensureAudioContext();
    if (!isActive || !audioContextRef.current) {
      console.warn(`AudioContext not available for procedural sound (attempt ${retryCount + 1})`);

      // Intentar activar automáticamente y reintentar
      if (retryCount === 0) {
        console.log('🔄 Attempting automatic AudioContext activation...');
        await activateAudioContext();
        return createProceduralSound(type, duration, retryCount + 1);
      }

      return null;
    }

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    switch (type) {
      case 'spinStart':
        // Sonido de arranque: frecuencia ascendente rápida
        oscillator.frequency.setValueAtTime(200, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
        break;

      case 'spinLoop':
        // Sonido percutivo que simula la bola golpeando casillas
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(1600, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + SPIN_LOOP_TICK_DURATION);
        gainNode.gain.cancelScheduledValues(ctx.currentTime);
        gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + SPIN_LOOP_TICK_DURATION);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + SPIN_LOOP_TICK_DURATION);
        return { oscillator, gainNode };

      case 'spinStop':
        // Sonido de frenado: frecuencia descendente
        oscillator.frequency.setValueAtTime(600, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
        break;

      case 'win':
        // Sonido de victoria: arpegio ascendente
        const frequencies = [523, 659, 784, 1047]; // Do, Mi, Sol, Do (octava arriba)
        frequencies.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.1);
          gain.gain.setValueAtTime(0.3, ctx.currentTime + index * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + index * 0.1 + 0.2);

          osc.start(ctx.currentTime + index * 0.1);
          osc.stop(ctx.currentTime + index * 0.1 + 0.2);
        });
        break;

      case 'lose':
        // Sonido de derrota: tono descendente triste
        oscillator.frequency.setValueAtTime(400, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.8);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.8);
        break;
    }

    return null;
  }, []);

  // Referencia para los sonidos de loop activos y control de loop
  const activeLoopsRef = useRef<Array<{ oscillator: OscillatorNode; gainNode: GainNode }>>([]);
  const loopHumRef = useRef<{ oscillator: OscillatorNode; gainNode: GainNode } | null>(null);
  const loopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoopingRef = useRef<boolean>(false);

  const playSpinStart = useCallback(async () => {
    console.log('🎵 Playing spin start sound');
    try {
      const sound = await createProceduralSound('spinStart');
      if (sound) {
        console.log('✅ Spin start sound played successfully');
      } else {
        console.warn('⚠️ Spin start sound could not be created');
      }
    } catch (e) {
      console.warn('❌ Error playing spin start sound:', e);
    }
  }, [createProceduralSound]);

  const stopSpinLoop = useCallback(() => {
    console.log('🎵 Stopping spin loop sound - isLooping:', isLoopingRef.current, 'hasTimeout:', !!loopTimeoutRef.current, 'activeSounds:', activeLoopsRef.current.length);
    try {
      // Detener el flag de loop
      isLoopingRef.current = false;

      // Cancelar timeout pendiente
      if (loopTimeoutRef.current) {
        clearTimeout(loopTimeoutRef.current);
        loopTimeoutRef.current = null;
        console.log('✅ Loop timeout cancelled');
      }

      const ctx = audioContextRef.current;

      // Detener todos los sonidos activos con un fade muy corto
      activeLoopsRef.current.forEach(({ oscillator, gainNode }) => {
        try {
          if (ctx) {
            gainNode.gain.cancelScheduledValues(ctx.currentTime);
            gainNode.gain.setValueAtTime(Math.max(gainNode.gain.value, 0.0001), ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.05);
            oscillator.stop(ctx.currentTime + 0.06);
          } else {
            oscillator.stop();
          }
          console.log('✅ Active loop sound stopped');
        } catch (e) {
          // Ya detenido
        }
      });
      activeLoopsRef.current = [];

      if (loopHumRef.current) {
        const { oscillator, gainNode } = loopHumRef.current;
        if (ctx) {
          gainNode.gain.cancelScheduledValues(ctx.currentTime);
          gainNode.gain.setValueAtTime(Math.max(gainNode.gain.value, 0.0001), ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.2);
          try {
            oscillator.stop(ctx.currentTime + 0.22);
          } catch {
            /* noop */
          }
        } else {
          try {
            oscillator.stop();
          } catch {
            /* noop */
          }
        }
        loopHumRef.current = null;
      }

      console.log('🎵 Spin loop stopped successfully');
    } catch (e) {
      console.warn('❌ Error stopping spin loop sound:', e);
    }
  }, []);

  const playSpinLoop = useCallback(async () => {
    console.log('🎵 Playing spin loop sound');
    try {
      // Detener loop anterior si existe
      stopSpinLoop();

      const ctxReady = await ensureAudioContext();
      if (!ctxReady || !audioContextRef.current) {
        console.warn('⚠️ AudioContext not ready for spin loop');
        return;
      }

      const ctx = audioContextRef.current;
      // Iniciar nuevo loop
      isLoopingRef.current = true;

      if (!loopHumRef.current) {
        const humOsc = ctx.createOscillator();
        humOsc.type = 'sawtooth';
        humOsc.frequency.setValueAtTime(80, ctx.currentTime);
        humOsc.frequency.linearRampToValueAtTime(120, ctx.currentTime + 2);
        const humGain = ctx.createGain();
        humGain.gain.setValueAtTime(0.015, ctx.currentTime);
        humGain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 1);
        humOsc.connect(humGain);
        humGain.connect(ctx.destination);
        humOsc.start(ctx.currentTime);
        loopHumRef.current = { oscillator: humOsc, gainNode: humGain };
      }

      const startLoopIteration = async () => {
        if (!isLoopingRef.current) return;

        const loopSound = await createProceduralSound('spinLoop');
        if (loopSound && isLoopingRef.current) {
          const handle = loopSound;
          activeLoopsRef.current.push(handle);
          handle.oscillator.onended = () => {
            activeLoopsRef.current = activeLoopsRef.current.filter((active) => active !== handle);
          };
          console.log('✅ Spin loop iteration created');

          // Programar siguiente iteración
          loopTimeoutRef.current = setTimeout(startLoopIteration, SPIN_LOOP_INTERVAL_MS);
        } else if (!loopSound) {
          console.warn('⚠️ Could not create loop iteration, stopping loop');
          isLoopingRef.current = false;
        }
      };

      // Iniciar primera iteración
      startLoopIteration();

    } catch (e) {
      console.warn('❌ Error playing spin loop sound:', e);
      isLoopingRef.current = false;
    }
  }, [createProceduralSound, ensureAudioContext]);

  const playSpinStop = useCallback(async () => {
    console.log('🎵 Playing spin stop sound');
    try {
      // Asegurar que el loop se detenga primero
      stopSpinLoop();
      // Pequeño delay antes del sonido de parada
      setTimeout(async () => {
        await createProceduralSound('spinStop');
        console.log('✅ Spin stop sound played');
      }, 50);
    } catch (e) {
      console.warn('❌ Error playing spin stop sound:', e);
    }
  }, [createProceduralSound]);

  const playWin = useCallback(async () => {
    console.log('🎵 Playing win sound');
    try {
      // Solo sonido procedural (sin archivos de audio)
      await createProceduralSound('win');
      console.log('✅ Win procedural sound played');
    } catch (e) {
      console.warn('❌ Error playing win sound:', e);
    }
  }, [createProceduralSound]);

  const playLose = useCallback(async () => {
    console.log('🎵 Playing lose sound');
    try {
      await createProceduralSound('lose');
      console.log('✅ Lose sound played');
    } catch (e) {
      console.warn('❌ Error playing lose sound:', e);
    }
  }, [createProceduralSound]);

  const cleanup = useCallback(() => {
    try {
      stopSpinLoop();

      // Limpiar referencias de loop
      isLoopingRef.current = false;
      if (loopTimeoutRef.current) {
        clearTimeout(loopTimeoutRef.current);
        loopTimeoutRef.current = null;
      }

      // Solo cerrar AudioContext si la página se está descargando completamente
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        // Solo cerrar si el documento se está descargando
        if (document.visibilityState === 'hidden' || document.hidden) {
          audioContextRef.current.close();
          audioContextRef.current = null;
          console.log('🎵 AudioContext closed due to page unload');
        }
      }
    } catch (e) {
      console.warn('Error during audio cleanup:', e);
    }
  }, []);

  return {
    playSpinStart,
    playSpinLoop,
    stopSpinLoop,
    playSpinStop,
    playWin,
    playLose,
    cleanup
  };
};