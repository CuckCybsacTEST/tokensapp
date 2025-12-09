import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyUserSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { computeBusinessDayFromUtc, getConfiguredCutoffHour } from '@/lib/attendanceDay';
import { mapAreaToStaffRole } from '@/lib/staff-roles';
import { isValidArea } from '@/lib/areas';
import { StaffRole } from '@prisma/client';
import UHomeContent from './UHomeContent';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default async function UHome() {
  // Validar sesión de colaborador; si no está logueado, ir a /u/login
  const raw = cookies().get('user_session')?.value;
  const session = await verifyUserSessionCookie(raw);
  if (!session) {
    redirect(`/u/login?next=${encodeURIComponent('/u')}`);
  }

  // Mostrar control de tokens a cualquier STAFF (antes solo Caja)
  const isStaff = session.role === 'STAFF';

  // Verificar acceso a la carta y determinar rol específico
  let hasCartaAccess = false;
  let staffRole: StaffRole | null = null;
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { person: { select: { area: true } } }
    });
    const userArea = user?.person?.area;
    const validArea = userArea && isValidArea(userArea) ? userArea : null;
    staffRole = mapAreaToStaffRole(validArea);
    hasCartaAccess = !!staffRole || session.role === 'STAFF';
  } catch {}

  // Calcular próxima acción para hoy según última marca real (día laboral)
  const cutoff = getConfiguredCutoffHour();
  const todayBD = computeBusinessDayFromUtc(new Date(), cutoff);
  // Vamos a pasar solo el último tipo detectado al componente inteligente; éste derivará la acción.
  let lastType: 'IN' | 'OUT' | null = null;
  let personName: string | undefined;
  let commitmentAcceptedVersion = 0;
  const REQUIRED_COMMITMENT_VERSION = 1;
  try {
    const me: any = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { person: { select: { name: true, scans: { where: { businessDay: todayBD }, select: { type: true, scannedAt: true }, orderBy: { scannedAt: 'desc' }, take: 5 } } } }
    });
    const scans = me?.person?.scans || [];
    personName = me?.person?.name || undefined;
    commitmentAcceptedVersion = me?.commitmentVersionAccepted || 0;
    const last = scans[0];
    if(last && (last.type === 'IN' || last.type === 'OUT')) lastType = last.type;
  } catch {}

  // Obtener información adicional del usuario
  let hasDefaultPassword = false;
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { forcePasswordChange: true, person: { select: { dni: true } } }
    });
    hasDefaultPassword = user?.forcePasswordChange || false;
  } catch {}

  return (
    <UHomeContent
      session={session}
      isStaff={isStaff}
      hasCartaAccess={hasCartaAccess}
      lastType={lastType}
      personName={personName}
      commitmentAcceptedVersion={commitmentAcceptedVersion}
      hasDefaultPassword={hasDefaultPassword}
    />
  );
}
