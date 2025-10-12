"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChefHat, Clock, CheckCircle, XCircle, Users, Bell, RefreshCw, AlertCircle } from "lucide-react";
import { useStaffSocket } from "../../../hooks/useSocket";

interface Order {
  id: string;
  tableId: string;
  status: "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED";
  total: number;
  createdAt: string;
  table?: {
    name?: string;
    number?: number;
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
  zones: string[];
  permissions: {
    canViewOrders: boolean;
    canUpdateOrderStatus: boolean;
    canAssignTables: boolean;
    canCloseOrders: boolean;
    canMarkReady: boolean;
    allowedStatuses: string[];
  };
}

export default function StaffDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [staffLoading, setStaffLoading] = useState<boolean>(true);
  const { socket, isConnected } = useStaffSocket();

  const fetchStaffProfile = async () => {
    try {
      const response = await fetch("/api/staff/me");
      if (response.ok) {
        const data = await response.json();
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

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/orders");
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

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

        // Emitir actualizaciÃ³n a travÃ©s de Socket.IO
        if (socket) {
          const order = orders.find(o => o.id === orderId);
          if (order) {
            socket.emit("order-status-update", {
              orderId: parseInt(orderId),
              tableId: order.tableId,
              tableName: `Mesa ${order.tableId}`,
              status: newStatus,
              timestamp: new Date().toISOString(),
            });
          }
        }
      }
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-yellow-500";
      case "CONFIRMED": return "bg-blue-500";
      case "PREPARING": return "bg-orange-500";
      case "READY": return "bg-green-500";
      case "DELIVERED": return "bg-gray-500";
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

  const filteredOrders = selectedStatus === "all"
    ? orders
    : orders.filter(order => order.status === selectedStatus);

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
      // Listener para actualizaciones de pedidos
      socket.on("order-status-update", (data: any) => {
        console.log("📦 Actualización de pedido recibida:", data);
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order.id === data.orderId?.toString() || order.id === data.orderId
              ? { ...order, status: data.status }
              : order
          )
        );
      });

      // Listener para nuevos pedidos
      socket.on("new-order", (orderData: any) => {
        console.log("🍽️ Nuevo pedido recibido:", orderData);
        fetchOrders(); // Recargar todos los pedidos para incluir el nuevo
      });

      return () => {
        socket.off("order-status-update");
        socket.off("new-order");
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
            Tu área actual ({staffProfile?.area || 'Sin asignar'}) no tiene acceso al sistema de restaurante.
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
            <div>
              <h1 className="text-2xl font-bold text-[#FF4D2E]">Dashboard de Restaurante</h1>
              <p className="text-sm text-gray-400">
                Área: {staffProfile?.area} | Rol: {staffProfile?.restaurantRole}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-sm">{isConnected ? 'Conectado' : 'Desconectado'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
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

        {/* Filtros */}
        <div className="mb-6">
          <div className="flex gap-2 flex-wrap">
            {["all", "PENDING", "PREPARING", "READY", "DELIVERED", "CANCELLED"].map(status => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedStatus === status
                    ? "bg-[#FF4D2E] text-white"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {status === "all" ? "Todos" : status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
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
              className="bg-white/5 border border-white/10 rounded-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(order.status)}`}></div>
                  <h3 className="text-lg font-semibold">Pedido #{order.id}</h3>
                  <span className="text-gray-400">Mesa {order.tableId}</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(order.status)}
                  <span className="text-sm capitalize">{order.status}</span>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-medium mb-2">Items:</h4>
                <div className="space-y-1">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="text-sm text-gray-300">
                      {item.quantity}x {item.product.name}
                      {item.notes && <span className="text-yellow-400 ml-2">({item.notes})</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-lg font-bold text-[#FF4D2E]">
                  Total: ${order.total}
                </div>
                <div className="text-sm text-gray-400">
                  {new Date(order.createdAt).toLocaleTimeString()}
                </div>
              </div>

              {/* Acciones */}
              {staffProfile?.permissions.canUpdateOrderStatus && (
                <div className="flex gap-2 mt-4">
                  {order.status === "PENDING" && staffProfile.permissions.allowedStatuses.includes("PREPARING") && (
                    <button
                      onClick={() => updateOrderStatus(order.id, "PREPARING")}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Iniciar Preparación
                    </button>
                  )}
                  {order.status === "PREPARING" && staffProfile.permissions.allowedStatuses.includes("READY") && (
                    <button
                      onClick={() => updateOrderStatus(order.id, "READY")}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Marcar como Listo
                    </button>
                  )}
                  {order.status === "READY" && staffProfile.permissions.allowedStatuses.includes("DELIVERED") && (
                    <button
                      onClick={() => updateOrderStatus(order.id, "DELIVERED")}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Marcar como Entregado
                    </button>
                  )}
                  {order.status !== "DELIVERED" && order.status !== "CANCELLED" && staffProfile.permissions.allowedStatuses.includes("CANCELLED") && (
                    <button
                      onClick={() => updateOrderStatus(order.id, "CANCELLED")}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              )}
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
