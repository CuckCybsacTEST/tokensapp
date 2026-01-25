'use client';

import { useEffect, useState } from 'react';
import { Admin, Resource, ListGuesser, EditGuesser } from 'react-admin';
import simpleRestProvider from 'ra-data-simple-rest';
import { CustomerList } from './CustomerList';
import { CustomerCreate } from './CustomerCreate';
import { CustomerEdit } from './CustomerEdit';
import { CustomerSessions } from '@/components/admin/CustomerSessions';
import Link from 'next/link';

// Configurar dataProvider con cookies incluidas
const dataProvider = simpleRestProvider('/api', (url, options = {}) => {
  return fetch(url, {
    ...options,
    credentials: 'include', // Incluir cookies de autenticación
  });
});

// Componente que se renderiza solo en el cliente
function ClientOnlyAdmin() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Admin
      dataProvider={dataProvider}
      requireAuth={false}
      disableTelemetry
    >
      <Resource
        name="customers"
        list={CustomerList}
        create={CustomerCreate}
        edit={CustomerEdit}
      />
    </Admin>
  );
}

export function CustomerAdmin() {
  return (
    <div className="space-y-6">
      {/* Header con navegación */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gestión de Clientes
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Administra clientes y sus sesiones de autenticación
          </p>
        </div>
        <Link
          href="/admin/customer-sessions"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Ver Sesiones Activas
        </Link>
      </div>

      {/* React Admin para gestión de clientes - solo en cliente */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <ClientOnlyAdmin />
      </div>

      {/* Sesiones activas de todos los clientes */}
      <CustomerSessions />
    </div>
  );
}
