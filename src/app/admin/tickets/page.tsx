"use client";
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Plus, Edit, Trash2, Ticket, Eye, Download, RefreshCw, X } from 'lucide-react';
import { useStaffSocket } from '@/hooks/useSocket';

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

interface TicketPackage {
  id: string;
  ticketPurchaseId: string;
  ticketTypeId: string;
  showTitle: string;
  showDate: string;
  ticketTypeName: string;
  qrCode: string;
  qrDataUrl?: string;
  totalTickets: number;
  usedTickets: number;
  remainingTickets: number;
  totalAmount: number;
  status: string;
  purchasedAt: string;
  customerName: string;
  customerDni: string;
  customerPhone: string;
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
  ticketPackages?: TicketPackage[];
  shows?: Show[];
  error?: string;
}

type TabType = 'types' | 'tickets';

export default function AdminTicketsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('tickets');
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [ticketPackages, setTicketPackages] = useState<TicketPackage[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShow, setSelectedShow] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [processingTicket, setProcessingTicket] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [formData, setFormData] = useState({
    showId: '',
    name: '',
    description: '',
    price: '',
    capacity: ''
  });

  // Socket para actualizaciones en tiempo real
  const { socket } = useStaffSocket("general");

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      console.log('🔍 Checking session...');
      const sessionResponse = await fetch('/api/static/session');
      const sessionData = await sessionResponse.json();
      
      console.log('📋 Session response:', sessionData);
      console.log('🍪 Cookies sent:', document.cookie);
      
      if (sessionData.ok && (sessionData.isStaff || sessionData.isAdmin)) {
        console.log('✅ Session valid - user has staff/admin access');
        setHasSession(true);
        fetchData();
      } else {
        console.log('❌ Session invalid or no staff/admin access');
        console.log('isStaff:', sessionData.isStaff, 'isAdmin:', sessionData.isAdmin);
        setHasSession(false);
      }
    } catch (error) {
      console.error('💥 Error checking session:', error);
      setHasSession(false);
    }
  }

  // Función para refrescar datos con debounce
  const refreshData = React.useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    refreshTimeoutRef.current = setTimeout(() => {
      if (!isRefreshing) {
        fetchData();
      }
    }, 500); // 500ms debounce
  }, [isRefreshing]);

  // Escuchar eventos de socket para actualizaciones en tiempo real
  useEffect(() => {
    if (socket) {
      const handleTicketPurchased = (data: any) => {
        console.log('Nueva compra de ticket recibida:', data);
        refreshData();
      };

      const handleTicketStatusChanged = (data: any) => {
        console.log('Cambio de estado de ticket recibido:', data);
        refreshData();
      };

      const handleTicketValidated = (data: any) => {
        console.log('Ticket validado recibido:', data);
        refreshData();
      };

      socket.on('ticket-purchased', handleTicketPurchased);
      socket.on('ticket-status-changed', handleTicketStatusChanged);
      socket.on('ticket-validated', handleTicketValidated);

      return () => {
        socket.off('ticket-purchased', handleTicketPurchased);
        socket.off('ticket-status-changed', handleTicketStatusChanged);
        socket.off('ticket-validated', handleTicketValidated);
      };
    }
  }, [socket, refreshData]);

  async function fetchData() {
    if (isRefreshing) return; // Prevenir llamadas simultáneas
    
    try {
      setIsRefreshing(true);
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

      // Fetch ticket packages
      const ticketPackagesResponse = await fetch('/api/admin/ticket-packages');
      const ticketPackagesData = await ticketPackagesResponse.json();

      if (ticketPackagesData.ok) {
        setTicketPackages(ticketPackagesData.ticketPackages);
      } else {
        console.error('Error fetching ticket packages:', ticketPackagesData.error);
        setError(`Error al cargar paquetes de tickets: ${ticketPackagesData.error || 'Error desconocido'}`);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
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

  async function handleCancelTicket(ticketId: string) {
    if (!confirm('¿Estás seguro de que quieres cancelar este ticket? Esta acción no se puede deshacer.')) {
      return;
    }

    setProcessingTicket(ticketId);
    try {
      const response = await fetch(`/api/admin/tickets/cancel/${ticketId}`, {
        method: 'POST'
      });

      const result = await response.json();

      if (result.ok) {
        setSuccess('Ticket cancelado exitosamente');
        // La UI se actualizará automáticamente via socket events
      } else {
        setError(result.error || 'Error al cancelar el ticket');
        fetchData(); // Solo recargar en caso de error
      }
    } catch (error) {
      console.error('Error canceling ticket:', error);
      setError('Error al cancelar el ticket');
      fetchData(); // Solo recargar en caso de error
    } finally {
      setProcessingTicket(null);
    }
  }

  async function handleMarkSuspicious(ticketId: string) {
    if (!confirm('¿Marcar este ticket como sospechoso?')) {
      return;
    }

    setProcessingTicket(ticketId);
    try {
      const response = await fetch(`/api/admin/tickets/suspicious/${ticketId}`, {
        method: 'POST'
      });

      const result = await response.json();

      if (result.ok) {
        setSuccess('Ticket marcado como sospechoso');
        // La UI se actualizará automáticamente via socket events
      } else {
        setError(result.error || 'Error al marcar el ticket como sospechoso');
        fetchData(); // Solo recargar en caso de error
      }
    } catch (error) {
      console.error('Error marking ticket as suspicious:', error);
      setError('Error al marcar el ticket como sospechoso');
      fetchData(); // Solo recargar en caso de error
    } finally {
      setProcessingTicket(null);
    }
  }

  async function handleMarkValid(ticketId: string) {
    if (!confirm('¿Marcar este ticket como válido?')) {
      return;
    }

    setProcessingTicket(ticketId);
    try {
      const response = await fetch(`/api/admin/tickets/valid/${ticketId}`, {
        method: 'POST'
      });

      const result = await response.json();

      if (result.ok) {
        setSuccess('Ticket marcado como válido');
        // La UI se actualizará automáticamente via socket events
      } else {
        setError(result.error || 'Error al marcar el ticket como válido');
        fetchData(); // Solo recargar en caso de error
      }
    } catch (error) {
      console.error('Error marking ticket as valid:', error);
      setError('Error al marcar el ticket como válido');
      fetchData(); // Solo recargar en caso de error
    } finally {
      setProcessingTicket(null);
    }
  }

  const filteredTickets = selectedShow === 'all'
    ? ticketTypes
    : ticketTypes.filter(ticket => ticket.showId === selectedShow);

  const filteredTicketPackages = selectedShow === 'all'
    ? ticketPackages
    : ticketPackages.filter(pkg => {
        // Encontrar el show correspondiente al paquete
        const ticketType = ticketTypes.find(tt => tt.id === pkg.ticketTypeId);
        return ticketType?.showId === selectedShow;
      });

  const groupedTickets = filteredTickets.reduce((acc, ticket) => {
    if (!acc[ticket.showTitle]) {
      acc[ticket.showTitle] = [];
    }
    acc[ticket.showTitle].push(ticket);
    return acc;
  }, {} as Record<string, TicketType[]>);

  const groupedTicketPackages = filteredTicketPackages.reduce((acc, pkg) => {
    // Asegurarse de que showTitle existe
    const showTitle = pkg.showTitle || 'Sin título';
    if (!acc[showTitle]) {
      acc[showTitle] = [];
    }
    acc[showTitle].push(pkg);
    return acc;
  }, {} as Record<string, TicketPackage[]>);


  if (hasSession === false) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Acceso Denegado
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Necesitas iniciar sesión como administrador o staff para acceder a esta página.
            </p>
            <a
              href="/u/login"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#FF4D2E] hover:bg-[#FF4D2E]/90"
            >
              Ir al Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (hasSession === null || loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF4D2E] mr-2"></div>
          <span className="text-gray-600 dark:text-gray-400">Cargando...</span>
        </div>
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
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            title="Actualizar datos"
          >
            <RefreshCw size={20} />
          </button>
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
              Paquetes de Tickets ({ticketPackages.length})
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
        </div>
      ) : (
        /* Vista de Tickets Individuales */
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100 mb-4">
                Paquetes de Tickets Vendidos
              </h3>

              {ticketPackages.length === 0 ? (
                <div className="text-center py-12">
                  <Ticket className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No hay paquetes de tickets</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Los paquetes de tickets aparecerán aquí cuando se realicen compras.
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
                          Entradas
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
                      {ticketPackages.map((ticketPackage) => (
                        <tr key={ticketPackage.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {ticketPackage.customerName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              DNI: {ticketPackage.customerDni}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-gray-100">
                              {ticketPackage.showTitle}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(ticketPackage.showDate).toLocaleDateString('es-ES')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-gray-100">
                              {ticketPackage.ticketTypeName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              S/ {ticketPackage.totalAmount.toFixed(2)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-gray-100">
                              {ticketPackage.usedTickets}/{ticketPackage.totalTickets}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {ticketPackage.remainingTickets} restantes
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              ticketPackage.status === 'CONFIRMED'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : ticketPackage.status === 'CANCELLED'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}>
                              {ticketPackage.status === 'CONFIRMED' ? 'Confirmado' :
                               ticketPackage.status === 'CANCELLED' ? 'Cancelado' : 'Otro'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {new Date(ticketPackage.purchasedAt).toLocaleDateString('es-ES')} {new Date(ticketPackage.purchasedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  // Mostrar QR del paquete
                                  const qrWindow = window.open('', '_blank', 'width=400,height=600');
                                  if (qrWindow) {
                                    qrWindow.document.write(`
                                      <html>
                                        <head>
                                          <title>Código QR - ${ticketPackage.qrCode}</title>
                                          <style>
                                            body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
                                            .qr-code { margin: 20px 0; }
                                            .info { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; }
                                          </style>
                                        </head>
                                        <body>
                                          <h2>Código QR de Entrada</h2>
                                          <div class="qr-code">
                                            <img src="${ticketPackage.qrDataUrl || ''}" alt="QR Code" style="max-width: 100%; height: auto;" />
                                          </div>
                                          <div class="info">
                                            <p><strong>Código:</strong> ${ticketPackage.qrCode}</p>
                                            <p><strong>Cliente:</strong> ${ticketPackage.customerName}</p>
                                            <p><strong>Show:</strong> ${ticketPackage.showTitle}</p>
                                            <p><strong>Entradas:</strong> ${ticketPackage.totalTickets}</p>
                                            <p><strong>Usadas:</strong> ${ticketPackage.usedTickets}</p>
                                          </div>
                                        </body>
                                      </html>
                                    `);
                                  }
                                }}
                                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                title="Ver QR"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  // Descargar QR
                                  if (ticketPackage.qrDataUrl) {
                                    const link = document.createElement('a');
                                    link.href = ticketPackage.qrDataUrl;
                                    link.download = `qr-${ticketPackage.qrCode}.png`;
                                    link.click();
                                  }
                                }}
                                className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                title="Descargar QR"
                              >
                                <Download size={16} />
                              </button>
                            </div>
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
