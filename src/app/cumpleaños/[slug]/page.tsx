"use client";
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function CumpleañosPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

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
            // Redirigir con el referrerId
            router.replace(`/marketing/birthdays/reservar?ref=${data.referrer.id}`);
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

  // Mostrar loading mientras se procesa
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0E0606] to-[#07070C]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400 mx-auto mb-4"></div>
        <p className="text-white/80">Redirigiendo...</p>
      </div>
    </div>
  );
}