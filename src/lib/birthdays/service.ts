import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { audit } from '@/lib/audit';
import { signBirthdayClaim, verifyBirthdayClaim } from '@/lib/birthdays/token';
import { randomBytes } from 'crypto';
import { DateTime } from 'luxon';
import { Prisma, type BirthdayReservation, type BirthdayPack, type InviteToken, type TokenRedemption, type CourtesyItem, type PhotoDeliverable } from '@prisma/client';

// Ejecutar prueba de zona horaria al cargar el módulo
testLimaTimezone();

function now() {
  return new Date();
}

function nowLima(): DateTime {
  return DateTime.now().setZone('America/Lima');
}

function toIso(d: Date) {
  return d.toISOString();
}

// Helper functions para zona horaria Lima usando Luxon
function getLimaDate(date: Date): DateTime {
  // Para fechas de reserva, asumimos que representan fechas en zona Lima
  // Si viene como 2025-10-22T00:00:00.000Z, lo tratamos como 2025-10-22 en Lima
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1; // getUTCMonth() es 0-based
  const day = date.getUTCDate();

  // Crear Date que representa medianoche del día en zona UTC
  const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

  // Crear DateTime en zona Lima desde la fecha UTC
  return DateTime.fromJSDate(utcDate).setZone('America/Lima');
}

// Crear DateTime en zona Lima desde componentes de fecha
function createLimaDateTime(year: number, month: number, day: number): DateTime {
  // Crear Date que representa medianoche del día en zona Lima (UTC-5)
  // Para que sea medianoche en Lima, necesitamos 05:00:00 UTC
  const utcDate = new Date(Date.UTC(year, month - 1, day, 5, 0, 0, 0));
  return DateTime.fromJSDate(utcDate).setZone('America/Lima');
}

// Convertir string YYYY-MM-DD a DateTime en zona Lima (medianoche Lima)
export function parseDateStringToLima(dateStr: string): DateTime {
  const [year, month, day] = dateStr.split('-').map(Number);
  return createLimaDateTime(year, month, day);
}

// Convertir DateTime Lima a Date (preservando la hora exacta)
export function limaDateTimeToJSDate(limaDateTime: DateTime): Date {
  return limaDateTime.toJSDate();
}

// Función de prueba para verificar zona horaria
function testLimaTimezone() {
  console.log('[TEST] Probando funciones de zona horaria Lima');

  // Test 1: Crear fecha para hoy en Lima
  const todayLima = parseDateStringToLima('2025-10-22');
  console.log('[TEST] Fecha parseada 2025-10-22:', todayLima.toISO());

  // Test 2: Convertir a JS Date
  const jsDate = limaDateTimeToJSDate(todayLima);
  console.log('[TEST] Convertida a JS Date:', jsDate.toISOString());

  // Test 3: Verificar conversión de vuelta
  const backToLima = getLimaDate(jsDate);
  console.log('[TEST] De vuelta a Lima:', backToLima.toISO());

  // Test 4: Partes de fecha
  const parts = getLimaDateParts(jsDate);
  console.log('[TEST] Partes de fecha:', parts);
}

function getLimaDateParts(date: Date) {
  const limaDate = getLimaDate(date) as any;
  return {
    y: limaDate.year,
    m: limaDate.month, // Luxon months are 1-based, keep as is for logging
    d: limaDate.day
  };
}

function isReservationDatePast(reservationDate: Date) {
  const nowLima = getLimaDate(new Date()) as DateTime;
  // Interpretar reservationDate como fecha en zona Lima
  const reservationLima = getLimaDate(reservationDate) as DateTime;

  // Comparar solo fecha (ignorar hora)
  // Permitir reservas para hoy mismo, solo rechazar fechas estrictamente pasadas
  const nowDate = nowLima.startOf('day');
  const reservationDateOnly = reservationLima.startOf('day');

  return reservationDateOnly < nowDate;
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
  referrerId?: string;
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
  console.log('[BIRTHDAYS] createReservation: Iniciando creación', {
    celebrantName: input.celebrantName,
    documento: input.documento,
    date: input.date,
    packId: input.packId,
    referrerId: input.referrerId
  });

  // Validación de fecha: máximo 30 días en el futuro (hora Lima)
  // PERMITIR reservas para hoy mismo
  let reservaDateObj: Date;
  const reservaDateRaw = (input.date as any)?.toString?.() ?? input.date;
  if (typeof reservaDateRaw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(reservaDateRaw)) {
    // Crear fecha directamente en zona Lima usando Luxon
    // La fecha string representa un día calendario en zona Lima
    reservaDateObj = limaDateTimeToJSDate(parseDateStringToLima(reservaDateRaw));
  } else {
    reservaDateObj = new Date(input.date);
  }

  // Validar que no sea más de 30 días en el futuro (en zona Lima)
  const nowLima = getLimaDate(new Date()) as DateTime;
  const maxFuture = nowLima.plus({ days: 30 });
  const reservationLima = getLimaDate(reservaDateObj) as DateTime;

  if (reservationLima > maxFuture) {
    console.error('[BIRTHDAYS] createReservation: Fecha demasiado lejana', {
      reservationLima: reservationLima.toISO(),
      maxFuture: maxFuture.toISO()
    });
    throw new Error('DATE_TOO_FAR');
  }

  // NO validar fechas pasadas - permitir reservas para hoy

  // Validación de formato DNI y WhatsApp
  if (!/^\d{8}$/.test(input.documento)) {
    console.error('[BIRTHDAYS] createReservation: DNI inválido', { documento: input.documento });
    throw new Error('INVALID_DNI');
  }
  if (!/^\d{9}$/.test(input.phone)) {
    console.error('[BIRTHDAYS] createReservation: WhatsApp inválido', { phone: input.phone });
    throw new Error('INVALID_WHATSAPP');
  }

  console.log('[BIRTHDAYS] createReservation: Validaciones básicas OK');

  // Rate limiting por sesión de usuario (TEMPORALMENTE DESACTIVADO)
  /*
  if (input.createdBy) {
    console.log('[BIRTHDAYS] createReservation: Verificando rate limit por sesión', { createdBy: input.createdBy });
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const count = await prisma.birthdayReservation.count({
      where: {
        createdBy: input.createdBy,
        createdAt: { gte: oneHourAgo }
      }
    });
    if (count >= 3) {
      console.error('[BIRTHDAYS] createReservation: Rate limit excedido por sesión', { createdBy: input.createdBy, count });
      throw new Error('RATE_LIMITED');
    }
    console.log('[BIRTHDAYS] createReservation: Rate limit OK', { createdBy: input.createdBy, count });
  }
  */

  // Validar nombre: al menos 2 palabras (nombre y apellido)
  const nameWords = input.celebrantName.trim().split(/\s+/).filter(word => word.length > 0);
  if (nameWords.length < 2) {
    console.error('[BIRTHDAYS] createReservation: Nombre debe tener al menos 2 palabras', {
      celebrantName: input.celebrantName,
      wordCount: nameWords.length
    });
    throw new Error('INVALID_NAME_MIN_WORDS');
  }

  // Evitar reservas duplicadas por DNI en el mismo año
  let year = 0;
  if (typeof reservaDateRaw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(reservaDateRaw)) {
    year = Number(reservaDateRaw.slice(0,4));
  } else {
    year = reservaDateObj.getFullYear();
  }

  console.log('[BIRTHDAYS] createReservation: Verificando duplicados y creando reserva en transacción');

  // Usar transacción para evitar race conditions en duplicados y creación
  const created = await prisma.$transaction(async (tx) => {
    // Si la fecha es string (YYYY-MM-DD), convertir a Date en Lima (UTC-5)
    let dateObj: Date;
    const dateStr = (input.date as any)?.toString?.() ?? input.date;
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      // Crear fecha directamente en zona Lima: YYYY-MM-DD se interpreta como medianoche en Lima
      dateObj = limaDateTimeToJSDate(parseDateStringToLima(dateStr));
    } else {
      dateObj = new Date(input.date);
    }

    console.log('[BIRTHDAYS] createReservation: Fecha procesada dentro de transacción', { dateObj });

    // Verificar duplicados dentro de la transacción
    const existing = await tx.birthdayReservation.findFirst({
      where: {
        documento: input.documento,
        date: {
          gte: new Date(`${dateObj.getFullYear()}-01-01T00:00:00.000Z`),
          lte: new Date(`${dateObj.getFullYear()}-12-31T23:59:59.999Z`)
        }
      }
    });

    if (existing) {
      console.error('[BIRTHDAYS] createReservation: Reserva duplicada encontrada en transacción', {
        documento: input.documento,
        year: dateObj.getFullYear(),
        existingId: existing.id,
        existingDate: existing.date
      });
      throw new Error('DUPLICATE_DNI_YEAR');
    }

    console.log('[BIRTHDAYS] createReservation: No hay duplicados, creando reserva');

    // Validar referrerId dentro de la transacción si se proporciona
    if (input.referrerId) {
      console.log('[BIRTHDAYS] createReservation: Validando referrer en transacción', { referrerId: input.referrerId });
      const referrer = await tx.birthdayReferrer.findUnique({
        where: { id: input.referrerId },
        select: { id: true, active: true },
      });
      if (!referrer || !referrer.active) {
        console.error('[BIRTHDAYS] createReservation: Referrer inválido en transacción', { referrerId: input.referrerId, referrer });
        throw new Error('INVALID_REFERRER');
      }
    }

    // Crear la reserva dentro de la transacción
    const reservation = await tx.birthdayReservation.create({
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
        referrerId: input.referrerId || null,
      },
      include: { pack: true, inviteTokens: true, courtesyItems: true, photoDeliveries: true },
    });

    console.log('[BIRTHDAYS] createReservation: Reserva creada en transacción', { id: reservation.id });
    return reservation;
  });

  console.log('[BIRTHDAYS] createReservation: Transacción completada exitosamente');

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
  console.log('[BIRTHDAYS] generateInviteTokens: Iniciando generación', {
    reservationId,
    force: opts?.force,
    byUserId
  });

  const reservation = await prisma.birthdayReservation.findUnique({
    where: { id: reservationId },
    include: { pack: true },
  });
  if (!reservation) {
    console.error('[BIRTHDAYS] generateInviteTokens: Reserva no encontrada', { reservationId });
    throw new Error('RESERVATION_NOT_FOUND');
  }

  console.log('[BIRTHDAYS] generateInviteTokens: Reserva encontrada', {
    id: reservation.id,
    tokensGeneratedAt: reservation.tokensGeneratedAt,
    packQrCount: reservation.pack?.qrCount
  });

  // If already generated and not forcing, return existing tokens idempotently
  if (!opts?.force && reservation.tokensGeneratedAt) {
    console.log('[BIRTHDAYS] generateInviteTokens: Tokens ya generados, retornando existentes');
    const existingTokens = await prisma.inviteToken.findMany({ where: { reservationId }, orderBy: { code: 'asc' } });
    return existingTokens;
  }

  const target = reservation.pack?.qrCount ?? 0;
  const expectedUpdatedAt = opts?.expectedUpdatedAt
    ? (opts.expectedUpdatedAt instanceof Date ? opts.expectedUpdatedAt : new Date(opts.expectedUpdatedAt))
    : undefined;

  const nowDt = now();
  console.log('[BIRTHDAYS] generateInviteTokens: Validando fecha de reserva', {
    reservationDate: reservation.date,
    now: nowDt,
    target
  });

  // Calcular fecha de expiración usando Luxon
  // Los tokens expiran a las 23:59 (Lima) del día siguiente a la reserva
  // Interpretar reservation.date como fecha en zona Lima
  const reservationLima = getLimaDate(reservation.date) as DateTime;
  const expirationLima = reservationLima.plus({ days: 1 }).set({ hour: 23, minute: 59, second: 59 });
  const exp = limaDateTimeToJSDate(expirationLima);

  // Validar que la fecha de reserva no sea pasada (comparando solo fechas en zona Lima)
  if (isReservationDatePast(reservation.date)) {
    const reservationParts = getLimaDateParts(reservation.date);
    const nowParts = getLimaDateParts(new Date());
    console.error('[BIRTHDAYS] generateInviteTokens: Fecha de reserva pasada', {
      reservaLima: reservationParts,
      actualLima: nowParts,
      expira: exp
    });
    throw new Error('RESERVATION_DATE_PAST');
  }

  console.log('[BIRTHDAYS] generateInviteTokens: Fechas calculadas con Luxon', {
    reservationLima: reservationLima.toISO(),
    expirationLima: expirationLima.toISO(),
    expira: exp
  });

  console.log('[BIRTHDAYS] generateInviteTokens: Fecha válida, iniciando transacción');

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

    // If forcing regeneration, delete all existing tokens first
    if (opts?.force && existing.length > 0) {
      await tx.inviteToken.deleteMany({ where: { reservationId } });
      console.log(`[BIRTHDAYS] generateInviteTokens: Deleted ${existing.length} existing tokens for force regeneration`);
    }

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

    if (!hasHost || opts?.force) await createToken('host', 1);
    if (!hasGuest || opts?.force) await createToken('guest', Math.max(1, target));    // If forcing and tokensGeneratedAt was null, set it now
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
    const nowLimaDt = nowLima();
    const expiresAtLima = DateTime.fromJSDate(token.expiresAt).setZone('America/Lima');
    if (nowLimaDt > expiresAtLima) throw new Error('TOKEN_EXPIRED');

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
