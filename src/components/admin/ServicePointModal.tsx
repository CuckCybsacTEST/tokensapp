"use client";

import { useState, useEffect } from "react";

enum ServicePointType {
  TABLE = "TABLE",
  BOX = "BOX",
  ZONE = "ZONE"
}

interface ServicePointData {
  id?: string;
  locationId: string;
  number: string;
  name?: string;
  type: ServicePointType;
  capacity: number;
  active: boolean;
  positionX?: number;
  positionY?: number;
  qrCode?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ServicePointModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (servicePoint: Partial<ServicePointData>) => Promise<void>;
  servicePoint?: ServicePointData | null;
  locationId: string;
  title: string;
}

export default function ServicePointModal({
  isOpen,
  onClose,
  onSave,
  servicePoint,
  locationId,
  title
}: ServicePointModalProps) {
  const [formData, setFormData] = useState({
    locationId: "",
    number: "",
    name: "",
    type: ServicePointType.TABLE,
    capacity: 4,
    active: true,
    positionX: "",
    positionY: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (servicePoint) {
      setFormData({
        locationId: servicePoint.locationId,
        number: servicePoint.number,
        name: servicePoint.name || "",
        type: servicePoint.type,
        capacity: servicePoint.capacity,
        active: servicePoint.active,
        positionX: servicePoint.positionX?.toString() || "",
        positionY: servicePoint.positionY?.toString() || ""
      });
    } else {
      setFormData({
        locationId,
        number: "",
        name: "",
        type: ServicePointType.TABLE,
        capacity: 4,
        active: true,
        positionX: "",
        positionY: ""
      });
    }
    setError("");
  }, [servicePoint, locationId, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validaciones básicas
      if (!formData.number.trim()) {
        throw new Error("El número/identificador es obligatorio");
      }

      const dataToSave = {
        ...formData,
        locationId,
        capacity: Math.max(1, formData.capacity),
        positionX: formData.positionX ? parseInt(formData.positionX) : undefined,
        positionY: formData.positionY ? parseInt(formData.positionY) : undefined
      };

      await onSave(dataToSave);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const getServicePointTypeLabel = (type: ServicePointType) => {
    switch (type) {
      case ServicePointType.TABLE: return "Mesa";
      case ServicePointType.BOX: return "Box";
      case ServicePointType.ZONE: return "Zona";
      default: return type;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Número/Identificador *
            </label>
            <input
              type="text"
              value={formData.number}
              onChange={(e) => setFormData({ ...formData, number: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="Ej: 01, VIP-01, Box-01..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Nombre descriptivo (opcional)
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="Ej: Mesa ventana, Box privado..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Tipo *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as ServicePointType })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            >
              <option value={ServicePointType.TABLE}>Mesa</option>
              <option value={ServicePointType.BOX}>Box</option>
              <option value={ServicePointType.ZONE}>Zona</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Capacidad (personas) *
            </label>
            <input
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              min="1"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Posición X (opcional)
              </label>
              <input
                type="number"
                value={formData.positionX}
                onChange={(e) => setFormData({ ...formData, positionX: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Posición Y (opcional)
              </label>
              <input
                type="number"
                value={formData.positionY}
                onChange={(e) => setFormData({ ...formData, positionY: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="active" className="text-sm">
              Punto de servicio activo
            </label>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}