// DUPLICATE ROUTE (disabled): Original session page exists at /admin/roulette/[sessionId]
// This file retained to avoid build errors in patch tool; export placeholder to prevent dynamic slug conflict.
import RouletteSessionClient from './client';

export const metadata = { title: 'Roulette Session' };

interface Params { params: { sessionId: string } }

export default function RouletteSessionPage({ params }: Params) {
  return (
    <div className="p-4 flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Sesión Ruleta #{params.sessionId}</h1>
      <RouletteSessionClient sessionId={params.sessionId} />
    </div>
  );
}
