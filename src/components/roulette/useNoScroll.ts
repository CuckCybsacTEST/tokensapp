import { useEffect } from 'react';

/**
 * Bloquea el scroll global (body) mientras el componente que lo usa esté montado.
 * Úsalo sólo en vistas fullscreen (ruleta) para no afectar otras secciones como admin.
 */
export function useNoScroll(active: boolean = true) {
  useEffect(() => {
    if (!active) return;
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalWidth = document.body.style.width;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.width = originalWidth;
    };
  }, [active]);
}
