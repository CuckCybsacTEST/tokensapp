import React from 'react';
import cls from './discoBackground.module.css';

type Intensity = 'low' | 'medium' | 'high';

interface DiscoBackgroundProps {
  className?: string;
  intensity?: Intensity; // controla opacidad general
}

/**
 * DiscoBackground: Fondo animado tipo discoteca con blobs, haces giratorios y textura.
 * - No captura eventos (pointer-events: none)
 * - Debe renderizarse dentro de un contenedor position: relative y por debajo del contenido
 */
export default function DiscoBackground({ className, intensity = 'medium' }: DiscoBackgroundProps) {
  return (
    <div
      className={[cls.root, cls[intensity], className].filter(Boolean).join(' ')}
      aria-hidden
    >
  <div className={cls.baseGradient} />
  <div className={`${cls.blob} ${cls.blobPink}`} />
  <div className={`${cls.blob} ${cls.blobBlue}`} />
  <div className={`${cls.blob} ${cls.blobViolet}`} />
  <div className={cls.beams} />
      <div className={cls.texture} />
    </div>
  );
}
