"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChefHat, Clock, CheckCircle, XCircle, Users, RefreshCw, AlertCircle, Edit, Trash2, Loader2 } from "lucide-react";
import { useStaffSocket } from "../../../hooks/useSocket";
import { Button, ActionButton, QuickActionButton } from "../../../components";

interface Order {
  id: string;
  tableId?: string;
  servicePointId?: string;
  locationId?: string;
  customerName?: string;
  isFromQR: boolean;
  status: "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED";
  total: number;
  createdAt: string;
  updatedAt: string;
  table?: {
    name?: string;
    number?: number;
  };
  servicePoint?: {
    id: string;
    number: string;
    name?: string;
    location: {
      name: string;
    };
  };
  location?: {
    id: string;
    name: string;
  };
  staff?: {
    id: string;
    name: string;
    role: string;
  };
  items: Array<{
    quantity: number;
    product: {
      name: string;
    };
    notes?: string;
  }>;
}

export default function AdminPedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [newOrderNotification, setNewOrderNotification] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [updatingOrders, setUpdatingOrders] = useState<Record<string, string | null>>({});
  const { socket, isConnected } = useStaffSocket();

  const fetchOrders = async (showLoading = true, showButtonLoading = false) => {
    if (showLoading) setLoading(true);
    if (showButtonLoading) setRefreshing(true);
    try {
      const response = await fetch("/api/admin/orders");
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
        setLastUpdate(new Date());
        console.log(`📊 Pedidos admin actualizados: ${data.orders?.length || 0} pedidos`);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      if (showLoading) setLoading(false);
      if (showButtonLoading) setRefreshing(false);
    }
  };

  // Función wrapper para actualización manual (con loading del botón)
  const handleManualRefresh = () => fetchOrders(false, true);

  // Función wrapper para polling automático (sin loading del botón)
  const handleAutoRefresh = () => fetchOrders(false, false);

  // Función helper para verificar si una acción específica está en progreso
  const isUpdatingOrder = (orderId: string, action: string) => updatingOrders[orderId] === action;
  const isAnyActionInProgress = (orderId: string) => !!updatingOrders[orderId];

  // Polling de respaldo cada 8 segundos si no hay socket conectado
  useEffect(() => {
    if (!socketConnected) {
      console.log("🔄 Admin: Iniciando polling de respaldo (8s)");
      const interval = setInterval(() => {
        handleAutoRefresh();
      }, 8000);

      return () => clearInterval(interval);
    }
  }, [socketConnected]);

  // Polling agresivo cada 3 segundos cuando hay socket conectado
  useEffect(() => {
    if (socketConnected) {
      console.log("⚡ Admin: Iniciando polling agresivo (3s)");
      const interval = setInterval(() => {
        handleAutoRefresh();
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [socketConnected]);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (socket) {
      // Actualizar estado de conexión
      socket.on("connect", () => {
        console.log("🔌 Admin: Socket conectado - modo tiempo real activado");
        setSocketConnected(true);
      });

      socket.on("disconnect", () => {
        console.log("🔌 Admin: Socket desconectado - usando polling de respaldo");
        setSocketConnected(false);
      });

      // Listener para actualizaciones de pedidos
      socket.on("order-status-update", (data: any) => {
        console.log("📦 Admin: Actualización de pedido recibida:", data);
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order.id === data.orderId?.toString() || order.id === data.orderId
              ? { ...order, status: data.status, updatedAt: new Date().toISOString() }
              : order
          )
        );
        setLastUpdate(new Date());
      });

      // Listener para nuevos pedidos
      socket.on("new-order", (orderData: any) => {
        console.log("🍽️ Admin: Nuevo pedido recibido:", orderData);
        setNewOrderNotification(true);
        setTimeout(() => {
          fetchOrders(false);
          setNewOrderNotification(false);
        }, 500);
      });

      return () => {
        socket.off("connect");
        socket.off("disconnect");
        socket.off("order-status-update");
        socket.off("new-order");
      };
    }
  }, [socket]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrders(prev => ({ ...prev, [orderId]: newStatus }));
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Actualizar el estado local inmediatamente
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order.id === orderId
              ? { ...order, status: newStatus as Order['status'] }
              : order
          )
        );
      } else {
        const error = await response.json();
        alert(`Error al actualizar pedido: ${error.error}`);
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      alert("Error al actualizar el pedido");
    } finally {
      setUpdatingOrders(prev => ({ ...prev, [orderId]: null }));
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm("¿Estás seguro de eliminar este pedido? Esta acción no se puede deshacer.")) {
      return;
    }

    setDeletingOrderId(orderId);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
        alert("Pedido eliminado exitosamente");
      } else {
        const error = await response.json();
        alert(`Error al eliminar pedido: ${error.error}`);
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      alert("Error al eliminar el pedido");
    } finally {
      setDeletingOrderId(null);
    }
  };

  const getOrderLocationName = (order: Order): string => {
    if (order.servicePoint) {
      return `${order.servicePoint.name || order.servicePoint.number} (${order.servicePoint.location.name})`;
    } else if (order.location) {
      return order.location.name;
    } else if (order.table) {
      return order.table.name || `Mesa ${order.table.number}`;
    } else {
      return `Mesa ${order.tableId}`;
    }
  };

  const getOrderLocationId = (order: Order): string => {
    if (order.servicePoint) {
      return order.servicePoint.id;
    } else if (order.location) {
      return order.location.id;
    } else {
      return order.tableId || "";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-yellow-500";
      case "CONFIRMED": return "bg-blue-500";
      case "PREPARING": return "bg-orange-500";
      case "READY": return "bg-green-500";
      case "DELIVERED": return "bg-purple-500";
      case "CANCELLED": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING": return <Clock className="w-4 h-4" />;
      case "CONFIRMED": return <CheckCircle className="w-4 h-4" />;
      case "PREPARING": return <ChefHat className="w-4 h-4" />;
      case "READY": return <CheckCircle className="w-4 h-4" />;
      case "DELIVERED": return <CheckCircle className="w-4 h-4" />;
      case "CANCELLED": return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case "PENDING": return "Pendiente";
      case "CONFIRMED": return "Confirmado";
      case "PREPARING": return "Preparando";
      case "READY": return "Listo";
      case "DELIVERED": return "Entregado";
      case "CANCELLED": return "Cancelado";
      default: return status;
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
      case "CONFIRMED": return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
      case "PREPARING": return "bg-orange-500/20 text-orange-400 border border-orange-500/30";
      case "READY": return "bg-green-500/20 text-green-400 border border-green-500/30";
      case "DELIVERED": return "bg-purple-500/20 text-purple-400 border border-purple-500/30";
      case "CANCELLED": return "bg-red-500/20 text-red-400 border border-red-500/30";
      default: return "bg-gray-500/20 text-gray-400 border border-gray-500/30";
    }
  };

  const filteredOrders = selectedStatus === "all"
    ? orders
        .slice()
        .sort((a, b) => {
          const hasReadyOrders = orders.some(order => order.status === "READY");
          
          // Si hay pedidos READY, priorizarlos primero
          if (hasReadyOrders) {
            if (a.status === "READY" && b.status !== "READY") return -1;
            if (a.status !== "READY" && b.status === "READY") return 1;
          } else {
            // Si no hay pedidos READY, priorizar PENDING
            if (a.status === "PENDING" && b.status !== "PENDING") return -1;
            if (a.status !== "PENDING" && b.status === "PENDING") return 1;
          }
          
          // Para pedidos con el mismo estado, ordenar por fecha de creación (más recientes primero)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
    : orders.filter(order => order.status === selectedStatus);

  const pendingOrders = orders.filter(o => o.status === "PENDING").length;
  const preparingOrders = orders.filter(o => o.status === "PREPARING").length;
  const readyOrders = orders.filter(o => o.status === "READY").length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="text-gray-600 dark:text-gray-400 text-lg">Cargando pedidos...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header - Responsive */}
      <div className="sticky top-0 z-50 bg-gray-900/90 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <h1 className="text-xl sm:text-2xl font-bold">Administración de Pedidos</h1>

              {/* Indicadores de tiempo real - Responsive */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                {/* Indicador de conexión en tiempo real */}
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${socketConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                  <span className="text-xs sm:text-sm text-gray-400">
                    {socketConnected ? '🟢 Tiempo Real' : '🟡 Polling'}
                  </span>
                </div>

                {/* Última actualización */}
                <div className="text-xs sm:text-sm text-gray-500">
                  Última: {lastUpdate.toLocaleTimeString()}
                </div>

                {/* Notificación de nuevo pedido */}
                {newOrderNotification && (
                  <div className="flex items-center gap-2 bg-green-600 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm animate-bounce">
                    <span className="animate-ping text-xs">🔔</span>
                    ¡Nuevo!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Stats - Responsive */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 sm:p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-400 text-xs sm:text-sm">Pendientes</p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-400">{pendingOrders}</p>
              </div>
              <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 sm:p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-400 text-xs sm:text-sm">Preparando</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-400">{preparingOrders}</p>
              </div>
              <ChefHat className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 sm:p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-400 text-xs sm:text-sm">Listos</p>
                <p className="text-xl sm:text-2xl font-bold text-green-400">{readyOrders}</p>
              </div>
              <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 sm:p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-400 text-xs sm:text-sm">Total Hoy</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-400">{orders.length}</p>
              </div>
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400" />
            </div>
          </motion.div>
        </div>

        {/* Filtros - Responsive */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <span className="text-sm text-gray-400 self-start sm:self-center mb-1 sm:mb-0">Filtrar por estado:</span>
            <div className="flex flex-wrap gap-2">
              {["all", "PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERED", "CANCELLED"].map(status => (
                <Button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  variant={selectedStatus === status ? "primary" : "outline"}
                  size="sm"
                  className="whitespace-nowrap text-xs sm:text-sm px-3 py-1"
                >
                  {status === "all" ? "Todos" : status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Lista de Pedidos - Responsive */}
        <div className="space-y-4">
          {filteredOrders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-6 shadow-lg hover:shadow-xl transition-shadow"
            >
              {/* Header con Estado Destacado y Zona/Mesa - Responsive */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Estado con especial prominencia */}
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${getStatusBadgeStyle(order.status)}`}>
                    {getStatusIcon(order.status)}
                    <span>{getStatusText(order.status)}</span>
                  </div>

                  {/* Zona/Mesa - Mayor jerarquía */}
                  <div className="bg-gray-800/50 px-3 py-2 rounded-lg">
                    <span className="text-white font-bold text-base md:text-lg">{getOrderLocationName(order)}</span>
                  </div>
                </div>

                {/* ID del pedido y timestamp */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-gray-400">
                  <span className="font-mono">#{order.id.slice(-6)}</span>
                  <span className="hidden md:inline">{new Date(order.createdAt).toLocaleString()}</span>
                  <span className="md:hidden text-xs">{new Date(order.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Productos - Responsive */}
              <div className="mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-white truncate">{item.product.name}</h4>
                          <p className="text-sm text-gray-300">×{item.quantity}</p>
                          {item.notes && (
                            <p className="text-xs text-yellow-400 mt-1 italic">"{item.notes}"</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer con Precio, Staff y Acciones - Responsive */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Precio y Staff */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Precio - Tercera jerarquía */}
                  <div className="text-xl md:text-2xl font-bold text-[#FF4D2E]">
                    S/ {order.total.toFixed(2)}
                  </div>

                  {/* Quién hizo el pedido - Cuarta jerarquía */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm">
                    {order.customerName && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <span className="text-green-400">👤</span>
                        <span className="hidden sm:inline">{order.customerName}</span>
                        <span className="sm:hidden">{order.customerName.split(' ')[0]}</span>
                        {order.isFromQR && (
                          <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded text-xs font-medium border border-purple-500/30">
                            QR
                          </span>
                        )}
                      </div>
                    )}
                    {order.staff && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <span className="text-blue-400">👨‍🍳</span>
                        <span className="hidden sm:inline">{order.staff.name}</span>
                        <span className="sm:hidden">{order.staff.name.split(' ')[0]}</span>
                        <span className="text-gray-500">({order.staff.role})</span>
                      </div>
                    )}
                    {!order.customerName && !order.staff && (
                      <div className="flex items-center gap-2 text-gray-500">
                        <span>👤</span>
                        <span>Sin asignar</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Acciones - Touch-friendly */}
                <div className="flex flex-col sm:flex-row gap-2">
                  {/* Primera fila de acciones */}
                  <div className="flex flex-wrap gap-2">
                    {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
                      <button
                        onClick={() => updateOrderStatus(order.id, "CONFIRMED")}
                        disabled={isAnyActionInProgress(order.id) || order.status !== "PENDING"}
                        className={`inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px] ${
                          order.status === "PENDING"
                            ? "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500"
                            : "bg-blue-800 text-gray-300"
                        }`}
                      >
                        {isUpdatingOrder(order.id, "CONFIRMED") ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <span className="hidden sm:inline">
                            {order.status === "PENDING" ? "Confirmar" : "✓ Confirmado"}
                          </span>
                        )}
                        <span className="sm:hidden">
                          {order.status === "PENDING" ? "Confirmar" : "✓"}
                        </span>
                      </button>
                    )}
                    {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
                      <button
                        onClick={() => updateOrderStatus(order.id, "PREPARING")}
                        disabled={isAnyActionInProgress(order.id) || order.status !== "CONFIRMED"}
                        className={`inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px] ${
                          order.status === "CONFIRMED"
                            ? "bg-orange-600 hover:bg-orange-700 text-white focus:ring-orange-500"
                            : "bg-orange-800 text-gray-300"
                        }`}
                      >
                        {isUpdatingOrder(order.id, "PREPARING") ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <span className="hidden sm:inline">
                            {["PREPARING", "READY", "DELIVERED"].includes(order.status) ? "En preparación" : "Preparar"}
                          </span>
                        )}
                        <span className="sm:hidden">
                          {["PREPARING", "READY", "DELIVERED"].includes(order.status) ? "Preparando" : "Preparar"}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Segunda fila de acciones */}
                  <div className="flex flex-wrap gap-2">
                    {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
                      <button
                        onClick={() => updateOrderStatus(order.id, "READY")}
                        disabled={isAnyActionInProgress(order.id) || order.status !== "PREPARING"}
                        className={`inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px] ${
                          order.status === "PREPARING"
                            ? "bg-green-600 hover:bg-green-700 text-white focus:ring-green-500"
                            : "bg-green-800 text-gray-300"
                        }`}
                      >
                        {isUpdatingOrder(order.id, "READY") ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <span className="hidden sm:inline">
                            {["READY", "DELIVERED"].includes(order.status) ? "Listo para recoger" : "Listo"}
                          </span>
                        )}
                        <span className="sm:hidden">
                          {["READY", "DELIVERED"].includes(order.status) ? "Listo" : "Listo"}
                        </span>
                      </button>
                    )}
                    {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
                      <button
                        onClick={() => updateOrderStatus(order.id, "DELIVERED")}
                        disabled={isAnyActionInProgress(order.id) || order.status !== "READY"}
                        className={`inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px] ${
                          order.status === "READY"
                            ? "bg-purple-600 hover:bg-purple-700 text-white focus:ring-purple-500"
                            : "bg-purple-800 text-gray-300"
                        }`}
                      >
                        {isUpdatingOrder(order.id, "DELIVERED") ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <span className="hidden sm:inline">Entregar</span>
                        )}
                        <span className="sm:hidden">Entregar</span>
                      </button>
                    )}
                    {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
                      <button
                        onClick={() => updateOrderStatus(order.id, "CANCELLED")}
                        disabled={isAnyActionInProgress(order.id)}
                        className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
                      >
                        {isUpdatingOrder(order.id, "CANCELLED") ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <span className="hidden sm:inline">Cancelar</span>
                        )}
                        <span className="sm:hidden">Cancelar</span>
                      </button>
                    )}
                    <QuickActionButton
                      onClick={() => deleteOrder(order.id)}
                      disabled={deletingOrderId === order.id}
                      className="p-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 min-w-[40px] h-10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </QuickActionButton>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12 bg-white/5 rounded-lg border border-white/10">
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-white">
              No hay pedidos con el filtro seleccionado
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              Los pedidos aparecerán aquí cuando se realicen nuevos pedidos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
