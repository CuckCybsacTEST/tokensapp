"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { FormattedOffer } from '@/lib/types/offers';
import { CulqiProvider, useCheckout } from 'react-culqi-next';

interface OffersSectionProps {
  offers?: FormattedOffer[];
}

export function OffersSection({ offers: initialOffers }: OffersSectionProps = {}) {
  return (
    <CulqiProvider
      publicKey={process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY || 'pk_test_XXXXXXXXXXXXXXXX'}
    >
      <OffersSectionContent offers={initialOffers} />
    </CulqiProvider>
  );
}

function OffersSectionContent({ offers: initialOffers }: OffersSectionProps = {}) {
  const [offers, setOffers] = useState<FormattedOffer[]>(initialOffers || []);
  const [loading, setLoading] = useState(!initialOffers);
  const [error, setError] = useState<string | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<FormattedOffer | null>(null);
  const [customerData, setCustomerData] = useState({
    name: '',
    whatsapp: ''
  });
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [currentPurchaseId, setCurrentPurchaseId] = useState<string | null>(null);
  const [purchaseResult, setPurchaseResult] = useState<{
    qrDataUrl: string;
    purchaseId: string;
    amount: number;
  } | null>(null);

  // Hook de Culqi debe estar en el nivel superior
  const { openCulqi, token: culqiToken, error: culqiError } = useCheckout({
    settings: {
      amount: 0, // Se actualizará cuando se seleccione una oferta
      currency: 'PEN',
      title: 'Pago de Oferta',
    }
  });

  // Efecto para procesar el pago cuando el token esté disponible
  useEffect(() => {
    if (culqiToken && selectedOffer && paymentProcessing && currentPurchaseId) {
      processCulqiPayment(culqiToken.id);
    }
  }, [culqiToken, selectedOffer, paymentProcessing, currentPurchaseId]);

  // Efecto para manejar errores de Culqi
  useEffect(() => {
    if (culqiError) {
      console.error('Error de Culqi:', culqiError);
      alert('Error en el procesamiento del pago: ' + culqiError.user_message);
      setPaymentProcessing(false);
      setCurrentPurchaseId(null);
    }
  }, [culqiError]);

  useEffect(() => {
    if (!initialOffers) {
      fetchOffers();
    }
  }, [initialOffers]);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/offers');
      const data = await response.json();

      if (data.success) {
        setOffers(data.data);
      } else {
        setError('Error al cargar ofertas');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (offer: FormattedOffer) => {
    setSelectedOffer(offer);
    setShowPurchaseModal(true);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedOffer) return;

    try {
      setPurchaseLoading(true);

      // Crear la compra con datos del cliente (sin generar QR aún)
      const purchaseResponse = await fetch(`/api/offers/${selectedOffer.id}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerData.name,
          customerWhatsapp: customerData.whatsapp,
          skipQR: true // No generar QR hasta que el pago sea exitoso
        })
      });

      const purchaseData = await purchaseResponse.json();

      if (!purchaseData.success) {
        alert(purchaseData.error || 'Error al iniciar compra');
        return;
      }

      const { purchaseId } = purchaseData.data;

      // Ahora procesar el pago con Culqi
      await processPayment(purchaseId);

    } catch (err) {
      console.error('Error en compra:', err);
      alert('Error en el proceso de compra');
    } finally {
      setPurchaseLoading(false);
    }
  };

  const processPayment = async (purchaseId: string) => {
    try {
      setPaymentProcessing(true);
      setCurrentPurchaseId(purchaseId);

      // DEMO MODE: Simular pago exitoso sin Culqi
      console.log('🎭 DEMO MODE: Simulando pago exitoso...');

      // Simular delay de procesamiento
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simular pago exitoso
      await processDemoPayment(purchaseId);

    } catch (err) {
      console.error('Error procesando pago:', err);
      alert('Error en el procesamiento del pago');
      setPaymentProcessing(false);
      setCurrentPurchaseId(null);
    }
  };

  const processCulqiPayment = async (tokenId: string) => {
    try {
      if (!selectedOffer || !currentPurchaseId) return;

      // Procesar el pago con el token
      const paymentResponse = await fetch(`/api/offers/${selectedOffer.id}/process-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tokenId,
          purchaseId: currentPurchaseId,
          customerName: customerData.name,
          customerWhatsapp: customerData.whatsapp
        })
      });

      const paymentData = await paymentResponse.json();

      if (paymentData.success) {
        // Pago exitoso - mostrar el QR
        if (paymentData.data?.qrDataUrl) {
          setPurchaseResult({
            qrDataUrl: paymentData.data.qrDataUrl,
            purchaseId: currentPurchaseId,
            amount: Number(paymentData.data.amount)
          });
        } else {
          alert('Pago procesado exitosamente. El código QR estará disponible pronto.');
        }

        // Cerrar modal de compra y resetear
        setShowPurchaseModal(false);
        setSelectedOffer(null);
        setCustomerData({ name: '', whatsapp: '' });
        setCurrentPurchaseId(null);
      } else {
        alert('Error en el procesamiento del pago: ' + paymentData.error);
        setCurrentPurchaseId(null);
      }

    } catch (err) {
      console.error('Error procesando pago:', err);
      alert('Error en el procesamiento del pago');
      setCurrentPurchaseId(null);
    } finally {
      setPaymentProcessing(false);
    }
  };

  const processDemoPayment = async (purchaseId: string) => {
    try {
      if (!selectedOffer) return;

      // Procesar el pago en modo demo (simular token de Culqi)
      const demoToken = 'demo_token_' + Date.now();

      const paymentResponse = await fetch(`/api/offers/${selectedOffer.id}/process-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: demoToken,
          purchaseId: purchaseId,
          customerName: customerData.name,
          customerWhatsapp: customerData.whatsapp,
          demo: true // Indicar que es modo demo
        })
      });

      const paymentData = await paymentResponse.json();

      if (paymentData.success) {
        // Pago exitoso - mostrar el QR
        if (paymentData.data?.qrDataUrl) {
          setPurchaseResult({
            qrDataUrl: paymentData.data.qrDataUrl,
            purchaseId: purchaseId,
            amount: Number(paymentData.data.amount)
          });
        } else {
          alert('Pago procesado exitosamente. El código QR estará disponible pronto.');
        }

        // Cerrar modal de compra y resetear
        setShowPurchaseModal(false);
        setSelectedOffer(null);
        setCustomerData({ name: '', whatsapp: '' });
        setCurrentPurchaseId(null);
      } else {
        alert('Error en el procesamiento del pago: ' + paymentData.error);
        setCurrentPurchaseId(null);
      }

    } catch (err) {
      console.error('Error procesando pago demo:', err);
      alert('Error en el procesamiento del pago demo');
      setCurrentPurchaseId(null);
    } finally {
      setPaymentProcessing(false);
    }
  };

  if (loading) {
    return (
      <section className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/70">Cargando ofertas...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchOffers}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            Reintentar
          </button>
        </div>
      </section>
    );
  }

  if (offers.length === 0) {
    return (
      <section className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ofertas Especiales</h2>
          <p className="text-white/70">No hay ofertas disponibles en este momento.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Ofertas Especiales
          </h2>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Descubre nuestras promociones exclusivas con disponibilidad limitada
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className="bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all duration-300 hover:transform hover:scale-105"
            >
              {/* Imagen de oferta */}
              <div className="relative aspect-[1080/1350] bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                {offer.imageUrl ? (
                  <Image
                    src={offer.imageUrl}
                    alt={offer.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-6xl opacity-50">🎁</div>
                  </div>
                )}

                {/* Badge de disponibilidad */}
                <div className="absolute top-4 left-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    offer.isAvailable
                      ? 'bg-green-500/90 text-white'
                      : 'bg-red-500/90 text-white'
                  }`}>
                    {offer.isAvailable ? 'Disponible' : 'No disponible'}
                  </span>
                </div>

                {/* Badge de descuento */}
                {offer.originalPrice && Number(offer.originalPrice) > Number(offer.price) && (
                  <div className="absolute top-4 right-4">
                    <span className="px-3 py-1 bg-red-500/90 text-white rounded-full text-sm font-bold">
                      -{Math.round(((Number(offer.originalPrice) - Number(offer.price)) / Number(offer.originalPrice)) * 100)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Contenido */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2">{offer.title}</h3>
                <p className="text-white/70 mb-4 line-clamp-3">{offer.description}</p>

                {/* Precios */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl font-bold text-white">
                    S/ {Number(offer.price).toFixed(2)}
                  </span>
                  {offer.originalPrice && Number(offer.originalPrice) > Number(offer.price) && (
                    <span className="text-lg text-white/50 line-through">
                      S/ {Number(offer.originalPrice).toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Stock */}
                {offer.maxStock && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-white/70 mb-1">
                      <span>Disponible</span>
                      <span>{offer.currentStock} / {offer.maxStock}</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${offer.maxStock > 0 ? (offer.currentStock! / offer.maxStock) * 100 : 0}%`
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Disponibilidad temporal */}
                <div className="mb-4">
                  <p className="text-sm text-white/60">{offer.availabilityText}</p>
                </div>

                {/* Botón de compra */}
                <button
                  onClick={() => handlePurchase(offer)}
                  disabled={!offer.isAvailable}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-300 ${
                    offer.isAvailable
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                      : 'bg-gray-500/50 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  {offer.isAvailable ? 'Comprar Ahora' : 'No Disponible'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de compra */}
      {showPurchaseModal && selectedOffer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 max-w-md w-full border border-white/10">
            <h3 className="text-2xl font-bold text-white mb-6 text-center">
              Comprar {selectedOffer.title}
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={customerData.name}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ingresa tu nombre completo"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  WhatsApp
                </label>
                <input
                  type="tel"
                  value={customerData.whatsapp}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, whatsapp: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="+51 999 999 999"
                  required
                />
              </div>
            </div>

            <div className="text-center mb-6">
              <p className="text-white/80">
                Precio: <span className="font-bold text-purple-400">S/ {selectedOffer.price}</span>
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowPurchaseModal(false);
                  setSelectedOffer(null);
                  setCustomerData({ name: '', whatsapp: '' });
                }}
                className="flex-1 py-3 px-6 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors duration-300"
                disabled={purchaseLoading}
              >
                Cancelar
              </button>

              <button
                onClick={handleConfirmPurchase}
                disabled={purchaseLoading || !customerData.name || !customerData.whatsapp}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {purchaseLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Procesando Demo...
                  </div>
                ) : (
                  'Confirmar Compra (Demo)'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de resultado de compra con QR */}
      {purchaseResult && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 max-w-md w-full border border-white/10 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">¡Compra Exitosa!</h3>
              <p className="text-white/70">Presenta este código QR para validar tu compra</p>
            </div>

            <div className="bg-white p-4 rounded-lg mb-6 inline-block">
              <img
                src={purchaseResult.qrDataUrl}
                alt="Código QR de compra"
                className="w-48 h-48 mx-auto"
              />
            </div>

            <div className="text-white/80 mb-6">
              <p className="font-semibold">ID de Compra: {purchaseResult.purchaseId}</p>
              <p>Total: S/ {purchaseResult.amount.toFixed(2)}</p>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-white/60">
                Muestra este QR al personal para completar la validación
              </p>

              <button
                onClick={() => setPurchaseResult(null)}
                className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-colors duration-300"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}