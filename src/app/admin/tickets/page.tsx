"use client";
import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Ticket, Eye, Download } from 'lucide-react';

interface TicketType {
  id: string;
  showId: string;
  showTitle: string;
  name: string;
  description?: string;
  price: number;
  capacity: number;
  soldCount: number;
  availableFrom?: string;
  availableTo?: string;
  createdAt: string;
  updatedAt: string;
}

interface Ticket {
  id: string;
  ticketPurchaseId: string;
  showTitle: string;
  showDate: string;
  ticketType: string;
  quantity: number;
  totalAmount: number;
  status: string;
  purchasedAt: string;
  customerName: string;
  customerDni: string;
  customerPhone: string;
  qrCode: string;
  qrDataUrl: string;
}

interface Show {
  id: string;
  title: string;
  slug: string;
  startsAt: string;
  status: string;
}

interface ApiResponse {
  ok: boolean;
  ticketTypes?: TicketType[];
  tickets?: Ticket[];
  shows?: Show[];
  error?: string;
}

type TabType = 'types' | 'tickets';

export default function AdminTicketsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('types');
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShow, setSelectedShow] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    showId: '',
    name: '',
    description: '',
    price: '',
    capacity: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);

      // Fetch shows
      const showsResponse = await fetch('/api/admin/shows?limit=100');
      const showsData = await showsResponse.json();

      if (showsData.ok) {
        setShows(showsData.shows);
      }

      // Fetch ticket types
      const ticketsResponse = await fetch('/api/admin/tickets');
      const ticketsData = await ticketsResponse.json();

      if (ticketsData.ok) {
        setTicketTypes(ticketsData.ticketTypes);
      }

      // Fetch individual tickets
      const individualTicketsResponse = await fetch('/api/admin/tickets/all');
      const individualTicketsData = await individualTicketsResponse.json();

      if (individualTicketsData.ok) {
        setTickets(individualTicketsData.tickets);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      showId: '',
      name: '',
      description: '',
      price: '',
      capacity: ''
    });
  }

  function openCreateModal() {
    resetForm();
    setEditingTicket(null);
    setShowCreateModal(true);
  }

  function openEditModal(ticket: TicketType) {
    setFormData({
      showId: ticket.showId,
      name: ticket.name,
      description: ticket.description || '',
      price: ticket.price.toString(),
      capacity: ticket.capacity.toString()
    });
    setEditingTicket(ticket);
    setShowCreateModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price),
        capacity: parseInt(formData.capacity)
      };

      const url = editingTicket
        ? `/api/admin/tickets/${editingTicket.id}`
        : '/api/admin/tickets';

      const method = editingTicket ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.ok) {
        setSuccess(editingTicket ? 'Ticket actualizado exitosamente' : 'Ticket creado exitosamente');
        setShowCreateModal(false);
        resetForm();
        fetchData();
      } else {
        setError(result.error || 'Error al guardar el ticket');
      }
    } catch (error) {
      console.error('Error saving ticket:', error);
      setError('Error al guardar el ticket');
    }
  }

  async function handleDelete(ticketId: string) {
    if (!confirm('¿Estás seguro de que quieres eliminar este tipo de ticket?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.ok) {
        setSuccess('Ticket eliminado exitosamente');
        fetchData();
      } else {
        setError(result.error || 'Error al eliminar el ticket');
      }
    } catch (error) {
      console.error('Error deleting ticket:', error);
      setError('Error al eliminar el ticket');
    }
  }

  const filteredTickets = selectedShow === 'all'
    ? ticketTypes
    : ticketTypes.filter(ticket => ticket.showId === selectedShow);

  const groupedTickets = filteredTickets.reduce((acc, ticket) => {
    if (!acc[ticket.showTitle]) {
      acc[ticket.showTitle] = [];
    }
    acc[ticket.showTitle].push(ticket);
    return acc;
  }, {} as Record<string, TicketType[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-900 dark:text-gray-100">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestión de Tickets</h1>
          <p className="text-gray-600 dark:text-gray-400">Administra los tipos de entradas y tickets vendidos</p>
        </div>
        {activeTab === 'types' && (
          <button
            onClick={openCreateModal}
            className="bg-[#FF4D2E] text-white px-4 py-2 rounded-lg hover:bg-[#e6442a] flex items-center gap-2"
          >
            <Plus size={20} />
            Nuevo Tipo de Ticket
          </button>
        )}
      </div>

      {/* Pestañas */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('types')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'types'
                  ? 'border-[#FF4D2E] text-[#FF4D2E]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Tipos de Tickets
            </button>
            <button
              onClick={() => setActiveTab('tickets')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tickets'
                  ? 'border-[#FF4D2E] text-[#FF4D2E]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Tickets Vendidos ({tickets.length})
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'types' ? (
        <div>
          {/* Filtros para tipos de tickets */}
          <div className="mb-6">
            <select
              value={selectedShow}
              onChange={(e) => setSelectedShow(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="all">Todos los shows</option>
              {shows.map(show => (
                <option key={show.id} value={show.id}>
                  {show.title} ({show.status})
                </option>
              ))}
            </select>
          </div>

          {/* Mensajes */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-300 rounded">
              {success}
            </div>
          )}

          {/* Lista de Tipos de Tickets */}
          <div className="space-y-6">
        {Object.entries(groupedTickets).map(([showTitle, tickets]) => (
          <div key={showTitle} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{showTitle}</h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {tickets.map(ticket => (
                <div key={ticket.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Ticket className="text-[#FF4D2E]" size={20} />
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">{ticket.name}</h3>
                        {ticket.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{ticket.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-lg font-bold text-[#FF4D2E]">
                        S/ {ticket.price.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {ticket.soldCount}/{ticket.capacity} vendidos
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(ticket)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(ticket.id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {Object.keys(groupedTickets).length === 0 && (
          <div className="text-center py-12">
            <Ticket className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No hay tickets</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Comienza creando tu primer tipo de ticket.
            </p>
          </div>
        )}
      </div>
    ) : (
        /* Vista de Tickets Individuales */
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100 mb-4">
                Tickets Vendidos
              </h3>

              {tickets.length === 0 ? (
                <div className="text-center py-12">
                  <Ticket className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No hay tickets vendidos</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Los tickets aparecerán aquí cuando se realicen compras.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Cliente
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Show
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Comprado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {tickets.map((ticket) => (
                        <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {ticket.customerName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              DNI: {ticket.customerDni}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-gray-100">
                              {ticket.showTitle}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(ticket.showDate).toLocaleDateString('es-ES')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-gray-100">
                              {ticket.ticketType}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              S/ {ticket.totalAmount.toFixed(2)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              ticket.status === 'VALID'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : ticket.status === 'USED'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {ticket.status === 'VALID' ? 'Válido' :
                               ticket.status === 'USED' ? 'Usado' : 'Cancelado'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {new Date(ticket.purchasedAt).toLocaleDateString('es-ES')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = ticket.qrDataUrl;
                                link.download = `ticket-${ticket.id}.png`;
                                link.click();
                              }}
                              className="text-[#FF4D2E] hover:text-[#e6442a] mr-3"
                            >
                              <Download size={16} />
                            </button>
                            <button
                              onClick={() => {
                                // Mostrar QR en modal
                                const modal = document.createElement('div');
                                modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50';
                                modal.innerHTML = `
                                  <div class="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
                                    <div class="flex justify-between items-center mb-4">
                                      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Código QR de Entrada</h3>
                                      <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                        </svg>
                                      </button>
                                    </div>
                                    <div class="text-center">
                                      <img src="${ticket.qrDataUrl}" alt="QR Code" class="mx-auto border rounded-lg mb-4" style="max-width: 200px;" />
                                      <div class="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                                        <p><strong>Cliente:</strong> ${ticket.customerName}</p>
                                        <p><strong>DNI:</strong> ${ticket.customerDni}</p>
                                        <p><strong>Show:</strong> ${ticket.showTitle}</p>
                                        <p><strong>Fecha:</strong> ${new Date(ticket.showDate).toLocaleDateString('es-ES')}</p>
                                      </div>
                                      <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                                        Cerrar
                                      </button>
                                    </div>
                                  </div>
                                `;
                                document.body.appendChild(modal);
                              }}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                            >
                              <Eye size={16} />
                            </button>
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
      )}

      {/* Modal Crear/Editar */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              {editingTicket ? 'Editar Ticket' : 'Nuevo Tipo de Ticket'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Show
                </label>
                <select
                  value={formData.showId}
                  onChange={(e) => setFormData({...formData, showId: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                >
                  <option value="">Seleccionar show</option>
                  {shows.filter(show => show.status === 'PUBLISHED').map(show => (
                    <option key={show.id} value={show.id}>
                      {show.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre del Ticket
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Ej: Entrada General"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Descripción opcional"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Precio (S/)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="25.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Capacidad
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="100"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#FF4D2E] text-white rounded-lg hover:bg-[#e6442a]"
                >
                  {editingTicket ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}