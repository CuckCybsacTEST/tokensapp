'use client';

import { useState } from 'react';
import { Button } from '@/components/Button';

interface Ticket {
  id: string;
  qrDataUrl: string;
  status: string;
  createdAt: string;
  usedAt?: string;
  ticketType: {
    name: string;
    price: number;
  };
  show: {
    id: string;
    title: string;
    slug: string;
    startsAt: string;
    endsAt?: string | null;
    status: string;
    imageWebpPath?: string;
  };
  purchase: {
    id: string;
    purchasedAt: string;
    status: string;
    totalAmount: number;
  };
}

interface UserTickets {
  customerDni: string;
  totalTickets: number;
  tickets: Ticket[];
}

export default function MyTicketsPage() {
  const [dni, setDni] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<UserTickets | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dni.trim()) {
      setError('Por favor ingresa tu DNI');
      return;
    }

    // Validar formato de DNI
    const dniRegex = /^\d{8}$/;
    if (!dniRegex.test(dni.trim())) {
      setError('El DNI debe tener exactamente 8 dígitos numéricos');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ dni: dni.trim() });
      if (phone.trim()) {
        params.append('phone', phone.trim());
      }

      const response = await fetch(`/api/my-tickets?${params}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error al buscar tickets');
        return;
      }

      setTickets(data);
    } catch (err) {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = (ticket: Ticket) => {
    // Crear un enlace para descargar la imagen QR
    const link = document.createElement('a');
    link.href = ticket.qrDataUrl;
    link.download = `ticket-${ticket.show.slug}-${ticket.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VALID':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'USED':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'CANCELLED':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'VALID':
        return 'Válido';
      case 'USED':
        return 'Usado';
      case 'CANCELLED':
        return 'Cancelado';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Mis Tickets
          </h1>
          <p className="text-gray-600">
            Ingresa tu DNI para ver y descargar tus tickets
          </p>
        </div>

        {/* Formulario de búsqueda */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="dni" className="block text-sm font-medium text-gray-700 mb-1">
                  DNI *
                </label>
                <input
                  type="text"
                  id="dni"
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="12345678"
                  maxLength={8}
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  WhatsApp (opcional)
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="999888777"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto"
            >
              {loading ? 'Buscando...' : 'Buscar mis tickets'}
            </Button>
          </form>
        </div>

        {/* Resultados */}
        {tickets && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Encontrados {tickets.totalTickets} ticket{tickets.totalTickets !== 1 ? 's' : ''}
              </h2>
              <p className="text-gray-600">DNI: {tickets.customerDni}</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {tickets.tickets.map((ticket) => (
                <div key={ticket.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                  {/* Header con info del show */}
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
                    <h3 className="font-semibold text-lg mb-1">{ticket.show.title}</h3>
                    <p className="text-sm opacity-90">
                      {new Date(ticket.show.startsAt).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>

                  {/* QR Code */}
                  <div className="p-4 flex justify-center">
                    <div className="bg-white p-2 rounded-lg border-2 border-gray-200">
                      <img
                        src={ticket.qrDataUrl}
                        alt={`QR Code para ${ticket.show.title}`}
                        className="w-32 h-32"
                      />
                    </div>
                  </div>

                  {/* Info del ticket */}
                  <div className="px-4 pb-4">
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Tipo:</span>
                        <span className="text-sm">{ticket.ticketType.name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Precio:</span>
                        <span className="text-sm">S/ {ticket.ticketType.price.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Estado:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(ticket.status)}`}>
                          {getStatusText(ticket.status)}
                        </span>
                      </div>
                      {ticket.usedAt && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Usado:</span>
                          <span className="text-sm text-gray-600">
                            {new Date(ticket.usedAt).toLocaleString('es-ES')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => downloadQR(ticket)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled={ticket.status !== 'VALID'}
                      >
                        📥 Descargar QR
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Información adicional */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">💡 Información importante</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Presenta este código QR en la entrada del evento</li>
                <li>• Asegúrate de que el código sea claramente visible</li>
                <li>• Cada ticket es único y solo puede usarse una vez</li>
                <li>• Si tienes problemas, contacta al staff del evento</li>
              </ul>
            </div>
          </div>
        )}

        {/* Buscar de nuevo */}
        {tickets && (
          <div className="text-center mt-8">
            <Button
              onClick={() => {
                setTickets(null);
                setDni('');
                setPhone('');
                setError(null);
              }}
              variant="outline"
            >
              🔍 Buscar otros tickets
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}