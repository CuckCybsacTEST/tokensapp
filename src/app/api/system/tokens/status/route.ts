import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateSystemConfigCache } from '@/lib/config';

export async function GET() {
  try {
    // Invalidar la caché para obtener los datos más recientes
    invalidateSystemConfigCache();
    
  // Columns tokensAdminDisabled / tokensTestMode were removed; select only existing columns
  const rows: any[] = await prisma.$queryRawUnsafe(`SELECT id, tokensEnabled, updatedAt FROM SystemConfig WHERE id = 1 LIMIT 1`);
  const cfg = rows && rows.length ? rows[0] : { tokensEnabled: false };

    const now = new Date();

    // Calcular tiempos de activación/desactivación
    // Próximas fronteras diarias locales
    const activationDate = new Date(now);
    activationDate.setHours(18, 0, 0, 0); // hoy a las 18:00
    if (now.getHours() >= 18) {
      // si ya pasaron las 18:00, la próxima activación es mañana a las 18:00
      activationDate.setDate(activationDate.getDate() + 1);
    }

    const deactivationDate = new Date(now);
    deactivationDate.setHours(0, 0, 0, 0); // hoy a las 00:00
    // la próxima desactivación siempre es el próximo 00:00 (mañana a las 00:00)
    deactivationDate.setDate(deactivationDate.getDate() + 1);

    // Determinar el próximo cambio según el estado actual
    const nextScheduleDate = Boolean(cfg.tokensEnabled) ? deactivationDate : activationDate;

    return NextResponse.json({
      tokensEnabled: Boolean(cfg.tokensEnabled),
      serverTimeIso: now.toISOString(),
      nextSchedule: nextScheduleDate.toISOString(),
      // Información adicional para temporizadores
  activationTime: activationDate.toISOString(),
  deactivationTime: deactivationDate.toISOString(),
      systemTime: now.toISOString()
    });
  } catch (e: any) {
    console.error('status endpoint error', e);
    return NextResponse.json({ error: 'internal_server_error', message: String(e?.message || e) }, { status: 500 });
  }
}
