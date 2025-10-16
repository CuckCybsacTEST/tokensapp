"use client";

import { useState, useEffect } from "react";
import { ActionButton } from "@/components";

interface UnitOfMeasure {
  id: string;
  name: string;
  symbol: string;
  category: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function UnitsPage() {
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitOfMeasure | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    category: "weight",
  });

  const categories = [
    { value: "weight", label: "Peso" },
    { value: "volume", label: "Volumen" },
    { value: "count", label: "Unidad" },
    { value: "length", label: "Longitud" },
  ];

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      const response = await fetch("/api/inventory/units");
      if (response.ok) {
        const data = await response.json();
        setUnits(data);
      }
    } catch (error) {
      console.error("Error fetching units:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingUnit ? "/api/inventory/units" : "/api/inventory/units";
      const method = editingUnit ? "PUT" : "POST";
      const body = editingUnit
        ? { ...formData, id: editingUnit.id, active: true }
        : { ...formData, active: true };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchUnits();
        setShowForm(false);
        setEditingUnit(null);
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || "Error al guardar la unidad");
      }
    } catch (error) {
      console.error("Error saving unit:", error);
      alert("Error al guardar la unidad");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (unit: UnitOfMeasure) => {
    setEditingUnit(unit);
    setFormData({
      name: unit.name,
      symbol: unit.symbol,
      category: unit.category,
    });
    setShowForm(true);
  };

  const handleDelete = async (unit: UnitOfMeasure) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la unidad "${unit.name}"?`)) {
      return;
    }

    try {
      const response = await fetch("/api/inventory/units", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: unit.id, active: false }),
      });

      if (response.ok) {
        await fetchUnits();
      } else {
        const error = await response.json();
        alert(error.error || "Error al eliminar la unidad");
      }
    } catch (error) {
      console.error("Error deleting unit:", error);
      alert("Error al eliminar la unidad");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      symbol: "",
      category: "weight",
    });
  };

  const cancelEdit = () => {
    setShowForm(false);
    setEditingUnit(null);
    resetForm();
  };

  const getCategoryLabel = (category: string) => {
    return categories.find(cat => cat.value === category)?.label || category;
  };

  if (loading) {
    return <div className="p-6">Cargando unidades...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Unidades de Medida</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Gestiona las unidades de medida para productos
          </p>
        </div>
        <ActionButton
          onClick={() => setShowForm(true)}
          disabled={submitting}
        >
          Agregar Unidad
        </ActionButton>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingUnit ? "Editar Unidad" : "Nueva Unidad"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                  placeholder="ej: Kilogramo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Símbolo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                  placeholder="ej: kg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Categoría *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                >
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary disabled:opacity-50"
              >
                {submitting ? "Guardando..." : (editingUnit ? "Actualizar" : "Crear")} Unidad
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
                  Unidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Símbolo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {units.map((unit) => (
                <tr key={unit.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                      {unit.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-500 dark:text-slate-300">
                      {unit.symbol}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-500 dark:text-slate-300">
                      {getCategoryLabel(unit.category)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => handleEdit(unit)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(unit)}
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

        {units.length === 0 && (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            No hay unidades registradas
          </div>
        )}
      </div>
    </div>
  );
}