import { NextRequest } from 'next/server';
import { apiError, apiOk } from '@/lib/apiError';
import { verifyClientSecret } from '@/lib/birthdays/clientAuth';
import { generateInviteTokens, listTokens } from '@/lib/birthdays/service';
import { isBirthdaysEnabledPublic } from '@/lib/featureFlags';
import { corsHeadersFor } from '@/lib/cors';

function toSafeDto(t: any) {
  return {
    id: t.id,
    code: t.code,
    kind: t.kind,
    status: t.status,
    expiresAt: t.expiresAt instanceof Date ? t.expiresAt.toISOString() : t.expiresAt,
    usedCount: (t as any).usedCount ?? null,
    maxUses: (t as any).maxUses ?? null,
  };
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // Feature flag
  const cors = corsHeadersFor(req as unknown as Request);
  if (!isBirthdaysEnabledPublic()) return apiError('NOT_FOUND', 'Not found', undefined, 404, cors);

  try {
    const body = await req.json().catch(() => ({}));
    const clientSecret = body?.clientSecret as string | undefined;
    if (!clientSecret) return apiError('INVALID_BODY', 'clientSecret required', undefined, 400, cors);

    const ver = verifyClientSecret(clientSecret);
    if (!ver.ok) return apiError(ver.code, 'Unauthorized', undefined, ver.code === 'EXPIRED' ? 401 : 403, cors);
    if (ver.rid !== params.id) return apiError('INVALID', 'Unauthorized', undefined, 403, cors);

    // Generate idempotently (service already handles idempotencia)
    const tokens = await generateInviteTokens(params.id, { force: false }, 'PUBLIC');
    return apiOk({ ok: true, items: tokens.map(toSafeDto) }, 200, cors);
  } catch (e) {
    return apiError('TOKENS_GENERATE_ERROR', 'Failed to generate tokens', undefined, 500, cors);
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const cors = corsHeadersFor(req as unknown as Request);
  if (!isBirthdaysEnabledPublic()) return apiError('NOT_FOUND', 'Not found', undefined, 404, cors);

  try {
    const { searchParams } = new URL(req.url);
    const clientSecret = searchParams.get('clientSecret') || undefined;
  if (!clientSecret) return apiError('INVALID_QUERY', 'clientSecret required', undefined, 400, cors);

  const ver = verifyClientSecret(clientSecret);
  if (!ver.ok) return apiError(ver.code, 'Unauthorized', undefined, ver.code === 'EXPIRED' ? 401 : 403, cors);
  if (ver.rid !== params.id) return apiError('INVALID', 'Unauthorized', undefined, 403, cors);

    const tokens = await listTokens(params.id);
    // Order host first, then by code
    const ordered = [...tokens].sort((a: any, b: any) => {
      if (a.kind === b.kind) return a.code.localeCompare(b.code);
      return a.kind === 'host' ? -1 : 1;
    });
    return apiOk({ ok: true, items: ordered.map(toSafeDto) }, 200, cors);
  } catch (e) {
    return apiError('TOKENS_LIST_ERROR', 'Failed to list tokens', undefined, 500, cors);
  }
}

export async function OPTIONS(req: NextRequest) {
  const cors = corsHeadersFor(req as unknown as Request);
  return new Response(null, { status: 204, headers: cors });
}
