import { PrismaClient, Prisma } from '@prisma/client';
import { DateTime } from 'luxon';
import { signInvitationClaim, buildDefaultInvitationClaim } from './token';

const LIMA_TZ = 'America/Lima';

const prisma = new PrismaClient();

// ─── Random code generation ────────────────────────────────────────────
function randomCode(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 ambiguity
  let code = '';
  const arr = new Uint8Array(length);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('crypto').getRandomValues(arr);
  for (let i = 0; i < length; i++) code += chars[arr[i] % chars.length];
  return code;
}

// ─── Events ─────────────────────────────────────────────────────────────

export type CreateEventInput = {
  name: string;
  description?: string;
  date: Date;
  timeSlot: string;
  location?: string;
  maxGuests?: number;
  templateUrl?: string;
  createdBy?: string;
};

export async function createEvent(input: CreateEventInput) {
  return prisma.specialEvent.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      date: input.date,
      timeSlot: input.timeSlot,
      location: input.location ?? null,
      maxGuests: input.maxGuests ?? null,
      templateUrl: input.templateUrl ?? null,
      createdBy: input.createdBy ?? null,
      status: 'active',
    },
  });
}

export async function updateEvent(
  id: string,
  data: Partial<Pick<CreateEventInput, 'name' | 'description' | 'date' | 'timeSlot' | 'location' | 'maxGuests' | 'templateUrl'>>,
) {
  return prisma.specialEvent.update({ where: { id }, data });
}

export async function getEvent(id: string) {
  return prisma.specialEvent.findUnique({
    where: { id },
    include: {
      invitations: {
        orderBy: { createdAt: 'asc' },
        include: { card: true },
      },
    },
  });
}

export async function listEvents(
  filters?: { status?: string; search?: string; dateFilter?: string },
  pagination?: { page?: number; pageSize?: number },
) {
  const where: Prisma.SpecialEventWhereInput = {};
  if (filters?.status) where.status = filters.status;
  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { location: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  if (filters?.dateFilter && filters.dateFilter !== 'all') {
    const limaNow = DateTime.now().setZone(LIMA_TZ);
    const todayStart = limaNow.startOf('day').toJSDate();
    const tomorrowStart = limaNow.plus({ days: 1 }).startOf('day').toJSDate();
    switch (filters.dateFilter) {
      case 'upcoming':
        where.date = { gte: todayStart };
        break;
      case 'past':
        where.date = { lt: todayStart };
        break;
      case 'today':
        where.date = { gte: todayStart, lt: tomorrowStart };
        break;
    }
  }

  const page = pagination?.page ?? 1;
  const pageSize = pagination?.pageSize ?? 20;

  const [items, total] = await Promise.all([
    prisma.specialEvent.findMany({
      where,
      orderBy: { date: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { invitations: true } },
      },
    }),
    prisma.specialEvent.count({ where }),
  ]);

  // Enrich with arrival stats
  const enriched = await Promise.all(
    items.map(async (ev) => {
      const arrivedCount = await prisma.specialInvitation.count({
        where: { eventId: ev.id, arrivedAt: { not: null } },
      });
      return { ...ev, invitationCount: ev._count.invitations, arrivedCount };
    }),
  );

  return { items: enriched, total, page, pageSize };
}

export async function cancelEvent(id: string) {
  return prisma.specialEvent.update({ where: { id }, data: { status: 'cancelled' } });
}

export async function completeEvent(id: string) {
  return prisma.specialEvent.update({ where: { id }, data: { status: 'completed' } });
}

export async function activateEvent(id: string) {
  return prisma.specialEvent.update({ where: { id }, data: { status: 'active' } });
}

// ─── Guests / Invitations ───────────────────────────────────────────────

export type AddGuestInput = {
  guestName: string;
  guestPhone?: string;
  guestWhatsapp?: string;
  guestEmail?: string;
  guestDni?: string;
  guestCategory?: string;
  courtesyNote?: string;
  additionalNote?: string;
  notes?: string;
};

export async function addGuest(eventId: string, input: AddGuestInput) {
  // Duplicate name check (case-insensitive) within the same event
  const existing = await prisma.specialInvitation.findFirst({
    where: {
      eventId,
      guestName: { equals: input.guestName.trim(), mode: 'insensitive' },
    },
  });
  if (existing) {
    throw new Error(`DUPLICATE_NAME: Ya existe un invitado con el nombre "${input.guestName.trim()}" en este evento`);
  }

  return prisma.specialInvitation.create({
    data: {
      eventId,
      guestName: input.guestName.trim(),
      guestPhone: input.guestPhone ?? null,
      guestWhatsapp: input.guestWhatsapp ?? null,
      guestEmail: input.guestEmail ?? null,
      guestDni: input.guestDni ?? null,
      guestCategory: input.guestCategory ?? null,
      courtesyNote: input.courtesyNote ?? null,
      additionalNote: input.additionalNote ?? null,
      notes: input.notes ?? null,
      status: 'pending',
    },
  });
}

export async function bulkAddGuests(eventId: string, guests: AddGuestInput[]) {
  // Pre-check for duplicates within the batch itself
  const seen = new Set<string>();
  for (const g of guests) {
    const normalized = g.guestName.trim().toLowerCase();
    if (seen.has(normalized)) {
      throw new Error(`DUPLICATE_NAME: El nombre "${g.guestName.trim()}" aparece más de una vez en la lista`);
    }
    seen.add(normalized);
  }

  // Each addGuest call checks against existing DB records
  const results = [];
  for (const g of guests) {
    results.push(await addGuest(eventId, g));
  }
  return results;
}

export async function updateGuest(invitationId: string, data: Partial<AddGuestInput>) {
  return prisma.specialInvitation.update({
    where: { id: invitationId },
    data: {
      ...(data.guestName !== undefined && { guestName: data.guestName }),
      ...(data.guestPhone !== undefined && { guestPhone: data.guestPhone ?? null }),
      ...(data.guestWhatsapp !== undefined && { guestWhatsapp: data.guestWhatsapp ?? null }),
      ...(data.guestEmail !== undefined && { guestEmail: data.guestEmail ?? null }),
      ...(data.guestDni !== undefined && { guestDni: data.guestDni ?? null }),
      ...(data.guestCategory !== undefined && { guestCategory: data.guestCategory ?? null }),
      ...(data.courtesyNote !== undefined && { courtesyNote: data.courtesyNote ?? null }),
      ...(data.additionalNote !== undefined && { additionalNote: data.additionalNote ?? null }),
      ...(data.notes !== undefined && { notes: data.notes ?? null }),
    },
  });
}

export async function removeGuest(invitationId: string) {
  return prisma.specialInvitation.delete({ where: { id: invitationId } });
}

export async function listGuests(eventId: string) {
  return prisma.specialInvitation.findMany({
    where: { eventId },
    orderBy: { createdAt: 'asc' },
    include: { card: true },
  });
}

// ─── Code Generation ────────────────────────────────────────────────────

export async function generateInvitationCodes(eventId: string, opts?: { force?: boolean }) {
  const event = await prisma.specialEvent.findUnique({ where: { id: eventId } });
  if (!event) throw new Error('EVENT_NOT_FOUND');

  const invitations = await prisma.specialInvitation.findMany({
    where: { eventId },
  });

  // Compute expiration: 23:59:59 Lima time on event date
  const eventDT = DateTime.fromJSDate(event.date, { zone: 'utc' }).setZone(LIMA_TZ);
  const expiresAt = eventDT.endOf('day').toJSDate();

  const results = [];
  for (const inv of invitations) {
    // Skip invitations that already have a code (unless force)
    if (inv.code && !opts?.force) {
      results.push(inv);
      continue;
    }

    // Generate unique code with retries
    let code: string | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = randomCode(10);
      const exists = await prisma.specialInvitation.findUnique({ where: { code: candidate } });
      if (!exists) {
        code = candidate;
        break;
      }
    }
    if (!code) throw new Error('CODE_GENERATION_FAILED');

    // Sign claim
    const claimPayload = buildDefaultInvitationClaim(eventId, inv.id, code, expiresAt);
    const signed = signInvitationClaim(claimPayload);
    const claimJson = JSON.stringify(signed);

    const updated = await prisma.specialInvitation.update({
      where: { id: inv.id },
      data: {
        code,
        claim: claimJson,
        expiresAt,
        status: 'confirmed',
      },
    });
    results.push(updated);
  }

  return results;
}

// ─── Validation (staff in-door) ─────────────────────────────────────────

export async function findInvitationByCode(code: string) {
  return prisma.specialInvitation.findUnique({
    where: { code },
    include: { event: true, card: true },
  });
}

export async function markArrival(code: string, validatedBy?: string) {
  const inv = await prisma.specialInvitation.findUnique({
    where: { code },
    include: { event: true },
  });
  if (!inv) throw new Error('INVITATION_NOT_FOUND');
  if (inv.arrivedAt) throw new Error('ALREADY_ARRIVED');
  if (inv.status === 'cancelled') throw new Error('INVITATION_CANCELLED');

  return prisma.specialInvitation.update({
    where: { id: inv.id },
    data: {
      arrivedAt: new Date(),
      validatedBy: validatedBy ?? null,
      status: 'arrived',
    },
    include: { event: true },
  });
}

// ─── Stats ──────────────────────────────────────────────────────────────

export async function getEventStats(eventId: string) {
  const event = await prisma.specialEvent.findUnique({ where: { id: eventId } });
  if (!event) throw new Error('EVENT_NOT_FOUND');

  const [total, confirmed, arrived, cancelled, pending] = await Promise.all([
    prisma.specialInvitation.count({ where: { eventId } }),
    prisma.specialInvitation.count({ where: { eventId, status: 'confirmed' } }),
    prisma.specialInvitation.count({ where: { eventId, status: 'arrived' } }),
    prisma.specialInvitation.count({ where: { eventId, status: 'cancelled' } }),
    prisma.specialInvitation.count({ where: { eventId, status: 'pending' } }),
  ]);

  const withCode = await prisma.specialInvitation.count({ where: { eventId, code: { not: null } } });

  return { eventId, total, confirmed, arrived, cancelled, pending, withCode };
}

export async function getGlobalInvitationStats() {
  const [totalEvents, activeEvents, completedEvents, cancelledEvents] = await Promise.all([
    prisma.specialEvent.count(),
    prisma.specialEvent.count({ where: { status: 'active' } }),
    prisma.specialEvent.count({ where: { status: 'completed' } }),
    prisma.specialEvent.count({ where: { status: 'cancelled' } }),
  ]);

  const [totalInvitations, arrivedInvitations] = await Promise.all([
    prisma.specialInvitation.count(),
    prisma.specialInvitation.count({ where: { arrivedAt: { not: null } } }),
  ]);

  // Upcoming events (next 30 days)
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 86400000);
  const upcomingEvents = await prisma.specialEvent.findMany({
    where: { date: { gte: now, lte: in30 }, status: 'active' },
    orderBy: { date: 'asc' },
    take: 5,
    include: { _count: { select: { invitations: true } } },
  });

  return {
    totalEvents,
    activeEvents,
    completedEvents,
    cancelledEvents,
    totalInvitations,
    arrivedInvitations,
    arrivalRate: totalInvitations > 0 ? Math.round((arrivedInvitations / totalInvitations) * 100) : 0,
    upcomingEvents,
  };
}
