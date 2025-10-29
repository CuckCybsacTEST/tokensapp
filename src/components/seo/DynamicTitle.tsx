"use client";
import React, { useEffect } from 'react';
import { usePathname, useParams } from 'next/navigation';

// Brand constant
const BRAND = 'Go Lounge!';

type TitleMatcher = {
  test: (path: string) => boolean;
  build: (path: string, params: Record<string, any>) => string;
};

// Ordered list; first match wins
const MATCHERS: TitleMatcher[] = [
  { test: p => p === '/' || p === '/landing', build: () => 'Inicio' },
  { test: p => p.startsWith('/marketing'), build: () => 'Marketing' },
  { test: p => p === '/admin', build: () => 'Dashboard' },
  { test: p => p.startsWith('/admin/prizes'), build: () => 'Premios' },
  { test: p => p.startsWith('/admin/roulettebatches/purge'), build: () => 'Purgar Lotes' },
  { test: p => p.startsWith('/admin/roulettebatches/'), build: (p) => 'Batch ' + p.split('/').pop() },
  { test: p => p.startsWith('/admin/roulettebatches'), build: () => 'Lotes de Ruleta' },
  { test: p => p.startsWith('/admin/tokens'), build: () => 'Tokens' },
  { test: p => p.startsWith('/admin/attendance'), build: () => 'Asistencia' },
  { test: p => p.startsWith('/admin/persons'), build: () => 'Personas' },
  { test: p => p.startsWith('/admin/users'), build: () => 'Usuarios' },
  { test: p => p.startsWith('/admin/tasks/metrics'), build: () => 'Métricas de Tareas' },
  { test: p => p.startsWith('/admin/tasks'), build: () => 'Tareas' },
  { test: p => p.startsWith('/admin/roulette/session/'), build: p => 'Ruleta Sesión ' + p.split('/').pop() },
  { test: p => p.startsWith('/admin/roulette/batch/'), build: p => 'Ruleta Lote ' + p.split('/').pop() },
  { test: p => p.startsWith('/admin/roulette/'), build: () => 'Ruleta' },
  { test: p => p.startsWith('/admin/printroulette'), build: () => 'Impresión de Tokens de Ruleta' },
  { test: p => p.startsWith('/admin/printstatics'), build: () => 'Impresión de Tokens Estáticos' },
  { test: p => p.startsWith('/admin/shows'), build: () => 'Shows' },
  { test: p => p.startsWith('/admin/restore'), build: () => 'Restaurar' },
  { test: p => p.startsWith('/admin/login'), build: () => 'Login Admin' },
  { test: p => p.startsWith('/admin/day-brief'), build: () => 'Brief del Día' },
  { test: p => p.startsWith('/admin/birthdays/'), build: p => 'Cumpleaños ' + p.split('/').pop() },
  { test: p => p.startsWith('/admin/birthdays'), build: () => 'Cumpleaños' },
  { test: p => p.startsWith('/u/login'), build: () => 'Login' },
  { test: p => p.startsWith('/u/register'), build: () => 'Registro' },
  { test: p => p.startsWith('/u/reset-password'), build: () => 'Resetear Contraseña' },
  { test: p => p.startsWith('/u/tokens'), build: () => 'Mis Tokens' },
  { test: p => p.startsWith('/u/tasks'), build: () => 'Tareas Usuario' },
  { test: p => p.startsWith('/u/users'), build: () => 'Usuarios' },
  { test: p => p.startsWith('/u/manual'), build: () => 'Manual' },
  { test: p => p.startsWith('/u/history'), build: () => 'Historial' },
  { test: p => p.startsWith('/u/checklist'), build: () => 'Checklist' },
  { test: p => p.startsWith('/u/attendance'), build: () => 'Asistencia' },
  { test: p => p.startsWith('/u/assistance'), build: () => 'Ayuda' },
  { test: p => p.startsWith('/u/birthdays/'), build: p => 'Cumpleaños ' + p.split('/').pop() },
  { test: p => p.startsWith('/u/birthdays'), build: () => 'Cumpleaños' },
  { test: p => p.startsWith('/u/caja'), build: () => 'Caja' },
  { test: p => p.startsWith('/u/closed'), build: () => 'Cerrado' },
  { test: p => p.startsWith('/scanner'), build: () => 'Escáner' },
  { test: p => p.startsWith('/redeem/'), build: p => 'Canjear ' + p.split('/').pop() },
  { test: p => p.startsWith('/r/'), build: () => 'Redención' },
];

function computeTitle(path: string, params: Record<string, any>): string {
  for (const m of MATCHERS) {
    if (m.test(path)) return m.build(path, params);
  }
  return ''; // fallback -> brand only
}

export const DynamicTitle: React.FC = () => {
  const pathname = usePathname();
  const params = useParams();
  useEffect(() => {
    if (!pathname) return;
    const base = computeTitle(pathname, params || {});
    document.title = base ? `${base} · ${BRAND}` : BRAND;
  }, [pathname, params]);
  return null;
};
