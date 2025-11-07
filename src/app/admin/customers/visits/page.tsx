'use client';

import { useState } from 'react';
import { AdminLayout } from "@/components/AdminLayout";

export default function CustomerVisitsPage() {
  const [dni, setDni] = useState('');
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [visitType, setVisitType] = useState('VISIT');
  const [spent, setSpent] = useState(0);
  const [notes, setNotes] = useState('');

  const searchCustomer = async () => {
    if (!dni.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/customers/search?dni=${dni}`);
      if (response.ok) {
        const data = await response.json();
        setCustomer(data.customer);
      } else {
        setCustomer(null);
        alert('Cliente no encontrado');
      }
    } catch (error) {
      console.error('Error searching customer:', error);
      alert('Error al buscar cliente');
    } finally {
      setLoading(false);
    }
  };

  const registerVisit = async () => {
    if (!customer) return;

    setLoading(true);
    try {
      const response = await fetch('/api/customers/visits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customer.id,
          visitType,
          spent: Number(spent),
          notes,
        }),
      });

      if (response.ok) {
        alert('Visita registrada exitosamente');
        setCustomer(null);
        setDni('');
        setSpent(0);
        setNotes('');
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error registering visit:', error);
      alert('Error al registrar visita');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Registro de Visitas de Clientes</h1>

      {/* Búsqueda de cliente */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Buscar Cliente</h2>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Ingrese DNI del cliente"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && searchCustomer()}
          />
          <button
            onClick={searchCustomer}
            disabled={loading || !dni.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </div>

      {/* Información del cliente */}
      {customer && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Información del Cliente</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre</label>
              <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{customer.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">DNI</label>
              <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{customer.dni}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Membresía</label>
              <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{customer.membershipLevel}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Puntos</label>
              <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{customer.points}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Total Gastado</label>
              <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">S/ {customer.totalSpent}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Visitas</label>
              <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{customer.visitCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* Registro de visita */}
      {customer && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Registrar Visita</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tipo de Visita
              </label>
              <select
                value={visitType}
                onChange={(e) => setVisitType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="VISIT">Visita Regular</option>
                <option value="BIRTHDAY">Cumpleaños</option>
                <option value="SPECIAL_EVENT">Evento Especial</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Monto Gastado (S/)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={spent}
                onChange={(e) => setSpent(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notas
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Notas adicionales sobre la visita..."
              />
            </div>

            <button
              onClick={registerVisit}
              disabled={loading}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Registrando...' : 'Registrar Visita'}
            </button>
          </div>
        </div>
      )}
    </div>
    </AdminLayout>
  );
}
