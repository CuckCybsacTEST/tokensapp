import { Suspense } from "react";
import StaffMesasManager from "./StaffMesasManager";

export default function StaffMesasPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mesas y Ubicaciones</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Selecciona una mesa o zona para crear un pedido
          </p>
        </div>
      </div>

      <Suspense fallback={<div>Cargando mesas...</div>}>
        <StaffMesasManager />
      </Suspense>
    </div>
  );
}