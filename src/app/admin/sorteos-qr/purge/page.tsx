import React, { Suspense } from 'react';
import PurgeCustomQrsClient from './ui';
import { AdminLayout } from "@/components/AdminLayout";

export const dynamic = 'force-dynamic';

export default async function PurgeCustomQrsPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Purgar Lotes de QR Personalizados</h1>
          <a href="/admin/custom-qrs" className="btn-outline !px-3 !py-1.5 text-sm">Volver</a>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
          Herramienta administrativa para eliminar lotes de QR personalizados y sus códigos QR asociados. Siempre ejecuta un dry-run primero. Requiere confirmación explícita.
        </p>
        <Suspense fallback={<div>Cargando...</div>}>
          <PurgeCustomQrsClient />
        </Suspense>
      </div>
    </AdminLayout>
  );
}