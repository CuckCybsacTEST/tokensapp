import { Suspense } from "react";
import TablesManager from "./TablesManager";

export default function TablesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestión de Mesas</h1>
      </div>

      <Suspense fallback={<div>Cargando mesas...</div>}>
        <TablesManager />
      </Suspense>
    </div>
  );
}