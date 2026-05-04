"use client";

import dynamic from 'next/dynamic';

const EquipoReactAdmin = dynamic(() => import('./EquipoReactAdmin'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text)' }}>
      Cargando gestión de equipo...
    </div>
  ),
});

export default function EquipoAdminClient() {
  return <EquipoReactAdmin />;
}
