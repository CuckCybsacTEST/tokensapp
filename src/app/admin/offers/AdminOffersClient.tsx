"use client";
import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Eye, RefreshCw, X, AlertTriangle, Calendar, Clock, DollarSign, Package } from 'lucide-react';
import { DateTime } from 'luxon';
import { useStaffSocket } from '@/hooks/useSocket';

interface Offer {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  maxStock?: number;
  isActive: boolean;
  validFrom?: string;
  validUntil?: string;
  availableDays?: number[];
  startTime?: string;
  endTime?: string;
  availabilityText: string;
  isAvailable: boolean;
  totalPurchases: number;
  totalRevenue: number;
  recentPurchases: Array<{
    amount: number;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface OfferPurchase {
  id: string;
  offerId: string;
  userId: string | null;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  customerWhatsapp?: string;
  amount: number;
  currency: string;
  status: string;
  culqiChargeId?: string;
  culqiPaymentId?: string;
  createdAt: string;
  updatedAt: string;
  offer: {
    id: string;
    title: string;
    description: string;
    price: number;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

interface ApiResponse {
  success: boolean;
  data?: Offer[];
  error?: string;
}

export function OffersAdminPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [purchases, setPurchases] = useState<OfferPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPurchasesModal, setShowPurchasesModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    originalPrice: '',
    imageUrl: '',
    imageFile: null as File | null,
    maxStock: '',
    isActive: true,
    validFrom: '',
    validUntil: '',
    availableDays: [] as number[],
    startTime: '',
    endTime: ''
  });

  const socket = useStaffSocket();

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/offers');
      const data: ApiResponse = await response.json();

      if (data.success && data.data) {
        setOffers(data.data);
      } else {
        setError(data.error || 'Error al cargar ofertas');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchases = async (offerId: string) => {
    try {
      const response = await fetch(`/api/admin/offers/${offerId}/purchases`);
      const data = await response.json();

      if (data.success) {
        setPurchases(data.data || []);
        setShowPurchasesModal(true);
      }
    } catch (err) {
      console.error('Error fetching purchases:', err);
    }
  };

  const updatePurchaseStatus = async (purchaseId: string, offerId: string, status: string) => {
    try {
      const response = await fetch(`/api/admin/offers/${offerId}/purchases`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId, status })
      });

      const data = await response.json();

      if (data.success) {
        // Actualizar la lista de compras
        setPurchases(purchases.map(purchase =>
          purchase.id === purchaseId ? data.data : purchase
        ));
      } else {
        alert(data.error || 'Error al actualizar el estado');
      }
    } catch (err) {
      console.error('Error updating purchase status:', err);
      alert('Error de conexión');
    }
  };

  const uploadImage = async (offerId: string, file: File) => {
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    const response = await fetch(`/api/admin/offers/${offerId}/image`, {
      method: 'POST',
      body: formDataUpload
    });

    const data = await response.json();
    if (!data.ok) {
      throw new Error(data.message || 'Error al subir imagen');
    }
    return data;
  };

  const handleCreate = async () => {
    try {
      // Crear la oferta primero (excluir imageFile del JSON)
      const { imageFile, imageUrl, ...createData } = formData;

      // Convertir fechas a zona horaria de Lima antes de enviar
      const processedData = {
        ...createData,
        validFrom: createData.validFrom ? DateTime.fromISO(createData.validFrom).setZone('America/Lima').toISO() : null,
        validUntil: createData.validUntil ? DateTime.fromISO(createData.validUntil).setZone('America/Lima').toISO() : null,
        ...(imageUrl && imageUrl.trim() !== '' && { imagePath: imageUrl }) // Solo enviar imagePath si tiene valor
      };

      const response = await fetch('/api/admin/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processedData)
      });

      const data = await response.json();

      if (data.success) {
        // Si hay imagen, subirla
        if (formData.imageFile) {
          try {
            await uploadImage(data.data.id, formData.imageFile);
          } catch (uploadErr) {
            console.error('Error uploading image:', uploadErr);
            // No fallar la creación si la imagen falla
          }
        }

        setShowCreateModal(false);
        resetForm();
        fetchOffers();
      } else {
        alert(data.error || 'Error al crear oferta');
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const handleUpdate = async () => {
    if (!selectedOffer) return;

    try {
      // Actualizar la oferta primero (excluir imageFile del JSON)
      const { imageFile, imageUrl, ...updateData } = formData;

      // Convertir fechas a zona horaria de Lima antes de enviar
      const processedData = {
        ...updateData,
        validFrom: updateData.validFrom ? DateTime.fromISO(updateData.validFrom).setZone('America/Lima').toISO() : null,
        validUntil: updateData.validUntil ? DateTime.fromISO(updateData.validUntil).setZone('America/Lima').toISO() : null,
        ...(imageUrl && imageUrl.trim() !== '' && { imagePath: imageUrl }) // Solo enviar imagePath si tiene valor
      };

      const response = await fetch(`/api/admin/offers/${selectedOffer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processedData)
      });

      const data = await response.json();

      if (data.success) {
        // Si hay imagen nueva, subirla
        if (formData.imageFile) {
          try {
            await uploadImage(selectedOffer.id, formData.imageFile);
          } catch (uploadErr) {
            console.error('Error uploading image:', uploadErr);
            // No fallar la actualización si la imagen falla
          }
        }

        setShowEditModal(false);
        setSelectedOffer(null);
        resetForm();
        fetchOffers();
      } else {
        alert(data.error || 'Error al actualizar oferta');
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const handleDelete = async (offerId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta oferta?')) return;

    try {
      const response = await fetch(`/api/admin/offers/${offerId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        fetchOffers();
      } else {
        alert(data.error || 'Error al eliminar oferta');
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      price: '',
      originalPrice: '',
      imageUrl: '',
      imageFile: null,
      maxStock: '',
      isActive: true,
      validFrom: '',
      validUntil: '',
      availableDays: [],
      startTime: '',
      endTime: ''
    });
  };

  const openEditModal = (offer: Offer) => {
    setSelectedOffer(offer);
    setFormData({
      title: offer.title,
      description: offer.description,
      price: offer.price.toString(),
      originalPrice: offer.originalPrice?.toString() || '',
      imageUrl: offer.imageUrl || '',
      imageFile: null,
      maxStock: offer.maxStock?.toString() || '',
      isActive: offer.isActive,
      // @ts-ignore - toFormat method exists in Luxon DateTime
      validFrom: offer.validFrom ? DateTime.fromJSDate(new Date(offer.validFrom)).setZone('America/Lima').toFormat("yyyy-MM-dd'T'HH:mm") : '',
      // @ts-ignore - toFormat method exists in Luxon DateTime
      validUntil: offer.validUntil ? DateTime.fromJSDate(new Date(offer.validUntil)).setZone('America/Lima').toFormat("yyyy-MM-dd'T'HH:mm") : '',
      availableDays: offer.availableDays || [],
      startTime: offer.startTime || '',
      endTime: offer.endTime || ''
    });
    setShowEditModal(true);
  };

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-end mb-6">
        <div className="flex flex-row gap-2">
          <button
            onClick={fetchOffers}
            className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-xs sm:text-sm"
          >
            <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Actualizar</span>
            <span className="sm:hidden">Refresh</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs sm:text-sm"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Nueva Oferta</span>
            <span className="sm:hidden">Nueva</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertTriangle className="w-5 h-5" />
            {error}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        {offers.map((offer) => (
          <div key={offer.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border dark:border-gray-700">
            {/* Imagen */}
            <div className="relative h-32 sm:h-48 bg-gradient-to-br from-purple-100 to-pink-100">
              {offer.imageUrl ? (
                <img
                  src={offer.imageUrl}
                  alt={offer.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Package className="w-10 h-10 sm:w-16 sm:h-16 text-gray-400" />
                </div>
              )}

              {/* Badges */}
              <div className="absolute top-1 left-1 sm:top-2 sm:left-2 flex flex-col gap-1">
                <span className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-xs font-medium ${
                  offer.isActive
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500 text-white'
                }`}>
                  {offer.isActive ? 'Activa' : 'Inactiva'}
                </span>
                <span className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-xs font-medium ${
                  offer.isAvailable
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-500 text-white'
                }`}>
                  {offer.isAvailable ? 'Disponible' : 'No disponible'}
                </span>
              </div>
            </div>

            {/* Contenido */}
            <div className="p-3 sm:p-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1 sm:mb-2 line-clamp-2 break-words leading-tight">{offer.title}</h3>
              <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-2 sm:line-clamp-3 break-words leading-tight">{offer.description}</p>

              {/* Precios */}
              <div className="flex items-center gap-1 sm:gap-2 mb-2 sm:mb-3">
                <span className="text-lg sm:text-2xl font-bold text-green-600">
                  S/ {offer.price.toFixed(2)}
                </span>
                {offer.originalPrice && offer.originalPrice > offer.price && (
                  <span className="text-sm sm:text-lg text-gray-500 line-through">
                    S/ {offer.originalPrice.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Estadísticas */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-4 text-xs sm:text-sm">
                <div className="text-center">
                  <div className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">{offer.totalPurchases}</div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs">Compras</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">S/ {offer.totalRevenue.toFixed(2)}</div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs">Ingresos</div>
                </div>
              </div>

              {/* Disponibilidad */}
              <div className="mb-3 sm:mb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{offer.availabilityText}</p>
              </div>

              {/* Acciones */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => fetchPurchases(offer.id)}
                    className="flex items-center justify-center gap-1 px-2 sm:px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors text-xs sm:text-sm font-medium shadow-sm"
                  >
                    <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Compras</span>
                    <span className="sm:hidden">Ver</span>
                  </button>
                  <button
                    onClick={() => openEditModal(offer)}
                    className="flex items-center justify-center gap-1 px-2 sm:px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md transition-colors text-xs sm:text-sm font-medium shadow-sm"
                  >
                    <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Editar</span>
                    <span className="sm:hidden">Edit</span>
                  </button>
                </div>
                <button
                  onClick={() => handleDelete(offer.id)}
                  className="w-full flex items-center justify-center gap-1 px-2 sm:px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors text-xs sm:text-sm font-medium shadow-sm border border-red-600"
                >
                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Crear */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Crear Nueva Oferta</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <OfferForm
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleCreate}
                submitLabel="Crear Oferta"
                onCancel={() => setShowCreateModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Editar Oferta</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <OfferForm
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleUpdate}
                submitLabel="Actualizar Oferta"
                onCancel={() => setShowEditModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Compras */}
      {showPurchasesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Compras de Oferta</h2>
                <button
                  onClick={() => setShowPurchasesModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {purchases.map((purchase) => (
                  <div key={purchase.id} className="border dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{purchase.customerName}</h3>
                          {purchase.userId === 'anonymous' && (
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                              Anónimo
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                          {purchase.userId === 'anonymous' ? (
                            // Para compras anónimas, mostrar email y teléfono si están disponibles
                            <>
                              {purchase.customerEmail && `${purchase.customerEmail}`}
                              {purchase.customerEmail && purchase.customerPhone && ' • '}
                              {purchase.customerPhone && `${purchase.customerPhone}`}
                              {!purchase.customerEmail && !purchase.customerPhone && 'Sin contacto'}
                            </>
                          ) : (
                            // Para usuarios registrados, mostrar el email/whatsapp
                            purchase.user?.email || 'Sin email'
                          )}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                          {new Date(purchase.createdAt).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <strong className="text-gray-900 dark:text-white">Oferta:</strong> {purchase.offer.title}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <div className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">S/ {purchase.amount.toFixed(2)}</div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          purchase.status === 'CONFIRMED'
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            : purchase.status === 'PENDING'
                            ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                            : purchase.status === 'CANCELLED'
                            ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        }`}>
                          {purchase.status === 'PENDING' ? 'Pendiente' :
                           purchase.status === 'CONFIRMED' ? 'Entregado' :
                           purchase.status === 'CANCELLED' ? 'Cancelado' :
                           purchase.status === 'REFUNDED' ? 'Reembolsado' :
                           purchase.status === 'EXPIRED' ? 'Expirado' : purchase.status}
                        </span>
                        {purchase.status === 'PENDING' && (
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => updatePurchaseStatus(purchase.id, purchase.offerId, 'CONFIRMED')}
                              className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 dark:hover:bg-green-700 transition-colors"
                            >
                              ✓ Entregado
                            </button>
                            <button
                              onClick={() => updatePurchaseStatus(purchase.id, purchase.offerId, 'CANCELLED')}
                              className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 dark:hover:bg-red-700 transition-colors"
                            >
                              ✗ Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {purchases.length === 0 && (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">No hay compras para esta oferta</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface OfferFormProps {
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: () => void;
  submitLabel: string;
  onCancel: () => void;
}

function OfferForm({ formData, setFormData, onSubmit, submitLabel, onCancel }: OfferFormProps) {
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  const handleDayToggle = (dayIndex: number) => {
    const currentDays = formData.availableDays || [];
    const newDays = currentDays.includes(dayIndex)
      ? currentDays.filter((d: number) => d !== dayIndex)
      : [...currentDays, dayIndex];
    setFormData({ ...formData, availableDays: newDays });
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio (S/)</label>
          <input
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio Original (S/)</label>
          <input
            type="number"
            step="0.01"
            value={formData.originalPrice}
            onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Opcional"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Máximo</label>
          <input
            type="number"
            value={formData.maxStock}
            onChange={(e) => setFormData({ ...formData, maxStock: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Ilimitado"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
          <select
            value={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="true">Activa</option>
            <option value="false">Inactiva</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Imagen</label>
        <div className="space-y-2">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setFormData({ ...formData, imageFile: file });
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white file:bg-gray-50 dark:file:bg-gray-600 file:border-0 file:rounded file:px-3 file:py-1 file:mr-3 file:text-gray-700 dark:file:text-gray-300"
          />
          {formData.imageUrl && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Imagen actual:</span>
              <img
                src={formData.imageUrl}
                alt="Preview"
                className="w-16 h-16 object-cover rounded border dark:border-gray-600"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Inicio</label>
          <input
            type="datetime-local"
            value={formData.validFrom}
            onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Fin</label>
          <input
            type="datetime-local"
            value={formData.validUntil}
            onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Días Disponibles</label>
        <div className="grid grid-cols-7 gap-2">
          {dayNames.map((day, index) => (
            <button
              key={day}
              type="button"
              onClick={() => handleDayToggle(index)}
              className={`px-2 py-2 text-xs rounded border ${
                formData.availableDays?.includes(index)
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hora Inicio</label>
          <input
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hora Fin</label>
          <input
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 dark:hover:bg-blue-700"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
