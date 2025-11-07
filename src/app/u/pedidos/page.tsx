"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChefHat, Clock, CheckCircle, XCircle, Users, RefreshCw, AlertCircle, Edit, Trash2, Loader2 } from "lucide-react";
import { useStaffSocket } from "../../../hooks/useSocket";

interface Order {
  id: string;
  tableId?: string;
  servicePointId?: string;
  locationId?: string;
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

interface StaffProfile {
  hasRestaurantAccess: boolean;
  area: string | null;
  restaurantRole: string | null;
  staffId: string;
  name?: string;
  zones: string[];
  permissions: {
    canViewOrders: boolean;
    canUpdateOrderStatus: boolean;
    canAssignTables: boolean;
    canCloseOrders: boolean;
    canMarkReady: boolean;
    canViewMetrics: boolean;
    allowedStatuses: string[];
  };
}

export default function CartaDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("auto");
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [staffLoading, setStaffLoading] = useState<boolean>(true);
  const { socket, isConnected } = useStaffSocket();

  const fetchStaffProfile = async () => {
    try {
      const response = await fetch("/api/pedidos/me");
      if (response.ok) {
        const data = await response.json();
        console.log('?? Perfil de staff cargado:', data);
        setStaffProfile(data);
      } else if (response.status === 401) {
        // Usuario no autenticado, redirigir a login
        window.location.href = "/u/login";
        return;
      }
    } catch (error) {
      console.error("Error fetching staff profile:", error);
    } finally {
      setStaffLoading(false);
    }
  };

  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [newOrderNotification, setNewOrderNotification] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [updatingOrders, setUpdatingOrders] = useState<Record<string, string | null>>({});

  const fetchOrders = async (showLoading = true, showButtonLoading = false) => {
    if (showLoading) setLoading(true);
    if (showButtonLoading) setRefreshing(true);
    try {
      const response = await fetch("/api/orders");
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
        setLastUpdate(new Date());
        console.log(`?? Pedidos actualizados: ${data.orders?.length || 0} pedidos`);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      if (showLoading) setLoading(false);
      if (showButtonLoading) setRefreshing(false);
    }
  };

  // Funci�n wrapper para actualizaci�n manual (con loading del bot�n)
  const handleManualRefresh = () => fetchOrders(false, true);

  // Funci�n wrapper para polling autom�tico (sin loading del bot�n)
  const handleAutoRefresh = () => fetchOrders(false, false);

  // Polling de respaldo cada 8 segundos si no hay socket conectado
  useEffect(() => {
    if (!socketConnected) {
      console.log("?? Iniciando polling de respaldo (8s)");
      const interval = setInterval(() => {
        fetchOrders(false);
      }, 8000);

      return () => clearInterval(interval);
    }
  }, [socketConnected]);

  // Funci�n helper para verificar si una acci�n espec�fica est� en progreso
  const isUpdatingOrder = (orderId: string, action: string) => updatingOrders[orderId] === action;
  const isAnyActionInProgress = (orderId: string) => !!updatingOrders[orderId];

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    // Validar permisos antes de actualizar
    if (!staffProfile?.permissions.canUpdateOrderStatus) {
      alert("No tienes permisos para cambiar el estado de los pedidos");
      return;
    }

    if (!staffProfile.permissions.allowedStatuses.includes(newStatus)) {
      alert(`No puedes cambiar el estado a ${newStatus}`);
      return;
    }

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
              ? { ...order, status: newStatus as Order['status'], updatedAt: new Date().toISOString() }
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

  const deleteOrder = async (orderId: string) => {
    if (!confirm("�Est�s seguro de eliminar este pedido? Esta acci�n no se puede deshacer.")) {
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

  // Determinar filtro predeterminado basado en si el usuario tiene pedidos propios
  const userHasOwnOrders = orders.some(order => order.staff?.id === staffProfile?.staffId);
  const defaultFilter = userHasOwnOrders ? "mine" : "all";

  // Usar el filtro predeterminado si a�n no se ha seleccionado ninguno espec�fico
  const effectiveSelectedStatus = selectedStatus === "auto" 
    ? (userHasOwnOrders ? "mine" : "all") 
    : selectedStatus;

  const filteredOrders = effectiveSelectedStatus === "all"
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
          
          // Para pedidos con el mismo estado, ordenar por fecha de creaci�n (m�s recientes primero)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
    : effectiveSelectedStatus === "mine"
    ? orders
        .filter(order => order.staff?.id === staffProfile?.staffId)
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
          
          // Para pedidos con el mismo estado, ordenar por fecha de creaci�n (m�s recientes primero)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
    : orders.filter(order => order.status === effectiveSelectedStatus);

  const pendingOrders = orders.filter(o => o.status === "PENDING").length;
  const preparingOrders = orders.filter(o => o.status === "PREPARING").length;
  const readyOrders = orders.filter(o => o.status === "READY").length;

  useEffect(() => {
    fetchStaffProfile();
  }, []);

  useEffect(() => {
    if (staffProfile?.hasRestaurantAccess) {
      fetchOrders();
    }
  }, [staffProfile]);

  useEffect(() => {
    if (socket) {
      // Actualizar estado de conexi�n
      socket.on("connect", () => {
        console.log("?? Socket conectado - modo tiempo real activado");
        setSocketConnected(true);
      });

      socket.on("disconnect", () => {
        console.log("?? Socket desconectado - usando polling de respaldo");
        setSocketConnected(false);
      });

      // Listener para actualizaciones de pedidos
      socket.on("order-status-update", (data: any) => {
        console.log("?? Actualizaci�n de pedido recibida:", data);
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
        console.log("??? Nuevo pedido recibido:", orderData);
        setNewOrderNotification(true);
        // Peque�o delay para mostrar notificaci�n antes de recargar
        setTimeout(() => {
          fetchOrders(false);
          setNewOrderNotification(false);
        }, 500);
      });

      // Listener para actualizaciones de inventario
      socket.on("inventory-update", (data: any) => {
        console.log("?? Actualizaci�n de inventario recibida:", data);
        // Aqu� podr�amos mostrar una notificaci�n o actualizar alg�n estado relacionado con inventario
        // Por ahora solo loggeamos para debugging
      });

      return () => {
        socket.off("connect");
        socket.off("disconnect");
        socket.off("order-status-update");
        socket.off("new-order");
        socket.off("inventory-update");
      };
    }
  }, [socket]);

  if (staffLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando perfil...</div>
      </div>
    );
  }

  if (!staffProfile?.hasRestaurantAccess) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Acceso Restringido</h1>
          <p className="text-gray-400 mb-4">
            Tu �rea actual ({staffProfile?.area || 'Sin asignar'}) no tiene acceso al sistema de restaurante.
          </p>
          <p className="text-gray-500 text-sm">
            Solo usuarios de Caja, Barra o Mozos pueden acceder al dashboard de restaurante.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando pedidos...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gray-900/90 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Indicador de conexi�n en tiempo real */}
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${socketConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                <span className="text-sm text-gray-400">
                  {socketConnected ? '?? Tiempo Real' : '?? Polling'}
                </span>
              </div>

              {/* �ltima actualizaci�n */}
              <div className="text-sm text-gray-500">
                �ltima actualizaci�n: {lastUpdate.toLocaleTimeString()}
              </div>

              {/* Notificaci�n de nuevo pedido */}
              {newOrderNotification && (
                <div className="flex items-center gap-2 bg-green-600 text-white px-3 py-1 rounded-full text-sm animate-bounce">
                  <span className="animate-ping">??</span>
                  �Nuevo pedido!
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {refreshing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Actualizar
              </button>
              <a
                href="/u/mesas"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Mesas
              </a>
              <a
                href="/u/menu"
                className="px-4 py-2 bg-[#FF4D2E] hover:bg-[#E6442A] text-white rounded-lg text-sm font-medium transition-colors"
              >
                Ver carta
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Stats - Solo visible para roles que no sean mozos */}
      {staffProfile?.restaurantRole !== 'WAITER' && (
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-400 text-sm">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-400">{pendingOrders}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-400 text-sm">Preparando</p>
                <p className="text-2xl font-bold text-blue-400">{preparingOrders}</p>
              </div>
              <ChefHat className="w-8 h-8 text-blue-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-green-500/10 border border-green-500/20 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-400 text-sm">Listos</p>
                <p className="text-2xl font-bold text-green-400">{readyOrders}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-400 text-sm">Total Hoy</p>
                <p className="text-2xl font-bold text-purple-400">{orders.length}</p>
              </div>
              <Users className="w-8 h-8 text-purple-400" />
            </div>
          </motion.div>
          </div>
        </div>

      )}

      {/* Filtros */}
      <div className="mb-6">
        <div className="mb-6">
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "all", label: "Todos" },
              { key: "mine", label: "Mis pedidos" },
              { key: "PENDING", label: "Pendientes" },
              { key: "PREPARING", label: "Preparando" },
              { key: "READY", label: "Listos" },
              { key: "DELIVERED", label: "Entregados" },
              { key: "CANCELLED", label: "Cancelados" }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSelectedStatus(key === "all" ? "auto" : key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  (key === "all" && effectiveSelectedStatus === "all") || 
                  (key === "mine" && effectiveSelectedStatus === "mine") ||
                  (key !== "all" && key !== "mine" && effectiveSelectedStatus === key)
                    ? "bg-[#FF4D2E] text-white"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Pedidos */}
        <div className="space-y-4">
          {filteredOrders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-6 shadow-lg hover:shadow-xl transition-shadow"
            >
              {/* Header con Estado Destacado y Zona/Mesa */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                <div className="flex items-center gap-3">
                  {/* Estado con especial prominencia */}
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${getStatusBadgeStyle(order.status)}`}>
                    {getStatusIcon(order.status)}
                    <span>{getStatusText(order.status)}</span>
                  </div>
                  
                  {/* Zona/Mesa - Mayor jerarqu�a */}
                  <div className="bg-gray-800/50 px-3 py-2 rounded-lg">
                    <span className="text-white font-bold text-base md:text-lg">{getOrderLocationName(order)}</span>
                  </div>
                </div>
                
                {/* ID del pedido y timestamp */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-gray-400">
                  <span className="font-mono">#{order.id.slice(-6)}</span>
                  <span className="hidden md:inline">{new Date(order.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Productos - Segunda jerarqu�a */}
              <div className="mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-white truncate">{item.product.name}</h4>
                          <p className="text-sm text-gray-300">�{item.quantity}</p>
                          {item.notes && (
                            <p className="text-xs text-yellow-400 mt-1 italic">"{item.notes}"</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer con Precio, Staff y Acciones */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Precio y Staff */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Precio - Tercera jerarqu�a */}
                  <div className="text-xl md:text-2xl font-bold text-[#FF4D2E]">
                    S/ {order.total.toFixed(2)}
                  </div>
                  
                  {/* Qui�n hizo el pedido - Cuarta jerarqu�a */}
                  {order.staff && (
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="text-blue-400">??</span>
                      <span className="hidden sm:inline">{order.staff.name}</span>
                      <span className="sm:hidden">{order.staff.name.split(' ')[0]}</span>
                      <span className="text-gray-500">({order.staff.role})</span>
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex gap-2 flex-wrap">
                  {staffProfile?.permissions.canUpdateOrderStatus && (
                    <>
                      {/* Bot�n CONFIRMAR - Solo para usuarios que pueden confirmar */}
                      {order.status !== "DELIVERED" && order.status !== "CANCELLED" && staffProfile.permissions.allowedStatuses.includes("CONFIRMED") && order.status === "PENDING" && (
                        <button
                          onClick={() => updateOrderStatus(order.id, "CONFIRMED")}
                          disabled={isAnyActionInProgress(order.id)}
                          className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
                        >
                          {isUpdatingOrder(order.id, "CONFIRMED") ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <span>Confirmar</span>
                          )}
                        </button>
                      )}

                      {/* Bot�n PREPARAR - Para usuarios que pueden preparar */}
                      {order.status !== "DELIVERED" && order.status !== "CANCELLED" && staffProfile.permissions.allowedStatuses.includes("PREPARING") && order.status === "CONFIRMED" && (
                        <button
                          onClick={() => updateOrderStatus(order.id, "PREPARING")}
                          disabled={isAnyActionInProgress(order.id)}
                          className={`inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px] ${
                            ["PREPARING", "READY", "DELIVERED"].includes(order.status)
                              ? "bg-orange-800 text-gray-300"
                              : "bg-orange-600 hover:bg-orange-700 text-white focus:ring-orange-500"
                          }`}
                        >
                          {isUpdatingOrder(order.id, "PREPARING") ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <span>
                              {["PREPARING", "READY", "DELIVERED"].includes(order.status) ? "En preparaci�n" : "Preparar"}
                            </span>
                          )}
                        </button>
                      )}

                      {/* Bot�n LISTO - Para usuarios que pueden marcar como listo */}
                      {order.status !== "DELIVERED" && order.status !== "CANCELLED" && staffProfile.permissions.allowedStatuses.includes("READY") && order.status === "PREPARING" && (
                        <button
                          onClick={() => updateOrderStatus(order.id, "READY")}
                          disabled={isAnyActionInProgress(order.id)}
                          className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
                        >
                          {isUpdatingOrder(order.id, "READY") ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <span>
                              {["READY", "DELIVERED"].includes(order.status) ? "Listo para recoger" : "Listo"}
                            </span>
                          )}
                        </button>
                      )}

                      {/* Bot�n ENTREGAR - Para usuarios que pueden entregar */}
                      {order.status !== "DELIVERED" && order.status !== "CANCELLED" && staffProfile.permissions.allowedStatuses.includes("DELIVERED") && order.status === "READY" && (
                        <button
                          onClick={() => updateOrderStatus(order.id, "DELIVERED")}
                          disabled={isAnyActionInProgress(order.id)}
                          className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
                        >
                          {isUpdatingOrder(order.id, "DELIVERED") ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <span>Entregar</span>
                          )}
                        </button>
                      )}

                      {/* Bot�n CANCELAR - Para usuarios que pueden cancelar */}
                      {order.status !== "DELIVERED" && order.status !== "CANCELLED" && staffProfile.permissions.allowedStatuses.includes("CANCELLED") && (
                        <button
                          onClick={() => updateOrderStatus(order.id, "CANCELLED")}
                          disabled={isAnyActionInProgress(order.id)}
                          className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
                        >
                          {isUpdatingOrder(order.id, "CANCELLED") ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <span>Cancelar</span>
                          )}
                        </button>
                      )}
                    </>
                  )}

                  {/* Bot�n de eliminar (solo para administradores) */}
                  {staffProfile?.permissions.canCloseOrders && (
                    <button
                      onClick={() => deleteOrder(order.id)}
                      disabled={deletingOrderId === order.id}
                      className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg bg-red-800 hover:bg-red-900 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingOrderId === order.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">No hay pedidos con el filtro seleccionado</p>
          </div>
        )}
      </div>
    </div>
  );
}

