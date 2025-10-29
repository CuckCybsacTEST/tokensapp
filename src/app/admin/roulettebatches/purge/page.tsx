import React, { Suspense } from 'react';
import PurgeBatchesClient from './ui';

export const dynamic = 'force-dynamic';

export default async function PurgeBatchesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Purgar Batches</h1>
        <a href="/admin/roulettebatches" className="btn-outline !px-3 !py-1.5 text-sm">Volver</a>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
        Herramienta administrativa para eliminar batches y sus tokens/sesiones de ruleta asociados. Siempre ejecuta un dry-run primero. Requiere confirmación explícita.
      </p>
      <Suspense fallback={<div>Cargando...</div>}>
        {/* Client component handles fetching and interactions */}
        <PurgeBatchesClient />
      </Suspense>
    </div>
  );
}
