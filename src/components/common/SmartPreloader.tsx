"use client";

import React, { useEffect, useState } from 'react';
import BrandLogo from '@/components/brand/BrandLogo';
import styles from './smartPreloader.module.css';

type MessagesConfig = {
  byWeekday?: Partial<Record<
    | 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday',
    { title?: string; subtitle?: string }
  >>;
  byDate?: Record<string, { title?: string; subtitle?: string }>; // clave YYYY-MM-DD
  default?: { title?: string; subtitle?: string };
};

function getWeekdayKey(d: Date): keyof NonNullable<MessagesConfig['byWeekday']> {
  return ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][d.getDay()] as any;
}

function formatDateYYYYMMDD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function SmartPreloader({
  fallbackTitle = 'Cargando ruleta…',
  fallbackSubtitle = 'Preparando premios y sorpresas',
  configPath = '/preloader-messages.json',
  logoSrc
}: {
  fallbackTitle?: string;
  fallbackSubtitle?: string;
  configPath?: string;
  logoSrc?: string;
}) {
  const [title, setTitle] = useState<string>(fallbackTitle);
  const [subtitle, setSubtitle] = useState<string>(fallbackSubtitle);

  useEffect(() => {
    let abort = false;
    let timeoutId: number | null = null;
    let idleId: number | null = null;

    // Mensaje inmediato basado en el día de la semana para el primer render hidratado
    const now = new Date();
    const weekday = getWeekdayKey(now);
    const map: Record<string, { title: string; subtitle: string }> = {
      monday: { title: 'Arrancando la semana', subtitle: '¡Hoy calienta motores!' },
      tuesday: { title: 'Martes de suerte', subtitle: '¿Listo para girar?' },
      wednesday: { title: 'Miércoles en marcha', subtitle: 'La ruleta ya casi está' },
      thursday: { title: 'No es jueves, es jueveo…', subtitle: '¡Bienvenido al show!' },
      friday: { title: 'Viernes de fiesta', subtitle: 'Premios a la vuelta de la esquina' },
      saturday: { title: 'Sábado de premios', subtitle: 'Ambiente listo, ¿giramos?' },
      sunday: { title: 'Domingo relax', subtitle: 'Un giro suave para cerrar la semana' },
    };
    const m = (map as any)[weekday] as { title: string; subtitle: string } | undefined;
    if (m) {
      setTitle(m.title);
      setSubtitle(m.subtitle);
    }

    const run = async () => {
      try {
        const res = await fetch(configPath, { cache: 'no-store' });
        if (!res.ok) return;
        const cfg = (await res.json()) as MessagesConfig;
        if (!cfg) return;
        const now = new Date();
        const keyDate = formatDateYYYYMMDD(now);
        const byDateMsg = cfg.byDate?.[keyDate];
        const weekdayKey = getWeekdayKey(now);
        const byWeekdayMsg = cfg.byWeekday?.[weekdayKey];
        const def = cfg.default;
        const chosen = byDateMsg || byWeekdayMsg || def;
        if (!abort && chosen) {
          setTitle(chosen.title || fallbackTitle);
          setSubtitle(chosen.subtitle || fallbackSubtitle);
        }
      } catch {}
    };

    const w: any = typeof window !== 'undefined' ? window : {};
    if (typeof w.requestIdleCallback === 'function') {
      idleId = w.requestIdleCallback(() => { if (!abort) run(); });
    } else {
      timeoutId = window.setTimeout(() => { if (!abort) run(); }, 0);
    }

    return () => {
      abort = true;
      if (idleId != null && typeof (window as any).cancelIdleCallback === 'function') {
        (window as any).cancelIdleCallback(idleId);
      }
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, [configPath, fallbackTitle, fallbackSubtitle]);

  // Sin efectos globales: no tocar html/body para evitar recomposiciones que reinicien animaciones.

  return (
    <div className={styles.root} role="status" aria-live="polite">
      {/* Brand logo as its own component, small and with gentle sway */}
      <div className={styles.logoTight}>
        <BrandLogo src={logoSrc || '/logo.png'} animated={true} />
      </div>
      <div className={styles.message}>
  <div className={`${styles.title} text-xl sm:text-2xl`}>{title}</div>
        {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
      </div>
    </div>
  );
}
