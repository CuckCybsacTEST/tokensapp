'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Ticket {
  id: string;
  purchaseId: string;
  showId: string;
  showTitle: string;
  showDate: Date;
  showPoster: string | null;
  showStatus: string;
  ticketType: string;
  quantity: number;
  totalAmount: number;
  status: string;
  purchasedAt: Date;
  isValid: boolean;
  qrCode: string;
  qrDataUrl: string;
  customerDni: string;
}

export default function UserTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tickets');
      if (!response.ok) {
        throw new Error('Error al cargar los tickets');
      }
      const data = await response.json();
      setTickets(data.tickets || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando tus tickets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">Error</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchTickets}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mis Tickets</h1>
          <p className="text-gray-600">Aquí puedes ver todos tus tickets comprados</p>
        </div>

        {tickets.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🎫</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No tienes tickets aún</h3>
            <p className="text-gray-600 mb-6">¡Explora nuestros shows y compra tus tickets!</p>
            <a
              href="/marketing"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ver Shows Disponibles
            </a>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Poster del show */}
                <div className="relative h-48 bg-gray-200">
                  {ticket.showPoster ? (
                    <Image
                      src={ticket.showPoster}
                      alt={ticket.showTitle}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <span className="text-4xl">🎭</span>
                    </div>
                  )}

                  {/* Badge de estado */}
                  <div className="absolute top-3 right-3">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        ticket.status === 'CONFIRMED'
                          ? 'bg-green-100 text-green-800'
                          : ticket.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {ticket.status === 'CONFIRMED' ? 'Confirmado' :
                       ticket.status === 'PENDING' ? 'Pendiente' : 'Cancelado'}
                    </span>
                  </div>

                  {/* Badge de validez */}
                  {!ticket.isValid && (
                    <div className="absolute top-3 left-3">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        Expirado
                      </span>
                    </div>
                  )}
                </div>

                {/* Información del ticket */}
                <div className="p-4">
                  <h3 className="font-semibold text-lg text-gray-900 mb-1">
                    {ticket.showTitle}
                  </h3>

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Tipo:</span>
                      <span className="font-medium">{ticket.ticketType}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>Cantidad:</span>
                      <span className="font-medium">{ticket.quantity}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span className="font-medium">${ticket.totalAmount.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>Fecha del show:</span>
                      <span className="font-medium">
                        {format(new Date(ticket.showDate), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span>Comprado:</span>
                      <span className="font-medium">
                        {format(new Date(ticket.purchasedAt), 'dd/MM/yyyy', { locale: es })}
                      </span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    {ticket.isValid && ticket.status === 'CONFIRMED' ? (
                      <button
                        onClick={() => setSelectedTicket(ticket)}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Ver QR de entrada
                      </button>
                    ) : (
                      <div className="text-center text-gray-500 text-sm">
                        {ticket.isValid ? 'Procesando...' : 'Show expirado'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para mostrar QR */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Código QR de Entrada</h3>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="text-center">
              <div className="mb-4">
                <Image
                  src={selectedTicket.qrDataUrl}
                  alt="QR Code"
                  width={200}
                  height={200}
                  className="mx-auto border rounded-lg"
                />
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <p><strong>Show:</strong> {selectedTicket.showTitle}</p>
                <p><strong>Fecha:</strong> {format(new Date(selectedTicket.showDate), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                <p><strong>Tipo:</strong> {selectedTicket.ticketType}</p>
                <p><strong>DNI:</strong> {selectedTicket.customerDni}</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = selectedTicket.qrDataUrl;
                    link.download = `ticket-${selectedTicket.id}.png`;
                    link.click();
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Descargar QR
                </button>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
