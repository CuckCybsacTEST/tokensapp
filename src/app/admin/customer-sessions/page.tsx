'use client';

import { AdminLayout } from "@/components/AdminLayout";
import { CustomerSessions } from "@/components/admin/CustomerSessions";
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function CustomerSessionsAdminPage() {
  const searchParams = useSearchParams();
  const customerId = searchParams?.get('customerId') || undefined;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Gestión de Sesiones de Clientes
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {customerId
                ? 'Administra las sesiones activas de un cliente específico'
                : 'Administra las sesiones activas de autenticación de clientes'
              }
            </p>
            {customerId && (
              <div className="mt-2">
                <Link
                  href="/admin/customer-sessions"
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  ← Ver todas las sesiones
                </Link>
              </div>
            )}
          </div>
          <Link
            href="/admin/customers"
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Gestionar Clientes
          </Link>
        </div>

        <CustomerSessions customerId={customerId || undefined} />
      </div>
    </AdminLayout>
  );
}