import { Suspense } from "react";
import MenuManager from "./MenuManager";
import { AdminLayout } from "@/components/AdminLayout";

export default function MenuPage() {
  return (
    <AdminLayout title="Gestión del Menú" breadcrumbs={[{ label: "Menú", href: "/admin/menu" }]}>
      <div className="space-y-6">
        <Suspense fallback={<div>Cargando menú...</div>}>
          <MenuManager />
        </Suspense>
      </div>
    </AdminLayout>
  );
}