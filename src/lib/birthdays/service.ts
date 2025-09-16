import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { buildDefaultClaim, signBirthdayClaim, verifyBirthdayClaim } from '@/lib/birthdays/token';
import { randomBytes } from 'crypto';
import type {
  BirthdayReservation,
  BirthdayPack,
  InviteToken,
  TokenRedemption,
  CourtesyItem,
  PhotoDeliverable,
  Prisma,
} from '@prisma/client';

// Config helpers -------------------------------------------------------------
import { getBirthdayTokenTtlHours } from '@/lib/config';
const BDAY_TOKEN_TTL_HOURS = getBirthdayTokenTtlHours();

function addHours(d: Date, hours: number) {
  return new Date(d.getTime() + hours * 3600 * 1000);
}

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
  assertNonEmpty(input.celebrantName, 'celebrantName');
  assertNonEmpty(input.phone, 'phone');
  assertNonEmpty(input.documento, 'documento');
  assertNonEmpty(input.timeSlot, 'timeSlot');
  assertNonEmpty(input.packId, 'packId');
  assertPositive(input.guestsPlanned, 'guestsPlanned');

  const created = await prisma.birthdayReservation.create({
    data: {
      celebrantName: input.celebrantName.trim(),
      phone: input.phone.trim(),
      documento: input.documento.trim(),
      email: input.email || null,
      date: input.date,
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
): Promise<{ items: ReservationWithRelations[]; total: number; page: number; pageSize: number }> {
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
    where.OR = [
      { celebrantName: { contains: s } },
      { phone: { contains: s } },
      { documento: { contains: s } },
    ];
  }

  const [total, items] = await prisma.$transaction([
    prisma.birthdayReservation.count({ where }),
    prisma.birthdayReservation.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { pack: true, inviteTokens: true, courtesyItems: true, photoDeliveries: true },
    }),
  ]);

  return { items: items as ReservationWithRelations[], total, page, pageSize };
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
  const exp = addHours(nowDt, BDAY_TOKEN_TTL_HOURS);

  const result = await prisma.$transaction(async (tx) => {
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
          // cast due to possible stale prisma types at dev-time
          ...( { maxUses, usedCount: 0 } as any ),
        },
      });
      const claimPayload = buildDefaultClaim(reservationId, code);
      const signed = signBirthdayClaim(claimPayload);
      const updated = await tx.inviteToken.update({ where: { id: token.id }, data: { claim: JSON.stringify(signed) } });
      created.push(updated);
      return updated;
    }

    // detect if we already have host and guest tokens in any state
    const hasHost = existing.find(e => e.kind === 'host');
    const hasGuest = existing.find(e => e.kind === 'guest');

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
  });
  return result.tokens;
}

export async function listTokens(reservationId: string): Promise<InviteToken[]> {
  return prisma.inviteToken.findMany({ where: { reservationId }, orderBy: { code: 'asc' } });
}

export async function redeemToken(code: string, context: RedeemContext = {}, byUserId?: string): Promise<{ token: InviteToken; redemption: TokenRedemption }>{
  const result = await prisma.$transaction(async (tx) => {
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
