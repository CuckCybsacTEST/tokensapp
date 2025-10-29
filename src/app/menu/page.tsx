"use client";

import React, { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Plus, Minus } from "lucide-react";
import SuccessModal from "@/components/SuccessModal";
import { useTableSocket } from "../../hooks/useSocket";
import { useSearchParams } from "next/navigation";

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
}

interface Table {
  id: string;
  number: string;
  name?: string;
  type: 'TABLE' | 'BOX' | 'ZONE';
  capacity: number;
  active: boolean;
  positionX?: number;
  positionY?: number;
  qrCode?: string;
  location?: {
    id: string;
    name: string;
    type: 'DINING' | 'VIP' | 'BAR';
  };
}

interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

function MenuPageContent() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableId, setTableId] = useState<string>("");
  const [orderNotes, setOrderNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderStatus, setOrderStatus] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [showCustomerNameModal, setShowCustomerNameModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string>("");

  const searchParams = useSearchParams();

  // Socket.IO para actualizaciones en tiempo real
  const { socket, isConnected } = useTableSocket(tableId);

  // Leer tableId desde URL parameters
  useEffect(() => {
    const tableParam = searchParams?.get('table');
    if (tableParam) {
      setTableId(tableParam);
    }
  }, [searchParams]);

  // Cargar datos del menú al montar el componente
  useEffect(() => {
    loadMenuData();
  }, []);

  useEffect(() => {
    if (tableId) {
      loadTableData();
    }
  }, [tableId]);

  useEffect(() => {
    if (socket) {
      socket.on("order-status-update", (orderData) => {
        console.log("📦 Actualización de pedido:", orderData);
        setOrderStatus(`Estado: ${orderData.status}`);

        // Mostrar notificación
        if ("Notification" in window) {
          new Notification(`Pedido ${orderData.status}`, {
            body: `Tu pedido en ${orderData.tableName || `Mesa ${orderData.tableId}`} está ${orderData.status}`,
            icon: "/icon-192x192.png",
          });
        }
      });
    }

    return () => {
      if (socket) {
        socket.off("order-status-update");
      }
    };
  }, [socket]);

  const loadMenuData = async () => {
    try {
      // Cargar categorías y productos desde la API (públicos)
      const [categoriesRes, productsRes] = await Promise.all([
        fetch("/api/menu/categories"),
        fetch("/api/menu/products")
      ]);

      if (categoriesRes.ok && productsRes.ok) {
        const categoriesData = await categoriesRes.json();
        const productsData = await productsRes.json();

        setCategories(categoriesData);
        setProducts(productsData);

        // Seleccionar primera categoría activa
        const firstActiveCategory = categoriesData.find((cat: Category) => cat.active);
        if (firstActiveCategory) {
          setSelectedCategory(firstActiveCategory.id);
        }
      } else {
        console.error("Error loading menu data:", {
          categories: categoriesRes.status,
          products: productsRes.status
        });
      }
    } catch (error) {
      console.error("Error loading menu:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTableData = async () => {
    if (!tableId) return;

    try {
      // Validar que el servicePoint existe y está activo
      const tableRes = await fetch(`/api/menu/service-points?ids=${encodeURIComponent(tableId)}`);

      if (tableRes.ok) {
        const tablesData = await tableRes.json();
        if (tablesData.length > 0) {
          setTables(tablesData);
        } else {
          console.warn("Service point not found or inactive:", tableId);
          // Podríamos mostrar un mensaje de error aquí
        }
      } else {
        console.error("Error loading table data:", tableRes.status);
      }
    } catch (error) {
      console.error("Error loading table:", error);
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prev, { product, quantity: 1 }];
      }
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.product.id !== productId));
    } else {
      setCart(prev => prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      ));
    }
  };

  const getTotalItems = () => cart.reduce((sum, item) => sum + item.quantity, 0);
  const getTotalPrice = () => cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  const filteredProducts = products.filter(product =>
    product.categoryId === selectedCategory && product.available
  );
  const submitOrder = async () => {
    if (!tableId) {
      alert("Por favor selecciona una mesa o zona de servicio");
      return;
    }

    if (cart.length === 0) {
      alert("El carrito está vacío");
      return;
    }

    // Si viene desde QR (tiene tableId), pedir nombre del cliente
    if (tableId && !customerName.trim()) {
      setShowCustomerNameModal(true);
      return;
    }

    await sendOrder();
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    setLastOrderId("");
  };

  const sendOrder = async () => {
    setIsSubmitting(true);
    try {
      const orderData = {
        servicePointId: tableId,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          notes: item.notes,
        })),
        notes: orderNotes.trim() || undefined,
        customerName: customerName.trim() || undefined,
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Guardar el ID del pedido y mostrar modal de éxito
        setLastOrderId(result.order.id);
        setShowSuccessModal(true);
        
        // Limpiar carrito y datos del cliente
        setCart([]);
        setOrderNotes("");
        setCustomerName("");
        
        // Emitir evento de Socket.IO
        if (socket) {
          const selectedTable = tables.find(t => t.id === tableId);
          let locationName = "";
          if (selectedTable) {
            locationName = selectedTable.name || `${selectedTable.type} ${selectedTable.number}`;
          }

          socket.emit("new-order", {
            orderId: result.order.id,
            tableId: tableId,
            tableName: locationName,
            items: cart,
            total: getTotalPrice(),
            status: "pendiente",
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error submitting order:", error);
      alert("❌ Error al enviar el pedido. Inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Cargando carta...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-[#FF4D2E]">El Lounge</h1>
            <div className="flex items-center gap-4">
              <div className="relative">
                <ShoppingCart className="w-6 h-6" />
                {getTotalItems() > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#FF4D2E] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {getTotalItems()}
                  </span>
                )}
              </div>
              <span className="text-lg font-semibold">
                S/ {getTotalPrice().toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="sticky top-20 z-40 bg-black/90 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {categories
              .filter(cat => cat.active)
              .sort((a, b) => a.order - b.order)
              .map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                    selectedCategory === category.id
                      ? "bg-[#FF4D2E] text-white"
                      : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
                >
                  {category.icon && <span className="mr-2">{category.icon}</span>}
                  {category.name}
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts
            .sort((a, b) => a.order - b.order)
            .map((product) => {
              const cartItem = cart.find(item => item.product.id === product.id);

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 rounded-xl overflow-hidden border border-white/10"
                >
                  {product.image && (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-48 object-cover"
                    />
                  )}

                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold">{product.name}</h3>
                      <span className="text-[#FF4D2E] font-bold text-lg">
                        S/ {product.price.toFixed(2)}
                      </span>
                    </div>

                    {product.description && (
                      <p className="text-white/70 text-sm mb-4">{product.description}</p>
                    )}

                    <div className="flex items-center justify-between">
                      {cartItem ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(product.id, cartItem.quantity - 1)}
                            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center">{cartItem.quantity}</span>
                          <button
                            onClick={() => updateQuantity(product.id, cartItem.quantity + 1)}
                            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(product)}
                          className="flex-1 bg-[#FF4D2E] hover:bg-[#FF4D2E]/80 text-white py-2 px-4 rounded-lg font-semibold transition-colors"
                        >
                          Agregar
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
        </div>
      </div>

      {/* Cart Summary */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-white/10 p-4">
          <div className="container mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70">{getTotalItems()} productos</p>
                <p className="text-xl font-bold">Total: S/ {getTotalPrice().toFixed(2)}</p>
              </div>
              <button
                onClick={submitOrder}
                disabled={isSubmitting || !tableId}
                className="bg-[#FF4D2E] hover:bg-[#FF4D2E]/80 disabled:opacity-50 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
              >
                {isSubmitting ? "Enviando..." : "Hacer Pedido"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Modal */}
      {orderSuccess && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirmar Pedido</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seleccionar Mesa/Zona
                </label>
                <select
                  value={tableId}
                  onChange={(e) => setTableId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF4D2E] focus:border-transparent"
                  required
                >
                  <option value="">Seleccionar mesa/zona...</option>
                  
                  {/* Puntos de servicio (mesas, boxes, zonas) */}
                  {tables.map((table) => (
                    <option key={table.id} value={table.id}>
                      {table.type === 'TABLE' ? 'Mesa' : 
                       table.type === 'BOX' ? 'Box' : 'Zona'} {table.number}
                      {table.name && ` - ${table.name}`}
                      {table.location && ` (${table.location.name})`}
                      {` - ${table.capacity} personas`}
                    </option>
                  ))}
                </select>
                
                {/* Mostrar información de la selección actual */}
                {tableId && (
                  <p className="text-xs text-gray-500 mt-1">
                    Zona de servicio seleccionada
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas adicionales (opcional)
                </label>
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Ej: Sin cebolla, extra queso..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF4D2E] focus:border-transparent"
                />
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>{getTotalItems()} productos</span>
                  <span className="font-semibold">S/ {getTotalPrice().toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setOrderSuccess(false)}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={submitOrder}
                disabled={isSubmitting || !tableId}
                className="flex-1 px-4 py-2 bg-[#FF4D2E] text-white rounded-lg hover:bg-[#FF4D2E]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                {isSubmitting ? "Enviando..." : "Confirmar Pedido"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Name Modal */}
      {showCustomerNameModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black/90 border border-white/20 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Ingresa tu nombre</h3>
            <p className="text-gray-300 mb-4 text-sm">
              Para identificarte cuando llegue tu pedido
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Tu nombre *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#FF4D2E] focus:border-transparent"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCustomerNameModal(false)}
                className="flex-1 px-4 py-2 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (customerName.trim()) {
                    setShowCustomerNameModal(false);
                    sendOrder();
                  } else {
                    alert("Por favor ingresa tu nombre");
                  }
                }}
                disabled={!customerName.trim()}
                className="flex-1 px-4 py-2 bg-[#FF4D2E] text-white rounded-lg hover:bg-[#FF4D2E]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessModalClose}
        title="¡Pedido enviado!"
        message="Tu pedido ha sido registrado exitosamente. Te notificaremos cuando esté listo."
        orderId={lastOrderId}
        autoCloseDelay={8000}
      />
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando menú...</div>}>
      <MenuPageContent />
    </Suspense>
  );
}