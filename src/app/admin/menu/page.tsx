import { Suspense } from "react";
import MenuManager from "./MenuManager";
import { AdminLayout } from "@/components/AdminLayout";

export default function MenuPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <Suspense fallback={<div>Cargando menú...</div>}>
          <MenuManager />
        </Suspense>
      </div>
    </AdminLayout>
  );
}