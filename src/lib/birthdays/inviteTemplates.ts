// Template definitions for birthday invite QR composition
// Using proportional ratios so we can adapt if we later change resolution.
// Now using Supabase Storage URLs instead of local filesystem paths
export const inviteTemplates = {
  host: {
    // celebrant
    path: 'https://upmqzhfnigsihpcclsao.supabase.co/storage/v1/object/public/birthday-templates/newversioncard.webp',
    width: 1080,
    height: 1920,
    area: { leftRatio: 0.2116, topRatio: 0.1260, sizeRatio: 0.5768 },
    // Footer adaptivo también para el cumpleañero
    nameBar: { leftRatio: 144.2/1080, widthRatio: 791.6/1080, topRatio: 1364/1920, heightRatio: 90/1920 },
  },
  guest: {
    path: 'https://upmqzhfnigsihpcclsao.supabase.co/storage/v1/object/public/birthday-templates/newversioncard.webp',
    width: 1080,
    height: 1920,
    area: { leftRatio: 0.2116, topRatio: 0.1260, sizeRatio: 0.5768 },
    // Footer black bar (medidas del pantallazo aproximadas) -> ancho 791.6, left 144.2 => ratios
    // topRatio estimado: si el margen inferior ~73px => top=(1920-73-59.6)=1787.4 => 0.931; si fuera margen 144px => 0.895.
    // Usamos 0.92 como punto medio inicial; se puede ajustar fácilmente.
    // Aumentamos ligeramente la altura (antes 59.6 -> ahora 80px aprox) para mejor respiración del texto
    nameBar: { leftRatio: 144.2/1080, widthRatio: 791.6/1080, topRatio: 1364/1920, heightRatio: 90/1920 },
  }
} as const;

export type InviteTemplateKind = keyof typeof inviteTemplates;
