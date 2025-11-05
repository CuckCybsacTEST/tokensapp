"use client";
import React, { useState, useRef, useEffect } from 'react';
import { QrCode, CheckCircle, XCircle, Clock, AlertTriangle, User, Phone, Mail, Calendar, DollarSign, Package, ArrowLeft } from 'lucide-react';
import { DateTime } from 'luxon';
import Link from 'next/link';

interface QRValidationResult {
  valid: boolean;
  status: 'active' | 'expired' | 'used' | 'cancelled' | 'refunded';
  message: string;
  purchase: {
    id: string;
    purchaseId: string;
    amount: number;
    currency: string;
    createdAt: string;
    customerName: string;
    customerWhatsapp?: string;
    customerEmail?: string;
    customerPhone?: string;
    customerDni?: string;
    status: string;
    culqiChargeId?: string;
    culqiPaymentId?: string;
    paymentStatus: string;
    userId?: string;
    user?: {
      username: string;
      person?: {
        name: string;
        whatsapp?: string;
      };
    };
  };
  offer: {
    id: string;
    title: string;
    description?: string;
    price: number;
    isActive: boolean;
    validFrom?: string;
    validUntil?: string;
    timezone: string;
    availableDays: number[];
    startTime?: string;
    endTime?: string;
    maxQuantity?: number;
  };
}

export default function ValidateQROffersPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QRValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [delivering, setDelivering] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Check for scanned QR data on component mount and get user role
  useEffect(() => {
    const scannedData = sessionStorage.getItem('scannedQRData');
    if (scannedData) {
      sessionStorage.removeItem('scannedQRData'); // Clear it after use
      // Auto-validate if we have scanned data
      setTimeout(() => validateQRFromData(scannedData), 100);
    }

    // Get user role
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUserRole(data.role);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const validateQRFromData = async (data: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/offers/validate-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qrData: data }),
      });

      const resultData = await response.json();

      if (!response.ok) {
        throw new Error(resultData.error || 'Error al validar el QR');
      }

      setResult(resultData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    // Parsear la fecha como zona horaria de Lima (ya que se almacenó así)
    const date = DateTime.fromISO(dateString, { zone: 'America/Lima' });
    return date.toLocaleString(DateTime.DATETIME_SHORT, { locale: 'es-PE' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'expired': return 'text-red-600 bg-red-100';
      case 'used': return 'text-blue-600 bg-blue-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      case 'refunded': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-5 h-5" />;
      case 'expired': return <XCircle className="w-5 h-5" />;
      case 'used': return <CheckCircle className="w-5 h-5" />;
      case 'cancelled': return <XCircle className="w-5 h-5" />;
      case 'refunded': return <AlertTriangle className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  const markAsDelivered = async () => {
    if (!result) return;

    setDelivering(true);
    try {
      const response = await fetch('/api/offers/complete-delivery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ purchaseId: result.purchase.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al marcar como entregado');
      }

      // Actualizar el resultado localmente para reflejar el cambio
      setResult({
        ...result,
        purchase: {
          ...result.purchase,
          status: 'CONFIRMED'
        }
      });

      alert('Compra marcada como entregada exitosamente');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error desconocido al marcar como entregado');
    } finally {
      setDelivering(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <QrCode className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Detalles del Código QR Escaneado
            </h1>
          </div>

          {/* Botón de regreso al scanner */}
          {userRole && (
            <div className="mb-6">
              <Link
                href={userRole === 'ADMIN' || userRole === 'STAFF' ? '/admin/scanner' : '/u/scanner'}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver al Scanner
              </Link>
            </div>
          )}

          {/* Mensaje cuando no hay datos escaneados */}
          {!result && !loading && !error && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-3">
                <QrCode className="w-6 h-6 text-blue-600" />
                <div>
                  <h3 className="text-lg font-medium text-blue-900">Escanea un Código QR</h3>
                  <p className="text-blue-700 mt-1">
                    Usa el scanner en <strong>/admin/scanner</strong> para escanear códigos QR de ofertas.
                    Los detalles aparecerán automáticamente aquí.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {loading && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-gray-700">Validando código QR...</span>
              </div>
            </div>
          )}

          {/* Mensaje de error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-800 font-medium">Error</span>
              </div>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          )}

          {/* Resultado de validación */}
          {result && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(result.status)}`}>
                  {getStatusIcon(result.status)}
                  <span className="capitalize">{result.status}</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Resultado de Validación
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Información de la compra */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                    Información de la Compra
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Cliente:</span>
                      <span className="font-medium text-gray-900">{result.purchase.customerName}</span>
                    </div>

                    {result.purchase.customerWhatsapp && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">WhatsApp:</span>
                        <span className="font-medium text-gray-900">{result.purchase.customerWhatsapp}</span>
                      </div>
                    )}

                    {result.purchase.customerEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Email:</span>
                        <span className="font-medium text-gray-900">{result.purchase.customerEmail}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Fecha de compra:</span>
                      <span className="font-medium text-gray-900">{formatDate(result.purchase.createdAt)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Monto:</span>
                      <span className="font-medium text-gray-900">S/ {result.purchase.amount.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">ID Compra:</span>
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-900">
                        {result.purchase.purchaseId.slice(0, 8)}...
                      </span>
                    </div>
                  </div>
                </div>

                {/* Información de la oferta */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                    Información de la Oferta
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-gray-600">Título:</span>
                      <p className="font-medium text-gray-900">{result.offer.title}</p>
                    </div>

                    {result.offer.description && (
                      <div>
                        <span className="text-sm text-gray-600">Descripción:</span>
                        <p className="text-sm text-gray-700 mt-1">{result.offer.description}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Precio oferta:</span>
                      <span className="font-medium text-gray-900">S/ {result.offer.price.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Información de restricciones temporales de la oferta */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Restricciones Temporales de la Oferta
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Estado de la oferta:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        result.offer.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {result.offer.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>

                    {result.offer.validFrom && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Válida desde:</span>
                        <span className="font-medium text-gray-900">{formatDate(result.offer.validFrom)}</span>
                      </div>
                    )}

                    {result.offer.validUntil && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Válida hasta:</span>
                        <span className="font-medium text-gray-900">{formatDate(result.offer.validUntil)}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Zona horaria:</span>
                      <span className="font-medium text-gray-900">{result.offer.timezone}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-gray-600">Días disponibles:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {result.offer.availableDays && result.offer.availableDays.length > 0 ? (
                          result.offer.availableDays.map(day => (
                            <span key={day} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][day]}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-500 text-sm">Todos los días</span>
                        )}
                      </div>
                    </div>

                    {(result.offer.startTime || result.offer.endTime) && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Horario:</span>
                        <span className="font-medium text-gray-900">
                          {result.offer.startTime || '00:00'} - {result.offer.endTime || '23:59'}
                        </span>
                      </div>
                    )}

                    {result.offer.maxQuantity && (
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Stock máximo:</span>
                        <span className="font-medium text-gray-900">{result.offer.maxQuantity}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Información adicional para admin */}
              {result.purchase.userId && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Información del Usuario Registrado
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Username:</span>
                        <span className="font-medium text-gray-900">{result.purchase.user?.username}</span>
                      </div>

                      {result.purchase.user?.person?.name && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">Nombre real:</span>
                          <span className="font-medium text-gray-900">{result.purchase.user.person.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      {result.purchase.customerDni && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">DNI:</span>
                          <span className="font-medium text-gray-900">{result.purchase.customerDni}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Estado pago:</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          result.purchase.paymentStatus === 'completed' ? 'bg-green-100 text-green-800' :
                          result.purchase.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {result.purchase.paymentStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Mensaje de estado */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-3">
                  {getStatusIcon(result.status)}
                  <div>
                    <p className="font-medium text-gray-900">{result.message}</p>
                    {result.status === 'active' && (
                      <p className="text-sm text-gray-600 mt-1">
                        Este código QR puede ser utilizado para validar la compra.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Botón para marcar como entregado */}
              {result.purchase.status !== 'CONFIRMED' && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={markAsDelivered}
                    disabled={delivering}
                    className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {delivering ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Procesando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Marcar como Entregado
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}