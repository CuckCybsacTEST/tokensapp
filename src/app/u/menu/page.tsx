"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Plus, Minus } from "lucide-react";
import { useMenuSocket } from "../../../hooks/useSocket";
import Link from "next/link";
import { Button, ActionButton, QuickActionButton } from "../../../components";

interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  order: number;
  active: boolean;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  categoryId: string;
  available: boolean;
  featured: boolean;
  order: number;
  category?: {
    id: string;
    name: string;
  };
}

interface Location {
  id: string;
  name: string;
  type: 'DINING' | 'VIP' | 'BAR';
  active: boolean;
  order: number;
  servicePoints: ServicePoint[];
}

interface ServicePoint {
  id: string;
  locationId: string;
  number: string;
  name?: string;
  type: 'TABLE' | 'BOX' | 'ZONE';
  capacity: number;
  active: boolean;
  location: {
    name: string;
    type: string;
  };
}

interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
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
    allowedStatuses: string[];
  };
}

export default function StaffMenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedServicePoint, setSelectedServicePoint] = useState<ServicePoint | null>(null);
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [newOrderActivity, setNewOrderActivity] = useState<boolean>(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const { socket, isConnected } = useMenuSocket();

  const getRoleDisplayName = (role: string | null | undefined) => {
    switch (role) {
      case 'WAITER': return 'Mozo';
      case 'CASHIER': return 'Caja';
      case 'BARTENDER': return 'Bartender';
      case 'ADMIN': return 'Administrador';
      default: return role || 'Usuario';
    }
  };

  const getAreaDisplayName = (area: string | null | undefined) => {
    switch (area) {
      case 'bar': return 'Bar';
      case 'caja': return 'Caja';
      case 'cocina': return 'Cocina';
      case 'terraza': return 'Terraza';
      case 'vip': return 'VIP';
      default: return area || 'General';
    }
  };

  useEffect(() => {
    fetchStaffProfile();
    fetchCategories();
    fetchProducts();
    fetchLocations();
  }, []);

  // Listener para actualizaciones en tiempo real
  useEffect(() => {
    if (socket) {
      // Actualizar estado de conexión
      socket.on("connect", () => {
        console.log("🔌 Menú: Socket conectado");
        setSocketConnected(true);
      });

      socket.on("disconnect", () => {
        console.log("🔌 Menú: Socket desconectado");
        setSocketConnected(false);
      });

      // Listener para nuevos pedidos (útil para mostrar indicadores de actividad)
      socket.on("new-order", (orderData: any) => {
        console.log("🍽️ Menú: Nuevo pedido detectado:", orderData);
        setNewOrderActivity(true);
        // Ocultar indicador después de 3 segundos
        setTimeout(() => setNewOrderActivity(false), 3000);
      });

      // Listener para actualizaciones de estado de pedidos
      socket.on("order-status-update", (orderData: any) => {
        console.log("📦 Menú: Estado de pedido actualizado:", orderData);
        // Aquí podríamos actualizar indicadores visuales de actividad
      });

      return () => {
        socket.off("connect");
        socket.off("disconnect");
        socket.off("new-order");
        socket.off("order-status-update");
      };
    }
  }, [socket]);

  const fetchStaffProfile = async () => {
    try {
      const response = await fetch("/api/pedidos/me");
      if (response.ok) {
        const data = await response.json();
        setStaffProfile(data);
      } else if (response.status === 401) {
        window.location.href = "/u/login";
        return;
      }
    } catch (error) {
      console.error("Error fetching staff profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/menu/categories");
      if (response.ok) {
        const data = await response.json();
        console.log("Categories loaded:", data);
        setCategories(data);
        if (data && data.length > 0) {
          setSelectedCategory(data[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/menu/products");
      if (response.ok) {
        const data = await response.json();
        console.log("Products loaded:", data);
        // Transformar la data para que tenga categoryId en lugar de category
        const transformedProducts = data.map((product: any) => ({
          ...product,
          categoryId: product.category?.id || product.categoryId,
        }));
        setProducts(transformedProducts);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/admin/locations");
      if (response.ok) {
        const data = await response.json();
        console.log("Locations loaded:", data);
        setLocations(data);
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, { product, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart =>
      prevCart.reduce((acc, item) => {
        if (item.product.id === productId) {
          if (item.quantity > 1) {
            acc.push({ ...item, quantity: item.quantity - 1 });
          }
        } else {
          acc.push(item);
        }
        return acc;
      }, [] as CartItem[])
    );
  };

  const getTotal = () => {
    return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const createOrder = async () => {
    if (!selectedServicePoint || cart.length === 0) {
      alert("Selecciona una zona/punto de servicio y agrega productos al carrito");
      return;
    }

    setCreatingOrder(true);
    try {
      const orderData = {
        servicePointId: selectedServicePoint.type === 'ZONE' ? undefined : selectedServicePoint.id,
        locationId: selectedServicePoint.type === 'ZONE' ? selectedServicePoint.locationId : undefined,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          notes: item.notes
        })),
        notes: ""
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        setOrderSuccess(true);
        setCart([]);
        setSelectedServicePoint(null);
        // Emitir evento para actualizar otros dashboards
        if (socket) {
          socket.emit("new-order", orderData);
        }
        // Reset success state after 3 seconds
        setTimeout(() => setOrderSuccess(false), 3000);
      } else {
        const error = await response.json();
        alert(`Error al crear pedido: ${error.error}`);
      }
    } catch (error) {
      console.error("Error creating order:", error);
      alert("Error al crear el pedido");
    } finally {
      setCreatingOrder(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.categoryId === selectedCategory
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando carta interna...</div>
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
              <h1 className="text-2xl font-bold">Carta Digital</h1>

              {/* Indicadores de actividad */}
              <div className="flex items-center gap-4">
                {/* Indicador de conexión */}
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                  <span className="text-xs text-gray-400">
                    {socketConnected ? 'Conectado' : 'Sin conexión'}
                  </span>
                </div>

                {/* Indicador de actividad de pedidos */}
                {newOrderActivity && (
                  <div className="flex items-center gap-2 bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-xs border border-blue-600/30">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    Actividad de pedidos
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/u/mesas"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white font-medium"
              >
                Mesas
              </Link>
              <Link
                href="/u/pedidos"
                className="px-4 py-2 bg-[#FF4D2E] hover:bg-[#FF4D2E]/80 rounded-lg transition-colors text-white font-medium"
              >
                Control de Pedidos
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Categories and Products */}
          <div className="lg:col-span-2">
            {/* Categories */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Categorías</h2>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {categories.filter(cat => cat.active).map(category => (
                  <Button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    variant={selectedCategory === category.id ? "primary" : "outline"}
                    size="sm"
                    className="whitespace-nowrap"
                  >
                    {category.icon && <span className="mr-2">{category.icon}</span>}
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Products */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProducts.map(product => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                >
                  {product.image && (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-32 object-cover rounded-lg mb-3"
                    />
                  )}
                  <h3 className="text-lg font-semibold mb-2">{product.name}</h3>
                  {product.description && (
                    <p className="text-gray-400 text-sm mb-3">{product.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[#FF4D2E] font-bold text-lg">${product.price.toFixed(2)}</span>
                    <ActionButton
                      onClick={() => addToCart(product)}
                      size="sm"
                      successMessage="¡Agregado!"
                      className="px-3 py-2"
                    >
                      <Plus className="w-4 h-4" />
                    </ActionButton>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Cart and Table Selection */}
          <div className="space-y-6">
            {/* Service Point Selection */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">Seleccionar Zona/Punto de Servicio</h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {locations.map(location => (
                  <div key={location.id} className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-300 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        location.type === 'DINING' ? 'bg-blue-500' :
                        location.type === 'VIP' ? 'bg-purple-500' :
                        'bg-green-500'
                      }`}></div>
                      {location.name}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 ml-4">
                      {location.servicePoints.filter(sp => sp.active).map(servicePoint => (
                        <button
                          key={servicePoint.id}
                          onClick={() => setSelectedServicePoint(servicePoint)}
                          className={`p-3 rounded-lg text-center transition-colors ${
                            selectedServicePoint?.id === servicePoint.id
                              ? 'bg-[#FF4D2E] text-white'
                              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                          }`}
                        >
                          <div className="font-semibold">{servicePoint.number}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {selectedServicePoint && (
                <div className="mt-4 p-3 bg-[#FF4D2E]/20 rounded-lg">
                  <p className="text-sm font-medium">
                    Seleccionado: {selectedServicePoint.number}
                    {selectedServicePoint.name && ` (${selectedServicePoint.name})`}
                  </p>
                  <p className="text-xs text-gray-400">
                    {selectedServicePoint.location.name} - {selectedServicePoint.type.toLowerCase()}
                  </p>
                </div>
              )}
            </div>

            {/* Cart */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingCart className="w-5 h-5" />
                <h3 className="text-lg font-semibold">Carrito</h3>
                <span className="bg-[#FF4D2E] text-white text-xs px-2 py-1 rounded-full">
                  {cart.length}
                </span>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {cart.map(item => (
                  <div key={item.product.id} className="flex items-center justify-between bg-gray-700 rounded-lg p-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{item.product.name}</h4>
                      <p className="text-[#FF4D2E] text-sm">${item.product.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <QuickActionButton
                        onClick={() => removeFromCart(item.product.id)}
                        className="w-8 h-8 p-0 flex items-center justify-center"
                      >
                        <Minus className="w-4 h-4" />
                      </QuickActionButton>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <QuickActionButton
                        onClick={() => addToCart(item.product)}
                        className="w-8 h-8 p-0 flex items-center justify-center bg-[#FF4D2E] hover:bg-[#E6442A]"
                      >
                        <Plus className="w-4 h-4" />
                      </QuickActionButton>
                    </div>
                  </div>
                ))}
              </div>

              {cart.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-600">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-semibold">Total:</span>
                    <span className="text-xl font-bold text-[#FF4D2E]">${getTotal().toFixed(2)}</span>
                  </div>
                  <ActionButton
                    onClick={createOrder}
                    loading={creatingOrder}
                    success={orderSuccess}
                    disabled={!selectedServicePoint}
                    successMessage="¡Pedido creado!"
                    className="w-full py-3"
                  >
                    {selectedServicePoint ? 'Crear Pedido' : 'Selecciona una Zona'}
                  </ActionButton>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}