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
    return <div className="w-20 h-20 bg-gray-200 animate-pulse rounded"></div>;
  }

  return (
    <img
      src={qrDataUrl}
      alt="QR Code"
      className="border border-gray-300 rounded"
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
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Cargando ubicaciones...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {locations.map((location) => (
        <div key={location.id} className="border rounded-lg shadow-sm">
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={() => toggleLocation(location.id)}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                location.type === LocationType.DINING ? "bg-blue-500" :
                location.type === LocationType.VIP ? "bg-purple-500" :
                location.type === LocationType.BAR ? "bg-green-500" :
                "bg-gray-500"
              }`}></div>
              <div>
                <h3 className="font-semibold">{location.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {getLocationTypeLabel(location.type)} • {location.servicePoints.length} puntos de servicio
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditLocation(location);
                }}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
              >
                Editar
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddServicePoint(location);
                }}
                className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
              >
                + Agregar Punto
              </button>
              <svg
                className={`w-5 h-5 transition-transform ${
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {location.servicePoints.map((servicePoint: ServicePoint) => (
                      <div
                        key={servicePoint.id}
                        className="bg-white dark:bg-gray-800 rounded-lg p-4 border shadow-sm"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{servicePoint.name}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getServicePointTypeColor(servicePoint.type)}`}>
                            {getServicePointTypeLabel(servicePoint.type)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <p>Capacidad: {servicePoint.capacity || "N/A"}</p>
                          {servicePoint.positionX !== null && servicePoint.positionY !== null && (
                            <p>Posición: ({servicePoint.positionX}, {servicePoint.positionY})</p>
                          )}
                          <p className="text-xs">
                            Estado: {servicePoint.active ? "Activo" : "Inactivo"}
                          </p>
                        </div>
                        <div className="flex space-x-2 mt-3">
                          <button 
                            onClick={() => handleEditServicePoint(servicePoint)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Editar
                          </button>
                          <button 
                            onClick={() => handleDeleteServicePoint(servicePoint)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Eliminar
                          </button>
                        </div>
                        {servicePoint.active && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="space-y-2">
                              <span className="text-xs text-gray-500 dark:text-gray-400 block">QR del menú</span>
                              <div className="flex items-center space-x-3">
                                <QRDisplay 
                                  url={`${typeof window !== 'undefined' ? window.location.origin : ''}/menu?table=${servicePoint.id}`}
                                  size={80}
                                />
                                <div className="flex flex-col space-y-1">
                                  <QrDownloadButton 
                                    data={`${typeof window !== 'undefined' ? window.location.origin : ''}/menu?table=${servicePoint.id}`}
                                    fileName={`qr-${servicePoint.name || servicePoint.number}.png`}
                                  />
                                  <span className="text-xs text-gray-400">
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
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No hay ubicaciones configuradas
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
    </div>
  );
}