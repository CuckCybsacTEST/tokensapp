import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// Página deprecated: redirigir a /u/tokens para mantener compatibilidad con enlaces antiguos
export default async function DeprecatedCajaPage() {
  redirect('/u/tokens');
}
