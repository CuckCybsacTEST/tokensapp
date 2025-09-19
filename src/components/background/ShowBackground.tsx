import React from 'react';
import DiscoBackground from '@/components/effects/DiscoBackground';
import { brand } from '@/app/marketing/styles/brand';

interface ShowBackgroundProps {
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
  theme?: 'default' | 'marketing';
}

/**
 * ShowBackground: fondo compuesto reutilizable para pantallas del show/ruleta.
 * - Capa de degradado base + DiscoBackground animado
 * - No captura eventos y se posiciona absoluto para cubrir todo el contenedor relativo
 */
export default function ShowBackground({ className, intensity = 'medium', theme = 'default' }: ShowBackgroundProps) {
  // Helper to build rgba from hex color and opacity
  const hexToRgb = (hex: string) => {
    const h = hex.replace('#', '');
    const bigint = parseInt(h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `${r}, ${g}, ${b}`;
  };

  const cssVars: React.CSSProperties | undefined = theme === 'marketing'
    ? {
        // Base gradient accent blobs
        ['--disco-base-a' as any]: `rgba(${hexToRgb(brand.primary)}, 0.15)`,
        ['--disco-base-b' as any]: `rgba(${hexToRgb(brand.secondary)}, 0.14)`,
        ['--disco-base-c' as any]: `rgba(${hexToRgb(brand.accent)}, 0.12)`,
        // Blob strong/weak colors
        ['--disco-blob-a-strong' as any]: `rgba(${hexToRgb(brand.primary)}, 0.8)`,
        ['--disco-blob-a-weak' as any]: `rgba(${hexToRgb(brand.primary)}, 0.10)`,
        ['--disco-blob-b-strong' as any]: `rgba(${hexToRgb(brand.secondary)}, 0.8)`,
        ['--disco-blob-b-weak' as any]: `rgba(${hexToRgb(brand.secondary)}, 0.10)`,
        ['--disco-blob-c-strong' as any]: `rgba(${hexToRgb(brand.accent)}, 0.8)`,
        ['--disco-blob-c-weak' as any]: `rgba(${hexToRgb(brand.accent)}, 0.10)`,
      }
    : undefined;

  return (
    <div
      className={[
        'absolute inset-0 pointer-events-none z-0',
        className,
      ].filter(Boolean).join(' ')}
      aria-hidden
      style={cssVars}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#0E0606] to-[#07070C]" />
      <DiscoBackground intensity={intensity} />
    </div>
  );
}
