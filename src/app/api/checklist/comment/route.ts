import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSessionCookieFromRequest as getUserCookie, verifyUserSessionCookie as verifyUserCookie } from "@/lib/auth";
import { newId } from "@/lib/id";

export const dynamic = 'force-dynamic';

function isValidDay(day: string | null): day is string { return !!day && /^\d{4}-\d{2}-\d{2}$/.test(day); }

const lastByUser: Map<string, number> = new Map();

export async function POST(req: Request) {
  try {
    const raw = getUserCookie(req);
    const session = await verifyUserCookie(raw);
    if (!session) return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });

    const body = await req.json().catch(() => null) as { day?: string; text?: string } | null;
    const day = (body?.day || '').trim();
    if (!isValidDay(day)) return NextResponse.json({ ok: false, code: 'INVALID_DAY' }, { status: 400 });
    const text = (body?.text || '').toString().trim();
    if (!text) return NextResponse.json({ ok: false, code: 'EMPTY' }, { status: 400 });

    // Simple rate limit: 1 comment per 15 seconds per user
    const now = Date.now();
    const last = lastByUser.get(session.userId) || 0;
    if (now - last < 15_000) return NextResponse.json({ ok: false, code: 'RATE_LIMIT' }, { status: 429 });
    lastByUser.set(session.userId, now);

    const id = newId();
    await prisma.$executeRawUnsafe(
      'INSERT INTO "ChecklistComment" ("id","userId","day","text","createdAt") VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP)',
      id, session.userId, day, text
    );
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, code: 'ERROR', message: String(e?.message || e) }, { status: 500 });
  }
}
