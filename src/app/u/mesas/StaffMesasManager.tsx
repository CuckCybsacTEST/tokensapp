"use client";

import { useState, useEffect } from "react";
import { Location, ServicePoint, LocationType, ServicePointType } from "@prisma/client";

interface LocationWithServicePoints extends Location {
  servicePoints: ServicePoint[];
}

type LocationWithServicePointsType = Location & {
  servicePoints: ServicePoint[];
};

export default function StaffMesasManager() {
  const [locations, setLocations] = useState<LocationWithServicePointsType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/admin/locations");
      if (response.ok) {
        const data = await response.json();
        setLocations(data);
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setLoading(false);
    }
  };

  const getLocationTypeLabel = (type: LocationType) => {
    switch (type) {
      case LocationType.DINING: return "Comedor";
      case LocationType.VIP: return "VIP";
      case LocationType.BAR: return "Bar";
      default: return type;
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

  const getServicePointTypeColor = (type: ServicePointType) => {
    switch (type) {
      case ServicePointType.TABLE: return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case ServicePointType.BOX: return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case ServicePointType.ZONE: return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const handleServicePointSelect = (servicePoint: ServicePoint) => {
    // Aquí iría la lógica para crear un pedido con esta mesa/zona
    console.log("Seleccionado:", servicePoint);
    // TODO: Redirigir a creación de pedido con servicePointId
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Cargando mesas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selector de ubicación */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedLocation(null)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedLocation === null
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          }`}
        >
          Todas las ubicaciones
        </button>
        {locations.map((location) => (
          <button
            key={location.id}
            onClick={() => setSelectedLocation(location.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedLocation === location.id
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            {location.name}
          </button>
        ))}
      </div>

      {/* Lista de mesas filtradas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations
          .filter(location => !selectedLocation || location.id === selectedLocation)
          .map((location) => (
            <div key={location.id} className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  location.type === LocationType.DINING ? "bg-blue-500" :
                  location.type === LocationType.VIP ? "bg-purple-500" :
                  location.type === LocationType.BAR ? "bg-green-500" :
                  "bg-gray-500"
                }`}></div>
                {location.name}
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {location.servicePoints
                  .filter((sp: ServicePoint) => sp.active)
                  .map((servicePoint: ServicePoint) => (
                    <button
                      key={servicePoint.id}
                      onClick={() => handleServicePointSelect(servicePoint)}
                      className="p-3 bg-white dark:bg-gray-800 border rounded-lg shadow-sm hover:shadow-md transition-shadow text-left"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{servicePoint.number}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getServicePointTypeColor(servicePoint.type)}`}>
                          {getServicePointTypeLabel(servicePoint.type)}
                        </span>
                      </div>
                      {servicePoint.name && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {servicePoint.name}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Cap: {servicePoint.capacity}
                      </p>
                    </button>
                  ))}
              </div>

              {location.servicePoints.filter((sp: ServicePoint) => sp.active).length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                  No hay mesas activas en esta ubicación
                </p>
              )}
            </div>
          ))}
      </div>

      {locations.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No hay ubicaciones configuradas
        </div>
      )}
    </div>
  );
}
