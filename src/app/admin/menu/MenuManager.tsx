"use client";

import { useState, useEffect } from "react";
import { Button, ActionButton, QuickActionButton } from "../../../components";

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  order: number;
  active: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  basePrice: number | null;
  image: string | null;
  categoryId: string;
  featured: boolean;
  order: number;
  available: boolean;
  category: {
    id: string;
    name: string;
  };
}

interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  multiplier: number;
  sku: string | null;
  barcode: string | null;
  active: boolean;
  product: {
    id: string;
    name: string;
  };
}

export default function MenuManager() {
  const [activeTab, setActiveTab] = useState<"categories" | "products" | "variants">("categories");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [submittingCategory, setSubmittingCategory] = useState(false);
  const [submittingProduct, setSubmittingProduct] = useState(false);
  const [submittingVariant, setSubmittingVariant] = useState(false);

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    icon: "",
    order: "0",
  });

  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: "",
    image: "",
    categoryId: "",
    featured: false,
    order: "0",
  });

  const [variantForm, setVariantForm] = useState({
    productId: "",
    name: "",
    multiplier: "1.0",
    sku: "",
    barcode: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [categoriesRes, productsRes, variantsRes] = await Promise.all([
        fetch("/api/menu/categories"),
        fetch("/api/menu/products"),
        fetch("/api/menu/variants"),
      ]);

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData);
      }

      if (variantsRes.ok) {
        const variantsData = await variantsRes.json();
        setVariants(variantsData);
      }
    } catch (error) {
      console.error("Error fetching menu data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Category handlers
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCategory(true);

    try {
      const url = editingCategory ? "/api/menu/categories" : "/api/menu/categories";
      const method = editingCategory ? "PUT" : "POST";
      const body = editingCategory
        ? { ...categoryForm, id: editingCategory.id, order: parseInt(categoryForm.order) }
        : { ...categoryForm, order: parseInt(categoryForm.order) };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchData();
        setShowCategoryForm(false);
        setEditingCategory(null);
        resetCategoryForm();
      } else {
        const error = await response.json();
        alert(error.error || "Error al guardar la categoría");
      }
    } catch (error) {
      console.error("Error saving category:", error);
      alert("Error al guardar la categoría");
    } finally {
      setSubmittingCategory(false);
    }
  };

  const handleCategoryEdit = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || "",
      icon: category.icon || "",
      order: category.order.toString(),
    });
    setShowCategoryForm(true);
  };

  const handleCategoryDelete = async (category: Category) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la categoría "${category.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/menu/categories/${category.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchData();
      } else {
        const error = await response.json();
        alert(error.error || "Error al eliminar la categoría");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      alert("Error al eliminar la categoría");
    }
  };

  // Product handlers
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingProduct ? "/api/menu/products" : "/api/menu/products";
      const method = editingProduct ? "PUT" : "POST";
      const body = editingProduct
        ? {
            ...productForm,
            id: editingProduct.id,
            price: parseFloat(productForm.price),
            order: parseInt(productForm.order),
            featured: productForm.featured,
          }
        : {
            ...productForm,
            price: parseFloat(productForm.price),
            order: parseInt(productForm.order),
            featured: productForm.featured,
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
        setShowProductForm(false);
        setEditingProduct(null);
        resetProductForm();
      } else {
        const error = await response.json();
        alert(error.error || "Error al guardar el producto");
      }
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Error al guardar el producto");
    }
  };

  const handleProductEdit = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      image: product.image || "",
      categoryId: product.categoryId,
      featured: product.featured,
      order: product.order.toString(),
    });
    setShowProductForm(true);
  };

  const handleProductToggle = async (product: Product) => {
    try {
      const response = await fetch("/api/menu/products", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: product.id,
          available: !product.available,
        }),
      });

      if (response.ok) {
        await fetchData();
      } else {
        const error = await response.json();
        alert(error.error || "Error al cambiar el estado del producto");
      }
    } catch (error) {
      console.error("Error toggling product:", error);
      alert("Error al cambiar el estado del producto");
    }
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: "",
      description: "",
      icon: "",
      order: "0",
    });
  };

  const resetProductForm = () => {
    setProductForm({
      name: "",
      description: "",
      price: "",
      image: "",
      categoryId: "",
      featured: false,
      order: "0",
    });
  };

  const cancelCategoryEdit = () => {
    setShowCategoryForm(false);
    setEditingCategory(null);
    resetCategoryForm();
  };

  const cancelProductEdit = () => {
    setShowProductForm(false);
    setEditingProduct(null);
    resetProductForm();
  };

  const handleProductDelete = async (product: Product) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el producto "${product.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/menu/products/${product.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchData();
      } else {
        const error = await response.json();
        alert(error.error || "Error al eliminar el producto");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Error al eliminar el producto");
    }
  };

  // Variant handlers
  const handleVariantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingVariant(true);

    try {
      const method = editingVariant ? "PUT" : "POST";
      const body = editingVariant
        ? { ...variantForm, id: editingVariant.id, active: true }
        : { ...variantForm, active: true };

      const response = await fetch("/api/menu/variants", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchData();
        setShowVariantForm(false);
        setEditingVariant(null);
        resetVariantForm();
      } else {
        const error = await response.json();
        alert(error.error || "Error al guardar la variante");
      }
    } catch (error) {
      console.error("Error saving variant:", error);
      alert("Error al guardar la variante");
    } finally {
      setSubmittingVariant(false);
    }
  };

  const handleVariantEdit = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setVariantForm({
      productId: variant.productId,
      name: variant.name,
      multiplier: variant.multiplier.toString(),
      sku: variant.sku || "",
      barcode: variant.barcode || "",
    });
    setShowVariantForm(true);
  };

  const handleVariantDelete = async (variant: ProductVariant) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la variante "${variant.name}"?`)) {
      return;
    }

    try {
      const response = await fetch("/api/menu/variants", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: variant.id, active: false }),
      });

      if (response.ok) {
        await fetchData();
      } else {
        const error = await response.json();
        alert(error.error || "Error al eliminar la variante");
      }
    } catch (error) {
      console.error("Error deleting variant:", error);
      alert("Error al eliminar la variante");
    }
  };

  const resetVariantForm = () => {
    setVariantForm({
      productId: "",
      name: "",
      multiplier: "1.0",
      sku: "",
      barcode: "",
    });
  };

  const cancelVariantEdit = () => {
    setShowVariantForm(false);
    setEditingVariant(null);
    resetVariantForm();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="text-gray-600 dark:text-gray-400 text-lg">Cargando gestión de menú...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-gray-900 dark:text-white">
      {/* Tabs - Responsive */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="-mb-px flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-8">
          <Button
            onClick={() => setActiveTab("categories")}
            variant={activeTab === "categories" ? "primary" : "outline"}
            size="sm"
            className="w-full sm:w-auto border-b-2 border-transparent px-4 py-2 text-sm font-medium transition-colors"
          >
            Categorías ({categories.length})
          </Button>
          <Button
            onClick={() => setActiveTab("products")}
            variant={activeTab === "products" ? "primary" : "outline"}
            size="sm"
            className="w-full sm:w-auto border-b-2 border-transparent px-4 py-2 text-sm font-medium transition-colors"
          >
            Productos ({products.length})
          </Button>
          <Button
            onClick={() => setActiveTab("variants")}
            variant={activeTab === "variants" ? "primary" : "outline"}
            size="sm"
            className="w-full sm:w-auto border-b-2 border-transparent px-4 py-2 text-sm font-medium transition-colors"
          >
            Variantes ({variants.length})
          </Button>
        </nav>
      </div>

      {/* Categories Tab */}
      {activeTab === "categories" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Categorías
            </h2>
            <ActionButton
              onClick={() => setShowCategoryForm(true)}
              className="w-full sm:w-auto px-4 py-2"
            >
              + Agregar Categoría
            </ActionButton>
          </div>

          {showCategoryForm && (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingCategory ? "Editar Categoría" : "Nueva Categoría"}
              </h3>

              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      required
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Orden
                    </label>
                    <input
                      type="number"
                      value={categoryForm.order}
                      onChange={(e) => setCategoryForm({ ...categoryForm, order: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Icono (opcional)
                  </label>
                  <input
                    type="text"
                    value={categoryForm.icon}
                    onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                    placeholder="Nombre del icono"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                  />
                </div>

                <div className="flex gap-2">
                  <ActionButton
                    onClick={() => {}}
                    loading={submittingCategory}
                    className="px-4 py-2"
                  >
                    <button type="submit" className="hidden" />
                    {editingCategory ? "Actualizar" : "Crear"} Categoría
                  </ActionButton>
                  <Button
                    type="button"
                    onClick={cancelCategoryEdit}
                    variant="outline"
                    className="px-4 py-2"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Categories List - Responsive */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      Orden
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {categories.map((category) => (
                    <tr key={category.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {category.name}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {category.description || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {category.order}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          category.active
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}>
                          {category.active ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <QuickActionButton
                          onClick={() => handleCategoryEdit(category)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Editar
                        </QuickActionButton>
                        <QuickActionButton
                          onClick={() => handleCategoryDelete(category)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Eliminar
                        </QuickActionButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden">
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {categories.map((category) => (
                  <div key={category.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {category.name}
                      </h3>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        category.active
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }`}>
                        {category.active ? "Activa" : "Inactiva"}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-4">
                      <p><span className="font-medium">Descripción:</span> {category.description || "Sin descripción"}</p>
                      <p><span className="font-medium">Orden:</span> {category.order}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleCategoryEdit(category)}
                        className="flex-1 min-w-0 px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleCategoryDelete(category)}
                        className="flex-1 min-w-0 px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900 dark:hover:bg-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {categories.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 100 4 2 2 0 000-4zm0 0a2 2 0 110-4 2 2 0 010 4zm0 0V7m6 0v10m0-10a2 2 0 10-4 0 2 2 0 004 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  No hay categorías registradas
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Comienza creando tu primera categoría para organizar productos.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === "products" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Productos
            </h2>
            <ActionButton
              onClick={() => setShowProductForm(true)}
              className="w-full sm:w-auto px-4 py-2"
            >
              + Agregar Producto
            </ActionButton>
          </div>

          {showProductForm && (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingProduct ? "Editar Producto" : "Nuevo Producto"}
              </h3>

              <form onSubmit={handleProductSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      required
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Precio *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Categoría *
                    </label>
                    <select
                      required
                      value={productForm.categoryId}
                      onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                    >
                      <option value="">Seleccionar categoría</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Orden
                    </label>
                    <input
                      type="number"
                      value={productForm.order}
                      onChange={(e) => setProductForm({ ...productForm, order: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Imagen (opcional)
                  </label>
                  <input
                    type="url"
                    value={productForm.image}
                    onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                    placeholder="URL de la imagen"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="featured"
                    checked={productForm.featured}
                    onChange={(e) => setProductForm({ ...productForm, featured: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                  />
                  <label htmlFor="featured" className="ml-2 block text-sm">
                    Producto destacado
                  </label>
                </div>

                <div className="flex gap-2">
                  <button type="submit" className="btn btn-primary">
                    {editingProduct ? "Actualizar" : "Crear"} Producto
                  </button>
                  <button
                    type="button"
                    onClick={cancelProductEdit}
                    className="btn btn-secondary"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Products List - Responsive */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      Categoría
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      Precio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      Destacado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      Disponible
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {product.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {product.category.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        ${product.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {product.featured && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                            Destacado
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleProductToggle(product)}
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            product.available
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          }`}
                        >
                          {product.available ? "Disponible" : "No disponible"}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => handleProductEdit(product)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleProductDelete(product)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden">
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {products.map((product) => (
                  <div key={product.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        {product.featured && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                            Destacado
                          </span>
                        )}
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          product.available
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}>
                          {product.available ? "Disponible" : "No disponible"}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-4">
                      <p><span className="font-medium">Categoría:</span> {product.category.name}</p>
                      <p><span className="font-medium">Precio:</span> ${product.price.toFixed(2)}</p>
                      {product.description && (
                        <p><span className="font-medium">Descripción:</span> {product.description}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleProductToggle(product)}
                        className={`flex-1 min-w-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          product.available
                            ? "bg-red-50 hover:bg-red-100 dark:bg-red-900 dark:hover:bg-red-800 text-red-700 dark:text-red-300"
                            : "bg-green-50 hover:bg-green-100 dark:bg-green-900 dark:hover:bg-green-800 text-green-700 dark:text-green-300"
                        }`}
                      >
                        {product.available ? "Marcar no disponible" : "Marcar disponible"}
                      </button>
                      <button
                        onClick={() => handleProductEdit(product)}
                        className="flex-1 min-w-0 px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleProductDelete(product)}
                        className="flex-1 min-w-0 px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900 dark:hover:bg-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {products.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  No hay productos registrados
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Comienza creando tu primer producto para el menú.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Variants Tab */}
      {activeTab === "variants" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Variantes de Productos
            </h2>
            <ActionButton
              onClick={() => setShowVariantForm(true)}
              className="w-full sm:w-auto px-4 py-2"
            >
              + Agregar Variante
            </ActionButton>
          </div>

          {showVariantForm && (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingVariant ? "Editar Variante" : "Nueva Variante"}
              </h3>

              <form onSubmit={handleVariantSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Producto *
                    </label>
                    <select
                      required
                      value={variantForm.productId}
                      onChange={(e) => setVariantForm({ ...variantForm, productId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                    >
                      <option value="">Seleccionar producto...</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Nombre de la variante *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ej: 250ml, Copa, Botella"
                      value={variantForm.name}
                      onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Multiplicador de precio
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={variantForm.multiplier}
                      onChange={(e) => setVariantForm({ ...variantForm, multiplier: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      1.0 = precio base, 2.0 = doble precio
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      SKU (opcional)
                    </label>
                    <input
                      type="text"
                      value={variantForm.sku}
                      onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Código de barras (opcional)
                    </label>
                    <input
                      type="text"
                      value={variantForm.barcode}
                      onChange={(e) => setVariantForm({ ...variantForm, barcode: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button type="submit" className="btn btn-primary">
                    {editingVariant ? "Actualizar" : "Crear"} Variante
                  </button>
                  <button
                    type="button"
                    onClick={cancelVariantEdit}
                    className="btn btn-secondary"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Variants List - Responsive */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      Variante
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      Multiplicador
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {variants.map((variant) => (
                    <tr key={variant.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                        {variant.product.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-300">
                        {variant.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-300">
                        {variant.multiplier}x
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-300">
                        {variant.sku || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => handleVariantEdit(variant)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleVariantDelete(variant)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden">
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {variants.map((variant) => (
                  <div key={variant.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {variant.name}
                      </h3>
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {variant.multiplier}x
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-4">
                      <p><span className="font-medium">Producto:</span> {variant.product.name}</p>
                      {variant.sku && <p><span className="font-medium">SKU:</span> {variant.sku}</p>}
                      {variant.barcode && <p><span className="font-medium">Código de barras:</span> {variant.barcode}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleVariantEdit(variant)}
                        className="flex-1 min-w-0 px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleVariantDelete(variant)}
                        className="flex-1 min-w-0 px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900 dark:hover:bg-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {variants.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  No hay variantes registradas
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Crea variantes para productos con diferentes tamaños o presentaciones.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
