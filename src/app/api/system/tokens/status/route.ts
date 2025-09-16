import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateSystemConfigCache } from '@/lib/config';
import { computeTokensEnabled } from '@/lib/tokensMode';
// Prefer Lima timezone by default; allow override via env
const TOKENS_TZ = process.env.TOKENS_TIMEZONE || 'America/Lima';

export async function GET() {
  try {
    // Invalidar la caché para obtener los datos más recientes
    invalidateSystemConfigCache();
    
  // Columns tokensAdminDisabled / tokensTestMode were removed; select only existing columns
  const rows: any[] = await prisma.$queryRawUnsafe(`SELECT id, tokensEnabled, updatedAt FROM SystemConfig WHERE id = 1 LIMIT 1`);
  const cfg = rows && rows.length ? rows[0] : { tokensEnabled: false };

    const now = new Date();
    const computed = computeTokensEnabled({ now, tz: TOKENS_TZ });
    const scheduledEnabled = computed.enabled;

    // Enforcement: si fuera de ventana y DB dice ON, forzar OFF inmediatamente
    if (!scheduledEnabled && Boolean(cfg.tokensEnabled)) {
      try {
        await prisma.$executeRawUnsafe(`UPDATE SystemConfig SET tokensEnabled = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = 1`);
        invalidateSystemConfigCache();
        cfg.tokensEnabled = 0;
      } catch (e) {
        console.error('[status] enforcement update failed', e);
      }
    }

    // Calcular tiempos de activación/desactivación en TZ fija
    // Próximas fronteras diarias en Lima: hoy 18:00; próximo 00:00
    const activationTime = computed.nextToggleIso && !Boolean(cfg.tokensEnabled)
      ? computed.nextToggleIso
      : (() => {
          // hoy a las 18:00 en TZ; si ya pasó, mañana 18:00
          // Usamos computeTokensEnabled para derivar la siguiente activación si fuese necesario
          const alt = computeTokensEnabled({ now, tz: TOKENS_TZ });
          return alt.nextToggleIso || now.toISOString();
        })();
    const deactivationTime = computed.nextToggleIso && Boolean(cfg.tokensEnabled)
      ? computed.nextToggleIso
      : (() => computed.nextToggleIso || now.toISOString())();

    return NextResponse.json({
  tokensEnabled: Boolean(cfg.tokensEnabled), // actual DB state (may be manual override)
  scheduledEnabled,
      serverTimeIso: now.toISOString(),
      timezone: TOKENS_TZ,
      nextSchedule: computed.nextToggleIso || now.toISOString(),
      // Información adicional para temporizadores en TZ fija
      activationTime: String(activationTime),
      deactivationTime: String(deactivationTime),
      systemTime: now.toISOString()
    });
  } catch (e: any) {
    console.error('status endpoint error', e);
    return NextResponse.json({ error: 'internal_server_error', message: String(e?.message || e) }, { status: 500 });
  }
}
