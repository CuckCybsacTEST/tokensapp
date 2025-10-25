"use client";
import React, { useState, useRef, useEffect } from 'react';
import { QrCode, CheckCircle, XCircle, Clock, AlertTriangle, User, Phone, Calendar, DollarSign, RefreshCw } from 'lucide-react';

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

export default function ValidateQRPublicPage() {
  const [qrData, setQrData] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QRValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check for scanned QR data on component mount
  useEffect(() => {
    const scannedData = sessionStorage.getItem('scannedQRData');
    if (scannedData) {
      sessionStorage.removeItem('scannedQRData'); // Clear it after use
      setQrData(scannedData);
      // Auto-validate if we have scanned data
      setTimeout(() => validateQRFromData(scannedData), 100);
    }
  }, []);

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

  const validateQR = async () => {
    if (!qrData.trim()) {
      setError('Por favor ingresa los datos del QR');
      return;
    }

    await validateQRFromData(qrData.trim());
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setQrData(text);
    };
    reader.readAsText(file);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          icon: <CheckCircle className="w-8 h-8" />,
          title: '¡Código QR Válido!',
          description: 'Este código QR es válido y puede ser utilizado.'
        };
      case 'expired':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: <XCircle className="w-8 h-8" />,
          title: 'Código QR Expirado',
          description: 'Este código QR ha expirado y ya no es válido.'
        };
      case 'used':
        return {
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          icon: <CheckCircle className="w-8 h-8" />,
          title: 'Código QR Utilizado',
          description: 'Este código QR ya ha sido utilizado anteriormente.'
        };
      case 'cancelled':
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          icon: <XCircle className="w-8 h-8" />,
          title: 'Compra Cancelada',
          description: 'Esta compra ha sido cancelada.'
        };
      case 'refunded':
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          icon: <AlertTriangle className="w-8 h-8" />,
          title: 'Compra Reembolsada',
          description: 'Esta compra ha sido reembolsada.'
        };
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          icon: <Clock className="w-8 h-8" />,
          title: 'Estado Desconocido',
          description: 'No se pudo determinar el estado del código QR.'
        };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusConfig = result ? getStatusConfig(result.status) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4">
            <QrCode className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Validar Código QR
          </h1>
          <p className="text-gray-600">
            Escanea o ingresa los datos de tu código QR de compra
          </p>
        </div>

        {/* Formulario de validación */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Datos del Código QR
              </label>
              <textarea
                value={qrData}
                onChange={(e) => setQrData(e.target.value)}
                placeholder='Pega aquí los datos del código QR...'
                className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={validateQR}
                disabled={loading || !qrData.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <QrCode className="w-4 h-4" />
                )}
                {loading ? 'Validando...' : 'Validar QR'}
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                title="Cargar desde archivo"
              >
                <QrCode className="w-4 h-4" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Resultado de validación */}
        {result && statusConfig && (
          <div className={`rounded-xl shadow-lg p-6 border-2 ${statusConfig.borderColor} ${statusConfig.bgColor}`}>
            {/* Estado principal */}
            <div className="text-center mb-6">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-md mb-4 ${statusConfig.color}`}>
                {statusConfig.icon}
              </div>
              <h2 className={`text-xl font-bold mb-2 ${statusConfig.color}`}>
                {statusConfig.title}
              </h2>
              <p className="text-gray-600">
                {statusConfig.description}
              </p>
            </div>

            {/* Información de la compra */}
            <div className="bg-white/50 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Detalles de la Compra
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Cliente:</span>
                  <span className="font-medium">{result.purchase.customerName}</span>
                </div>

                {result.purchase.customerWhatsapp && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">WhatsApp:</span>
                    <span className="font-medium">{result.purchase.customerWhatsapp}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha:</span>
                  <span className="font-medium">{formatDate(result.purchase.createdAt)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Monto:</span>
                  <span className="font-medium">S/ {result.purchase.amount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Oferta:</span>
                  <span className="font-medium text-right max-w-32 truncate" title={result.offer.title}>
                    {result.offer.title}
                  </span>
                </div>
              </div>
            </div>

            {/* ID de compra */}
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">ID de Compra</p>
              <p className="font-mono text-xs bg-white/50 px-3 py-1 rounded border">
                {result.purchase.purchaseId.slice(0, 12)}...
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            ¿Necesitas ayuda? Contacta al personal del establecimiento
          </p>
        </div>
      </div>
    </div>
  );
}