"use client";

import React, { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Plus, Minus, Sparkles, Zap, Crown, Star } from "lucide-react";
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

// Estilos visuales para categorías
const categoryStyles: Record<string, {
  icon: string;
  color: string;
  bgColor: string;
  textColor: string;
  glowColor: string;
  emoji: string;
}> = {
  'WHISKY': {
    icon: '🥃',
    color: 'from-amber-500 to-orange-600',
    bgColor: 'bg-gradient-to-br from-amber-500/20 to-orange-600/20',
    textColor: 'text-amber-100',
    glowColor: 'shadow-amber-500/30',
    emoji: '🥃'
  },
  '🍾 GIN': {
    icon: '🍾',
    color: 'from-blue-400 to-cyan-500',
    bgColor: 'bg-gradient-to-br from-blue-400/20 to-cyan-500/20',
    textColor: 'text-blue-100',
    glowColor: 'shadow-blue-400/30',
    emoji: '🍾'
  },
  '🍷 VINO': {
    icon: '🍷',
    color: 'from-purple-500 to-pink-600',
    bgColor: 'bg-gradient-to-br from-purple-500/20 to-pink-600/20',
    textColor: 'text-purple-100',
    glowColor: 'shadow-purple-500/30',
    emoji: '🍷'
  },
  '🍸 VODKA': {
    icon: '🍸',
    color: 'from-indigo-400 to-purple-500',
    bgColor: 'bg-gradient-to-br from-indigo-400/20 to-purple-500/20',
    textColor: 'text-indigo-100',
    glowColor: 'shadow-indigo-400/30',
    emoji: '🍸'
  },
  '🥃 LICOR': {
    icon: '🥃',
    color: 'from-red-500 to-pink-500',
    bgColor: 'bg-gradient-to-br from-red-500/20 to-pink-500/20',
    textColor: 'text-red-100',
    glowColor: 'shadow-red-500/30',
    emoji: '🥃'
  },
  '🍶 PISCO': {
    icon: '🍶',
    color: 'from-yellow-400 to-orange-500',
    bgColor: 'bg-gradient-to-br from-yellow-400/20 to-orange-500/20',
    textColor: 'text-yellow-100',
    glowColor: 'shadow-yellow-400/30',
    emoji: '🍶'
  },
  '🥃 RON': {
    icon: '🥃',
    color: 'from-amber-600 to-red-600',
    bgColor: 'bg-gradient-to-br from-amber-600/20 to-red-600/20',
    textColor: 'text-amber-100',
    glowColor: 'shadow-amber-600/30',
    emoji: '🥃'
  },
  '🥃 TEQUILA': {
    icon: '🥃',
    color: 'from-lime-400 to-green-500',
    bgColor: 'bg-gradient-to-br from-lime-400/20 to-green-500/20',
    textColor: 'text-lime-100',
    glowColor: 'shadow-lime-400/30',
    emoji: '🥃'
  },
  '🍺 CERVEZAS PERSONALES': {
    icon: '🍺',
    color: 'from-yellow-300 to-amber-400',
    bgColor: 'bg-gradient-to-br from-yellow-300/20 to-amber-400/20',
    textColor: 'text-yellow-100',
    glowColor: 'shadow-yellow-300/30',
    emoji: '🍺'
  },
  '🥤 BEBIDAS': {
    icon: '🥤',
    color: 'from-cyan-400 to-blue-500',
    bgColor: 'bg-gradient-to-br from-cyan-400/20 to-blue-500/20',
    textColor: 'text-cyan-100',
    glowColor: 'shadow-cyan-400/30',
    emoji: '🥤'
  },
  'ESPECIALES KTDral': {
    icon: '✨',
    color: 'from-pink-500 to-rose-600',
    bgColor: 'bg-gradient-to-br from-pink-500/20 to-rose-600/20',
    textColor: 'text-pink-100',
    glowColor: 'shadow-pink-500/30',
    emoji: '✨'
  },
  'JARRITAS DE CASA': {
    icon: '🏠',
    color: 'from-green-400 to-emerald-500',
    bgColor: 'bg-gradient-to-br from-green-400/20 to-emerald-500/20',
    textColor: 'text-green-100',
    glowColor: 'shadow-green-400/30',
    emoji: '🏠'
  },
  'CÓCTELES - DULCES': {
    icon: '🍭',
    color: 'from-pink-400 to-rose-500',
    bgColor: 'bg-gradient-to-br from-pink-400/20 to-rose-500/20',
    textColor: 'text-pink-100',
    glowColor: 'shadow-pink-400/30',
    emoji: '🍭'
  },
  'CÓCTELES - Tropicales': {
    icon: '🏝️',
    color: 'from-orange-400 to-yellow-500',
    bgColor: 'bg-gradient-to-br from-orange-400/20 to-yellow-500/20',
    textColor: 'text-orange-100',
    glowColor: 'shadow-orange-400/30',
    emoji: '🏝️'
  },
  'CÓCTELES - EXÓTICOS': {
    icon: '🌟',
    color: 'from-violet-400 to-purple-500',
    bgColor: 'bg-gradient-to-br from-violet-400/20 to-purple-500/20',
    textColor: 'text-violet-100',
    glowColor: 'shadow-violet-400/30',
    emoji: '🌟'
  },
  'CÓCTELES - SECOS': {
    icon: '🧊',
    color: 'from-slate-400 to-gray-500',
    bgColor: 'bg-gradient-to-br from-slate-400/20 to-gray-500/20',
    textColor: 'text-slate-100',
    glowColor: 'shadow-slate-400/30',
    emoji: '🧊'
  }
};

const defaultCategoryStyle = {
  icon: '🍹',
  color: 'from-gray-400 to-gray-500',
  bgColor: 'bg-gradient-to-br from-gray-400/20 to-gray-500/20',
  textColor: 'text-gray-100',
  glowColor: 'shadow-gray-400/30',
  emoji: '🍹'
};

// Función para parsear precios de la descripción
const parsePrices = (description: string, basePrice: number) => {
  if (!description) return null;
  let prices: { price1: number; label1: string; price2: number; label2: string } | null = null;

  // Formato 1: "S/ 250.00 / 30.00" (botella / copa)
  const slashMatch = description.match(/s\/\s*(\d+(?:\.\d{2})?)\s*\/\s*(\d+(?:\.\d{2})?)/i);
  if (slashMatch) {
    prices = {
      price1: parseFloat(slashMatch[1]),
      label1: 'Botella',
      price2: parseFloat(slashMatch[2]),
      label2: 'Copa'
    };
  }

  // Formato 2: "Copa: S/ 19.00 1 Lt: S/ 38.00" (copa / litro)
  const copaLitroMatch = description.match(/copa[:\s]*s\/\s*(\d+(?:\.\d{2})?)[\s\S]*?1\s*lt[:\s]*s\/\s*(\d+(?:\.\d{2})?)/i);
  if (copaLitroMatch) {
    prices = {
      price1: parseFloat(copaLitroMatch[2]),
      label1: 'Jarra 1Lt',
      price2: parseFloat(copaLitroMatch[1]),
      label2: 'Copa'
    };
  }

  // Formato 3: "Copa: S/ 20.00 1 Lt: S/ 42.00" (copa / litro - orden diferente)
  const litCopaMatch = description.match(/1\s*lt[:\s]*s\/\s*(\d+(?:\.\d{2})?)[\s\S]*?copa[:\s]*s\/\s*(\d+(?:\.\d{2})?)/i);
  if (litCopaMatch) {
    prices = {
      price1: parseFloat(litCopaMatch[1]),
      label1: 'Jarra 1Lt',
      price2: parseFloat(litCopaMatch[2]),
      label2: 'Copa'
    };
  }

  // Formato 4: "Botella: S/ 180.00 Copa: S/ 25.00"
  const bottleCupMatch = description.match(/botella[:\s]*s\/\s*(\d+(?:\.\d{2})?)[\s\S]*?copa[:\s]*s\/\s*(\d+(?:\.\d{2})?)/i);
  if (bottleCupMatch) {
    prices = {
      price1: parseFloat(bottleCupMatch[1]),
      label1: 'Botella',
      price2: parseFloat(bottleCupMatch[2]),
      label2: 'Copa'
    };
  }

  // Formato 5: "Shot: S/ 12.00" o similar (solo un precio adicional)
  const singleMatch = description.match(/(shot|copa|1\s*lt|jarra)[:\s]*s\/\s*(\d+(?:\.\d{2})?)/i);
  if (singleMatch && !prices) {
    const label = singleMatch[1].toLowerCase().includes('lt') || singleMatch[1].toLowerCase().includes('jarra') ? 'Jarra' : singleMatch[1];
    prices = {
      price1: basePrice,
      label1: basePrice > parseFloat(singleMatch[2]) ? 'Botella' : 'Unidad',
      price2: parseFloat(singleMatch[2]),
      label2: label.charAt(0).toUpperCase() + label.slice(1)
    };
  }

  // Si encontramos precios, ordenarlos por precio (menor primero)
  if (prices) {
    const sortedPrices = [prices.price1, prices.price2].sort((a, b) => a - b);
    const sortedLabels = sortedPrices[0] === prices.price1
      ? [prices.label1, prices.label2]
      : [prices.label2, prices.label1];

    return {
      primaryPrice: sortedPrices[0],
      primaryLabel: sortedLabels[0],
      secondaryPrice: sortedPrices[1],
      secondaryLabel: sortedLabels[1]
    };
  }

  return null;
};

function MenuPageContent() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableId, setTableId] = useState<string>("");
  const [locationId, setLocationId] = useState<string>("");
  const [orderNotes, setOrderNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderStatus, setOrderStatus] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [showCustomerNameModal, setShowCustomerNameModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string>("");
  const [partyMode, setPartyMode] = useState(false);
  const [numColumns, setNumColumns] = useState(2);
  const [mounted, setMounted] = useState(false);

  // Efecto para manejar la responsividad del Masonry
  useEffect(() => {
    setMounted(true);
    const updateColumns = () => {
      if (window.innerWidth >= 1280) setNumColumns(5);
      else if (window.innerWidth >= 1024) setNumColumns(4);
      else if (window.innerWidth >= 768) setNumColumns(3);
      else setNumColumns(2);
    };
    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  // Estadísticas de optimización (solo en desarrollo)
  const getImageStats = () => {
    const totalProducts = products.length;
    const productsWithImages = products.filter((p: Product) => p.featured && p.image).length;
    const featuredProducts = products.filter((p: Product) => p.featured).length;

    return {
      totalProducts,
      productsWithImages,
      featuredProducts,
      imageRatio: totalProducts > 0 ? (productsWithImages / totalProducts * 100).toFixed(1) : '0'
    };
  };

  const searchParams = useSearchParams();

  // Socket.IO para actualizaciones en tiempo real
  const { socket, isConnected } = useTableSocket(tableId);

  // Leer tableId y locationId desde URL parameters
  useEffect(() => {
    const tableParam = searchParams?.get('table');
    const locationParam = searchParams?.get('location');
    if (tableParam) {
      setTableId(tableParam);
    }
    if (locationParam) {
      setLocationId(locationParam);
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
    if (locationId && !tableId) {
      loadLocationData();
    }
  }, [locationId, tableId]);

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

  const loadLocationData = async () => {
    if (!locationId) return;

    try {
      // Cargar mesas de la ubicación
      const locationRes = await fetch(`/api/admin/service-points?locationId=${encodeURIComponent(locationId)}`);

      if (locationRes.ok) {
        const tablesData = await locationRes.json();
        setTables(tablesData.filter((table: any) => table.active));
      } else {
        console.error("Error loading location data:", locationRes.status);
      }
    } catch (error) {
      console.error("Error loading location data:", error);
    }
  };

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

        // Agregar información de productos destacados a las categorías para el indicador visual
        const categoriesWithProducts = categoriesData.map((category: Category) => ({
          ...category,
          products: productsData.filter((product: Product) => product.categoryId === category.id)
        }));

        setCategories(categoriesWithProducts);
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

  // Función para dispersar productos destacados con imagen
  const disperseFeatured = (items: Product[]) => {
    const featured = items.filter(p => p.featured && p.image);
    const others = items.filter(p => !(p.featured && p.image));
    
    if (featured.length === 0) return others;
    if (others.length === 0) return featured;

    const result: Product[] = [];
    // Calculamos cuántos productos normales poner entre cada destacado
    const step = Math.max(1, Math.floor(others.length / featured.length));
    
    let fIdx = 0;
    let oIdx = 0;

    while (oIdx < others.length || fIdx < featured.length) {
      // Agregar un bloque de productos normales
      for (let i = 0; i < step && oIdx < others.length; i++) {
        result.push(others[oIdx++]);
      }
      // Insertar un destacado
      if (fIdx < featured.length) {
        result.push(featured[fIdx++]);
      }
      // Si ya no hay más normales, agregar el resto de destacados (aunque queden juntos al final)
      if (oIdx >= others.length && fIdx < featured.length) {
        result.push(...featured.slice(fIdx));
        break;
      }
    }
    
    return result;
  };

  const filteredProducts = disperseFeatured(
    products
      .filter(product => product.categoryId === selectedCategory && product.available)
      .sort((a, b) => a.order - b.order)
  );

  // Dividir productos en columnas para efecto Masonry (balanceado por altura estimada)
  const columns: Product[][] = Array.from({ length: numColumns }, () => []);
  const columnHeights = Array.from({ length: numColumns }, () => 0);

  filteredProducts.forEach(product => {
    // Altura estimada: Destacado con imagen ~350, Normal ~150
    const estimatedHeight = (product.featured && product.image) ? 350 : 150;
    
    // Encontrar la columna más corta
    const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
    columns[shortestColumnIndex].push(product);
    columnHeights[shortestColumnIndex] += estimatedHeight;
  });

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

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
    } else {
      setCart(prevCart =>
        prevCart.map(item =>
          item.product.id === productId
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
    }
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const sendOrder = async () => {
    if (!customerName.trim()) {
      setShowCustomerNameModal(true);
      return;
    }

    setOrderSuccess(true);
  };

  const submitOrder = async () => {
    if (!tableId) {
      alert("❌ Selecciona una mesa/zona primero");
      return;
    }

    if (cart.length === 0) {
      alert("❌ Agrega productos al carrito primero");
      return;
    }

    setIsSubmitting(true);

    try {
      const orderData = {
        tableId,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          notes: item.notes || "",
          price: item.product.price
        })),
        total: getTotalPrice(),
        notes: orderNotes,
        customerName: customerName.trim()
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
        setLastOrderId(result.order.id);

        // Emitir evento de nuevo pedido via socket
        if (socket) {
          let locationName = "";
          const selectedTable = tables.find(t => t.id === tableId);
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

        // Limpiar carrito y mostrar modal de éxito
        setCart([]);
        setOrderNotes("");
        setOrderSuccess(false);
        setShowSuccessModal(true);
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-[#FF4D2E] border-t-transparent rounded-full mx-auto mb-4"
          />
          <div className="text-white text-xl font-bold">Cargando carta...</div>
          <div className="text-gray-400 text-sm mt-2">Preparando la fiesta 🎉</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white relative overflow-hidden">
      {/* Efectos de fondo para modo fiesta */}
      <AnimatePresence>
        {partyMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-0"
          >
            {/* Luces de discoteca animadas */}
            <div className="absolute top-10 left-10 w-4 h-4 bg-[#FF4D2E] rounded-full animate-ping opacity-60" />
            <div className="absolute top-20 right-20 w-3 h-3 bg-cyan-400 rounded-full animate-pulse opacity-60" />
            <div className="absolute bottom-32 left-1/4 w-2 h-2 bg-purple-400 rounded-full animate-bounce opacity-60" />
            <div className="absolute top-1/3 right-10 w-5 h-5 bg-pink-400 rounded-full animate-pulse opacity-40" />
            <div className="absolute bottom-20 right-1/3 w-3 h-3 bg-yellow-400 rounded-full animate-ping opacity-50" />

            {/* Partículas flotantes */}
            <div className="absolute inset-0">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-white rounded-full opacity-20"
                  animate={{
                    y: [0, -100, 0],
                    x: [0, Math.random() * 100 - 50, 0],
                    opacity: [0.2, 0.8, 0.2],
                  }}
                  transition={{
                    duration: Math.random() * 3 + 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                  }}
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {locationId && !tableId ? (
        /* Table Selection for Location */
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center p-4 relative z-10">
          <div className="max-w-4xl w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <h1 className="text-4xl font-bold bg-gradient-to-r from-[#FF4D2E] to-[#FF6B4A] bg-clip-text text-transparent mb-2">
                Selecciona tu Mesa
              </h1>
              <p className="text-gray-400">Elige tu zona para comenzar la fiesta 🎭</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tables.map((table, index) => (
                <motion.button
                  key={table.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setTableId(table.id)}
                  className="group relative bg-gradient-to-br from-gray-800/50 to-gray-900/50
                           hover:from-gray-700/50 hover:to-gray-800/50 border border-white/10
                           hover:border-[#FF4D2E]/50 rounded-2xl p-6 transition-all duration-300
                           backdrop-blur-sm overflow-hidden"
                >
                  {/* Efecto de luz */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent
                                translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

                  <div className="relative text-center">
                    <div className="text-4xl mb-4">
                      {table.type === 'TABLE' ? '🍽️' : table.type === 'BOX' ? '🏠' : '📍'}
                    </div>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-[#FF4D2E] transition-colors">
                      {table.name || `${table.type} ${table.number}`}
                    </h3>
                    <p className="text-gray-400 text-sm mb-3">
                      Capacidad: {table.capacity} personas
                    </p>
                    {table.location && (
                      <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
                        <span className="text-xs text-gray-300">{table.location.name}</span>
                      </div>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>

            {tables.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="text-6xl mb-4">🎭</div>
                <p className="text-gray-400 text-lg">No hay mesas disponibles en esta ubicación</p>
                <p className="text-gray-500 text-sm mt-2">Vuelve más tarde para la fiesta</p>
              </motion.div>
            )}
          </div>
        </div>
      ) : (
        /* Main Menu */
        <div className="relative z-10">
          {/* Header Mejorado */}
          <div className="sticky top-0 z-50 bg-gradient-to-r from-black via-gray-900 to-black
                          backdrop-blur-md border-b border-white/10 shadow-2xl">
            {/* Efectos de luz animados */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FF4D2E] to-transparent animate-pulse" />

            <div className="container mx-auto px-4 py-4 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                    className="w-12 h-12 bg-gradient-to-br from-[#FF4D2E] to-[#FF6B4A]
                               rounded-2xl flex items-center justify-center shadow-lg shadow-[#FF4D2E]/30"
                  >
                    <span className="text-2xl">🎭</span>
                  </motion.div>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                      El Lounge
                    </h1>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Discoteca & Bar
                    </p>
                  </div>
                </div>

                {/* Controles del header */}
                <div className="flex items-center gap-4">
                  {/* Botón modo fiesta */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setPartyMode(!partyMode)}
                    className={`p-2 rounded-xl transition-all duration-300 ${
                      partyMode
                        ? 'bg-gradient-to-r from-[#FF4D2E] to-[#FF6B4A] shadow-lg shadow-[#FF4D2E]/30'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <Sparkles className={`w-5 h-5 ${partyMode ? 'text-white' : 'text-gray-400'}`} />
                  </motion.button>

                  {/* Carrito mejorado */}
                  <div className="relative group">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      <ShoppingCart className="w-6 h-6" />
                      <AnimatePresence>
                        {getTotalItems() > 0 && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute -top-1 -right-1 bg-gradient-to-r from-[#FF4D2E] to-[#FF6B4A]
                                     text-white text-xs rounded-full w-6 h-6 flex items-center justify-center
                                     font-bold shadow-lg animate-bounce"
                          >
                            {getTotalItems()}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </div>

                  {/* Total */}
                  <div className="text-right hidden sm:block">
                    <div className="text-lg font-bold text-[#FF4D2E]">S/ {getTotalPrice().toFixed(2)}</div>
                    <div className="text-xs text-gray-400">{getTotalItems()} items</div>
                    {/* Estadísticas de optimización (solo desarrollo) */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="text-xs text-gray-500 mt-1">
                        📸 {getImageStats().productsWithImages}/{getImageStats().totalProducts} imgs
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Categories Mejoradas */}
          <div className="sticky top-20 z-40 bg-black/95 backdrop-blur-md border-b border-white/10 py-4">
            <div className="container mx-auto px-4">
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 md:justify-center">
                {categories
                  .filter(cat => cat.active)
                  .sort((a, b) => a.order - b.order)
                  .map((category, index) => {
                    const style = categoryStyles[category.name] || defaultCategoryStyle;
                    const isSelected = selectedCategory === category.id;

                    return (
                      <motion.button
                        key={category.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`relative flex-shrink-0 px-4 py-3 rounded-xl transition-all duration-300
                                 border backdrop-blur-sm overflow-hidden ${
                          isSelected
                            ? `bg-gradient-to-r ${style.color} shadow-2xl ${style.glowColor} border-white/20`
                            : `bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20`
                        }`}
                      >
                        {/* Efecto de selección */}
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute inset-0 bg-white/20 rounded-2xl"
                          />
                        )}

                        {/* Efecto de luz */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent
                                      translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

                        <div className="relative flex flex-col items-center gap-1">
                          <span className={`font-black text-xs text-center uppercase tracking-widest ${
                            isSelected ? 'text-white' : 'text-gray-400'
                          }`}>
                            {category.name.replace('CÓCTELES - ', '').replace('🍾 ', '').replace('🍷 ', '').replace('🍸 ', '').replace('🥃 ', '').replace('🍶 ', '').replace('🍺 ', '').replace('🥤 ', '')}
                          </span>

                          {/* Indicador de productos destacados con imagen */}
                          {products.some((p: Product) => p.categoryId === category.id && p.featured && p.image) && (
                            <motion.div
                              className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-500
                                         rounded-full flex items-center justify-center shadow-lg"
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              <Sparkles className="w-2 h-2 text-white" />
                            </motion.div>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Products Grid Mejorado - Masonry Dinámico y Responsivo */}
          <div className="container mx-auto px-3 py-4">
            <div className="flex gap-3">
              {mounted && columns.map((column, colIndex) => (
                <div key={colIndex} className="flex-1 flex flex-col gap-3">
                  <AnimatePresence mode="popLayout">
                    {column.map((product, index) => {
                      const cartItem = cart.find(item => item.product.id === product.id);
                      const prices = parsePrices(product.description || '', product.price);

                      return (
                        <motion.div
                          key={product.id}
                          layout
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ delay: index * 0.05 + colIndex * 0.02 }}
                          className="group relative bg-gradient-to-br from-gray-900/80 to-black/80
                                   backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden
                                   hover:border-[#FF4D2E]/50 hover:shadow-2xl hover:shadow-[#FF4D2E]/20
                                   transition-all duration-300 transform hover:scale-[1.02]"
                        >
                          {/* Efecto de luz animado */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent
                                        translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

                          {/* Imagen con overlay - Solo para destacados con imagen */}
                          {product.featured && product.image ? (
                            <div className="relative aspect-[4/5] overflow-hidden">
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                              {/* Badge de precio destacado - Solo si no hay precios múltiples */}
                              {!prices && (
                                <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-md border border-white/20
                                              text-white px-2 py-1 rounded-lg text-[10px] font-bold shadow-lg">
                                  S/ {product.price.toFixed(2)}
                                </div>
                              )}

                              {/* Icono de Destacado (Sparkle) */}
                              <div className="absolute top-2 left-2 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]">
                                <Sparkles className="w-4 h-4" />
                              </div>
                            </div>
                          ) : (
                            /* Si no es destacado o no tiene imagen, mostramos un indicador sutil si es destacado */
                            product.featured && (
                              <div className="absolute top-2 right-2 text-yellow-400/50">
                                <Sparkles className="w-3 h-3" />
                              </div>
                            )
                          )}

                          {/* Contenido */}
                          <div className="p-3">
                          <div className="flex flex-col gap-1 mb-3">
                            <h3 className="text-white font-bold text-[11px] leading-[1.2] group-hover:text-[#FF4D2E] transition-colors min-h-[2.4em] flex items-center">
                              <span>
                                {product.name}
                              </span>
                            </h3>
                            {/* Precio para productos sin imagen visual y sin precios múltiples */}
                            {!(product.featured && product.image) && !prices && product.price > 0 && (
                              <span className="text-[#FF4D2E] font-black text-xs">
                                S/ {product.price.toFixed(2)}
                              </span>
                            )}
                          </div>

                            {/* Precios adicionales si existen - Estilo Referencia */}
                            {prices && (
                              <div className="flex gap-1.5 mb-3">
                                <div className="flex-1 bg-white/5 rounded-xl px-1 py-2 text-center border border-white/10 backdrop-blur-sm">
                                  <div className="text-[8px] uppercase tracking-tighter text-gray-400 font-bold mb-0.5">{prices.primaryLabel}</div>
                                  <div className="text-[11px] font-black text-[#FF4D2E]">
                                    <span className="text-[9px] mr-0.5">S/</span>
                                    {prices.primaryPrice.toFixed(2)}
                                  </div>
                                </div>
                                {prices.secondaryPrice !== null && (
                                  <div className="flex-1 bg-white/5 rounded-xl px-1 py-2 text-center border border-white/10 backdrop-blur-sm">
                                    <div className="text-[8px] uppercase tracking-tighter text-gray-400 font-bold mb-0.5">{prices.secondaryLabel}</div>
                                    <div className="text-[11px] font-black text-[#FF4D2E]">
                                      <span className="text-[9px] mr-0.5">S/</span>
                                      {prices.secondaryPrice.toFixed(2)}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Controles de cantidad */}
                            <div className="flex items-center justify-between">
                              {cartItem ? (
                                <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 flex-1 border border-white/10">
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => updateQuantity(product.id, cartItem.quantity - 1)}
                                    className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center
                                             hover:bg-white/20 transition-colors"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </motion.button>
                                  <motion.span
                                    key={cartItem.quantity}
                                    initial={{ scale: 0.8 }}
                                    animate={{ scale: 1 }}
                                    className="flex-1 text-center font-bold text-xs"
                                  >
                                    {cartItem.quantity}
                                  </motion.span>
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => updateQuantity(product.id, cartItem.quantity + 1)}
                                    className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center
                                             hover:bg-white/20 transition-colors"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </motion.button>
                                </div>
                              ) : (
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => addToCart(product)}
                                  className="flex-1 bg-gradient-to-r from-[#FF4D2E] to-[#FF6B4A]
                                           hover:from-[#FF6B4A] hover:to-[#FF8A6A] text-white font-bold py-2 px-3
                                           rounded-xl transition-all duration-200 shadow-lg text-xs uppercase tracking-wider"
                                >
                                  Agregar
                                </motion.button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <div className="text-6xl mb-4">🍹</div>
                <h3 className="text-xl font-bold text-gray-400 mb-2">No hay productos disponibles</h3>
                <p className="text-gray-500">Selecciona otra categoría para continuar la fiesta</p>
              </motion.div>
            )}
          </div>

          {/* Cart Summary Mejorado */}
          <AnimatePresence>
            {cart.length > 0 && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black via-gray-900 to-transparent
                          backdrop-blur-md border-t border-white/10 p-4 shadow-2xl z-50"
              >
                <div className="container mx-auto">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-left">
                        <p className="text-white/70 text-sm">{getTotalItems()} productos</p>
                        <p className="text-xl font-bold text-[#FF4D2E]">Total: S/ {getTotalPrice().toFixed(2)}</p>
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={sendOrder}
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-[#FF4D2E] to-[#FF6B4A] hover:from-[#FF6B4A] hover:to-[#FF8A6A]
                               disabled:opacity-50 text-white px-8 py-4 rounded-2xl font-bold transition-all
                               duration-200 shadow-lg hover:shadow-xl transform hover:scale-105
                               flex items-center gap-2"
                    >
                      <span>Hacer Pedido</span>
                      <motion.div
                        animate={{ rotate: isSubmitting ? 360 : 0 }}
                        transition={{ duration: 1, repeat: isSubmitting ? Infinity : 0, ease: "linear" }}
                      >
                        🎉
                      </motion.div>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Order Modal Mejorado */}
          <AnimatePresence>
            {orderSuccess && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-3xl p-6 max-w-md w-full shadow-2xl"
                >
                  <div className="text-center mb-6">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 0.5, repeat: 2 }}
                      className="text-6xl mb-4"
                    >
                      🎭
                    </motion.div>
                    <h3 className="text-2xl font-bold text-white mb-2">Confirmar Pedido</h3>
                    <p className="text-gray-400">¡Último paso para la fiesta!</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Seleccionar Mesa/Zona
                      </label>
                      <select
                        value={tableId}
                        onChange={(e) => setTableId(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white
                                 placeholder-gray-400 focus:ring-2 focus:ring-[#FF4D2E] focus:border-transparent
                                 transition-all duration-200"
                        required
                      >
                        <option value="">Seleccionar mesa/zona...</option>
                        {tables.map((table) => (
                          <option key={table.id} value={table.id} className="bg-gray-800">
                            {table.type === 'TABLE' ? 'Mesa' :
                             table.type === 'BOX' ? 'Box' : 'Zona'} {table.number}
                            {table.name && ` - ${table.name}`}
                            {table.location && ` (${table.location.name})`}
                            {` - ${table.capacity} personas`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Notas adicionales (opcional)
                      </label>
                      <textarea
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        placeholder="Ej: Sin cebolla, extra queso..."
                        rows={3}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white
                                 placeholder-gray-400 focus:ring-2 focus:ring-[#FF4D2E] focus:border-transparent
                                 transition-all duration-200 resize-none"
                      />
                    </div>

                    {/* Customer Information */}
                    {customerName.trim() && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30
                                 rounded-xl p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-bold">
                                {customerName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-blue-100">Cliente: {customerName}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setCustomerName("")}
                            className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                          >
                            Cambiar
                          </button>
                        </div>
                      </motion.div>
                    )}

                    <div className="border-t border-white/10 pt-4">
                      <div className="flex justify-between text-sm text-gray-400 mb-4">
                        <span>{getTotalItems()} productos</span>
                        <span className="font-semibold text-[#FF4D2E]">S/ {getTotalPrice().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setOrderSuccess(false)}
                      className="flex-1 px-4 py-3 text-gray-300 border border-gray-600 rounded-xl
                               hover:bg-gray-800 transition-all duration-200 font-semibold"
                    >
                      Cancelar
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={submitOrder}
                      disabled={isSubmitting || !tableId}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-[#FF4D2E] to-[#FF6B4A] text-white
                               rounded-xl hover:from-[#FF6B4A] hover:to-[#FF8A6A] disabled:opacity-50
                               disabled:cursor-not-allowed transition-all duration-200 font-bold
                               shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                          />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <span>Confirmar Pedido</span>
                          <span>🎉</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Customer Name Modal Mejorado */}
          <AnimatePresence>
            {showCustomerNameModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-3xl p-6 max-w-md w-full shadow-2xl"
                >
                  <div className="text-center mb-6">
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="text-6xl mb-4"
                    >
                      🎭
                    </motion.div>
                    <h3 className="text-2xl font-bold text-white mb-2">Ingresa tu nombre</h3>
                    <p className="text-gray-400">Para identificarte cuando llegue tu pedido</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Tu nombre *
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Ej: Juan Pérez"
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white
                                 placeholder-gray-400 focus:ring-2 focus:ring-[#FF4D2E] focus:border-transparent
                                 transition-all duration-200"
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowCustomerNameModal(false)}
                      className="flex-1 px-4 py-2 text-gray-300 border border-gray-600 rounded-xl
                               hover:bg-gray-800 transition-all duration-200 font-semibold"
                    >
                      Cancelar
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (customerName.trim()) {
                          setShowCustomerNameModal(false);
                          sendOrder();
                        } else {
                          alert("Por favor ingresa tu nombre");
                        }
                      }}
                      disabled={!customerName.trim()}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-[#FF4D2E] to-[#FF6B4A] text-white
                               rounded-xl hover:from-[#FF6B4A] hover:to-[#FF8A6A] disabled:opacity-50
                               disabled:cursor-not-allowed transition-all duration-200 font-bold
                               shadow-lg hover:shadow-xl"
                    >
                      Continuar
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success Modal */}
          <SuccessModal
            isOpen={showSuccessModal}
            onClose={() => {
              setShowSuccessModal(false);
              setCustomerName("");
            }}
            title="¡Pedido enviado!"
            message="Tu pedido ha sido registrado exitosamente. Te notificaremos cuando esté listo."
            orderId={lastOrderId}
            autoCloseDelay={8000}
          />
        </div>
      )}
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-[#FF4D2E] border-t-transparent rounded-full mx-auto mb-4"
          />
          <div className="text-white text-xl font-bold">Cargando menú...</div>
        </div>
      </div>
    }>
      <MenuPageContent />
    </Suspense>
  );
}
