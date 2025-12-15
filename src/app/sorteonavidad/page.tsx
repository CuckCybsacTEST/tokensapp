"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QR_THEMES, FORM_FIELDS, type QrTheme, type FormFieldKey } from "@/lib/qr-custom";
import { ImageUpload } from "@/components/ImageUpload";
import { ErrorModal, useErrorModal } from "@/components/ErrorModal";
import { LoadingScreen } from "@/components/LoadingScreen";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

interface QrResult {
  code: string;
  qrDataUrl: string;
  redeemUrl: string;
  expiresAt: string;
  customerName: string;
}

interface Policy {
  allowImageUpload: boolean;
  requireImageUpload?: boolean;
  maxImageSize: number;
  allowedImageFormats: string;
  imageQuality: number;
  maxImageWidth: number;
  maxImageHeight: number;
  allowCustomPhrase: boolean;
  allowCustomData: boolean;
  allowDni: boolean;
  requireWhatsapp: boolean;
  requireDni: boolean;
  requireUniqueDni: boolean;
  defaultTheme: string;
}

export default function SorteoNavidadPage() {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<QrResult | null>(null);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [imageData, setImageData] = useState<any>(null);
  const router = useRouter();
  const { errorModal, showError, closeError } = useErrorModal();

  // Campos activos en el formulario basados en la política
  const activeFields: FormFieldKey[] = React.useMemo(() => {
    const fields: FormFieldKey[] = ['customerName']; // Nombre siempre obligatorio

    // WhatsApp se incluye si es requerido o si la política lo permite
    if (policy?.requireWhatsapp || policy?.allowDni || policy?.allowCustomPhrase || policy?.allowCustomData) {
      fields.push('customerWhatsapp');
    }

    if (policy?.allowDni) {
      fields.push('customerDni');
    }

    if (policy?.allowCustomPhrase) {
      fields.push('customerPhrase');
    }

    if (policy?.allowCustomData) {
      fields.push('customData');
    }

    return fields;
  }, [policy]);

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    try {
      // Usar endpoint público en lugar de admin
      const response = await fetch('/api/qr/policy');
      if (response.ok) {
        const data = await response.json();
        if (data.policy) {
          setPolicy(data.policy);
        }
      }
    } catch (error) {
      console.error('Error loading policy:', error);
      // Fallback: política por defecto hardcodeada para el sorteo navideño
      setPolicy({
        allowImageUpload: true,
        requireImageUpload: true,
        maxImageSize: 20 * 1024 * 1024, // 20MB para fotos grandes
        allowedImageFormats: 'jpg,jpeg,png,webp',
        imageQuality: 85,
        maxImageWidth: 6000,  // Aumentado para fotos de smartphones modernos
        maxImageHeight: 6000, // Aumentado para fotos de smartphones modernos
        allowCustomPhrase: true,
        allowCustomData: true,
        allowDni: true,
        requireWhatsapp: true,
        requireDni: false,
        requireUniqueDni: false,
        defaultTheme: 'navidad'
      });
    }
  };

  const handleImageUploaded = (data: any) => {
    setImageData(data);
  };

  const handleImageRemoved = () => {
    setImageData(null);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validaciones del lado del cliente según la política
      if (policy?.requireWhatsapp && !formData.customerWhatsapp?.trim()) {
        showError('Campo obligatorio', 'El número de WhatsApp es obligatorio');
        setIsSubmitting(false);
        return;
      }

      if (policy?.requireDni && policy?.allowDni && !formData.customerDni?.trim()) {
        showError('Campo obligatorio', 'El DNI es obligatorio');
        setIsSubmitting(false);
        return;
      }

      if (policy?.requireDni && policy?.allowDni && formData.customerDni && !/^\d{8}$/.test(formData.customerDni)) {
        showError('Formato inválido', 'El DNI debe tener exactamente 8 dígitos');
        setIsSubmitting(false);
        return;
      }

      // Validar unicidad de DNI si está configurado (aunque la validación principal es en backend)
      if (policy?.requireUniqueDni && policy?.allowDni && formData.customerDni) {
        // Esta es una validación adicional en frontend, la validación principal está en backend
        console.log('Validando unicidad de DNI:', formData.customerDni);
      }

      // Validar que se haya subido imagen si es obligatoria
      if (policy?.requireImageUpload && !imageData) {
        showError('Imagen obligatoria', 'Debes subir una foto con motivo navideño para participar');
        setIsSubmitting(false);
        return;
      }

      // Asegurar que el WhatsApp tenga el formato correcto
      const processedFormData = {
        ...formData,
        customerWhatsapp: formData.customerWhatsapp?.startsWith('+51')
          ? formData.customerWhatsapp
          : `+51 ${formData.customerWhatsapp?.replace(/\D/g, '') || ''}`
      };

      const requestData = {
        ...processedFormData,
        theme: policy?.defaultTheme || 'default',
        imageUrl: imageData?.imageUrl,
        originalImageUrl: imageData?.originalImageUrl,
        thumbnailUrl: imageData?.thumbnailUrl,
        imageMetadata: imageData?.metadata
      };

      const response = await fetch('/api/qr/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al generar QR');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      const errorMessage = err.message || 'Error desconocido al generar QR';
      showError('Error al generar QR', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadQr = async () => {
    if (!result) return;

    try {
      // Generar imagen compuesta con plantilla
      const brandedQrDataUrl = await generateBrandedQr(result.qrDataUrl);

      // Descargar imagen personalizada
      const link = document.createElement('a');
      link.href = brandedQrDataUrl;
      link.download = `boleto-sorteo-navidad-${result.code}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error generando QR personalizado:', error);
      // Fallback: descargar QR original
      const link = document.createElement('a');
      link.href = result.qrDataUrl;
      link.download = `sorteo-navidad-${result.code}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Función para generar QR personalizado con plantilla
  const generateBrandedQr = (qrDataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas no soportado'));
        return;
      }

      canvas.width = 1080;
      canvas.height = 1080;

      const templateImg = new Image();
      const qrImg = new Image();

      templateImg.crossOrigin = 'anonymous';
      qrImg.crossOrigin = 'anonymous';

      templateImg.onload = () => {
        // Dibujar plantilla como fondo
        ctx.drawImage(templateImg, 0, 0, 1080, 1080);

        qrImg.onload = () => {
          // Dibujar QR en la posición especificada: X=290, Y=297, 500x500px
          ctx.drawImage(qrImg, 290, 297, 500, 500);

          // Convertir a DataURL y resolver
          try {
            const brandedDataUrl = canvas.toDataURL('image/png');
            resolve(brandedDataUrl);
          } catch (error) {
            reject(error);
          }
        };

        qrImg.onerror = () => {
          reject(new Error('Error cargando imagen QR'));
        };

        qrImg.src = qrDataUrl;
      };

      templateImg.onerror = () => {
        reject(new Error('Error cargando plantilla'));
      };

      templateImg.src = '/templates/templatenavidad.png';
    });
  };

  if (result) {
    return (
      <div className="min-h-screen bg-[#0E0606] text-white px-4 py-8 sm:px-6 sm:py-10 md:px-8 lg:px-12 relative overflow-hidden flex flex-col">
        {/* Elementos decorativos navideños - ocultos en móviles pequeños */}
        <div className="hidden sm:block absolute top-10 left-4 md:left-10 text-yellow-400/20 text-2xl md:text-4xl animate-pulse">🎄</div>
        <div className="hidden sm:block absolute top-20 right-4 md:right-16 text-red-400/20 text-xl md:text-3xl animate-pulse delay-1000">🎁</div>
        <div className="hidden md:block absolute bottom-20 left-4 md:left-20 text-green-400/20 text-lg md:text-2xl animate-pulse delay-500">❄️</div>
        <div className="hidden md:block absolute bottom-32 right-4 md:right-10 text-blue-400/20 text-xl md:text-3xl animate-pulse delay-1500">⭐</div>

        <div className="flex-1 flex flex-col justify-center max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl mx-auto relative z-10 w-full">
          <div className="text-center space-y-4 mb-6 sm:mb-8 md:mb-10">
            <div className="inline-block p-4 sm:p-5 bg-gradient-to-r from-green-500/20 to-red-500/20 rounded-full mb-3 sm:mb-4">
              <div className="text-3xl sm:text-4xl md:text-5xl">🎄</div>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 bg-gradient-to-r from-green-400 to-red-400 bg-clip-text text-transparent leading-tight">
              ¡Estás participando!
            </h1>
            <p className="text-white/80 text-sm sm:text-base font-medium px-2">
              Descarga tu QR y guárdalo en un lugar seguro
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6">
            <div className="space-y-4 sm:space-y-5">
              <div className="text-center space-y-3 sm:space-y-4">
                <div>
                  <span className="font-medium text-white/60 block text-xs sm:text-sm">Participante:</span>
                  <p className="mt-1 text-white text-sm sm:text-base break-words">{result.customerName}</p>
                </div>
                <div>
                  <span className="font-medium text-white/60 block text-xs sm:text-sm">DNI:</span>
                  <p className="mt-1 text-white text-sm sm:text-base break-words">{formData.customerDni}</p>
                </div>
              </div>

              {/* QR Code Section - integrado dentro de la tarjeta */}
              <div className="pt-3 sm:pt-4 border-t border-white/10">
                <div className="text-center mb-3 sm:mb-4">
                  <div className="flex justify-center">
                    <div className="inline-flex w-36 sm:w-48 md:w-56 flex-col items-center bg-white p-3 sm:p-4 rounded-xl shadow-lg transform transition-transform hover:scale-105 duration-300">
                      <img
                        src={result.qrDataUrl}
                        alt="Boleto del Gran Sorteo Navideño"
                        className="w-full h-auto object-contain"
                      />
                      <div className="mt-2 flex w-full justify-center">
                        <div className="text-black/60 text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-center">🎄 SORTEO NAVIDAD</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones más pequeños debajo del QR */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <button
                  onClick={downloadQr}
                  className="bg-gradient-to-r from-yellow-500 to-red-500 hover:from-yellow-600 hover:to-red-600 text-white font-medium py-2 px-3 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md text-xs"
                >
                  Descargar QR
                </button>

                <button
                  onClick={() => router.push('/')}
                  className="bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-3 rounded-lg transition-all duration-300 border border-white/20 text-xs"
                >
                  Volver
                </button>
              </div>

              {formData.customerPhrase && (
                <div>
                  <span className="text-xs sm:text-sm font-medium text-white/60 block">Frase personal:</span>
                  <p className="mt-1 italic text-white text-sm sm:text-base break-words">"{formData.customerPhrase}"</p>
                </div>
              )}

              {formData.customData && (
                <div>
                  <span className="text-xs sm:text-sm font-medium text-white/60 block">Dato adicional:</span>
                  <p className="mt-1 text-white text-sm sm:text-base break-words">{formData.customData}</p>
                </div>
              )}

              <div className="pt-3 sm:pt-4 border-t border-white/10">
                <div className="text-center mb-3 sm:mb-4">
                  <div className="inline-flex items-center gap-1 sm:gap-2 bg-gradient-to-r from-yellow-500/20 to-red-500/20 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full border border-yellow-500/30 animate-pulse">
                    <span className="text-yellow-400 text-sm">🎯</span>
                    <span className="text-xs font-bold text-yellow-400 uppercase tracking-wide">Fecha del Sorteo</span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-white mt-1 bg-gradient-to-r from-yellow-400 to-red-400 bg-clip-text text-transparent">
                    {result.expiresAt}
                  </div>
                  <div className="text-xs text-white/60">
                    ¡No te lo pierdas! Sigue nuestras redes
                  </div>
                </div>
              </div>
            </div>

            {/* Social Media Announcement */}
            <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-white/10">
              <div className="text-center">
                <p className="text-white text-sm sm:text-base mb-2 px-2 font-semibold">
                  ¡El sorteo será transmitido en vivo por todas nuestras plataformas!
                </p>
                <p className="text-sm text-white/60">
                  Facebook • Instagram • TikTok • WhatsApp
                </p>
              </div>
            </div>

            <div className="text-center mt-4 sm:mt-5">
              <p className="text-sm sm:text-base text-white/40 px-2">
                🎄 ¡Mucha suerte en el Gran Sorteo Navideño! 🎄
              </p>
              <p className="text-sm text-white/30 mt-2 px-2 leading-relaxed">
                Tu boleto es único y válido para participar
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar pantalla de carga completa si no hay política cargada
  if (!policy) {
    return (
      <LoadingScreen
        title="Configurando sorteo navideño..."
        subtitle="Cargando políticas de participación"
        icon="🎄"
      />
    );
  }

  return (<>
      <div className="min-h-screen bg-[#0E0606] text-white px-4 py-8 sm:px-6 sm:py-10 md:px-8 lg:px-12 relative overflow-hidden flex flex-col">
      {/* Elementos decorativos navideños - ocultos en móviles pequeños */}
      <div className="hidden sm:block absolute top-10 left-4 md:left-10 text-yellow-400/20 text-2xl md:text-4xl animate-pulse">🎄</div>
      <div className="hidden sm:block absolute top-20 right-4 md:right-16 text-red-400/20 text-xl md:text-3xl animate-pulse delay-1000">🎁</div>
      <div className="hidden md:block absolute bottom-20 left-4 md:left-20 text-green-400/20 text-lg md:text-2xl animate-pulse delay-500">❄️</div>
      <div className="hidden md:block absolute bottom-32 right-4 md:right-10 text-blue-400/20 text-xl md:text-3xl animate-pulse delay-1500">⭐</div>

      <div className="flex-1 flex flex-col justify-center max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl mx-auto relative z-10 w-full">
        <div className="text-center space-y-4 mb-6 sm:mb-8 md:mb-10">
          <div className="inline-block p-4 sm:p-5 bg-gradient-to-r from-yellow-500/20 to-red-500/20 rounded-full mb-3 sm:mb-4">
            <div className="text-3xl sm:text-4xl md:text-5xl">🎄</div>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-red-400 bg-clip-text text-transparent leading-tight">
            GRAN SORTEO NAVIDEÑO
          </h1>
          <p className="text-white/80 text-sm sm:text-base font-medium px-2">
            2 CANASTAS NAVIDEÑAS + 2 PAVOS COMPLETOS
          </p>
          <p className="text-white/60 text-sm sm:text-base px-2">
            Completa tus datos y sube una foto familiar navideña para participar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-5">

        {/* Campo de nombre */}
        <div className="space-y-3">
          <label className="text-xs sm:text-sm font-medium text-white/80 block">
            {FORM_FIELDS.customerName.label}
            <span className="text-red-400 ml-1">*</span>
          </label>
          <input
            type={FORM_FIELDS.customerName.type}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all duration-300 text-sm sm:text-base"
            placeholder={FORM_FIELDS.customerName.placeholder}
            value={formData.customerName || ''}
            onChange={(e) => handleInputChange('customerName', e.target.value)}
            required
          />
        </div>

        {/* Campo de WhatsApp */}
        <div className="space-y-3">
          <label className="text-xs sm:text-sm font-medium text-white/80 block">
            {FORM_FIELDS.customerWhatsapp.label}
            {policy?.requireWhatsapp && <span className="text-red-400 ml-1">*</span>}
            {!policy?.requireWhatsapp && <span className="text-gray-400 ml-2 text-xs">(opcional)</span>}
          </label>
          <input
            type={FORM_FIELDS.customerWhatsapp.type}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all duration-300 text-sm sm:text-base"
            placeholder="999 999 999"
            value={formData.customerWhatsapp ? formData.customerWhatsapp.replace(/^\+51\s*/, '') : ''}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, ''); // Solo números
              const formattedValue = value ? `+51 ${value}` : '';
              handleInputChange('customerWhatsapp', formattedValue);
            }}
            required={policy?.requireWhatsapp}
          />
        </div>

        {/* Campo DNI si está permitido */}
        {policy?.allowDni && (
          <div className="space-y-3">
            <label className="text-xs sm:text-sm font-medium text-white/80 block">
              {FORM_FIELDS.customerDni.label}
              {policy?.requireDni && <span className="text-red-400 ml-1">*</span>}
              {policy?.requireUniqueDni && <span className="text-yellow-400 ml-2 text-xs">(único por persona)</span>}
            </label>
            <input
              type={FORM_FIELDS.customerDni.type}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all duration-300 text-sm sm:text-base"
              placeholder={FORM_FIELDS.customerDni.placeholder}
              value={formData.customerDni || ''}
              onChange={(e) => handleInputChange('customerDni', e.target.value)}
              maxLength={8}
              required={policy?.requireDni}
            />
          </div>
        )}

        {/* Subida de imagen - después del DNI */}
        {policy?.allowImageUpload && (
          <ImageUpload
            onImageUploaded={handleImageUploaded}
            onImageRemoved={handleImageRemoved}
            policy={policy}
            disabled={isSubmitting}
          />
        )}

        {/* Campos opcionales restantes (excluyendo DNI que ya se mostró arriba) */}
        {activeFields.filter(field => !['customerName', 'customerWhatsapp', 'customerDni'].includes(field)).map(fieldKey => {
          const field = FORM_FIELDS[fieldKey];
          return (
            <div key={fieldKey} className="space-y-3">
              <label className="text-xs sm:text-sm font-medium text-white/80 block">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </label>
              <input
                type={field.type}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all duration-300 text-sm sm:text-base"
                placeholder={field.placeholder}
                value={formData[fieldKey] || ''}
                onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                required={field.required}
              />
            </div>
          );
        })}

        <button
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-yellow-500 to-red-500 hover:from-yellow-600 hover:to-red-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold py-3 sm:py-4 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 shadow-lg text-sm sm:text-base disabled:opacity-50"
          type="submit"
        >
          {isSubmitting ? "🎄 Generando tu boleto navideño..." : "¡Participar en el Sorteo!"}
        </button>
      </form>

      <div className="text-center mt-6 sm:mt-8">
        <p className="text-sm sm:text-base text-white/40 px-2">
          🎄 ¡Gracias a Ktdral lounge! 🎄
        </p>
        <p className="text-sm text-white/30 mt-2 px-2">
          Cada participante recibe un boleto único personalizado
        </p>
        <div className="mt-6 sm:mt-8 flex justify-center">
          <img
            src="/loungewhite.png"
            alt="Ktdral Lounge"
            className="h-10 sm:h-12 md:h-14 lg:h-16 w-auto opacity-60 hover:opacity-80 transition-opacity duration-300"
          />
        </div>
      </div>

      </div>
    </div>

      <ErrorModal
        isOpen={!!errorModal}
        onClose={closeError}
        title={errorModal?.title || ''}
        message={errorModal?.message || ''}
      />
    </>);
}