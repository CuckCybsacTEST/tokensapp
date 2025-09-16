import redirectToMarketingRoulette from './redirectToMarketing';
import { getSystemConfig } from '@/lib/config';

export const revalidate = 0; // equivalente a force-dynamic para este caso

export default async function TokenRedirectPage({ params }: { params: { tokenId: string } }) {
  // Verificamos si la redirección está habilitada mediante una feature flag
  const cfg = await getSystemConfig();
  
  // Si el sistema tiene habilitada la bandera "useMarketingRouletteUI"
  // redireccionar a la nueva interfaz, de lo contrario seguir usando la UI actual
  if (cfg.featureFlags?.useMarketingRouletteUI) {
    return redirectToMarketingRoulette(params.tokenId);
  }
  
  // Si la feature flag no está habilitada, se redirige de vuelta al handler original
  // Para evitar un ciclo de redirección, modificamos la URL para que incluya "useOriginal=true"
  // El handler original verificará este parámetro
  return Response.redirect(new URL(`/r/${params.tokenId}?useOriginal=true`, process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));
}
