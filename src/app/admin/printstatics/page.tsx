import { Suspense } from "react";
import { PrintControlClient } from "./PrintControlClient";
import { AdminLayout } from "@/components/AdminLayout";

export const dynamic = "force-dynamic";

export default function PrintControlPage() {
  return (
    <AdminLayout>
      <div className="container mx-auto p-4 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Impresión de Tokens Estáticos</h1>
      
      <Suspense fallback={<div>Cargando...</div>}>
        <PrintControlClient />
      </Suspense>
    </div>
    </AdminLayout>
  );
}
