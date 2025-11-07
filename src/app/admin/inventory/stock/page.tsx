"use client";

import { useState, useEffect } from "react";
import { ActionButton } from "@/components";
import { AdminLayout } from "@/components/AdminLayout";

interface ProductVariant {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  multiplier: number;
  active: boolean;
}

interface Product {
  id: string;
  name: string;
  active: boolean;
  unitOfMeasure: {
    id: string;
    name: string;
    symbol: string;
  } | null;
  variants: ProductVariant[];
}

interface InventoryItem {
  id: string;
  productId: string;
  variantId: string | null;
  supplierId: string | null;
  quantity: number;
  currentStock: number;
  minStock: number;
  maxStock: number;
  location: string | null;
  batchNumber: string | null;
  expiryDate: string | null;
  costPrice: number;
  supplier: {
    id: string;
    name: string;
  } | null;
  product: {
    id: string;
    name: string;
    unitOfMeasure: {
      id: string;
      name: string;
      symbol: string;
    } | null;
  };
  variant: {
    id: string;
    name: string;
  } | null;
}

export default function StockPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    productId: "",
    variantId: "",
    supplierId: "",
    quantity: "",
    minStock: "",
    maxStock: "",
    unitOfMeasureId: "",
    location: "",
    batchNumber: "",
    expiryDate: "",
    costPrice: "",
  });

  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [units, setUnits] = useState<{ id: string; name: string; symbol: string }[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [inventoryRes, productsRes, suppliersRes, unitsRes] = await Promise.all([
        fetch("/api/inventory/items"),
        fetch("/api/menu/products"),
        fetch("/api/inventory/suppliers"),
        fetch("/api/inventory/units"),
      ]);

      if (inventoryRes.ok) {
        const inventoryData = await inventoryRes.json();
        setInventory(inventoryData);
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData);
      }

      if (suppliersRes.ok) {
        const suppliersData = await suppliersRes.json();
        setSuppliers(suppliersData);
      }

      if (unitsRes.ok) {
        const unitsData = await unitsRes.json();
        setUnits(unitsData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingItem ? "/api/inventory/items" : "/api/inventory/items";
      const method = editingItem ? "PUT" : "POST";
      const body = editingItem
        ? {
            id: editingItem.id,
            productId: formData.productId,
            variantId: formData.variantId || null,
            supplierId: formData.supplierId || null,
            currentStock: parseFloat(formData.quantity),
            costPrice: formData.costPrice ? parseFloat(formData.costPrice) : null,
            location: formData.location || null,
            batchNumber: formData.batchNumber || null,
            expiryDate: formData.expiryDate || null,
            minStock: formData.minStock ? parseFloat(formData.minStock) : 0,
            maxStock: formData.maxStock ? parseFloat(formData.maxStock) : null,
          }
        : {
            productId: formData.productId,
            variantId: formData.variantId || null,
            supplierId: formData.supplierId || null,
            quantity: parseFloat(formData.quantity),
            costPrice: formData.costPrice ? parseFloat(formData.costPrice) : null,
            location: formData.location || null,
            batchNumber: formData.batchNumber || null,
            expiryDate: formData.expiryDate || null,
            minStock: formData.minStock ? parseFloat(formData.minStock) : 0,
            maxStock: formData.maxStock ? parseFloat(formData.maxStock) : null,
          };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchData();
        setShowForm(false);
        setEditingItem(null);
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || "Error al guardar el item de inventario");
      }
    } catch (error) {
      console.error("Error saving inventory item:", error);
      alert("Error al guardar el item de inventario");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      productId: item.productId,
      variantId: item.variantId || "",
      supplierId: item.supplierId || "",
      quantity: item.currentStock.toString(),
      minStock: item.minStock?.toString() || "0",
      maxStock: item.maxStock?.toString() || "0",
      unitOfMeasureId: "",
      location: item.location || "",
      batchNumber: item.batchNumber || "",
      expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : "",
      costPrice: item.costPrice?.toString() || "0",
    });
    setShowForm(true);
  };

  const handleDelete = async (item: InventoryItem) => {
    const productName = item.variant ? `${item.product.name} (${item.variant.name})` : item.product.name;
    if (!confirm(`¿Estás seguro de que quieres eliminar el stock de "${productName}"?`)) {
      return;
    }

    try {
      const response = await fetch("/api/inventory/items", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: item.id }),
      });

      if (response.ok) {
        await fetchData();
      } else {
        const error = await response.json();
        alert(error.error || "Error al eliminar el item de inventario");
      }
    } catch (error) {
      console.error("Error deleting inventory item:", error);
      alert("Error al eliminar el item de inventario");
    }
  };

  const resetForm = () => {
    setFormData({
      productId: "",
      variantId: "",
      supplierId: "",
      quantity: "",
      minStock: "",
      maxStock: "",
      unitOfMeasureId: "",
      location: "",
      batchNumber: "",
      expiryDate: "",
      costPrice: "",
    });
  };

  const cancelEdit = () => {
    setShowForm(false);
    setEditingItem(null);
    resetForm();
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.currentStock <= (item.minStock || 0)) return { status: "low", color: "text-red-600", bg: "bg-red-100" };
    if (item.currentStock >= (item.maxStock || 0)) return { status: "high", color: "text-orange-600", bg: "bg-orange-100" };
    return { status: "normal", color: "text-green-600", bg: "bg-green-100" };
  };

  const selectedProduct = products.find(p => p.id === formData.productId);
  const availableVariants = selectedProduct?.variants || [];

  // Filtrar productos disponibles para agregar stock (solo cuando no se está editando)
  const availableProducts = editingItem
    ? products
    : products.filter(product =>
        !inventory.some(item => item.productId === product.id)
      );

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">Cargando inventario...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Control de Inventario</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Gestiona el stock de productos y recibe alertas
          </p>
        </div>
        <ActionButton
          onClick={() => setShowForm(true)}
          disabled={submitting}
        >
          Agregar Stock
        </ActionButton>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingItem ? "Editar Stock" : "Agregar Stock"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Producto *
                </label>
                <select
                  required
                  value={formData.productId}
                  onChange={(e) => {
                    setFormData({ ...formData, productId: e.target.value, variantId: "" });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                >
                  <option value="">
                    {editingItem ? "Seleccionar producto..." : "Seleccionar producto disponible..."}
                  </option>
                  {availableProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Variante
                </label>
                <select
                  value={formData.variantId}
                  onChange={(e) => setFormData({ ...formData, variantId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                  disabled={!selectedProduct || availableVariants.length === 0}
                >
                  <option value="">Sin variante</option>
                  {availableVariants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Proveedor
                </label>
                <select
                  value={formData.supplierId}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                >
                  <option value="">Sin proveedor</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Cantidad *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Unidad de Medida
                </label>
                <select
                  value={formData.unitOfMeasureId}
                  onChange={(e) => setFormData({ ...formData, unitOfMeasureId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                >
                  <option value="">
                    {selectedProduct?.unitOfMeasure
                      ? `Usar del producto: ${selectedProduct.unitOfMeasure.name} (${selectedProduct.unitOfMeasure.symbol})`
                      : 'Seleccionar unidad...'
                    }
                  </option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} ({unit.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Precio de Costo
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Stock Mínimo
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Stock Máximo
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.maxStock}
                  onChange={(e) => setFormData({ ...formData, maxStock: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Lote
                </label>
                <input
                  type="text"
                  value={formData.batchNumber}
                  onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                  placeholder="Número de lote"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Fecha de Vencimiento
                </label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Ubicación
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                  placeholder="ej: Estante A-1"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary disabled:opacity-50"
              >
                {submitting ? "Guardando..." : (editingItem ? "Actualizar" : "Agregar")} Stock
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="btn btn-secondary"
                disabled={submitting}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Proveedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Lote
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Vencimiento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {inventory.map((item) => {
                const stockStatus = getStockStatus(item);
                const productName = item.variant
                  ? `${item.product.name} (${item.variant.name})`
                  : item.product.name;

                return (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        {productName}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-300">
                        {item.product?.unitOfMeasure?.symbol || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        {item.currentStock}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-300">
                        Min: {item.minStock} | Max: {item.maxStock}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.bg} ${stockStatus.color}`}>
                        {stockStatus.status === "low" && "Stock Bajo"}
                        {stockStatus.status === "high" && "Stock Alto"}
                        {stockStatus.status === "normal" && "Normal"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-500 dark:text-slate-300">
                        {item.supplier?.name || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-500 dark:text-slate-300">
                        {item.batchNumber || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-500 dark:text-slate-300">
                        {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {inventory.length === 0 && (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            No hay items en inventario
          </div>
        )}
      </div>
    </div>
    </AdminLayout>
  );
}
