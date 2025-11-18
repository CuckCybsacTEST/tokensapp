import { Suspense } from "react";
import LocationsManager from "./LocationsManager";

export default function AdminMesasPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Gestión de Mesas y Ubicaciones
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Administra ubicaciones, mesas, boxes y zonas de servicio
          </p>
        </div>
      </div>

      <Suspense fallback={
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">Cargando sistema de mesas...</span>
        </div>
      }>
        <LocationsManager />
      </Suspense>
    </div>
  );
}
