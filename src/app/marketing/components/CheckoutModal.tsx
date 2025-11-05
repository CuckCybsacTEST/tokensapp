"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CreditCard, User, MessageCircle, Loader2, Download, QrCode } from "lucide-react";

// Declaración de tipos para Culqi
declare global {
  interface Window {
    Culqi: any;
  }
}
import { CulqiProvider, useCheckout } from "react-culqi-next";
import QRCode from 'qrcode';

interface TicketType {
  id: string;
  name: string;
  description?: string;
  price: number;
  capacity: number;
  soldCount: number;
  availableFrom?: string;
  availableTo?: string;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  showId: string;
  showTitle: string;
  showDate: string;
  showTime: string;
  selectedTickets: Record<string, number>;
  ticketTypes: TicketType[];
  onPurchaseComplete: () => void;
}

export function CheckoutModal({
  isOpen,
  onClose,
  showId,
  showTitle,
  showDate,
  showTime,
  selectedTickets,
  ticketTypes,
  onPurchaseComplete,
}: CheckoutModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    dni: "",
    whatsapp: "",
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [orderData, setOrderData] = useState<any>(null);
  const [purchaseResult, setPurchaseResult] = useState<any>(null);
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Función simple para abrir Culqi checkout
  const handleOpenCulqi = () => {
    if (window.Culqi) {
      // Configurar Culqi
      window.Culqi.publicKey = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY!;
      window.Culqi.settings = {
        title: `Compra de tickets - ${showTitle}`,
        currency: 'PEN',
        description: `Compra de ${Object.values(selectedTickets).reduce((a, b) => a + b, 0)} tickets`,
        amount: Math.round(getTotalAmount() * 100),
      };

      // Configurar callback de éxito
      window.Culqi.options = {
        style: {
          logo: '', // URL del logo
          bannerColor: '#FF4D2E',
          buttonColor: '#FF4D2E',
          priceColor: '#FFFFFF',
        },
      };

      window.Culqi.open();

      // Escuchar el token
      window.addEventListener('message', (event) => {
        if (event.origin === 'https://checkout.culqi.com') {
          const { token } = event.data;
          if (token && orderData) {
            handlePaymentComplete(token);
          }
        }
      });
    } else {
      alert('Culqi no está disponible. Por favor recarga la página.');
    }
  };

  const handlePaymentComplete = async (culqiToken: any) => {
    try {
      setIsProcessing(true);
      setError(null);

      // Procesar el cargo con el token de Culqi
      const chargeResponse = await fetch('/api/payments/process-charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: culqiToken.id,
          orderId: orderData.id,
          purchaseId: orderData.order_number, // Este es el ID de la compra
          amount: getTotalAmount(),
        }),
      });

      if (!chargeResponse.ok) {
        throw new Error('Error procesando el pago');
      }

      const chargeResult = await chargeResponse.json();

      if (chargeResult.ok) {
        // Pago exitoso - generar QR y mostrar modal de éxito
        if (purchaseId) {
          await generateAndShowQR(purchaseId);
        }
        setShowPaymentModal(false);
        setShowSuccessModal(true);
      } else {
        throw new Error(chargeResult.error || 'Error procesando el pago');
      }

    } catch (err: any) {
      setError(err.message || "Error procesando el pago");
    } finally {
      setIsProcessing(false);
    }
  };

  const getTotalAmount = () => {
    return Object.entries(selectedTickets).reduce((total, [ticketId, quantity]) => {
      const ticket = ticketTypes.find(t => t.id === ticketId);
      return total + (ticket ? ticket.price * quantity : 0);
    }, 0);
  };

  const generateAndShowQR = async (purchaseId: string) => {
    try {
      // Obtener información del paquete desde la API
      const response = await fetch(`/api/purchase/${purchaseId}/package-info`);
      if (response.ok) {
        const packageData = await response.json();
        if (packageData.qrCode) {
          // Generar QR code
          const qrDataUrl = await QRCode.toDataURL(packageData.qrCode, {
            width: 256,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          setQrDataUrl(qrDataUrl);
          setPurchaseResult(packageData);
        }
      }
    } catch (error) {
      console.error('Error generando QR:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.dni.trim() || !formData.whatsapp.trim()) {
      setError("Por favor completa nombre, DNI y WhatsApp");
      return;
    }

    // Validar DNI (8 dígitos numéricos)
    const dniRegex = /^\d{8}$/;
    if (!dniRegex.test(formData.dni.trim())) {
      setError("El DNI debe tener exactamente 8 dígitos numéricos");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Primero crear la orden de compra en nuestro sistema
      const purchaseData = {
        showId,
        customerName: formData.name.trim(),
        customerDni: formData.dni.trim(),
        customerPhone: formData.whatsapp.trim(),
        tickets: Object.entries(selectedTickets).map(([ticketTypeId, quantity]) => ({
          ticketTypeId,
          quantity,
        })),
        totalAmount: getTotalAmount(),
      };

      const purchaseResponse = await fetch(`/api/shows/${showId}/purchase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(purchaseData),
      });

      if (!purchaseResponse.ok) {
        const errorData = await purchaseResponse.json();
        throw new Error(errorData.error || "Error al procesar la compra");
      }

      const purchaseResult = await purchaseResponse.json();

      // Guardar el purchaseId para usarlo después
      setPurchaseId(purchaseResult.purchaseId);

      // Crear orden de pago en Culqi
      const orderResponse = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: getTotalAmount(),
          currency: 'PEN',
          description: `Compra de tickets - ${showTitle}`,
          orderId: purchaseResult.purchaseId,
        }),
      });

      if (!orderResponse.ok) {
        throw new Error('Error creando orden de pago');
      }

      const orderResult = await orderResponse.json();

      if (orderResult.ok) {
        setOrderData(orderResult.order);

        if (orderResult.mode === 'demo') {
          // Modo demo: mostrar mini-modal de pago simulado
          setShowPaymentModal(true);
          setPaymentStatus('processing');

          // Simular pago automático después de crear la orden
          setTimeout(async () => {
            try {
              const simulateResponse = await fetch('/api/payments/simulate-webhook', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  orderId: orderResult.order.id,
                }),
              });

              if (simulateResponse.ok) {
                setPaymentStatus('success');
                // Generar QR después del pago simulado
                try {
                  if (purchaseId) {
                    await generateAndShowQR(purchaseId);
                  }
                  setShowPaymentModal(false);
                  setShowSuccessModal(true);
                } catch (error) {
                  console.error('Error generando QR:', error);
                  setShowPaymentModal(false);
                  setShowSuccessModal(true); // Mostrar modal aunque falle el QR
                }
              } else {
                setPaymentStatus('error');
              }
            } catch (error) {
              console.error('Error simulando pago:', error);
              setPaymentStatus('error');
            }
          }, 1500); // Delay para mostrar el procesamiento
        } else {
          // Modo real: mostrar mini-modal con link de pago
          setShowPaymentModal(true);
          setPaymentStatus('processing');
          // Aquí se integraría Culqi checkout
        }

      } else {
        throw new Error(orderResult.error || 'Error creando orden');
      }

    } catch (err: any) {
      setError(err.message || "Error al procesar la compra");
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedTicketsList = Object.entries(selectedTickets).map(([ticketId, quantity]) => {
    const ticket = ticketTypes.find(t => t.id === ticketId);
    return {
      name: ticket?.name || "Desconocido",
      quantity,
      price: ticket?.price || 0,
      subtotal: (ticket?.price || 0) * quantity,
    };
  });

  return (
    <>
      {/* Modal de éxito con QR */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="bg-gray-900 border border-white/20 rounded-xl max-w-md w-full mx-4"
            >
              <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                  <QrCode className="w-8 h-8 text-green-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    ¡Compra Exitosa!
                  </h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Tu código QR está listo. Muéstralo en la entrada del evento.
                  </p>
                </div>

                {qrDataUrl && (
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-lg inline-block">
                      <img
                        src={qrDataUrl}
                        alt="Código QR de entrada"
                        className="w-48 h-48"
                      />
                    </div>

                    {purchaseResult && (
                      <div className="text-left bg-gray-800 rounded-lg p-4 space-y-2">
                        <div className="text-white text-sm">
                          <strong>Cliente:</strong> {purchaseResult.customerName}
                        </div>
                        <div className="text-white text-sm">
                          <strong>Entradas:</strong> {purchaseResult.totalTickets}
                        </div>
                        <div className="text-white text-sm">
                          <strong>Código:</strong> {purchaseResult.qrCode}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = qrDataUrl;
                          link.download = `qr-entrada-${purchaseResult?.qrCode || 'ticket'}.png`;
                          link.click();
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-[#FF4D2E] text-white rounded-lg hover:bg-[#FF4D2E]/90 transition-colors text-sm font-medium"
                      >
                        <Download className="w-4 h-4" />
                        Descargar QR
                      </button>
                      <button
                        onClick={() => {
                          setShowSuccessModal(false);
                          onPurchaseComplete();
                          onClose();
                        }}
                        className="flex-1 py-2 px-4 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mini-modal de pago */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="bg-gray-900 border border-white/20 rounded-xl max-w-sm w-full mx-4"
            >
              <div className="p-6 text-center space-y-4">
                {paymentStatus === 'processing' && (
                  <>
                    <div className="w-12 h-12 bg-[#FF4D2E]/20 rounded-full flex items-center justify-center mx-auto">
                      <Loader2 className="w-6 h-6 text-[#FF4D2E] animate-spin" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-2">
                        {orderData?.mode === 'demo' ? 'Procesando Pago Simulado' : 'Preparando Pago'}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {orderData?.mode === 'demo' 
                          ? 'Simulando procesamiento de pago...' 
                          : 'Conectando con pasarela de pago segura...'
                        }
                      </p>
                    </div>
                  </>
                )}

                {paymentStatus === 'success' && (
                  <>
                    <div className="w-12 h-12 bg-green-600/20 rounded-full flex items-center justify-center mx-auto">
                      <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-2">¡Pago Exitoso!</h3>
                      <p className="text-gray-400 text-sm">
                        Tu compra ha sido procesada correctamente. Recibirás confirmación por WhatsApp.
                      </p>
                    </div>
                  </>
                )}

                {paymentStatus === 'error' && (
                  <>
                    <div className="w-12 h-12 bg-red-600/20 rounded-full flex items-center justify-center mx-auto">
                      <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-2">Error en el Pago</h3>
                      <p className="text-gray-400 text-sm">
                        Hubo un problema procesando tu pago. Por favor intenta nuevamente.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowPaymentModal(false)}
                      className="w-full py-2 px-4 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Cerrar
                    </button>
                  </>
                )}

                {orderData?.mode === 'real' && paymentStatus === 'processing' && (
                  <div className="space-y-4">
                    <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                      <p className="text-blue-200 text-sm mb-3">
                        Serás redirigido a la pasarela de pago seguro de Culqi para completar tu compra.
                      </p>
                      <button
                        onClick={handleOpenCulqi}
                        className="w-full py-3 px-4 bg-[#FF4D2E] text-white rounded-lg hover:bg-[#FF4D2E]/90 transition-colors font-semibold"
                      >
                        Ir a Pagar - S/ {getTotalAmount().toFixed(2)}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal principal */}
      <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-gray-900 border border-white/20 rounded-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">
                Confirmar Compra
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Show Info */}
              <div className="mb-6">
                <h3 className="font-semibold text-white mb-2">{showTitle}</h3>
                <div className="text-sm text-gray-400 space-y-1">
                  <div>{showDate}</div>
                  <div>{showTime}</div>
                </div>
              </div>

              {/* Selected Tickets */}
              <div className="mb-6">
                <h4 className="font-medium text-white mb-3">Entradas seleccionadas</h4>
                <div className="space-y-2">
                  {selectedTicketsList.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-white/10">
                      <div>
                        <div className="text-white text-sm">{item.name}</div>
                        <div className="text-gray-400 text-xs">x{item.quantity}</div>
                      </div>
                      <div className="text-white font-medium">
                        S/ {item.subtotal.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-white/10">
                  <span className="font-semibold text-white">Total</span>
                  <span className="text-xl font-bold text-[#FF4D2E]">
                    S/ {getTotalAmount().toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Customer Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Nombre completo *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#FF4D2E] focus:border-transparent"
                      placeholder="Tu nombre completo"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    DNI *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.dni}
                      onChange={(e) => setFormData(prev => ({ ...prev, dni: e.target.value }))}
                      className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#FF4D2E] focus:border-transparent"
                      placeholder="12345678"
                      maxLength={8}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    WhatsApp *
                  </label>
                  <div className="relative">
                    <MessageCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                      className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#FF4D2E] focus:border-transparent"
                      placeholder="+51 999 999 999"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg p-3">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-[#FF4D2E] text-white rounded-lg hover:bg-[#FF4D2E]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Confirmar y Pagar - S/ {getTotalAmount().toFixed(2)}
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
}