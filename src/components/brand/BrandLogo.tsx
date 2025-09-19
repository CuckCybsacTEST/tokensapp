"use client";

import React from 'react';
import styles from './brandLogo.module.css';

export type BrandLogoProps = {
  src?: string; // default to /logo.png
  alt?: string;
  size?: number; // base size in px (square). CSS will clamp for responsiveness.
  className?: string;
  animated?: boolean; // enable/disable sway animation
};

export default function BrandLogo({ src = '/logo.png', alt = 'Marca', size = 80, className, animated = true }: BrandLogoProps) {
  return (
    <span
      className={`${styles.logoStack} ${animated ? styles.sway : ''} ${className || ''}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className={`${styles.logoImg} ${styles.logoLayer}`} />
    </span>
  );
}
