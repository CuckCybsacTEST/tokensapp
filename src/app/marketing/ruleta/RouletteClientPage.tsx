"use client";

import React, { useEffect, useState, useRef } from "react";
import NewRoulette from "@/components/roulette/NewRoulette";
import RouletteHeading from "@/components/roulette/RouletteHeading";
import { RouletteElement } from "@/components/roulette/types";
import { motion, AnimatePresence } from "framer-motion";
import RetryOverlay from "@/components/roulette/RetryOverlay";
import LoseModal from "@/components/roulette/LoseModal";
import SmartPreloader from "@/components/common/SmartPreloader";
import { perfMark, perfMeasure, perfSummarize, perfCheckBudget } from "@/lib/perf";
import CanvasConfetti from "@/components/visual/CanvasConfetti";
import { ThemeName } from "@/lib/themes/types";
import { useRouletteTheme } from "@/lib/themes/useRouletteTheme";

// Confetti ahora usando canvas para menos costo en DOM
const Confetti = ({ active, lowMotion = false, colors }: { active: boolean; lowMotion?: boolean; colors?: string[] }) => (
  <CanvasConfetti active={active && !lowMotion} lowMotion={lowMotion} colors={colors} />
);

// Función para obtener colores variados para los segmentos de la ruleta
function getSegmentColor(index: number): string {
  const colors = [
    "#FF8A00", // Naranja
    "#FF5252", // Rojo
    "#E040FB", // Morado
    "#7C4DFF", // Índigo
    "#448AFF", // Azul
    "#18FFFF", // Cyan
    "#B2FF59", // Verde lima
    "#EEFF41", // Amarillo claro
    "#FFC400", // Ámbar
    "#FF6D00", // Naranja oscuro
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
  reservedByRetry?: boolean;
  prize: { id: string; key: string; label: string; color: string | null; active: boolean };
  realToken?: {
    id: string;
    revealedAt?: string | null;
    deliveredAt?: string | null;
    redeemedAt?: string | null;
  };
}

interface RouletteClientPageProps {
  tokenId: string;
  theme?: ThemeName;
}

export default function RouletteClientPage({ tokenId, theme: propTheme = "default" }: RouletteClientPageProps) {
  // Usar el hook de tema para obtener la configuración
  const { theme: contextTheme, config } = useRouletteTheme();
  const theme = propTheme || contextTheme;
  const themeConfig = config;
  // Mark initial mount
  useEffect(() => {
    perfMark("page_mount");
  }, []);
  const [loading, setLoading] = useState(true);
  // Token activo en UI (permite cambiar sin navegación dura)
  const [activeTokenId, setActiveTokenId] = useState<string>(tokenId);
  // Bandera para transición suave (no mostrar overlay) - ahora ref para evitar re-ejecuciones
  const softSwitchRef = useRef(false);
  // const [pendingAutoSpin, setPendingAutoSpin] = useState(false); // OBSOLETO
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<TokenShape | null>(null);
  const [elements, setElements] = useState<RouletteElement[]>([]);
  type Phase = "READY" | "SPINNING" | "REVEALED_MODAL" | "REVEALED_PANEL" | "DELIVERED";
  const [phase, setPhase] = useState<Phase>("READY");
  const [prizeIndex, setPrizeIndex] = useState<number | null>(null);
  const [prizeWon, setPrizeWon] = useState<RouletteElement | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [deliverError, setDeliverError] = useState<string | null>(null);
  const [lowMotion, setLowMotion] = useState(false);
  // Overlay minimal para RETRY (oculta cabeceras y copia mientras cambia el token)
  const [retryOverlayOpen, setRetryOverlayOpen] = useState(false);
  // Suprime la UI de "premio revelado" cuando el resultado es RETRY
  const [suppressRevealed, setSuppressRevealed] = useState(false);
  // Suprime el loader durante la transición RETRY (entre overlay y auto-spin)
  const [suppressLoader, setSuppressLoader] = useState(false);
  // Marca cuándo se abrió el overlay para garantizar visibilidad mínima (~1s)
  const retryOverlayOpenedAt = useRef<number | null>(null);
  // Bandera para transición de retry, para suprimir errores
  const [isRetryTransition, setIsRetryTransition] = useState(false);
  // Bandera para auto-spin en retry, para suprimir errores
  const [isAutoSpin, setIsAutoSpin] = useState(false);
  const prizeModalTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const winAudioRef = useRef<HTMLAudioElement | null>(null);
  // Altura dinámica del heading para espaciar ruleta (se usa sólo en render principal, pero declaramos aquí para orden estable de hooks)
  const [rouletteHeadingHeight, setRouletteHeadingHeight] = useState(0);
  // Contador de giros (offset base 420). Se obtiene de métricas del periodo "today".
  const SPIN_BASE_OFFSET = 420;
  const [spinCounter, setSpinCounter] = useState<number | null>(null);
  // Tuning constants
  const FETCH_TIMEOUT_MS = 8000; // abort fetch if backend stalls
  const MIN_LOADER_MS = 900; // shorter minimum loader time to feel snappy
  const LOAD_BUDGET_MS = 2500; // presupuesto orientativo para load_total

  useEffect(() => {
    if (typeof document === "undefined") return;
    const target = document.documentElement;
    const attrName = "data-roulette-theme";
    const prevValue = target.getAttribute(attrName);
    if (theme) {
      target.setAttribute(attrName, theme);
    } else {
      target.removeAttribute(attrName);
    }
    return () => {
      if (prevValue) {
        target.setAttribute(attrName, prevValue);
      } else {
        target.removeAttribute(attrName);
      }
    };
  }, [theme]);

  // Cargar métrica de giros al montar (period today) para inicializar contador.
  useEffect(() => {
    // Detectar modo de bajo movimiento / heurística de dispositivo
    try {
      const mq =
        typeof window !== "undefined"
          ? window.matchMedia("(prefers-reduced-motion: reduce)")
          : null;
      const deviceMem = (navigator as any)?.deviceMemory || 0; // heurística (no estándar en todos los navs)
      const smallViewport =
        typeof window !== "undefined" && (window.innerWidth < 380 || window.innerHeight < 680);
      const isLow = (!!mq && mq.matches) || (deviceMem > 0 && deviceMem <= 2) || smallViewport;
      setLowMotion(!!isLow);
    } catch {}
    let abort = false;
    (async () => {
      try {
        const today = new Date();
        const y = today.getFullYear(),
          m = String(today.getMonth() + 1).padStart(2, "0"),
          d = String(today.getDate()).padStart(2, "0");
        // A falta de conteo de giros centralizado en nuevo modelo, inicializamos sólo con base fija.
        const res = await fetch(`/api/admin/daily-tokens?day=${y}-${m}-${d}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          setSpinCounter(SPIN_BASE_OFFSET);
          return;
        }
        // El endpoint diario todavía no expone spins; dejamos base sola.
        if (!abort) setSpinCounter(SPIN_BASE_OFFSET);
      } catch {
        if (!abort) setSpinCounter(SPIN_BASE_OFFSET);
      }
    })();
    return () => {
      abort = true;
    };
  }, []);

  // Inicializar audio al montar para reducir delay en giro
  useEffect(() => {
    if (!winAudioRef.current) {
      const a = new Audio("/win-sound.mp3");
      a.volume = 0.5;
      winAudioRef.current = a;
      // Intentar primar (algunos navegadores requieren gesto; si falla, se ignora)
      a.muted = true;
      a.play()
        .then(() => {
          a.pause();
          a.currentTime = 0;
          a.muted = false;
        })
        .catch(() => {
          a.muted = false;
        });
    }
  }, []);

  // Reconstrucción en recarga: si el token ya está revelado / entregado.
  useEffect(() => {
    if (!token) return;
    if (suppressRevealed) return; // no mostrar panel si estamos en transición de RETRY
    const isReserved = !!token.reservedByRetry;
    // Si el token es un bi-token y tiene realToken, revisa el estado del real
    const realTokenUsed = isReserved && token.realToken && (token.realToken.revealedAt || token.realToken.deliveredAt || token.realToken.redeemedAt);
    if (isReserved && realTokenUsed) {
      // No mostrar panel de premio revelado, solo el mensaje especial
      setPhase("READY");
      setPrizeIndex(null);
      setPrizeWon(null);
      return;
    }
    if (token.deliveredAt || token.redeemedAt) {
      setPhase("DELIVERED");
      return;
    }
    if (token.revealedAt && phase === "READY") {
      console.log(`🔍 [Roulette] Token ya revelado detectado:`, {
        tokenId: token.id,
        revealedAt: token.revealedAt,
        prize: token.prize?.key,
        phase,
        elementsCount: elements.length,
        isRetryTransition,
        functionalTokenId
      });
      // Derivar prizeIndex del premio original.
      if (elements.length) {
        const idx = elements.findIndex((e) => e.prizeId === token.prize.id);
        if (idx >= 0) {
          setPrizeIndex(idx);
          setPrizeWon(elements[idx]);
          setPhase("REVEALED_PANEL"); // tras recarga no abrimos modal para no confundir usuario
        }
      }
    }
  }, [token, elements, phase, suppressRevealed]);

  useEffect(() => {
    // Si el prop cambia (navegación externa), sincroniza estado base
    setActiveTokenId(tokenId || "");
  }, [tokenId]);

  useEffect(() => {
    if (!activeTokenId) {
      setError("No se ha proporcionado un token");
      setLoading(false);
      return;
    }

    // Reset UI sólo para carga dura; en suave mantenemos UI y cambiamos al final
    if (!softSwitchRef.current) {
      // No mostrar loader si estamos en transición RETRY
      if (!suppressLoader) setLoading(true);
      setError(null);
      setToken(null);
      setElements([]);
      setPhase("READY");
      setPrizeIndex(null);
      setPrizeWon(null);
      setShowConfetti(false);
      setDelivering(false);
      setDeliverError(null);
    } else {
      setError(null);
    }

    let abort = false;
    const minPromise = new Promise<void>((resolve) => setTimeout(resolve, MIN_LOADER_MS));

    (async function loadToken() {
      perfMark("load_start");
      try {
        // Control de timeout
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        const doFetch = async () => {
          const response = await fetch(`/api/tokens/${activeTokenId}/roulette-data`, {
            signal: controller.signal,
            cache: "no-store",
          });
          const raw = await response.text();
          if (!response.ok) {
            // Intenta parsear JSON desde el texto una sola vez
            let msg = "";
            try {
              const j = JSON.parse(raw || "{}");
              msg = j.message || j.error || "";
            } catch {}
            if (response.status === 404) throw new Error("Token no encontrado");
            if (response.status === 403)
              throw new Error(
                "El sistema de tokens está temporalmente desactivado. Por favor, inténtalo más tarde."
              );
            throw new Error(msg || `Error ${response.status}${raw ? `: ${raw}` : ""}`);
          }
          return raw ? JSON.parse(raw) : {};
        };

        let data: any;
        try {
          data = await doFetch();
        } catch (e: any) {
          // Reintento rápido una vez si no fue un abort por timeout
          if (e?.name !== "AbortError") {
            try {
              data = await doFetch();
            } catch (e2) {
              throw e; // propaga el error original
            }
          } else {
            throw new Error("Tiempo de espera agotado al cargar la ruleta.");
          }
        } finally {
          clearTimeout(timer);
        }

        if (abort) return;
        // En transición suave, aplicamos cambios al final de golpe
        const applyData = () => {
          setToken(data.token);
          if (data.elements && Array.isArray(data.elements)) {
            const rouletteElements = data.elements.map((e: any, index: number) => ({
              label: e.label,
              color: e.color || getSegmentColor(index),
              prizeId: e.prizeId,
              key: e.key,
            }));
            setElements(rouletteElements);
          }
        };
        const isSoft = softSwitchRef.current;
        if (isSoft) {
          applyData();
          // Listo para auto-giro tras soft load - DESACTIVADO para segundo giro
          setPhase("READY");
          // setPendingAutoSpin(true);
          // El cierre del overlay ahora se gestiona por un efecto cuando la ruleta está lista (elements>=2)
        } else {
          applyData();
        }
      } catch (err) {
        if (!abort) {
          console.error("Error cargando datos:", err);
          if (!softSwitchRef.current) setError(err instanceof Error ? err.message : "Error desconocido");
        }
      } finally {
        await minPromise;
        if (!abort) {
          setLoading(false); // Siempre ocultar loader al final, independientemente de softSwitch
          // Si fue softSwitch, evitamos overlay; limpiamos bandera
          if (softSwitchRef.current) {
            softSwitchRef.current = false;
            setIsRetryTransition(false);
            setRetryOverlayOpen(false); // Cerrar overlay después de carga completa
          }
          perfMark("loader_hidden");
          perfMeasure("load_total", "load_start", "loader_hidden");
          // Presupuesto de carga
          perfCheckBudget("load_total", LOAD_BUDGET_MS, "load");
          // Log summary occasionally
          if (typeof window !== "undefined" && Math.random() < 0.15) perfSummarize();
        }
      }
    })();

    return () => {
      abort = true;
    };
  }, [activeTokenId]);

  const handleSpin = async () => {
    if (phase !== "READY") return;
    if (!activeTokenId) return;
    if (token?.revealedAt || token?.redeemedAt || token?.deliveredAt) return;
    setPhase("SPINNING");
    perfMark("spin_start");
    // Audio ya inicializado en useEffect
    try {
  const response = await fetch(`/api/token/${activeTokenId}/reveal`, { method: "POST" });
      if (!response.ok) throw new Error(`Error ${response.status}: ${await response.text()}`);
      const data = await response.json();
      // Guardamos revealedAt pero dejamos que la animación termine (onSpinEnd)
      setToken((t) =>
        t ? { ...t, revealedAt: data?.timestamps?.revealedAt || new Date().toISOString() } : t
      );
      const winIndex = elements.findIndex((e) => e.prizeId === data.prizeId);
      if (winIndex < 0) throw new Error("Premio no encontrado en la ruleta");
      setPrizeIndex(winIndex);
      // Si el backend indica RETRY, guardamos nextTokenId para transición suave
      if (data?.action === 'RETRY' && data?.nextTokenId) {
        console.log(`🎯 [Roulette] Retry detectado, nextTokenId: ${data.nextTokenId}`);
        setNextTokenId(data.nextTokenId);
        setFunctionalTokenId(data.nextTokenId); // El token funcional es el nextTokenId
      } else {
        setNextTokenId(null);
        setFunctionalTokenId(null);
      }
      // La animación del componente NewRoulette usará prizeIndex y disparará handleSpinEnd
    } catch (err) {
      console.error("Error al girar:", err);
      if (!isAutoSpin) setError(err instanceof Error ? err.message : "Error al girar la ruleta");
      setPhase("READY");
    }
  };

  const confirmDeliver = async () => {
    if (!activeTokenId) return;
    setDeliverError(null);
    setDelivering(true);
    try {
      const res = await fetch(`/api/token/${activeTokenId}/deliver`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = body?.error || body?.message || `Error ${res.status}`;
        setDeliverError(msg);
        return;
      }
      // Update local token state to reflect delivery (mirror redeemedAt)
      setToken((t) =>
        t
          ? ({
              ...t,
              deliveredAt: body?.timestamps?.deliveredAt || new Date().toISOString(),
              redeemedAt: body?.timestamps?.deliveredAt || new Date().toISOString(),
            } as any)
          : t
      );
      setPhase("DELIVERED");
      setShowConfetti(false);
    } catch (e: any) {
      setDeliverError(e?.message || "DELIVER_FAILED");
    } finally {
      setDelivering(false);
    }
  };

  const [nextTokenId, setNextTokenId] = useState<string|null>(null);
  // Token funcional que se habilita después de reveal de retry
  const [functionalTokenId, setFunctionalTokenId] = useState<string|null>(null);

  // Callback cuando el token funcional está listo
  const handleFunctionalTokenReady = () => {
    console.log(`🚀 [Roulette] Token funcional listo, iniciando transición automática:`, {
      functionalTokenId,
      nextTokenId,
      isRetryTransition
    });

    // Cleanup agresivo antes de la transición
    setToken(null); // Forzar recarga completa de token
    setElements([]); // Limpiar elementos anteriores
    setPrizeWon(null);
    setPrizeIndex(null);
    setPhase('READY');

    // El overlay se cerrará automáticamente y comenzará la transición
    setTimeout(() => {
      try {
        const newUrl = `/marketing/ruleta?tokenId=${encodeURIComponent(functionalTokenId!)}`;
        console.log(`🔗 [Roulette] Redirigiendo a: ${newUrl}`);
        window.history.replaceState(null, "", newUrl);
      } catch (error) {
        console.error(`❌ [Roulette] Error en redirección:`, error);
      }
      softSwitchRef.current = true;
      // Auto-spin desactivado para segundo giro - interacción manual
      // setPendingAutoSpin(true);
      setActiveTokenId(functionalTokenId!);
      // Limpiar estados de retry completamente
      setFunctionalTokenId(null);
      setNextTokenId(null);
      setIsRetryTransition(false);
      setRetryOverlayOpen(false);
      setSuppressRevealed(false);
    }, 500); // Pequeño delay para que el usuario vea que está listo
  };
  const handleSpinEnd = (prize: RouletteElement) => {
    perfMark("spin_end");
    perfMeasure("spin_duration", "spin_start", "spin_end");
    // Presupuesto de animación (varía por lowMotion)
    perfCheckBudget("spin_duration", lowMotion ? 3600 : 6200, "spin");
    // Si hay RETRY, mostramos overlay con polling para esperar token funcional
    if (nextTokenId) {
      console.log(`🎯 [Roulette] Iniciando overlay de retry para token funcional: ${nextTokenId}`);
      // Cancelar cualquier timeout de modal anterior
      if (prizeModalTimeoutRef.current) {
        clearTimeout(prizeModalTimeoutRef.current);
        prizeModalTimeoutRef.current = null;
      }
      // Mostrar overlay con polling que esperará a que el token esté listo
      setIsRetryTransition(true);
      setRetryOverlayOpen(true);
      try { retryOverlayOpenedAt.current = Date.now(); } catch {}
      setSuppressRevealed(true);
      // Asegurar que no aparezca overlay de loader
      setLoading(false);
      setSuppressLoader(true);
      setShowConfetti(false);
      setPrizeIndex(null);
      setPrizeWon(null); // Asegurar que no haya premio mostrado
      setPhase('READY');
      // La transición se hará automáticamente cuando el polling detecte que el token esté listo
      return;
    }
    setPrizeWon(prize);
    setShowConfetti(true);
    // Incrementar contador local tras completar un giro exitoso
    setSpinCounter((c) => (c == null ? SPIN_BASE_OFFSET + 1 : c + 1));

    // Limpiamos cualquier timeout anterior
    if (prizeModalTimeoutRef.current) {
      clearTimeout(prizeModalTimeoutRef.current);
    }

    // Temporizador para detener el confetti después de unos segundos
    setTimeout(() => {
      setShowConfetti(false);
    }, 5000); // Detiene el confetti después de 5 segundos

    // Reproducir efecto de sonido (ya inicializado)
    try {
      if (winAudioRef.current) {
        winAudioRef.current.currentTime = 0;
        winAudioRef.current.play().catch(() => {});
      }
    } catch {}

    // Delay antes de mostrar el modal para que el usuario vea el premio en la ruleta
    setTimeout(() => {
      setPhase("REVEALED_MODAL");
    }, 1500); // 1.5 segundos de delay
  };

  // Al cambiar de token (softSwitch), desactivar supresión del panel para el nuevo ciclo
  useEffect(() => {
    if (!activeTokenId) return;
    // permitir paneles normales para el nuevo token; no afecta RETRY in-flight
    setSuppressRevealed(false);
  }, [activeTokenId]);

  // (sin aviso toast)

  const baseContainerClass = [
    "relative",
    "w-full",
    retryOverlayOpen ? "pointer-events-none" : "",
    theme === 'christmas' ? "pt-16 sm:pt-0" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (retryOverlayOpen) {
    return (
      <RetryOverlay
        open={true}
        functionalTokenId={functionalTokenId}
        onFunctionalTokenReady={handleFunctionalTokenReady}
        maxPollingTime={30000}
      />
    );
  }
  if (loading && !suppressLoader && !retryOverlayOpen) {
    return (
      <div
        className={`fixed inset-0 z-[100] overflow-hidden flex items-center justify-center roulette-loading-overlay touch-none ${theme === 'christmas' ? "roulette-theme--christmas" : ""}`}
        style={{ overscrollBehavior: "contain" }}
      >
        <div className="relative z-[1]">
          <SmartPreloader logoSrc="/logo.png" />
        </div>
      </div>
    );
  }

  if (error) {
    // Clasificación de errores: priorizar TWO_PHASE_DISABLED para no confundir con "desactivado"
    const isTwoPhaseDisabledError = error.includes("TWO_PHASE_DISABLED");
    const isTokensDisabledError =
      (!isTwoPhaseDisabledError && (error.includes("El sistema de tokens está temporalmente desactivado") || error.includes("fuera de servicio"))) || false;

    const boxTone = isTwoPhaseDisabledError
      ? {
          box: "bg-indigo-500/10 border-indigo-500/30",
          title: "text-indigo-300",
          heading: "Modo de 1 fase activo",
          msg: "Este entorno no tiene habilitado el flujo de 2 fases (reveal → deliver). Activa TWO_PHASE_REDEMPTION=1 y reinicia el servidor para probar la ruleta.",
        }
      : isTokensDisabledError
        ? {
            box: "bg-amber-500/10 border-amber-500/30",
            title: "text-amber-300",
            heading: "Cargando el drop",
            msg: "Aún no soltamos la ruleta. Se enciende a las 5:00 PM. Quédate cerca.",
          }
        : {
            box: "bg-red-500/10 border-red-500/30",
            title: "text-red-300",
            heading: "Error",
            msg: error,
          };

    return (
      <div className="min-h-[70vh] sm:min-h-[60vh] flex items-center justify-center px-4">
        <div
          className={`w-full max-w-[20rem] sm:max-w-md ${boxTone.box} border rounded-xl p-5 sm:p-6 shadow-lg`}
        >
          <p className={`${boxTone.title} text-base sm:text-lg font-semibold`}>{boxTone.heading}</p>
          <p className="mt-2 text-white/70 text-sm sm:text-base">{boxTone.msg}</p>
          <button
            className="mt-5 w-full sm:w-auto px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={() => window.location.reload()}
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    );
  }

  if (phase === "DELIVERED" || token?.redeemedAt || token?.deliveredAt) {
    return (
      <div className={`text-center py-16 max-w-md mx-auto ${theme === 'christmas' ? "roulette-theme--christmas" : ""}`}>
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
          <p className="text-green-300 text-lg font-semibold">¡Premio ya canjeado!</p>
          <p className="mt-2 text-white/70">
            Este token ya ha sido utilizado para canjear un premio.
          </p>
          <p className="mt-4 text-xl font-bold">{token?.prize?.label}</p>
        </div>
      </div>
    );
  }

  // Evitar mostrar pantallas de token no disponible/expirado durante transición RETRY
  const transitionGuardActive = retryOverlayOpen || suppressLoader || softSwitchRef.current;
  const allowRestrictedScreens = !transitionGuardActive && phase === "READY";

  if (allowRestrictedScreens && token?.disabled) {
    let availableText: string | null = null;
    try {
      if (token.availableFrom) {
        const d = new Date(token.availableFrom);
        // Formato determinista DD/MM/AAAA para evitar diferencias de locale entre server y cliente
        // Usamos 'es-ES' fijo para que SSR y CSR produzcan exactamente el mismo string.
        // (Locales implícitos pueden variar y causar hydration mismatch.)
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        availableText = `${day}/${month}/${year}`;
      }
    } catch {}
    return (
      <div className={`text-center py-16 max-w-md mx-auto ${theme === 'christmas' ? "roulette-theme--christmas" : ""}`}>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6">
          <p className="text-amber-300 text-lg font-semibold">Token no disponible</p>
          <p className="mt-2 text-white/70">
            {availableText ? (
              <>
                Este token estará habilitado el{" "}
                <span className="font-semibold">{availableText}</span>.
              </>
            ) : (
              <>Este token no está activo o ha sido deshabilitado.</>
            )}
          </p>
        </div>
      </div>
    );
  }

  if (allowRestrictedScreens && new Date(token?.expiresAt || 0) < new Date()) {
    return (
      <div className={`text-center py-16 max-w-md mx-auto ${theme === 'christmas' ? "roulette-theme--christmas" : ""}`}>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6">
          <p className="text-amber-300 text-lg font-semibold">Token expirado</p>
          <p className="mt-2 text-white/70">Este token ha expirado y ya no puede ser utilizado.</p>
        </div>
      </div>
    );
  }

  // Si el token es un bi-token (retry) y el real ya fue revelado/entregado/redimido, suprime el panel de premio revelado
  const isReserved = !!token?.reservedByRetry;
  const realTokenUsed = isReserved && token?.realToken && (token.realToken.revealedAt || token.realToken.deliveredAt || token.realToken.redeemedAt);
  const showRevealedPanel = !retryOverlayOpen && !suppressRevealed && (phase === "REVEALED_PANEL" || (token?.revealedAt && phase === "READY")) && !(isReserved && realTokenUsed) && !(prizeWon && prizeWon.key === 'lose');

  // Render principal

  // UI especial para tokens reservados (bi-token), cuando no hay ruleta disponible o ya fue usado
  const shouldShowReservedPanel = (isReserved && (token?.disabled || elements.length < 2) && !retryOverlayOpen && phase === 'READY') || (isReserved && realTokenUsed);

  return (
    <div
      className={baseContainerClass}
      aria-hidden={retryOverlayOpen ? true : undefined}
      style={{ opacity: retryOverlayOpen ? 0 : 1 }}
      data-roulette-theme={theme || undefined}
    >
      {!retryOverlayOpen && !shouldShowReservedPanel && (
        <div className="px-4 pt-8 sm:pt-12 text-center max-w-3xl mx-auto">
          <RouletteHeading
            kicker="BIENVENIDO"
            title="Ruleta Token Show"
            subtitle="Gira la ruleta y prueba tu suerte"
            onHeight={(h) => setRouletteHeadingHeight(h)}
          />
        </div>
      )}
      {/* Confetti animation */}
      <Confetti
        active={showConfetti}
        lowMotion={lowMotion}
        colors={
          theme === 'christmas'
            ? ["#ff1c1c", "#ffb347", "#ffd700", "#2ecc71", "#34c759", "#ffffff"]
            : undefined
        }
      />

      {/* Estado: Token reservado (bi-token) */}
      {shouldShowReservedPanel && (
        <div className="px-4">
          <div className="mx-auto max-w-md text-center py-10 sm:py-12">
            <div
              className="rounded-2xl p-6 sm:p-7 border shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(14,16,22,0.85), rgba(10,12,18,0.85))',
                borderColor: 'rgba(255,255,255,0.12)'
              }}
            >
              <div className="flex items-center justify-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-500 to-indigo-400 animate-pulse" />
                <div className="text-white/90 text-base sm:text-lg font-semibold tracking-wide">Token reservado</div>
              </div>
              {realTokenUsed ? (
                <>
                  <p className="mt-3 text-white/70 text-sm sm:text-base leading-relaxed">
                    Este <span className="text-white/90">Nuevo intento</span> ya fue utilizado porque el premio real fue revelado o entregado. No es posible volver a usarlo.
                  </p>
                  <div className="mt-5">
                    <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs border border-white/10 text-white/70">
                      <span className="inline-block w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                      Retry usado
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-3 text-white/70 text-sm sm:text-base leading-relaxed">
                    Este QR está apartado para un <span className="text-white/90">Nuevo intento</span>. No participa de la ruleta ni se imprime por separado.
                  </p>
                  <p className="mt-2 text-white/60 text-xs sm:text-sm">
                    Si acabas de obtener <span className="text-white/80">Retry</span>, el staff usará este código automáticamente cuando corresponda.
                  </p>
                  <div className="mt-5">
                    <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs border border-white/10 text-white/70">
                      <span className="inline-block w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                      Reservado (bi-token)
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ruleta solo en READY / SPINNING */}
      {(phase === "READY" || phase === "SPINNING") && !shouldShowReservedPanel && (
        <div className="flex items-center justify-center py-6 sm:py-8 min-h-[400px] sm:min-h-[500px]">
          <NewRoulette
            elements={elements}
            onSpin={handleSpin}
            onSpinEnd={handleSpinEnd} // mantenemos callback legacy para posible animación futura
            spinning={phase === "SPINNING"}
            prizeIndex={prizeIndex}
            variant="inline"
            lowMotion={lowMotion}
            theme={theme}
          />
        </div>
      )}

      {/* Contador de giros */}
      {spinCounter != null && !shouldShowReservedPanel && (
        <div className="mt-3 text-center text-xs sm:text-sm text-white/60 select-none tracking-wide">
          Giro #{spinCounter}
        </div>
      )}

      {/* Panel permanente tras cerrar modal */}
  {showRevealedPanel && prizeWon && (
        <div className="text-center py-8 sm:py-12 max-w-md mx-auto px-4">
          <div
            className="rounded-lg p-5 sm:p-6 border"
            style={{ background: "rgba(255,77,46,0.10)", borderColor: "rgba(255,77,46,0.30)" }}
          >
            <p className="text-[#FFD166] text-base sm:text-lg font-semibold">¡Premio revelado!</p>
            <p className="mt-2 text-white/80 text-sm sm:text-base leading-relaxed">
              Muéstralo en barra para canjearlo. Nuestro staff confirmará la entrega en tu pantalla.
            </p>
            <p className="mt-4 text-lg sm:text-xl font-bold break-words px-2">{prizeWon.label}</p>
            <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
              <button
                className="px-4 sm:px-5 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-500 transition-colors text-sm sm:text-base"
                onClick={confirmDeliver}
                disabled={delivering}
                title="Para uso del STAFF"
              >
                {delivering ? "Confirmando…" : "Marcar entregado (staff)"}
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
            {/* Overlay minimal para RETRY */}
            {retryOverlayOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center"
                aria-modal="true"
                role="dialog"
              >
                <div className="absolute inset-0" style={{ background: 'rgba(6,7,10,0.92)', backdropFilter: 'blur(8px)' }} />
                <motion.div
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.98, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                  className="relative z-10 rounded-2xl px-5 py-4 sm:px-6 sm:py-5 shadow-2xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(20,20,28,0.95), rgba(18,18,24,0.95))',
                    border: '1px solid rgba(255,255,255,0.12)'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#5B86E5] to-[#36D1DC] animate-pulse" />
                    <div className="text-white/90 text-sm sm:text-base font-medium">Nuevo intento</div>
                  </div>
                  <div className="mt-1 text-white/60 text-xs sm:text-sm">Preparando tu siguiente giro…</div>
                </motion.div>
              </motion.div>
            )}
  {prizeWon && phase === "REVEALED_MODAL" && prizeWon.key !== 'lose' && !(isReserved && realTokenUsed) && !isRetryTransition && !functionalTokenId && (
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
                setPhase("REVEALED_PANEL");
                setShowConfetti(false);
              }}
            ></motion.div>

            <motion.div
              initial={{ y: 30, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 30, opacity: 0, scale: 0.9, transition: { duration: 0.4 } }}
              className="relative z-10 rounded-xl p-6 sm:p-8 max-w-md w-full border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden"
              style={{
                background: "linear-gradient(180deg, #0E0606, #07070C)",
                boxShadow: "0 12px 32px -10px rgba(255,77,46,0.6)",
              }}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute top-3 right-3"
              >
                <button
                  onClick={() => {
                    setPhase("REVEALED_PANEL");
                    setShowConfetti(false);
                  }}
                  className="bg-white/10 hover:bg-white/20 rounded-full p-2 text-white/80 hover:text-white transition-colors"
                  aria-label="Cerrar"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
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
                    delay: 0.1,
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
                    ¡Bien hecho!
                  </motion.h2>
                  <motion.div className="w-16 h-1 bg-gradient-to-r from-[#FF4D2E] to-[#FF7A3C] mx-auto rounded-full" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className="my-6"
                >
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 }}
                    className="text-sm sm:text-base text-white/70 mb-1"
                  >
                    Has desbloqueado:
                  </motion.p>
                  <motion.p
                    className="text-2xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#FF4D2E] to-[#FF7A3C] my-2 px-2 sm:px-4 break-words"
                    animate={{
                      backgroundPosition: ["0% center", "100% center", "0% center"],
                    }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    style={{
                      backgroundSize: "200% 100%",
                    }}
                  >
                    {prizeWon.label}
                  </motion.p>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="text-white/80 mb-6 sm:mb-8 text-base sm:text-lg px-1 sm:px-2 leading-relaxed"
                >
                  Muestra esta pantalla en la barra y disfruta tu premio.
                </motion.p>

                <motion.button
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="px-6 sm:px-10 py-3 sm:py-4 rounded-full bg-gradient-to-r from-[#FF4D2E] to-[#FF7A3C] hover:from-[#ff5e44] hover:to-[#ff8a54] text-white font-bold transition-all shadow-lg hover:shadow-xl text-base sm:text-lg"
                  onClick={() => {
                    setPhase("REVEALED_PANEL");
                    setShowConfetti(false);
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  ¡A rumbear!
                </motion.button>
                {/* Staff delivery button removed from modal per request */}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal específico para lose/piña */}
      {prizeWon && phase === "REVEALED_MODAL" && prizeWon.key === 'lose' && !isRetryTransition && !functionalTokenId && <LoseModal open={true} />}
    </div>
  );
}
