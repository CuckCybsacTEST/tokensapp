'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CustomerSession {
  id: string;
  sessionToken: string;
  expiresAt: string;
  lastActivity: string;
  ipAddress: string;
  userAgent: string;
  customer: {
    id: string;
    name: string;
    dni: string;
  };
}

interface CustomerSessionsProps {
  customerId?: string;
}

export function CustomerSessions({ customerId }: CustomerSessionsProps) {
  const [sessions, setSessions] = useState<CustomerSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const url = customerId
        ? `/api/admin/customer-sessions?customerId=${customerId}`
        : '/api/admin/customer-sessions';

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch sessions');

      const data = await response.json();
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const terminateSession = async (sessionId: string) => {
    if (!confirm('¿Estás seguro de que quieres terminar esta sesión?')) return;

    try {
      const response = await fetch(`/api/admin/customer-sessions?sessionId=${sessionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to terminate session');

      // Refresh sessions list
      fetchSessions();
    } catch (err) {
      alert('Error al terminar la sesión: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [customerId]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-blue-600">👤</span>
          Sesiones Activas
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-blue-600">👤</span>
          Sesiones Activas
        </h3>
        <div className="text-red-600 text-center py-4">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="text-blue-600">👤</span>
        Sesiones Activas ({sessions.length})
      </h3>

      {sessions.length === 0 ? (
        <div className="text-gray-500 text-center py-8">
          No hay sesiones activas
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <div key={session.id} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm">
                      {session.customer.name}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded text-sm">
                      DNI: {session.customer.dni}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <span>🕒</span>
                      Última actividad: {format(new Date(session.lastActivity), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </div>
                    <div className="flex items-center gap-1">
                      <span>⏰</span>
                      Expira: {format(new Date(session.expiresAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </div>
                    <div className="flex items-center gap-1">
                      <span>📍</span>
                      IP: {session.ipAddress}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      User-Agent: {session.userAgent}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => terminateSession(session.id)}
                  className="ml-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  🗑️ Terminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          onClick={fetchSessions}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Actualizar
        </button>
      </div>
    </div>
  );
}