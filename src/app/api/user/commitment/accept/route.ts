import { NextResponse } from 'next/server';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth-user';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
const REQUIRED_VERSION = 1;

export async function POST(req: Request) {
  try {
  const raw = getUserSessionCookieFromRequest(req as any);
  const session = await verifyUserSessionCookie(raw);
    if (!session) return NextResponse.json({ ok:false, code:'UNAUTHORIZED' }, { status:401 });
    const body = await req.json().catch(()=>({}));
    const version = Number(body.version);
    if (!Number.isFinite(version) || version < REQUIRED_VERSION) {
      return NextResponse.json({ ok:false, code:'INVALID_VERSION'}, { status:400 });
    }
    // Prisma client types aún no incluyen los campos (pendiente regenerar). Usamos raw temporalmente.
    await (prisma as any).$executeRawUnsafe(
      'UPDATE "User" SET "commitmentVersionAccepted"=$1, "commitmentAcceptedAt"=NOW() WHERE id=$2',
      version,
      session.userId
    );
    return NextResponse.json({ ok:true });
  } catch (e:any) {
    return NextResponse.json({ ok:false, code:'INTERNAL', message: String(e?.message||e) }, { status:500 });
  }
}