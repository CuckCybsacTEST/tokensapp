"use client";

import { useState, useEffect } from "react";
import LocationModal from "@/components/admin/LocationModal";
import ServicePointModal from "@/components/admin/ServicePointModal";
import QrDownloadButton from "@/app/admin/persons/QrDownloadButton";
import QRCode from "qrcode";

function QRDisplay({ url, size = 120 }: { url: string; size?: number }) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    QRCode.toDataURL(url, { width: size, margin: 1 })
      .then(setQrDataUrl)
      .catch(console.error);
  }, [url, size]);

  if (!qrDataUrl) {
    return <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>;
  }

  return (
    <img
      src={qrDataUrl}
      alt="QR Code"
      className="border border-gray-300 dark:border-gray-600 rounded"
      style={{ width: size, height: size }}
    />
  );
}

enum LocationType {
  DINING = "DINING",
  VIP = "VIP",
  BAR = "BAR"
}

enum ServicePointType {
  TABLE = "TABLE",
  BOX = "BOX",
  ZONE = "ZONE"
}

interface LocationWithServicePoints {
  id: string;
  name: string;
  type: LocationType;
  active: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  servicePoints: ServicePoint[];
}

interface ServicePoint {
  id: string;
  locationId: string;
  number: string;
  name?: string;
  type: ServicePointType;
  capacity: number;
  active: boolean;
  positionX?: number;
  positionY?: number;
  qrCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function LocationsManager() {
  const [locations, setLocations] = useState<LocationWithServicePoints[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());
  const [locationModal, setLocationModal] = useState<{
    isOpen: boolean;
    location?: LocationWithServicePoints | null;
    title: string;
  }>({ isOpen: false, title: "" });
  const [servicePointModal, setServicePointModal] = useState<{
    isOpen: boolean;
    servicePoint?: ServicePoint | null;
    locationId: string;
    title: string;
  }>({ isOpen: false, locationId: "", title: "" });

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

  const toggleLocation = (locationId: string) => {
    const newExpanded = new Set(expandedLocations);
    if (newExpanded.has(locationId)) {
      newExpanded.delete(locationId);
    } else {
      newExpanded.add(locationId);
    }
    setExpandedLocations(newExpanded);
  };

  const handleEditLocation = (location: LocationWithServicePoints) => {
    setLocationModal({
      isOpen: true,
      location,
      title: "Editar Ubicación"
    });
  };

  const handleAddServicePoint = (location: LocationWithServicePoints) => {
    setServicePointModal({
      isOpen: true,
      servicePoint: null,
      locationId: location.id,
      title: `Agregar Punto de Servicio - ${location.name}`
    });
  };

  const handleEditServicePoint = (servicePoint: ServicePoint) => {
    setServicePointModal({
      isOpen: true,
      servicePoint,
      locationId: servicePoint.locationId,
      title: "Editar Punto de Servicio"
    });
  };

  const handleDeleteServicePoint = async (servicePoint: ServicePoint) => {
    if (!confirm(`¿Estás seguro de eliminar el punto de servicio "${servicePoint.name || servicePoint.number}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/service-points/${servicePoint.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.associatedOrders) {
          // Mostrar información detallada de pedidos activos asociados
          const ordersList = error.associatedOrders.map((order: any) =>
            `• Pedido ${order.id}: ${order.status} - S/ ${order.total} (${order.itemCount} items) - ${new Date(order.createdAt).toLocaleString()}`
          ).join('\n');

          alert(`No se puede eliminar el punto de servicio porque tiene ${error.totalOrders} pedido(s) activo(s) asociado(s):\n\n${ordersList}\n\nPara eliminar este punto de servicio, primero debes gestionar estos pedidos activos.`);
        } else {
          throw new Error(error.error || 'Error al eliminar');
        }
        return;
      }

      // Recargar datos
      await fetchLocations();
      alert('Punto de servicio eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting service point:', error);
      alert(error instanceof Error ? error.message : 'Error desconocido');
    }
  };

  const handleSaveLocation = async (locationData: any) => {
    try {
      const isEditing = !!locationModal.location;
      const url = isEditing ? `/api/admin/locations/${locationModal.location!.id}` : '/api/admin/locations';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(locationData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar');
      }

      // Recargar datos
      await fetchLocations();
      alert(isEditing ? 'Ubicación actualizada exitosamente' : 'Ubicación creada exitosamente');
    } catch (error) {
      console.error('Error saving location:', error);
      throw error; // Re-throw para que el modal maneje el error
    }
  };

  const handleSaveServicePoint = async (servicePointData: any) => {
    try {
      const isEditing = !!servicePointModal.servicePoint;
      const url = isEditing ? `/api/admin/service-points/${servicePointModal.servicePoint!.id}` : '/api/admin/service-points';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(servicePointData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar');
      }

      // Recargar datos
      await fetchLocations();
      alert(isEditing ? 'Punto de servicio actualizado exitosamente' : 'Punto de servicio creado exitosamente');
    } catch (error) {
      console.error('Error saving service point:', error);
      throw error; // Re-throw para que el modal maneje el error
    }
  };

  const handleDeleteLocation = async (location: LocationWithServicePoints) => {
    if (!confirm(`¿Estás seguro de eliminar la ubicación "${location.name}"? Esto eliminará permanentemente la ubicación y todos sus datos asociados.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/locations/${location.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al eliminar la ubicación');
        return;
      }

      // Recargar datos
      await fetchLocations();
      alert('Ubicación eliminada exitosamente');
    } catch (error) {
      console.error('Error deleting location:', error);
      alert(error instanceof Error ? error.message : 'Error desconocido');
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
  }

  return (
    <div className="space-y-4 text-gray-900 dark:text-white">
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">Cargando ubicaciones...</span>
        </div>
      ) : (
        <>
          {/* Header con botón para agregar ubicación */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Ubicaciones
            </h2>
            <button
              onClick={() => setLocationModal({ isOpen: true, location: null, title: "Agregar Ubicación" })}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              + Agregar Ubicación
            </button>
          </div>

          {locations.map((location) => (
        <div key={location.id} className="border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800">
          <div
            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            onClick={() => toggleLocation(location.id)}
          >
            <div className="flex items-center space-x-3 mb-3 sm:mb-0">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                location.type === LocationType.DINING ? "bg-blue-500" :
                location.type === LocationType.VIP ? "bg-purple-500" :
                location.type === LocationType.BAR ? "bg-green-500" :
                "bg-gray-500"
              }`}></div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {location.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {getLocationTypeLabel(location.type)} • {location.servicePoints.length} puntos de servicio
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-2">
              <div className="flex items-center space-x-2 order-2 sm:order-1">
                <QRDisplay
                  url={`${process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/menu?location=${location.id}`}
                  size={40}
                />
                <QrDownloadButton
                  data={`${process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/menu?location=${location.id}`}
                  fileName={`qr-location-${location.name}.png`}
                />
              </div>
              <div className="flex flex-wrap gap-2 order-1 sm:order-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditLocation(location);
                  }}
                  className="px-3 py-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 text-sm font-medium transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddServicePoint(location);
                  }}
                  className="px-3 py-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 text-sm font-medium transition-colors"
                >
                  + Agregar Punto
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteLocation(location);
                  }}
                  className="px-3 py-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 text-sm font-medium transition-colors"
                >
                  Eliminar
                </button>
              </div>
              <svg
                className={`w-5 h-5 transition-transform flex-shrink-0 order-3 ${
                  expandedLocations.has(location.id) ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {expandedLocations.has(location.id) && (
            <div className="border-t bg-gray-50 dark:bg-gray-900">
              <div className="p-4">
                {location.servicePoints.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No hay puntos de servicio en esta ubicación
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {location.servicePoints.map((servicePoint: ServicePoint) => (
                      <div
                        key={servicePoint.id}
                        className="bg-white dark:bg-gray-800 rounded-lg p-4 border shadow-sm"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900 dark:text-white truncate">
                            {servicePoint.name}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getServicePointTypeColor(servicePoint.type)}`}>
                            {getServicePointTypeLabel(servicePoint.type)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-4">
                          <p>Capacidad: {servicePoint.capacity || "N/A"}</p>
                          {servicePoint.positionX !== null && servicePoint.positionY !== null && (
                            <p>Posición: ({servicePoint.positionX}, {servicePoint.positionY})</p>
                          )}
                          <p className="text-xs">
                            Estado: {servicePoint.active ? "Activo" : "Inactivo"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <button
                            onClick={() => handleEditServicePoint(servicePoint)}
                            className="flex-1 min-w-0 px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteServicePoint(servicePoint)}
                            className="flex-1 min-w-0 px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900 dark:hover:bg-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium transition-colors"
                          >
                            Eliminar
                          </button>
                        </div>
                        {servicePoint.active && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="space-y-2">
                              <span className="text-xs text-gray-500 dark:text-gray-400 block">
                                QR del menú
                              </span>
                              <div className="flex flex-col sm:flex-row items-center gap-3">
                                <QRDisplay
                                  url={`${process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/menu?table=${servicePoint.id}`}
                                  size={80}
                                />
                                <div className="flex flex-col items-center sm:items-start gap-1">
                                  <QrDownloadButton
                                    data={`${process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/menu?table=${servicePoint.id}`}
                                    fileName={`qr-${servicePoint.name || servicePoint.number}.png`}
                                  />
                                  <span className="text-xs text-gray-400 text-center sm:text-left">
                                    {servicePoint.name || `${servicePoint.type} ${servicePoint.number}`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {locations.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 100 4 2 2 0 000-4zm0 0a2 2 0 110-4 2 2 0 010 4zm0 0V7m6 0v10m0-10a2 2 0 10-4 0 2 2 0 004 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            No hay ubicaciones configuradas
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Comienza creando tu primera ubicación para organizar mesas y puntos de servicio.
          </p>
        </div>
      )}

      {/* Modales */}
      <LocationModal
        isOpen={locationModal.isOpen}
        onClose={() => setLocationModal({ isOpen: false, title: "" })}
        onSave={handleSaveLocation}
        location={locationModal.location}
        title={locationModal.title}
      />

      <ServicePointModal
        isOpen={servicePointModal.isOpen}
        onClose={() => setServicePointModal({ isOpen: false, locationId: "", title: "" })}
        onSave={handleSaveServicePoint}
        servicePoint={servicePointModal.servicePoint}
        locationId={servicePointModal.locationId}
        title={servicePointModal.title}
      />
      </>
    )}
    </div>
  );
}
