import { Suspense } from "react";
import MenuManager from "./MenuManager";

export default function MenuPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<div>Cargando menú...</div>}>
        <MenuManager />
      </Suspense>
    </div>
  );
}
