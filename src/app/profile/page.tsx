'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface Customer {
  id: string;
  dni: string;
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  birthday: string;
  membershipLevel: string;
  points: number;
  totalSpent: number;
  visitCount: number;
  lastVisit: string;
  isActive: boolean;
  createdAt: string;
}

interface CustomerVisit {
  id: string;
  visitDate: string;
  visitType: string;
  notes: string;
  spent: number;
  pointsEarned: number;
}

function CustomerProfile() {
  const searchParams = useSearchParams();
  const customerId = searchParams?.get('id');

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [visits, setVisits] = useState<CustomerVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) {
      setError('ID de cliente no proporcionado');
      setLoading(false);
      return;
    }

    fetchCustomerData();
  }, [customerId]);

  const fetchCustomerData = async () => {
    try {
      const [customerResponse, visitsResponse] = await Promise.all([
        fetch(`/api/customers/${customerId}`),
        fetch(`/api/customers/visits?customerId=${customerId}`)
      ]);

      if (!customerResponse.ok) {
        throw new Error('Error al cargar datos del cliente');
      }

      const customerData = await customerResponse.json();
      const visitsData = visitsResponse.ok ? await visitsResponse.json() : { visits: [] };

      setCustomer(customerData.customer);
      setVisits(visitsData.visits || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getMembershipColor = (level: string) => {
    switch (level) {
      case 'VIP': return 'bg-purple-100 text-purple-800';
      case 'MEMBER': return 'bg-blue-100 text-blue-800';
      case 'GUEST': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getVisitTypeLabel = (type: string) => {
    switch (type) {
      case 'VISIT': return 'Visita';
      case 'BIRTHDAY': return 'Cumpleaños';
      case 'SPECIAL_EVENT': return 'Evento Especial';
      default: return 'Visita';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Cliente no encontrado'}</p>
          <button
            onClick={() => window.history.back()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getMembershipColor(customer.membershipLevel)}`}>
              {customer.membershipLevel}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{customer.points}</div>
              <div className="text-sm text-blue-600">Puntos Acumulados</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">S/ {customer.totalSpent.toFixed(2)}</div>
              <div className="text-sm text-green-600">Total Gastado</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{customer.visitCount}</div>
              <div className="text-sm text-purple-600">Total Visitas</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString() : 'Nunca'}
              </div>
              <div className="text-sm text-orange-600">Última Visita</div>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Información Personal</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">DNI</label>
              <p className="mt-1 text-sm text-gray-900">{customer.dni}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="mt-1 text-sm text-gray-900">{customer.email || 'No registrado'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Teléfono</label>
              <p className="mt-1 text-sm text-gray-900">{customer.phone}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">WhatsApp</label>
              <p className="mt-1 text-sm text-gray-900">{customer.whatsapp || 'No registrado'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha de Nacimiento</label>
              <p className="mt-1 text-sm text-gray-900">
                {customer.birthday ? new Date(customer.birthday).toLocaleDateString() : 'No registrada'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Estado</label>
              <p className="mt-1 text-sm text-gray-900">
                {customer.isActive ? 'Activo' : 'Inactivo'}
              </p>
            </div>
          </div>
        </div>

        {/* Visit History */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Historial de Visitas</h2>
          {visits.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay visitas registradas</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gasto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Puntos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notas
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {visits.map((visit) => (
                    <tr key={visit.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(visit.visitDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getVisitTypeLabel(visit.visitType)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        S/ {visit.spent.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        +{visit.pointsEarned}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {visit.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileWrapper() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <CustomerProfile />
    </Suspense>
  );
}

export default ProfileWrapper;
