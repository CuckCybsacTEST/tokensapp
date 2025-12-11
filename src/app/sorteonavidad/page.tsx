"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QR_THEMES, FORM_FIELDS, type QrTheme, type FormFieldKey } from "@/lib/qr-custom";
import { ImageUpload } from "@/components/ImageUpload";

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
  const [error, setError] = useState<string | null>(null);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [imageData, setImageData] = useState<any>(null);
  const router = useRouter();

  // Campos activos en el formulario basados en la política
  const activeFields: FormFieldKey[] = React.useMemo(() => {
    const fields: FormFieldKey[] = ['customerName']; // Nombre siempre obligatorio

    // WhatsApp puede ser opcional según la política
    fields.push('customerWhatsapp');

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
      const response = await fetch('/api/admin/custom-qrs/policy/active');
      if (response.ok) {
        const data = await response.json();
        if (data.policy) {
          setPolicy(data.policy);
        } else {
          // Fallback: intentar con políticas por defecto
          const fallbackResponse = await fetch('/api/admin/custom-qrs/policy');
          if (fallbackResponse.ok) {
            const policies = await fallbackResponse.json();
            const defaultPolicy = policies.find((p: any) => p.isDefault) || policies[0];
            if (defaultPolicy) {
              setPolicy(defaultPolicy);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading policy:', error);
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
    setError(null);

    try {
      // Validaciones del lado del cliente según la política
      if (policy?.requireWhatsapp && !formData.customerWhatsapp?.trim()) {
        setError('El número de WhatsApp es obligatorio');
        setIsSubmitting(false);
        return;
      }

      if (policy?.requireDni && policy?.allowDni && !formData.customerDni?.trim()) {
        setError('El DNI es obligatorio');
        setIsSubmitting(false);
        return;
      }

      if (policy?.requireDni && policy?.allowDni && formData.customerDni && !/^\d{8}$/.test(formData.customerDni)) {
        setError('El DNI debe tener exactamente 8 dígitos');
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
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadQr = () => {
    if (!result) return;

    const link = document.createElement('a');
    link.href = result.qrDataUrl;
    link.download = `sorteo-navidad-${result.code}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (result) {
    return (
      <div className="min-h-screen bg-[#0E0606] text-white px-4 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-12 relative overflow-hidden">
        {/* Elementos decorativos navideños - ocultos en móviles pequeños */}
        <div className="hidden sm:block absolute top-10 left-4 md:left-10 text-yellow-400/20 text-2xl md:text-4xl animate-pulse">🎄</div>
        <div className="hidden sm:block absolute top-20 right-4 md:right-16 text-red-400/20 text-xl md:text-3xl animate-pulse delay-1000">🎁</div>
        <div className="hidden md:block absolute bottom-20 left-4 md:left-20 text-green-400/20 text-lg md:text-2xl animate-pulse delay-500">❄️</div>
        <div className="hidden md:block absolute bottom-32 right-4 md:right-10 text-blue-400/20 text-xl md:text-3xl animate-pulse delay-1500">⭐</div>

        <div className="max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl mx-auto relative z-10">
          <div className="text-center space-y-4 mb-4 sm:mb-6">
            <div className="inline-block p-2 sm:p-3 md:p-4 bg-gradient-to-r from-green-500/20 to-red-500/20 rounded-full mb-3 sm:mb-4">
              <div className="text-2xl sm:text-3xl md:text-4xl">🎄</div>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 bg-gradient-to-r from-green-400 to-red-400 bg-clip-text text-transparent leading-tight">
              ¡Tu Boleto Navideño Está Listo!
            </h1>
            <p className="text-white/80 text-xs sm:text-sm md:text-base font-medium px-2">
              ¡Ya estás participando en el Gran Sorteo Navideño!
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-5">
            <div className="space-y-2 sm:space-y-3">
              <div className="text-center space-y-3 sm:space-y-4">
                <div>
                  <span className="font-medium text-white/60 block text-xs sm:text-sm">Participante:</span>
                  <p className="mt-1 text-white text-sm sm:text-base break-words">{result.customerName}</p>
                </div>
                <div>
                  <span className="font-medium text-white/60 block text-xs sm:text-sm">WhatsApp:</span>
                  <p className="mt-1 text-white text-sm sm:text-base break-words">{formData.customerWhatsapp}</p>
                </div>
              </div>

              {/* QR Code Section - integrado dentro de la tarjeta */}
              <div className="pt-1 sm:pt-2 border-t border-white/10">
                <div className="text-center mb-2 sm:mb-3">
                  <span className="text-xs sm:text-sm font-medium text-white/60 block mb-1">Tu boleto del sorteo:</span>
                  <div className="bg-white p-3 sm:p-4 rounded-xl shadow-lg transform transition-transform hover:scale-105 duration-300 inline-block mx-auto">
                    <img
                      src={result.qrDataUrl}
                      alt="Boleto del Gran Sorteo Navideño"
                      className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 object-contain"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-black/60 text-[9px] sm:text-[10px] font-mono uppercase tracking-widest">🎄 SORTEO NAVIDAD</div>
                      <button
                        onClick={downloadQr}
                        className="text-black/40 hover:text-black/60 transition-colors p-1 rounded hover:bg-black/5"
                        title="Descargar boleto del sorteo"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7,10 12,15 17,10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones más pequeños debajo del QR */}
              <div className="flex gap-2 justify-center mt-3">
                <button
                  onClick={downloadQr}
                  className="bg-gradient-to-r from-yellow-500 to-red-500 hover:from-yellow-600 hover:to-red-600 text-white font-medium py-2 px-3 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md text-xs"
                >
                  Descargar Boleto
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

              <div className="pt-2 sm:pt-3 border-t border-white/10">
                <div className="text-center mb-2 sm:mb-3">
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
            <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-white/10">
              <div className="text-center">
                <p className="text-white/80 text-xs sm:text-sm mb-1 sm:mb-2 px-2">
                  ¡El sorteo será transmitido en vivo por todas nuestras plataformas!
                </p>
                <p className="text-xs text-white/60">
                  Facebook • Instagram • TikTok • WhatsApp
                </p>
              </div>
            </div>

            <div className="text-center mt-3 sm:mt-4">
              <p className="text-xs sm:text-sm text-white/40 px-2">
                🎄 ¡Mucha suerte en el Gran Sorteo Navideño! 🎄
              </p>
              <p className="text-xs text-white/30 mt-1 px-2 leading-relaxed">
                Tu boleto es único y válido para participar
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E0606] text-white px-4 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-12 relative overflow-hidden">
      {/* Elementos decorativos navideños - ocultos en móviles pequeños */}
      <div className="hidden sm:block absolute top-10 left-4 md:left-10 text-yellow-400/20 text-2xl md:text-4xl animate-pulse">🎄</div>
      <div className="hidden sm:block absolute top-20 right-4 md:right-16 text-red-400/20 text-xl md:text-3xl animate-pulse delay-1000">🎁</div>
      <div className="hidden md:block absolute bottom-20 left-4 md:left-20 text-green-400/20 text-lg md:text-2xl animate-pulse delay-500">❄️</div>
      <div className="hidden md:block absolute bottom-32 right-4 md:right-10 text-blue-400/20 text-xl md:text-3xl animate-pulse delay-1500">⭐</div>

      <div className="max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl mx-auto relative z-10">
        <div className="text-center space-y-2 mb-4 sm:mb-6 md:mb-8">
          <div className="inline-block p-2 sm:p-3 bg-gradient-to-r from-yellow-500/20 to-red-500/20 rounded-full mb-2 sm:mb-3">
            <div className="text-2xl sm:text-3xl md:text-4xl">🎄</div>
          </div>
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-red-400 bg-clip-text text-transparent leading-tight">
            GRAN SORTEO NAVIDEÑO
          </h1>
          <p className="text-white/80 text-xs sm:text-sm font-medium px-2">
            2 CANASTAS NAVIDEÑAS + 2 PAVOS COMPLETOS
          </p>
          <p className="text-white/60 text-xs sm:text-sm px-2">
            Completa tus datos y sube una foto familiar navideña para participar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4">

        {/* Campo de nombre */}
        <div className="space-y-2">
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
        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-medium text-white/80 block">
            {FORM_FIELDS.customerWhatsapp.label}
            {policy?.requireWhatsapp && <span className="text-red-400 ml-1">*</span>}
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
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-medium text-white/80 block">
              {FORM_FIELDS.customerDni.label}
              {policy?.requireDni && <span className="text-red-400 ml-1">*</span>}
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
        {policy && (
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
            <div key={fieldKey} className="space-y-2">
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

        {error && (
          <div className="p-3 sm:p-4 bg-red-900/20 border border-red-500/30 rounded-lg backdrop-blur-sm">
            <p className="text-xs sm:text-sm text-red-300">{error}</p>
          </div>
        )}

        <button
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-yellow-500 to-red-500 hover:from-yellow-600 hover:to-red-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold py-3 sm:py-4 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 shadow-lg text-sm sm:text-base disabled:opacity-50"
          type="submit"
        >
          {isSubmitting ? "🎄 Generando tu boleto navideño..." : "¡Participar en el Sorteo!"}
        </button>
      </form>

      <div className="text-center mt-3 sm:mt-4">
        <p className="text-xs sm:text-sm text-white/40 px-2">
          🎄 ¡Gracias Ktdral Lounge por este increíble sorteo navideño! 🎄
        </p>
        <p className="text-xs text-white/30 mt-1 px-2">
          Cada participante recibe un boleto único personalizado
        </p>
        <div className="mt-4 sm:mt-6 flex justify-center">
          <img
            src="/loungewhite.png"
            alt="Ktdral Lounge"
            className="h-8 sm:h-10 md:h-12 lg:h-14 w-auto opacity-60 hover:opacity-80 transition-opacity duration-300"
          />
        </div>
      </div>
    </div>
    </div>
  );
}