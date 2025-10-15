"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Plus, Minus } from "lucide-react";
import { useTableSocket } from "../../../hooks/useSocket";
import Link from "next/link";

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

interface Table {
  id: string;
  number: number;
  name: string | null;
  zone: string | null;
  capacity: number;
  active: boolean;
  qrCode: string | null;
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
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { socket, isConnected } = useTableSocket();

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
    fetchTables();
  }, []);

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

  const fetchTables = async () => {
    try {
      const response = await fetch("/api/tables");
      if (response.ok) {
        const data = await response.json();
        console.log("Tables loaded:", data);
        setTables(data);
      }
    } catch (error) {
      console.error("Error fetching tables:", error);
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
    if (!selectedTable || cart.length === 0) {
      alert("Selecciona una mesa y agrega productos al carrito");
      return;
    }

    try {
      const orderData = {
        tableId: selectedTable.id,
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
        alert("Pedido creado exitosamente");
        setCart([]);
        setSelectedTable(null);
        // Emitir evento para actualizar otros dashboards
        if (socket) {
          socket.emit("new-order", orderData);
        }
      } else {
        const error = await response.json();
        alert(`Error al crear pedido: ${error.error}`);
      }
    } catch (error) {
      console.error("Error creating order:", error);
      alert("Error al crear el pedido");
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
          <div className="flex items-center justify-end">
            <Link
              href="/u/pedidos"
              className="px-4 py-2 bg-[#FF4D2E] hover:bg-[#FF4D2E]/80 rounded-lg transition-colors text-white font-medium"
            >
              Control de Pedidos
            </Link>
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
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-[#FF4D2E] text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    {category.icon && <span className="mr-2">{category.icon}</span>}
                    {category.name}
                  </button>
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
                    <button
                      onClick={() => addToCart(product)}
                      className="bg-[#FF4D2E] hover:bg-[#E6442A] text-white px-3 py-2 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Cart and Table Selection */}
          <div className="space-y-6">
            {/* Table Selection */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">Seleccionar Mesa</h3>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {tables.filter(table => table.active).map(table => (
                  <button
                    key={table.id}
                    onClick={() => setSelectedTable(table)}
                    className={`p-3 rounded-lg text-center transition-colors ${
                      selectedTable?.id === table.id
                        ? 'bg-[#FF4D2E] text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    <div className="font-semibold">Mesa {table.number}</div>
                    {table.name && <div className="text-xs">{table.name}</div>}
                    {table.zone && <div className="text-xs opacity-75">{table.zone}</div>}
                  </button>
                ))}
              </div>
              {selectedTable && (
                <div className="mt-4 p-3 bg-[#FF4D2E]/20 rounded-lg">
                  <p className="text-sm font-medium">Mesa seleccionada: {selectedTable.number}</p>
                  {selectedTable.name && <p className="text-xs text-gray-400">{selectedTable.name}</p>}
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
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="w-8 h-8 bg-gray-600 hover:bg-gray-500 rounded flex items-center justify-center"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => addToCart(item.product)}
                        className="w-8 h-8 bg-[#FF4D2E] hover:bg-[#E6442A] rounded flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
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
                  <button
                    onClick={createOrder}
                    disabled={!selectedTable}
                    className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                      selectedTable
                        ? 'bg-[#FF4D2E] hover:bg-[#E6442A] text-white'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {selectedTable ? 'Crear Pedido' : 'Selecciona una Mesa'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}