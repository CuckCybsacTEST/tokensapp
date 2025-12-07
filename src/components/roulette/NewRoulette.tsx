import React, { useState, useEffect, useRef } from 'react';
import RouletteFrame from './RouletteFrame';
import RouletteSegments from './RouletteSegments';
import SpinButton from './SpinButton';
import RoulettePointer from './RoulettePointer';
import styles from './roulette.module.css';
import { useNoScroll } from './useNoScroll';
import { RouletteElement } from './types';
import { ThemeName } from '@/lib/themes/types';

interface NewRouletteProps {
  elements: RouletteElement[];
  onSpin: () => void;
  onSpinEnd: (prize: RouletteElement) => void;
  spinning: boolean;
  prizeIndex: number | null;
  /** Espaciado superior explícito para reservar área de título (px o cualquier unidad CSS). Override de clases .hasTitle/.title-large */
  topSpacing?: number | string;
  /** Override opcional para el offset del puntero (en px, valor negativo esperado). */
  pointerOffset?: number;
  /** Controla si se bloquea el scroll global mientras está montada la ruleta (default true) */
  lockScroll?: boolean;
  /** Variante de layout: fullscreen (default) o inline (flujo dentro de una página con otros elementos encima). */
  variant?: 'fullscreen' | 'inline';
  /** Modo de bajo movimiento: reduce efectos/tiempos para dispositivos con menos recursos o usuarios que lo prefieren */
  lowMotion?: boolean;
  /** Tema opcional para personalizar colores (ej: "christmas"). */
  theme?: ThemeName;
}

const NewRoulette = ({
  elements,
  onSpin,
  onSpinEnd,
  spinning,
  prizeIndex,
  topSpacing,
  pointerOffset,
  lockScroll = true,
  variant = 'fullscreen',
  lowMotion = false,
  theme = 'default'
}: NewRouletteProps) => {
  const [rotation, setRotation] = useState(0);
  const [internalSpinning, setInternalSpinning] = useState(false);
  const [spinCompleted, setSpinCompleted] = useState(false);

  // Dimensiones dinámicas de la ruleta (se basan en el contenedor responsivo CSS)
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<number>(500); // fallback inicial

  useEffect(() => {
    if (!wrapperRef.current) return;
    const el = wrapperRef.current;

    // Observamos cambios de tamaño del wrapper para recalcular el SVG
    const resizeObserver = new (window as any).ResizeObserver((entries: any[]) => {
      for (const entry of entries) {
        const newSize = Math.min(entry.contentRect.width, entry.contentRect.height);
        if (newSize && Math.abs(newSize - size) > 0.5) {
          setSize(newSize);
        }
      }
    });
    resizeObserver.observe(el);
    // Inicial
    const rect = el.getBoundingClientRect();
    const initial = Math.min(rect.width, rect.height);
    if (initial && Math.abs(initial - size) > 0.5) setSize(initial);
    return () => resizeObserver.disconnect();
  }, [wrapperRef.current]);

  // Usamos un sistema de coordenadas fijo (base 500) para evitar desalineaciones
  const baseSize = 500;
  const scale = size / baseSize; // factor de escala real
  const center = baseSize / 2; // centro consistente
  const segmentsRadiusBase = baseSize * 0.395; // radio base de segmentos (coincide con frame)
  // Radio en píxeles reales (para pasar al frame decorativo)
  const segmentsRadiusReal = segmentsRadiusBase * scale;

  // Bloquear scroll sólo mientras la ruleta está montada (vista dedicada)
  useNoScroll(lockScroll);

  // Calcular la rotación basada en el índice del premio
  const calculatePrizeRotation = (index: number) => {
    if (index === null) return 0;
    
    const segmentAngle = 360 / elements.length;
    // Calculamos el ángulo central del segmento seleccionado
    // Restamos de 360 porque la ruleta gira en sentido horario
    const baseAngle = 360 - (index * segmentAngle + segmentAngle / 2);
    // Añadimos giros completos para efecto visual
    const fullSpins = lowMotion ? 3 : 5;
    return baseAngle + (fullSpins * 360);
  };

  // Efecto para manejar el giro cuando cambia prizeIndex o spinning
  useEffect(() => {
    if (spinning && prizeIndex !== null && !spinCompleted) {
      
      // Guardamos la rotación actual como punto de partida
      const currentRotation = rotation;
      setInternalSpinning(true);
      
      // Calculamos la nueva rotación basada en la posición actual para evitar saltos
      const baseRotation = calculatePrizeRotation(prizeIndex);
      
  // Calculamos giros completos - menos vueltas en lowMotion
  const minSpins = lowMotion ? 3 : 5;
      const currentAngle = currentRotation % 360;
      const targetAngle = baseRotation;
      
      // Aseguramos que siempre gire al menos 5 vueltas completas
      const fullSpins = minSpins * 360;
      
      // Calculamos el ángulo final sumando los giros completos y ajustando para terminar en el premio
      let newRotation = currentRotation + fullSpins;
      
      // Ajustamos para terminar exactamente en el ángulo del premio
      const angleDifference = (targetAngle - currentAngle + 360) % 360;
      newRotation += angleDifference;
      
      // Forzamos un reflow antes de aplicar la nueva rotación para garantizar que la transición funcione
      document.body.offsetHeight;
      
      // Aplicamos la nueva rotación
      setRotation(newRotation);
      
      // Después de que termine la animación
      const spinDuration = lowMotion ? 3500 : 6000; // Debe coordinar con CSS
      setTimeout(() => {
        // Mantenemos la rotación final
        setInternalSpinning(false);
        setSpinCompleted(true);
        if (elements[prizeIndex]) {
          onSpinEnd(elements[prizeIndex]);
        }
      }, spinDuration);
    }
  }, [spinning, prizeIndex, lowMotion]);

  // Sólo reseteamos cuando cambian los elementos, no al desmontar
  useEffect(() => {
    if (elements.length > 0) {
      setSpinCompleted(false);
      // No reseteamos internalSpinning aquí
    }
  }, [elements]);

  // Manejar el click en el botón de girar
  const handleSpinClick = () => {
    if (spinning || internalSpinning) {
      return;
    }
    onSpin();
  };

  // Estilo dinámico del contenedor (permite override sin romper estilos existentes)
  const containerStyle: React.CSSProperties = {};
  const hasCustomSpacing = topSpacing !== undefined;
  if (hasCustomSpacing) {
    containerStyle.paddingTop = typeof topSpacing === 'number' ? `${topSpacing}px` : topSpacing;
  }

  return (
    <div
      className={styles.rouletteContainer}
      style={containerStyle}
      data-has-custom-spacing={hasCustomSpacing || undefined}
      data-variant={variant}
    >
      <div className={styles.roulettePad}>
        <div className={styles.wheelWrapper} ref={wrapperRef} data-low-motion={lowMotion ? '1' : undefined}>
        {/* Guardia: si hay menos de 2 elementos, no renderizar la ruleta completa */}
        {elements.length < 2 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center gap-4">
            <div className="text-sm text-slate-600 dark:text-slate-300">
              La ruleta requiere al menos 2 premios disponibles para funcionar.
            </div>
          </div>
        ) : (
          <>
        {/* Puntero en la parte superior */}
  <RoulettePointer
            spinning={spinning || internalSpinning}
            scale={scale}
            pointerOffset={pointerOffset}
            theme={theme}
          />
        
        {/* La rueda con los segmentos que gira */}
        <div
          className={`${styles.wheel} ${spinning || internalSpinning ? styles.spinning : ''} ${lowMotion ? styles.lowMotion : ''}`}
          style={{ 
            transform: `translateZ(0) rotate(${rotation}deg)`,
            // Optimizaciones para renderizado y animación fluida
            transformStyle: 'flat',
            backfaceVisibility: 'hidden',
            transitionProperty: spinning || internalSpinning ? 'transform' : 'none',
            // Forzar que sea un círculo perfecto
            borderRadius: '50%'
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${baseSize} ${baseSize}`}
            style={{
              zIndex: 5,
              position: 'relative',
              overflow: 'visible', // permitir strokes completos
              borderRadius: '50%',
              shapeRendering: 'geometricPrecision'
            }}
          >
            {/* Círculo base */}
            <circle
              cx={center}
              cy={center}
              r={segmentsRadiusBase}
              fill="#DAA520"
              stroke="#4A3000"
              strokeWidth={3}
            />
            {/* Segmentos */}
            <RouletteSegments
              elements={elements}
              radius={segmentsRadiusBase}
              center={center}
              scale={scale}
              theme={theme}
            />
          </svg>
        </div>
        
        {/* Marco decorativo alrededor de la rueda */}
        <RouletteFrame
          spinning={spinning || internalSpinning}
          lowMotion={lowMotion}
          scale={scale}
          wheelRadius={segmentsRadiusReal}
          theme={theme}
        />
        
        {/* Botón para girar en el centro - Mejorado para capturar eventos de teclado */}
        <SpinButton 
          onClick={handleSpinClick} 
          disabled={spinning || internalSpinning}
          scale={scale}
          theme={theme}
        />
        
          </>
        )}
        </div>
      </div>
    </div>
  );
};

function areRoulettePropsEqual(prev: NewRouletteProps, next: NewRouletteProps) {
  // Always update when spinning state or prizeIndex changes
  if (prev.spinning !== next.spinning) return false;
  if (prev.prizeIndex !== next.prizeIndex) return false;
  // Compare elements deeply (label/color/prizeId)
  if (prev.elements.length !== next.elements.length) return false;
  for (let i = 0; i < prev.elements.length; i++) {
    const a = prev.elements[i];
    const b = next.elements[i];
    if (!a || !b) return false;
    if (a.label !== b.label || a.color !== b.color || a.prizeId !== b.prizeId) return false;
  }
  // Compare simple props
  if (prev.variant !== next.variant) return false;
  if (prev.lockScroll !== next.lockScroll) return false;
  if (prev.topSpacing !== next.topSpacing) return false;
  if (prev.pointerOffset !== next.pointerOffset) return false;
  if (prev.lowMotion !== next.lowMotion) return false;
  // onSpin / onSpinEnd are functions; assume referential changes are not meaningful for re-render of wheel itself
  return true;
}

export default React.memo(NewRoulette, areRoulettePropsEqual);
