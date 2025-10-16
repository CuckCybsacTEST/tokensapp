import { Suspense } from "react";
import LocationsManager from "./LocationsManager";

export default function AdminMesasPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Mesas y Ubicaciones</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Administra ubicaciones, mesas, boxes y zonas de servicio
          </p>
        </div>
      </div>

      <Suspense fallback={<div>Cargando sistema de mesas...</div>}>
        <LocationsManager />
      </Suspense>
    </div>
  );
}