import React, { useState, useEffect } from 'react';
import RouletteFrame from './RouletteFrame';
import RouletteSegments from './RouletteSegments';
import SpinButton from './SpinButton';
import RoulettePointer from './RoulettePointer';
import styles from './roulette.module.css';
import { RouletteElement } from './types';

interface NewRouletteProps {
  elements: RouletteElement[];
  onSpin: () => void;
  onSpinEnd: (prize: RouletteElement) => void;
  spinning: boolean;
  prizeIndex: number | null;
}

const NewRoulette = ({
  elements,
  onSpin,
  onSpinEnd,
  spinning,
  prizeIndex
}: NewRouletteProps) => {
  const [rotation, setRotation] = useState(0);
  const [internalSpinning, setInternalSpinning] = useState(false);
  const [spinCompleted, setSpinCompleted] = useState(false);

  // Dimensiones de la ruleta
  const width = 500;
  const height = 500;
  const center = width / 2;
  const segmentsRadius = 205;

  // Calcular la rotación basada en el índice del premio
  const calculatePrizeRotation = (index: number) => {
    if (index === null) return 0;
    
    const segmentAngle = 360 / elements.length;
    // Calculamos el ángulo central del segmento seleccionado
    // Restamos de 360 porque la ruleta gira en sentido horario
    const baseAngle = 360 - (index * segmentAngle + segmentAngle / 2);
    // Añadimos giros completos para efecto visual
    const fullSpins = 5;
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
      
      // Calculamos giros completos - SIEMPRE al menos 5 vueltas
      const minSpins = 5;
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
      const spinDuration = 6000; // Debe coincidir con la duración CSS
      setTimeout(() => {
        // Mantenemos la rotación final
        setInternalSpinning(false);
        setSpinCompleted(true);
        if (elements[prizeIndex]) {
          onSpinEnd(elements[prizeIndex]);
        }
      }, spinDuration);
    }
  }, [spinning, prizeIndex]);

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

  return (
    <div className={styles.rouletteContainer}>
      <div className={styles.wheelWrapper}>
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
        <RoulettePointer spinning={spinning || internalSpinning} />
        
        {/* La rueda con los segmentos que gira */}
        <div
          className={`${styles.wheel} ${spinning || internalSpinning ? styles.spinning : ''}`}
          style={{ 
            transform: `rotate(${rotation}deg)`, 
            // Esta propiedad evitará que la ruleta vuelva a la posición inicial
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
            transitionProperty: spinning || internalSpinning ? 'transform' : 'none'
          }}
        >
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ zIndex: 5, position: 'relative' }}>
            {/* Base circular de la ruleta */}
            <circle 
              cx={center} 
              cy={center} 
              r={segmentsRadius} 
              fill="#DAA520" 
              stroke="#4A3000" 
              strokeWidth="4" 
            />
            
            {/* Los segmentos de la ruleta con colores y etiquetas */}
            <RouletteSegments 
              elements={elements} 
              radius={segmentsRadius} 
              center={center} 
            />
          </svg>
        </div>
        
        {/* Marco decorativo alrededor de la rueda */}
        <RouletteFrame spinning={spinning || internalSpinning} />
        
        {/* Botón para girar en el centro - Mejorado para capturar eventos de teclado */}
        <SpinButton 
          onClick={handleSpinClick} 
          disabled={spinning || internalSpinning}
        />
        
          </>
        )}
      </div>
    </div>
  );
};

export default NewRoulette;
