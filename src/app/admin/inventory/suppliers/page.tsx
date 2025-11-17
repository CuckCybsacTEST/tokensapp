"use client";

import { useState, useEffect } from "react";
import { Button, ActionButton } from "@/components";
import { AdminLayout } from "@/components/AdminLayout";

interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch("/api/inventory/suppliers");
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data);
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingSupplier ? "/api/inventory/suppliers" : "/api/inventory/suppliers";
      const method = editingSupplier ? "PUT" : "POST";
      const body = editingSupplier
        ? { ...formData, id: editingSupplier.id, active: true }
        : { ...formData, active: true };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchSuppliers();
        setShowForm(false);
        setEditingSupplier(null);
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || "Error al guardar el proveedor");
      }
    } catch (error) {
      console.error("Error saving supplier:", error);
      alert("Error al guardar el proveedor");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contactName: supplier.contactName || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (supplier: Supplier) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el proveedor "${supplier.name}"?`)) {
      return;
    }

    try {
      const response = await fetch("/api/inventory/suppliers", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: supplier.id, active: false }),
      });

      if (response.ok) {
        await fetchSuppliers();
      } else {
        const error = await response.json();
        alert(error.error || "Error al eliminar el proveedor");
      }
    } catch (error) {
      console.error("Error deleting supplier:", error);
      alert("Error al eliminar el proveedor");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      contactName: "",
      email: "",
      phone: "",
      address: "",
    });
  };

  const cancelEdit = () => {
    setShowForm(false);
    setEditingSupplier(null);
    resetForm();
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">Cargando proveedores...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Gestión de Proveedores</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Administra los proveedores de tu restaurante
          </p>
        </div>
        <ActionButton
          onClick={() => setShowForm(true)}
          disabled={submitting}
          className="w-full sm:w-auto"
        >
          Agregar Proveedor
        </ActionButton>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
          <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-slate-100">
            {editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                  Nombre del Proveedor *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ej: Distribuidora XYZ"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                  Nombre de Contacto
                </label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ej: Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="contacto@proveedor.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+54 11 1234-5678"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                  Dirección
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Dirección completa del proveedor"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-md disabled:opacity-50 transition-colors"
              >
                {submitting ? "Guardando..." : (editingSupplier ? "Actualizar" : "Crear")} Proveedor
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="w-full sm:w-auto px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 rounded-md disabled:opacity-50 transition-colors"
                disabled={submitting}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vista móvil: tarjetas */}
      <div className="md:hidden space-y-4">
        {suppliers.map((supplier) => (
          <div key={supplier.id} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {supplier.name}
                </h3>
                {supplier.contactName && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Contacto: {supplier.contactName}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2 text-sm">
              {supplier.email && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400">📧</span>
                  <span className="text-slate-700 dark:text-slate-300">{supplier.email}</span>
                </div>
              )}
              {supplier.phone && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400">📞</span>
                  <span className="text-slate-700 dark:text-slate-300">{supplier.phone}</span>
                </div>
              )}
              {supplier.address && (
                <div className="flex items-start gap-2">
                  <span className="text-slate-500 dark:text-slate-400 mt-0.5">📍</span>
                  <span className="text-slate-700 dark:text-slate-300">{supplier.address}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => handleEdit(supplier)}
                className="flex-1 px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md transition-colors"
              >
                Editar
              </button>
              <button
                onClick={() => handleDelete(supplier)}
                className="flex-1 px-3 py-2 text-sm bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla desktop */}
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Proveedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Contacto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Teléfono
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                      {supplier.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-500 dark:text-slate-300">
                      {supplier.contactName || "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-500 dark:text-slate-300">
                      {supplier.email || "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-500 dark:text-slate-300">
                      {supplier.phone || "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => handleEdit(supplier)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(supplier)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {suppliers.length === 0 && (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          No hay proveedores registrados
        </div>
      )}
    </AdminLayout>
  );
}
