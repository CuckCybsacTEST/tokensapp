import { redirect } from 'next/navigation';

/**
 * Función para redirigir de la ruta antigua a la nueva interfaz de ruleta
 * @param tokenId - El ID del token a redirigir
 */
export default function redirectToMarketingRoulette(tokenId: string) {
  // Evitamos cualquier operación del lado del cliente
  // y simplemente redirigimos al nuevo path con el tokenId como parámetro de consulta
  redirect(`/marketing/ruleta?tokenId=${encodeURIComponent(tokenId)}`);
}
