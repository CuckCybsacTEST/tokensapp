"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function CumpleañosPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params && typeof params === 'object' && 'slug' in params ? (params.slug as string) : "";
  const [referrer, setReferrer] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      // Si no hay slug, redirigir a la página normal
      router.replace('/marketing/birthdays/reservar');
      return;
    }

    // Buscar el referrer por slug
    const fetchReferrer = async () => {
      try {
        const response = await fetch(`/api/birthdays/referrers/slug/${slug}`);
        if (response.ok) {
          const data = await response.json();
          if (data.referrer && data.referrer.active) {
            // Guardar el referrer y mostrar modal
            setReferrer(data.referrer);
            setShowModal(true);
            setLoading(false);
            return;
          }
        }
        // Si no se encuentra o no está activo, redirigir a la página normal
        router.replace('/marketing/birthdays/reservar');
      } catch (error) {
        console.error('Error fetching referrer:', error);
        // En caso de error, redirigir a la página normal
        router.replace('/marketing/birthdays/reservar');
      }
    };

    fetchReferrer();
  }, [slug, router]);

  const handleContinue = () => {
    if (referrer?.active && referrer?.approvalStatus === 'APPROVED') {
      router.replace(`/marketing/birthdays/reservar?ref=${referrer.id}`);
    } else {
      router.replace('/registrarreferidos');
    }
  };

  // Mostrar loading mientras se procesa
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0E0606] to-[#07070C]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400 mx-auto mb-4"></div>
          <p className="text-white/80">Cargando información...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Modal informativo del referrer */}
      {showModal && referrer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎉</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {referrer.approvalStatus === 'PENDING' ? 'Link en revisión' : '¡Bienvenido!'}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {referrer.approvalStatus === 'PENDING'
                  ? <>El link de <span className="font-semibold text-amber-500">{referrer.name}</span> está pendiente de aprobación.</>
                  : <>Has sido referido por <span className="font-semibold text-orange-500">{referrer.name}</span></>}
              </p>
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {referrer.approvalStatus === 'PENDING'
                    ? 'Tu registro fue recibido. Cuando el equipo lo apruebe, este mismo link quedará habilitado para compartirlo y generar reservas.'
                    : referrer.active
                      ? 'Estás accediendo a través de un enlace especial. Disfruta de beneficios exclusivos y precios especiales para tu celebración.'
                      : 'Este link no está activo por el momento. Puedes recuperar tu estado desde el registro público.'}
                </p>
              </div>
            </div>
            <button
              onClick={handleContinue}
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              {referrer.approvalStatus === 'APPROVED' && referrer.active ? 'Continuar a Reservar' : 'Ir al registro de referidos'}
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
              {referrer.approvalStatus === 'APPROVED' && referrer.active
                ? 'Te llevaremos a la página de reservas con beneficios exclusivos'
                : 'Ahí podrás revisar tu estado y recuperar tu link o QR'}
            </p>
          </div>
        </div>
      )}

      {/* Fallback por si algo sale mal */}
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0E0606] to-[#07070C]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400 mx-auto mb-4"></div>
          <p className="text-white/80">Procesando...</p>
        </div>
      </div>
    </>
  );
}