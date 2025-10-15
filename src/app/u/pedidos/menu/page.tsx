import { Suspense } from "react";
import MenuManager from "./MenuManager";

export default function MenuPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestión del Menú - La Carta</h1>
      </div>

      <Suspense fallback={<div>Cargando menú...</div>}>
        <MenuManager />
      </Suspense>
    </div>
  );
}