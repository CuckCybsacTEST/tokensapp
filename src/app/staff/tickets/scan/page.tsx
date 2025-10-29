'use client';

import { useState } from 'react';

interface ValidationResult {
  valid: boolean;
  error?: string;
  ticket?: {
    id: string;
    status: string;
    usedAt: string | null;
    customerName: string;
    customerDni: string;
    ticketType: {
      title: string;
      price: number;
    };
    show: {
      title: string;
      startsAt: string;
    };
  };
}

export default function StaffTicketScanPage() {
  const [qrCode, setQrCode] = useState('');
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = async () => {
    if (!qrCode.trim()) {
      setError('Por favor ingresa un código QR');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/tickets/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ qrCode: qrCode.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al validar ticket');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleValidate();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Validar Tickets
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <label htmlFor="qrCode" className="block text-sm font-medium text-gray-700 mb-2">
              Código QR del Ticket
            </label>
            <input
              type="text"
              id="qrCode"
              value={qrCode}
              onChange={(e) => setQrCode(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escanea o ingresa el código QR"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleValidate}
              disabled={loading || !qrCode.trim()}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Validando...' : 'Validar Ticket'}
            </button>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {result && (
            <div className={`mt-6 p-4 border rounded-md ${
              result.valid
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center mb-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  result.valid ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {result.valid ? (
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <h3 className={`ml-3 text-lg font-medium ${
                  result.valid ? 'text-green-800' : 'text-red-800'
                }`}>
                  {result.valid ? 'Ticket Válido' : 'Ticket Inválido'}
                </h3>
              </div>

              {result.error && (
                <p className={`mb-4 ${result.valid ? 'text-green-700' : 'text-red-700'}`}>
                  {result.error}
                </p>
              )}

              {result.ticket && (
                <div className="space-y-2 text-sm">
                  <p><strong>ID:</strong> {result.ticket.id}</p>
                  <p><strong>Cliente:</strong> {result.ticket.customerName}</p>
                  <p><strong>DNI:</strong> {result.ticket.customerDni}</p>
                  <p><strong>Estado:</strong> {result.ticket.status}</p>
                  {result.ticket.usedAt && (
                    <p><strong>Usado el:</strong> {new Date(result.ticket.usedAt).toLocaleString('es-ES')}</p>
                  )}
                  <p><strong>Show:</strong> {result.ticket.show.title}</p>
                  <p><strong>Tipo:</strong> {result.ticket.ticketType.title}</p>
                  <p><strong>Precio:</strong> S/ {result.ticket.ticketType.price}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-gray-600">
          <p>Escanea el código QR del ticket para validarlo</p>
        </div>
      </div>
    </div>
  );
}
