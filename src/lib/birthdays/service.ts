import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { audit } from '@/lib/audit';
import { signBirthdayClaim, verifyBirthdayClaim } from '@/lib/birthdays/token';
import { randomBytes } from 'crypto';
import { Prisma, type BirthdayReservation, type BirthdayPack, type InviteToken, type TokenRedemption, type CourtesyItem, type PhotoDeliverable } from '@prisma/client';

function now() {
  return new Date();
}

function toIso(d: Date) {
  return d.toISOString();
}

function generateCode(len = 10) {
  // base64url without padding, slice to len
  return randomBytes(16).toString('base64').replace(/[+/=]/g, '').slice(0, len);
}

// Input/Output Types ---------------------------------------------------------
export type CreateReservationInput = {
  celebrantName: string;
  phone: string;
  documento: string;
  email?: string | null;
  date: Date;
  timeSlot: string;
  packId: string;
  guestsPlanned: number;
  createdBy?: string;
};

export type ListReservationFilters = {
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string; // match celebrantName | phone | documento
  packId?: string;
};

export type Pagination = { page?: number; pageSize?: number };

export type ReservationWithRelations = BirthdayReservation & {
  pack: BirthdayPack;
  inviteTokens: InviteToken[];
  courtesyItems: CourtesyItem[];
  photoDeliveries: PhotoDeliverable[];
};

export type RedeemContext = { by?: string; device?: string; location?: string };

// Validators -----------------------------------------------------------------
function assertNonEmpty(v: string, name: string) {
  if (!v || !v.trim()) throw new Error(`INVALID_${name.toUpperCase()}`);
}

function assertPositive(n: number, name: string) {
  if (!Number.isFinite(n) || n <= 0) throw new Error(`INVALID_${name.toUpperCase()}`);
}

// Services -------------------------------------------------------------------
export async function createReservation(input: CreateReservationInput): Promise<ReservationWithRelations> {
  // Validación de fecha: máximo 30 días en el futuro (hora Lima)
  let reservaDateObj: Date;
  const reservaDateRaw = (input.date as any)?.toString?.() ?? input.date;
  if (typeof reservaDateRaw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(reservaDateRaw)) {
    reservaDateObj = new Date(`${reservaDateRaw}T00:00:00-05:00`);
  } else {
    reservaDateObj = new Date(input.date);
  }
  const nowLima = new Date(Date.now() + 5 * 60 * 60 * 1000);
  const maxFuture = new Date(nowLima.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (reservaDateObj.getTime() > maxFuture.getTime()) {
    throw new Error('DATE_TOO_FAR');
  }
  // Validación de formato DNI y WhatsApp
  if (!/^\d{8}$/.test(input.documento)) {
    throw new Error('INVALID_DNI');
  }
  if (!/^\d{9}$/.test(input.phone)) {
    throw new Error('INVALID_WHATSAPP');
  }

  // Evitar reservas duplicadas por DNI en el mismo año
  let year = 0;
  if (typeof reservaDateRaw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(reservaDateRaw)) {
    year = Number(reservaDateRaw.slice(0,4));
  } else {
    year = reservaDateObj.getFullYear();
  }
  const existing = await prisma.birthdayReservation.findFirst({
    where: {
      documento: input.documento,
      date: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lte: new Date(`${year}-12-31T23:59:59.999Z`)
      }
    }
  });
  if (existing) {
    throw new Error('DUPLICATE_DNI_YEAR');
  }

  // Rate limiting por IP (máx 3 reservas por IP en 1 hora)
  if (input.createdBy) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const count = await prisma.birthdayReservation.count({
      where: {
        createdBy: input.createdBy,
        createdAt: { gte: oneHourAgo }
      }
    });
    if (count >= 3) {
      throw new Error('RATE_LIMITED');
    }
  }
  assertNonEmpty(input.celebrantName, 'celebrantName');
  assertNonEmpty(input.phone, 'phone');
  assertNonEmpty(input.documento, 'documento');
  assertNonEmpty(input.timeSlot, 'timeSlot');
  assertNonEmpty(input.packId, 'packId');
  assertPositive(input.guestsPlanned, 'guestsPlanned');

  // Si la fecha es string (YYYY-MM-DD), convertir a Date en Lima (UTC-5)
  let dateObj: Date;
  const dateStr = (input.date as any)?.toString?.() ?? input.date;
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    // Crear Date en Lima (UTC-5) usando string con offset
    dateObj = new Date(`${dateStr}T00:00:00-05:00`);
  } else {
    dateObj = new Date(input.date);
  }
  const created = await prisma.birthdayReservation.create({
    data: {
      celebrantName: input.celebrantName.trim(),
      phone: input.phone.trim(),
      documento: input.documento.trim(),
      email: input.email || null,
      date: dateObj,
      timeSlot: input.timeSlot.trim(),
      packId: input.packId,
      guestsPlanned: input.guestsPlanned,
      status: 'pending_review',
      createdBy: input.createdBy || null,
    },
    include: { pack: true, inviteTokens: true, courtesyItems: true, photoDeliveries: true },
  });

  await audit('birthday.createReservation', input.createdBy, { id: created.id, date: toIso(created.date) });
  return created as ReservationWithRelations;
}

export async function listReservations(
  filters: ListReservationFilters = {},
  pagination: Pagination = {}
): Promise<{ items: (ReservationWithRelations & { cardsReady?: boolean })[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, Math.floor(pagination.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(pagination.pageSize ?? 20)));

  const where: Prisma.BirthdayReservationWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.packId) where.packId = filters.packId;
  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) (where.date as any).gte = filters.dateFrom;
    if (filters.dateTo) (where.date as any).lte = filters.dateTo;
  }
  if (filters.search && filters.search.trim()) {
    const s = filters.search.trim();
    // Búsqueda case-insensitive en campos clave
    where.OR = [
      { celebrantName: { contains: s, mode: 'insensitive' } },
      { phone: { contains: s, mode: 'insensitive' } },
      { documento: { contains: s, mode: 'insensitive' } },
    ];
  }

  // Estrategia: traer coincidencias completas y ordenar en memoria aplicando prioridad de estado.
  // Priorizamos: approved/completed primero (peso 0), luego el resto (peso 1), dentro del mismo peso orden por createdAt DESC.
  // Se usa createdAt (fecha de creación) en lugar de date (fecha de celebración) para el orden principal solicitado.
  const rawItems = await prisma.birthdayReservation.findMany({
    where,
    include: { pack: true, inviteTokens: true, courtesyItems: true, photoDeliveries: true },
  });
  rawItems.sort((a, b) => {
    const weight = (s: string) => (s === 'approved' || s === 'completed' ? 0 : 1);
    const wa = weight(a.status);
    const wb = weight(b.status);
    if (wa !== wb) return wa - wb;
    // createdAt más reciente primero
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  const total = rawItems.length;
  const start = (page - 1) * pageSize;
  const items = rawItems.slice(start, start + pageSize);

  // Obtener ids para buscar existencia de tarjetas (InviteTokenCard) sin romper si aún no existe la tabla
  const ids = items.map(i => i.id);
  let cardsByReservation: Record<string, boolean> = {};
  if (ids.length) {
    try {
      // Buscar tokens y luego si hay registros de cards para esos tokens
      const tokens = await prisma.inviteToken.findMany({ where: { reservationId: { in: ids } }, select: { id: true, reservationId: true } });
      if (tokens.length) {
        const tokenIds = tokens.map(t => t.id);
        try {
          const cards = await prisma.$queryRawUnsafe<{ inviteTokenId: string }[]>(
            `SELECT "inviteTokenId" FROM "InviteTokenCard" WHERE "inviteTokenId" IN (${tokenIds.map((_,i)=>'$'+(i+1)).join(',')})`,
            ...tokenIds
          );
          const tokenIdSet = new Set(cards.map(c => c.inviteTokenId));
          for (const t of tokens) {
            if (tokenIdSet.has(t.id)) cardsByReservation[t.reservationId] = true;
          }
        } catch {}
      }
    } catch {}
  }

  // Post-order to push approved/completed first maintaining internal date ordering.
  // Además: fallback a filesystem si aún no existe la tabla o no se pudo insertar registro.
  const decorated = (items as ReservationWithRelations[]).map(r => Object.assign(r, { cardsReady: !!cardsByReservation[r.id] }));

  // Filesystem fallback (solo para los que aún no marcan cardsReady)
  const toCheckFs = decorated.filter(r => !r.cardsReady);
  if (toCheckFs.length) {
    await Promise.all(toCheckFs.map(async r => {
      try {
        // Si la reserva está aprobada, intenta generar las tarjetas automáticamente
        if (r.status === 'approved') {
          const baseUrl = process.env.PUBLIC_BASE_URL || '';
          try { await (await import('./cards')).ensureBirthdayCards(r.id, baseUrl); } catch {}
        }
        const relDir = path.resolve(process.cwd(), 'public', 'birthday-cards', r.id);
        const host = path.join(relDir, 'host.png');
        const guest = path.join(relDir, 'guest.png');
        const hostOk = await fs.promises.access(host).then(()=>true).catch(()=>false);
        const guestOk = await fs.promises.access(guest).then(()=>true).catch(()=>false);
        if (hostOk || guestOk) (r as any).cardsReady = true;
      } catch {}
    }));
  }
  decorated.sort((a,b)=>{
    const aPri = (a.status === 'approved' || a.status === 'completed') ? 0 : 1;
    const bPri = (b.status === 'approved' || b.status === 'completed') ? 0 : 1;
    if (aPri !== bPri) return aPri - bPri;
    const aDt = a.date.getTime();
    const bDt = b.date.getTime();
    if (aDt !== bDt) return bDt - aDt;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return { items: decorated, total, page, pageSize };
}

export async function getReservation(id: string): Promise<ReservationWithRelations | null> {
  const r = await prisma.birthdayReservation.findUnique({
    where: { id },
    include: { pack: true, inviteTokens: true, courtesyItems: true, photoDeliveries: true },
  });
  return (r as ReservationWithRelations) || null;
}

export async function approveReservation(id: string, byUserId?: string): Promise<BirthdayReservation> {
  const r = await prisma.birthdayReservation.update({ where: { id }, data: { status: 'approved' } });
  await audit('birthday.approveReservation', byUserId, { id });
  return r;
}

export async function cancelReservation(id: string, reason?: string, byUserId?: string): Promise<BirthdayReservation> {
  const r = await prisma.birthdayReservation.update({ where: { id }, data: { status: 'canceled' } });
  await audit('birthday.cancelReservation', byUserId, { id, reason });
  return r;
}

export async function completeReservation(id: string, byUserId?: string): Promise<BirthdayReservation> {
  const r = await prisma.birthdayReservation.update({ where: { id }, data: { status: 'completed' } });
  await audit('birthday.completeReservation', byUserId, { id });
  return r;
}

export async function generateInviteTokens(
  reservationId: string,
  opts?: { force?: boolean; expectedUpdatedAt?: Date | string },
  byUserId?: string
): Promise<InviteToken[]> {
  const reservation = await prisma.birthdayReservation.findUnique({
    where: { id: reservationId },
    include: { pack: true },
  });
  if (!reservation) throw new Error('RESERVATION_NOT_FOUND');

  // If already generated and not forcing, return existing tokens idempotently
  if (!opts?.force && reservation.tokensGeneratedAt) {
    const existingTokens = await prisma.inviteToken.findMany({ where: { reservationId }, orderBy: { code: 'asc' } });
    return existingTokens;
  }

  const target = reservation.pack?.qrCount ?? 0;
  const expectedUpdatedAt = opts?.expectedUpdatedAt
    ? (opts.expectedUpdatedAt instanceof Date ? opts.expectedUpdatedAt : new Date(opts.expectedUpdatedAt))
    : undefined;

  const nowDt = now();
  // --- Cálculo manual zona Lima (UTC-5, sin DST efectivo) ---
  // Convertimos la fecha de la reserva (asumida en UTC) a "día Lima" restando 5 horas.
  function toLimaDateParts(date: Date) {
    const limaMs = date.getTime() - 5 * 3600 * 1000; // UTC-5
    const lima = new Date(limaMs);
    return { y: lima.getUTCFullYear(), m: lima.getUTCMonth(), d: lima.getUTCDate() };
  }
  const { y, m, d } = toLimaDateParts(reservation.date);
  // Expira a las 00:01 (Lima) del día siguiente => 05:01 UTC del día siguiente.
  const expUtcMs = Date.UTC(y, m, d + 1, 5, 1, 0, 0); // 00:01 Lima = 05:01 UTC
  const exp = new Date(expUtcMs);
  // Hora actual en Lima (aprox) para validar que no sea pasado.
  // Permitir generación de tokens si la fecha de la reserva es igual o mayor al día actual en Lima
  const { y: cy, m: cm, d: cd } = toLimaDateParts(nowDt);
  // Si la fecha de la reserva es menor al día actual en Lima, es pasada
  // Comparar solo año, mes y día
    // Ajustar la fecha de la reserva sumando 5 horas (UTC-5)
    const reservaLima = new Date(reservation.date.getTime() + 5 * 60 * 60 * 1000);
    const yLima = reservaLima.getUTCFullYear();
    const mLima = reservaLima.getUTCMonth();
    const dLima = reservaLima.getUTCDate();
    console.error('[BIRTHDAYS] Fecha reserva (ajustada Lima):', { reservaDate: reservaLima, yLima, mLima, dLima });
    console.error('[BIRTHDAYS] Fecha actual Lima:', { now: nowDt, cy, cm, cd });
    if (yLima < cy || (yLima === cy && mLima < cm) || (yLima === cy && mLima === cm && dLima < cd)) {
      throw new Error('RESERVATION_DATE_PAST');
    }

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Attempt to claim generation by setting tokensGeneratedAt only if currently null (and optional optimistic lock on updatedAt)
    let claimed = false;
    if (!opts?.force) {
      const where: any = { id: reservationId, tokensGeneratedAt: null };
      if (expectedUpdatedAt) where.updatedAt = expectedUpdatedAt as any;
      const upd = await tx.birthdayReservation.updateMany({ where, data: { tokensGeneratedAt: nowDt } });
      claimed = upd.count > 0;
    }

    // If not claimed and not forcing, return whatever exists (idempotent)
    if (!claimed && !opts?.force) {
      const existingTokens = await tx.inviteToken.findMany({ where: { reservationId }, orderBy: { code: 'asc' } });
      return { created: 0, tokens: existingTokens };
    }

    // We now ensure exactly two tokens:
    // - host: single-use (maxUses=1), kind='host', status='active'
    // - guest: multi-use (maxUses=target), kind='guest', status='active'
    const existing = await tx.inviteToken.findMany({ where: { reservationId }, orderBy: { code: 'asc' } });

    const created: InviteToken[] = [];

    async function createToken(kind: 'host' | 'guest', maxUses: number) {
      let code = generateCode(10);
      for (let attempts = 0; attempts < 3; attempts++) {
        const dup = await tx.inviteToken.findUnique({ where: { code } });
        if (!dup) break;
        code = generateCode(10);
      }
      const baseStatus = 'active';
      const token = await tx.inviteToken.create({
        data: {
          reservationId,
          code,
          kind,
          status: baseStatus,
          expiresAt: exp,
          claim: '',
          metadata: null,
          maxUses,
          usedCount: 0,
        },
      });
      // Build claim with explicit expiration anchored to reservation date (already computed above)
      const iatSec = Math.floor(Date.now() / 1000);
      const expSec = Math.floor(exp.getTime() / 1000);
      const claimPayload = { t: 'birthday', rid: reservationId, kind, code, iat: iatSec, exp: expSec };
      const signed = signBirthdayClaim(claimPayload as any);
      const updated = await tx.inviteToken.update({ where: { id: token.id }, data: { claim: JSON.stringify(signed) } });
      created.push(updated);
      return updated;
    }

    // detect if we already have host and guest tokens in any state
  const hasHost = existing.find((e: any) => e.kind === 'host');
  const hasGuest = existing.find((e: any) => e.kind === 'guest');

    if (!hasHost) await createToken('host', 1);
    if (!hasGuest) await createToken('guest', Math.max(1, target));

    // If forcing and tokensGeneratedAt was null, set it now
    if (opts?.force && !reservation.tokensGeneratedAt) {
      await tx.birthdayReservation.update({ where: { id: reservationId }, data: { tokensGeneratedAt: nowDt } });
    }

    const all = await tx.inviteToken.findMany({ where: { reservationId }, orderBy: { code: 'asc' } });
    return { created: created.length, tokens: all };
  });

  await audit('birthday.generateInviteTokens', byUserId, {
    reservationId,
    created: result.created,
    exp: toIso(exp),
    force: Boolean(opts?.force),
    mode: 'RES_DATE_ANCHORED',
    resDate: toIso(reservation.date),
    // Se omite ahora Lima exacto (aprox implícito en cálculo manual)
  });
  return result.tokens;
}

export async function listTokens(reservationId: string): Promise<InviteToken[]> {
  return prisma.inviteToken.findMany({ where: { reservationId }, orderBy: { code: 'asc' } });
}

export async function redeemToken(code: string, context: RedeemContext = {}, byUserId?: string): Promise<{ token: InviteToken; redemption: TokenRedemption }>{
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const token = await tx.inviteToken.findUnique({ where: { code } });
    if (!token) throw new Error('TOKEN_NOT_FOUND');
    const nowDt = now();
    if (nowDt > token.expiresAt) throw new Error('TOKEN_EXPIRED');

    // Validate claim signature & expiration
    try {
      const parsed = JSON.parse(token.claim) as { payload: any; sig: string };
      const ver = verifyBirthdayClaim(parsed);
      if (!ver.ok) throw new Error(ver.code);
      if (ver.payload.rid !== token.reservationId || ver.payload.code !== token.code) throw new Error('INVALID_SIGNATURE');
    } catch (e) {
      throw new Error('INVALID_SIGNATURE');
    }

    // Multi-use logic: if maxUses is set, increment usedCount atomically until limit, then mark exhausted
    let updated;
    if ((token as any).maxUses && (token as any).maxUses > 0) {
      // Prevent overuse and status must not be exhausted
      const canUse = await tx.inviteToken.updateMany({
        where: ({ id: token.id, status: { notIn: ['exhausted'] }, usedCount: { lt: (token as any).maxUses } } as any),
        data: ({ usedCount: { increment: 1 } } as any),
      });
      if (canUse.count === 0) throw new Error('TOKEN_EXHAUSTED');
      // Fetch current to see if we reached the cap
      const curr = (await tx.inviteToken.findUnique({ where: { id: token.id } })) as any;
      if (curr && curr.maxUses && curr.usedCount >= curr.maxUses && curr.status !== 'exhausted') {
        updated = (await tx.inviteToken.update({ where: { id: token.id }, data: { status: 'exhausted' } })) as any;
      } else {
        updated = curr!;
      }
    } else {
      // Legacy single-use path
      if (token.status === 'redeemed') throw new Error('TOKEN_ALREADY_REDEEMED');
      updated = (await tx.inviteToken.update({ where: { id: token.id }, data: ({ status: 'redeemed', usedCount: 1, maxUses: 1 } as any) })) as any;
    }

    const redemption = await tx.tokenRedemption.create({
      data: {
        tokenId: token.id,
        redeemedAt: nowDt,
        by: context.by || null,
        device: context.device || null,
        location: context.location || null,
        reservationId: token.reservationId,
      },
    });
    return { token: updated, redemption };
  });

  await audit('birthday.redeemToken', byUserId, { code, tokenId: result.token.id });
  return result;
}

export async function setCourtesyStatus(
  reservationId: string,
  type: string,
  status: 'pending' | 'delivered',
  byUserId?: string
): Promise<CourtesyItem> {
  assertNonEmpty(type, 'type');
  const existing = await prisma.courtesyItem.findFirst({ where: { reservationId, type } });
  let item: CourtesyItem;
  if (existing) {
    item = await prisma.courtesyItem.update({ where: { id: existing.id }, data: { status } });
  } else {
    item = await prisma.courtesyItem.create({ data: { reservationId, type, status } });
  }
  await audit('birthday.setCourtesyStatus', byUserId, { reservationId, type, status });
  return item;
}

export type AttachPhotoPayload = { kind?: 'group' | 'set' | string; url?: string | null; status?: 'pending' | 'ready' | 'sent' };

export async function attachPhoto(
  reservationId: string,
  payload: AttachPhotoPayload,
  byUserId?: string
): Promise<PhotoDeliverable> {
  const kind = payload.kind || 'group';
  const status = payload.status || 'pending';
  const url = payload.url ?? null;
  const photo = await prisma.photoDeliverable.create({ data: { reservationId, kind, status, url } });
  await audit('birthday.attachPhoto', byUserId, { reservationId, kind, status });
  return photo;
}
