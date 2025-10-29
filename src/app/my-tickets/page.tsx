'use client';

import { useEffect, useState } from 'react';

interface TicketPurchase {
  id: string;
  purchasedAt: string;
  totalAmount: string;
  status: string;
  ticketType: {
    title: string;
    price: number;
    show: {
      id: string;
      title: string;
      startsAt: string;
      imageWebpPath: string;
      status: string;
    };
  };
  tickets: Array<{
    id: string;
    status: string;
    qrCode: string;
    qrDataUrl: string;
  }>;
}

export default function MyTicketsPage() {
  const [purchases, setPurchases] = useState<TicketPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await fetch('/api/my-tickets');
      if (!response.ok) {
        throw new Error('Error al cargar tickets');
      }
      const data = await response.json();
      setPurchases(data.purchases || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Cargando tickets...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600 text-lg">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Mis Tickets</h1>

        {purchases.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No tienes tickets comprados aún.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {purchases.map((purchase) => (
              <div key={purchase.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {purchase.ticketType.show.title}
                    </h2>
                    <p className="text-gray-600">
                      {new Date(purchase.ticketType.show.startsAt).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      S/ {purchase.totalAmount}
                    </p>
                    <p className={`text-sm px-2 py-1 rounded ${
                      purchase.status === 'CONFIRMED'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {purchase.status === 'CONFIRMED' ? 'Confirmado' : 'Pendiente'}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium text-gray-900 mb-3">
                    Tickets ({purchase.tickets.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {purchase.tickets.map((ticket) => (
                      <div key={ticket.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">Ticket #{ticket.id.slice(-8)}</span>
                          <span className={`px-2 py-1 text-xs rounded ${
                            ticket.status === 'VALID'
                              ? 'bg-green-100 text-green-800'
                              : ticket.status === 'USED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {ticket.status === 'VALID' ? 'Válido' :
                             ticket.status === 'USED' ? 'Usado' : 'Cancelado'}
                          </span>
                        </div>
                        {ticket.qrDataUrl && (
                          <div className="flex justify-center">
                            <img
                              src={ticket.qrDataUrl}
                              alt="QR Code"
                              className="w-32 h-32"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
