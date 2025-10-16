"use client";

import { useState, useEffect } from "react";
import { Location, LocationType } from "@prisma/client";

interface LocationData {
  id?: string;
  name: string;
  type: LocationType;
  active: boolean;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (location: Partial<LocationData>) => Promise<void>;
  location?: LocationData | null;
  title: string;
}

export default function LocationModal({ isOpen, onClose, onSave, location, title }: LocationModalProps) {
  const [formData, setFormData] = useState<{
    name: string;
    type: LocationType;
    active: boolean;
    order: number;
  }>({
    name: "",
    type: LocationType.DINING,
    active: true,
    order: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name,
        type: location.type,
        active: location.active,
        order: location.order
      });
    } else {
      setFormData({
        name: "",
        type: LocationType.DINING,
        active: true,
        order: 0
      });
    }
    setError("");
  }, [location, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validaciones básicas
      if (!formData.name.trim()) {
        throw new Error("El nombre es obligatorio");
      }

      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const getLocationTypeLabel = (type: LocationType) => {
    switch (type) {
      case LocationType.DINING: return "Zona general";
      case LocationType.VIP: return "VIP";
      case LocationType.BAR: return "Bar";
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
              Nombre de la ubicación *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="Ej: Zona General, VIP Lounge..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Tipo de ubicación *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as LocationType })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            >
              <option value={LocationType.DINING}>Zona general</option>
              <option value={LocationType.VIP}>VIP</option>
              <option value={LocationType.BAR}>Bar</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Orden de visualización
            </label>
            <input
              type="number"
              value={formData.order}
              onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Número más bajo = aparece primero en la lista
            </p>
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
              Ubicación activa
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