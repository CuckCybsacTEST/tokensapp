"use client";

import dynamic from 'next/dynamic';

// Dynamically import the React Admin client component with SSR disabled
const ReactAdminClient = dynamic(() => import('./ReactAdminClient'), {
  ssr: false,
  loading: () => <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Cargando React Admin...</div>
});

export default function ReactAdminUsers() {
  return <ReactAdminClient />;
}
