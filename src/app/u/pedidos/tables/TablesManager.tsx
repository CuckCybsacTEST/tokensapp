"use client";

import { useState, useEffect } from "react";

interface Table {
  id: string;
  number: number;
  name: string | null;
  zone: string | null;
  capacity: number;
  active: boolean;
  qrCode: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    orders: number;
  };
}

export default function TablesManager() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [formData, setFormData] = useState({
    number: "",
    name: "",
    zone: "",
    capacity: "4",
    qrCode: "",
  });

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const response = await fetch("/api/tables");
      if (response.ok) {
        const data = await response.json();
        setTables(data);
      }
    } catch (error) {
      console.error("Error fetching tables:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingTable ? "/api/tables" : "/api/tables";
      const method = editingTable ? "PUT" : "POST";
      const body = editingTable
        ? { ...formData, id: editingTable.id, number: parseInt(formData.number), capacity: parseInt(formData.capacity) }
        : { ...formData, number: parseInt(formData.number), capacity: parseInt(formData.capacity) };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchTables();
        setShowForm(false);
        setEditingTable(null);
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || "Error al guardar la mesa");
      }
    } catch (error) {
      console.error("Error saving table:", error);
      alert("Error al guardar la mesa");
    }
  };

  const handleEdit = (table: Table) => {
    setEditingTable(table);
    setFormData({
      number: table.number.toString(),
      name: table.name || "",
      zone: table.zone || "",
      capacity: table.capacity.toString(),
      qrCode: table.qrCode || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (table: Table) => {
    if (!confirm(`¿Estás seguro de que quieres desactivar la mesa ${table.number}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/tables?id=${table.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchTables();
      } else {
        const error = await response.json();
        alert(error.error || "Error al desactivar la mesa");
      }
    } catch (error) {
      console.error("Error deleting table:", error);
      alert("Error al desactivar la mesa");
    }
  };

  const resetForm = () => {
    setFormData({
      number: "",
      name: "",
      zone: "",
      capacity: "4",
      qrCode: "",
    });
  };

  const cancelEdit = () => {
    setShowForm(false);
    setEditingTable(null);
    resetForm();
  };

  if (loading) {
    return <div>Cargando mesas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Mesas ({tables.length})</h2>
        <button
          onClick={() => setShowForm(true)}
          className="btn btn-primary"
        >
          Agregar Mesa
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingTable ? "Editar Mesa" : "Nueva Mesa"}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Número de Mesa *
                </label>
                <input
                  type="number"
                  required
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Nombre (opcional)
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ej: Terraza 01"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Zona (opcional)
                </label>
                <input
                  type="text"
                  value={formData.zone}
                  onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                  placeholder="ej: Terraza, VIP, Barra"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Capacidad
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Código QR (opcional)
              </label>
              <input
                type="url"
                value={formData.qrCode}
                onChange={(e) => setFormData({ ...formData, qrCode: e.target.value })}
                placeholder="URL del código QR"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
              />
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                {editingTable ? "Actualizar" : "Crear"} Mesa
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="btn btn-secondary"
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
                  Número
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Zona
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Capacidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Pedidos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {tables.map((table) => (
                <tr key={table.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {table.number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {table.name || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {table.zone || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {table.capacity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      table.active
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    }`}>
                      {table.active ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {table._count.orders}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => handleEdit(table)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Editar
                    </button>
                    {table.active && (
                      <button
                        onClick={() => handleDelete(table)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Desactivar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {tables.length === 0 && (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            No hay mesas registradas
          </div>
        )}
      </div>
    </div>
  );
}
