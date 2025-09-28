import { TokensToggle } from "@/app/admin/TokensToggle";
import DailyTokenMetricsClient from "../DailyTokenMetricsClient";

export const dynamic = "force-dynamic";
// Página simplificada: toda la carga de métricas se hace vía componentes cliente (Toggle + DailyTokenMetricsClient).
// Eliminamos getMetrics() que recargaba todos los tokens/batches duplicando trabajo del endpoint diario.
export default async function TokensPanelPage() {
  const tz = process.env.TOKENS_TIMEZONE || 'America/Lima';
  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700">
        <div className="flex items-center mb-5">
          <div className="mr-3 p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Control del Sistema</h2>
        </div>
        <div className="text-sm opacity-70 mb-2">Zona horaria programada: {tz} (activación 18:00, desactivación 00:00)</div>
        <TokensToggle />
      </div>
      <DailyTokenMetricsClient />
    </div>
  );
}
