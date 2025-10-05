import { prisma } from '@/lib/prisma';
import { Show, ShowStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';

/**
 * Input para crear un draft. Imagen NO se maneja aquí (uso de replaceImage más adelante).
 */
export interface CreateDraftInput {
  title: string;
  slug?: string | null;
  startsAt: string | Date;
  endsAt?: string | Date | null;
  slot?: number | null;
}

export interface UpdatePartialInput {
  title?: string;
  slug?: string | null;
  startsAt?: string | Date;
  endsAt?: string | Date | null;
  slot?: number | null;
  details?: string | null;
  specialGuests?: string | null;
  notes?: string | null;
}

export interface ListAdminFilters {
  status?: ShowStatus | 'ANY';
  search?: string;
  slot?: number;
  hasImage?: boolean;
  from?: string; // ISO
  to?: string;   // ISO
  order?: 'startsAt_desc' | 'startsAt_asc' | 'createdAt_desc';
  page?: number;
  pageSize?: number;
}

// ---- Utilidades internas ----

function normalizeTitle(raw: string): string {
  return raw.trim();
}

function isValidTitle(t: string): boolean {
  const len = t.length;
  return len >= 1 && len <= 120;
}

function parseDate(input: string | Date, field: string): Date {
  if (input instanceof Date) return input;
  const d = new Date(input);
  if (isNaN(d.getTime())) throw buildError('INVALID_DATE', `Invalid date for ${field}`);
  return d;
}

function sanitizeSlugPart(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-')
    .slice(0, 140);
}

function validateProvidedSlug(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) throw buildError('INVALID_SLUG', 'Slug cannot be empty');
  // Only allow a-z 0-9 and hyphen explicitly; disallow underscores and other punctuation
  if (!/^[a-zA-Z0-9-]+$/.test(trimmed)) {
    throw buildError('INVALID_SLUG', 'Slug contains illegal characters');
  }
}

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
function validateStartsAtWindow(d: Date) {
  const now = Date.now();
  const t = d.getTime();
  if (t > now + ONE_YEAR_MS) throw buildError('START_TOO_FAR', 'startsAt more than 365d in future');
  if (t < now - ONE_YEAR_MS) throw buildError('START_TOO_OLD', 'startsAt more than 365d in past');
}

async function ensureUniqueSlug(base: string): Promise<string> {
  const baseCandidate = base || 'show';
  let slug = baseCandidate;
  let i = 2;
  while (true) {
    const existing = await prisma.show.findUnique({ where: { slug } });
    if (!existing) return slug;
    slug = `${baseCandidate}-${i}`;
    i++;
    if (i > 50) {
      // fallback improbable
      slug = `${baseCandidate}-${randomUUID().slice(0, 8)}`;
    }
  }
}

interface ServiceError extends Error { code: string; http?: number; details?: any }

function buildError(code: string, message?: string, http = 400, details?: any): ServiceError {
  const err = new Error(message || code) as ServiceError;
  err.code = code;
  err.http = http;
  err.details = details;
  return err;
}

// ---- Funciones implementadas ----

/**
 * Crea un show en estado DRAFT. Campos de imagen se inicializan con placeholders porque
 * el modelo actual define columnas NOT NULL. TODO: considerar permitir NULL en migración futura.
 */
export async function createDraft(input: CreateDraftInput, ctx?: { actorRole?: string }): Promise<Show> {
  const title = normalizeTitle(input.title || '');
  if (!isValidTitle(title)) throw buildError('INVALID_TITLE', 'Title length must be 1..120');

  const startsAt = parseDate(input.startsAt, 'startsAt');
  validateStartsAtWindow(startsAt);
  let endsAt: Date | null = null;
  if (input.endsAt) {
    endsAt = parseDate(input.endsAt, 'endsAt');
  }
  if (endsAt && endsAt <= startsAt) {
    throw buildError('INVALID_DATE_RANGE', 'endsAt must be > startsAt');
  }

  let slot: number | null = input.slot == null ? null : Number(input.slot);
  if (slot != null) {
    if (!Number.isInteger(slot) || slot < 1 || slot > 4) {
      throw buildError('INVALID_SLOT', 'slot must be between 1 and 4');
    }
  }

  if (input.slug) validateProvidedSlug(String(input.slug));
  const providedSlug = input.slug ? sanitizeSlugPart(input.slug) : sanitizeSlugPart(title);
  const baseSlug = providedSlug || 'show';
  const slug = await ensureUniqueSlug(baseSlug);

  const show = await prisma.show.create({
    data: {
      title,
      slug,
      status: 'DRAFT',
      startsAt,
      endsAt,
      slot,
      // Placeholders (ver nota en doc):
      imageOriginalPath: '',
      imageWebpPath: '',
      imageBlurData: '',
      width: 0,
      height: 0,
      bytesOriginal: 0,
      bytesOptimized: 0,
      publishedAt: null,
    },
  });
  try { (await import('@/lib/shows/audit')).logShowEvent('show.create_draft', show.id, { actorRole: ctx?.actorRole }); } catch {}
  return show;
}

/** Obtiene un show por id (o lanza NOT_FOUND) */
export async function getById(id: string): Promise<Show> {
  const show = await prisma.show.findUnique({ where: { id } });
  if (!show) throw buildError('NOT_FOUND', 'Show not found', 404);
  return show;
}

// ---- Stubs (no implementados todavía) ----

export async function listAdmin(_filters: ListAdminFilters) {
  const filters = _filters || {};
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 20));
  const where: any = {};
  if (filters.status && filters.status !== 'ANY') where.status = filters.status;
  if (filters.slot != null) where.slot = filters.slot;
  if (filters.hasImage === true) {
    where.width = { gt: 0 };
    where.height = { gt: 0 };
    where.imageWebpPath = { not: '' };
  } else if (filters.hasImage === false) {
    where.OR = [
      { width: 0 },
      { height: 0 },
      { imageWebpPath: '' },
    ];
  }
  if (filters.from || filters.to) {
    where.startsAt = {};
    if (filters.from) where.startsAt.gte = new Date(filters.from);
    if (filters.to) where.startsAt.lte = new Date(filters.to);
  }
  if (filters.search) {
    const term = filters.search.trim();
    if (term) {
      where.OR = (where.OR || []).concat([
        { title: { contains: term, mode: 'insensitive' } },
        { slug: { contains: term, mode: 'insensitive' } },
      ]);
    }
  }

  const orderBy = (() => {
    switch (filters.order) {
      case 'startsAt_asc': return { startsAt: 'asc' as const };
      case 'createdAt_desc': return { createdAt: 'desc' as const };
      case 'startsAt_desc':
      default: return { startsAt: 'desc' as const };
    }
  })();

  const [total, items] = await Promise.all([
    prisma.show.count({ where }),
    prisma.show.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
  ]);

  return { page, pageSize, total, items };
}

export async function updatePartial(_id: string, _patch: UpdatePartialInput) {
  const id = _id;
  const patch = _patch || {};
  const existing = await prisma.show.findUnique({ where: { id } });
  if (!existing) throw buildError('NOT_FOUND', 'Show not found', 404);
  if (existing.status === 'ARCHIVED') throw buildError('ARCHIVED_IMMUTABLE', 'Archived show cannot be modified', 409);

  // Determine target values merging patch
  let title = existing.title;
  if (patch.title !== undefined) {
    title = normalizeTitle(patch.title || '');
    if (!isValidTitle(title)) throw buildError('INVALID_TITLE', 'Title length must be 1..120');
  }

  // Dates
  let startsAt = existing.startsAt;
  if (patch.startsAt !== undefined) startsAt = parseDate(patch.startsAt, 'startsAt');
  if (patch.startsAt !== undefined) validateStartsAtWindow(startsAt);
  let endsAt: Date | null = existing.endsAt;
  if (patch.endsAt !== undefined) {
    endsAt = patch.endsAt === null ? null : parseDate(patch.endsAt, 'endsAt');
  }
  if (endsAt && endsAt <= startsAt) {
    throw buildError('INVALID_DATE_RANGE', 'endsAt must be > startsAt');
  }

  // Slot validation
  let slot: number | null = existing.slot;
  if (patch.slot !== undefined) {
    slot = patch.slot == null ? null : Number(patch.slot);
    if (slot != null) {
      if (!Number.isInteger(slot) || slot < 1 || slot > 4) {
        throw buildError('INVALID_SLOT', 'slot must be between 1 and 4');
      }
    }
  }

  // Slug rules
  let slug = existing.slug;
  if (patch.slug !== undefined) {
    if (patch.slug != null) validateProvidedSlug(String(patch.slug));
    if (existing.status === 'PUBLISHED' && patch.slug != null && sanitizeSlugPart(patch.slug) !== existing.slug) {
      throw buildError('SLUG_LOCKED', 'Slug cannot be changed after publish', 409);
    }
    if (existing.status === 'DRAFT') {
      // Allow change (including null => regenerate)
      let requested = patch.slug == null ? '' : sanitizeSlugPart(patch.slug);
      if (!requested) requested = sanitizeSlugPart(title) || 'show';
      if (requested !== existing.slug) {
        slug = await ensureUniqueSlug(requested);
      }
    }
  }

  // For PUBLISHED: revalidate active constraints when changing slot / dates
  if (existing.status === 'PUBLISHED') {
    const now = new Date();
    if (endsAt && endsAt < now) {
      throw buildError('INVALID_ACTIVE_WINDOW', 'Show already expired');
    }
    // Fetch other active published
    const others = await prisma.show.findMany({
      where: {
        status: 'PUBLISHED',
        id: { not: existing.id },
        OR: [ { endsAt: null }, { endsAt: { gt: now } } ],
      },
      select: { id: true, slot: true, startsAt: true, endsAt: true },
    });

    if (slot != null) {
      const conflict = others.find(o => o.slot === slot);
      if (conflict) {
        throw buildError('SLOT_CONFLICT', `Slot ${slot} already in use`, 409, { conflictShowId: conflict.id, slot });
      }
    } else {
      // Non-slot overlap check (ignore slotted shows)
      const overlap = others.some(o => {
        if (o.slot != null) return false;
        const oStart = o.startsAt as Date;
        const oEnd = o.endsAt as Date | null;
        const endsAfterStart = !oEnd || startsAt <= oEnd;
        const otherStartsBeforeEnd = !endsAt || oStart <= endsAt;
        return endsAfterStart && otherStartsBeforeEnd;
      });
      if (overlap) {
        throw buildError('DATE_RANGE_CONFLICT', 'Date range overlaps another published show without slot', 409);
      }
    }
  }

  // Build update data (never touch publishedAt here)
  const data: any = {};
  if (title !== existing.title) data.title = title;
  if (slug !== existing.slug) data.slug = slug;
  if (startsAt.getTime() !== existing.startsAt.getTime()) data.startsAt = startsAt;
  const existingEndsMs = existing.endsAt ? existing.endsAt.getTime() : null;
  const newEndsMs = endsAt ? endsAt.getTime() : null;
  if (existingEndsMs !== newEndsMs) data.endsAt = endsAt;
  if (slot !== existing.slot) data.slot = slot;
  if (patch.details !== undefined) data.details = patch.details == null ? null : String(patch.details).slice(0, 5000);
  if (patch.specialGuests !== undefined) data.specialGuests = patch.specialGuests == null ? null : String(patch.specialGuests).slice(0, 2000);
  if (patch.notes !== undefined) data.notes = patch.notes == null ? null : String(patch.notes).slice(0, 4000);

  if (Object.keys(data).length === 0) {
    return existing; // no-op
  }

  const updated = await prisma.show.update({ where: { id: existing.id }, data });
  return updated;
}

export async function replaceImage(_id: string, _file: File | Blob) {
  throw buildError('NOT_IMPLEMENTED', 'replaceImage pending');
}

export async function publish(_id: string, ctx?: { actorRole?: string }) {
  const id = _id;
  const show = await prisma.show.findUnique({ where: { id } });
  if (!show) throw buildError('NOT_FOUND', 'Show not found', 404);
  if (show.status === 'ARCHIVED') throw buildError('ARCHIVED_IMMUTABLE', 'Archived show cannot be published', 409);
  if (show.status === 'PUBLISHED') return show; // idempotente

  // Validate startsAt window again before publishing
  validateStartsAtWindow(show.startsAt);

  const hasImage = !!show.imageWebpPath && show.imageWebpPath.trim() !== '' && show.width > 0 && show.height > 0;
  if (!hasImage) throw buildError('IMAGE_REQUIRED', 'Image required before publish');

  if (show.endsAt && show.endsAt <= show.startsAt) {
    throw buildError('INVALID_DATE_RANGE', 'endsAt must be > startsAt');
  }
  const now = new Date();
  if (show.endsAt && show.endsAt < now) {
    throw buildError('INVALID_ACTIVE_WINDOW', 'Show already expired');
  }

  // Obtenemos publicados activos (excluyendo expirados)
  const activePublished = await prisma.show.findMany({
    where: {
      status: 'PUBLISHED',
      id: { not: show.id },
      OR: [ { endsAt: null }, { endsAt: { gt: now } } ],
    },
    select: { id: true, slot: true, startsAt: true, endsAt: true },
  });
  if (activePublished.length >= 4) {
    throw buildError('MAX_PUBLISHED_REACHED', 'Maximum 4 published shows reached', 409, { activeCount: activePublished.length });
  }

  if (show.slot != null) {
    const conflict = activePublished.find((s: any) => s.slot === show.slot);
    if (conflict) {
      throw buildError('SLOT_CONFLICT', `Slot ${show.slot} already in use`, 409, { conflictShowId: conflict.id, slot: show.slot });
    }
  } else {
    const sStart = show.startsAt;
    const sEnd = show.endsAt; // null => abierto
    const overlap = activePublished.some((s: any) => {
      if (s.slot != null) return false;
      const otherStart = s.startsAt as Date;
      const otherEnd = s.endsAt as Date | null;
      const endsAfterStart = !otherEnd || sStart <= otherEnd;
      const otherStartsBeforeEnd = !sEnd || otherStart <= sEnd;
      return endsAfterStart && otherStartsBeforeEnd;
    });
    if (overlap) throw buildError('DATE_RANGE_CONFLICT', 'Date range overlaps another published show without slot', 409);
  }

  // Pequeña ventana de carrera: otro publish simultáneo podría cruzar el límite.
  // Mitigación ligera: recontar justo antes del update y si excede cancelar.
  return await prisma.$transaction(async tx => {
    const recalc = await tx.show.count({
      where: { status: 'PUBLISHED', OR: [ { endsAt: null }, { endsAt: { gt: now } } ] },
    });
    if (recalc >= 4) throw buildError('MAX_PUBLISHED_REACHED', 'Maximum 4 published shows reached', 409, { activeCount: recalc });
    // Si slot existe, asegurarse nuevamente que no haya conflicto
    if (show.slot != null) {
      const slotConflict = await tx.show.findFirst({ where: { status: 'PUBLISHED', slot: show.slot } });
      if (slotConflict) throw buildError('SLOT_CONFLICT', `Slot ${show.slot} already in use`, 409, { conflictShowId: slotConflict.id, slot: show.slot });
    }
    const updated = await tx.show.update({
      where: { id: show.id },
      data: { status: 'PUBLISHED', publishedAt: show.publishedAt ?? new Date() },
    });
  try { (await import('@/lib/shows/audit')).logShowEvent('show.publish', updated.id, { actorRole: ctx?.actorRole, bytesOptimized: updated.bytesOptimized }); } catch {}
    return updated;
  });
}

export async function archive(_id: string, ctx?: { actorRole?: string }) {
  const id = _id;
  const show = await prisma.show.findUnique({ where: { id } });
  if (!show) throw buildError('NOT_FOUND', 'Show not found', 404);
  if (show.status === 'ARCHIVED') return show; // idempotente
  const updated = await prisma.show.update({
    where: { id: show.id },
    data: { status: 'ARCHIVED' }, // publishedAt se conserva tal cual
  });
  try { (await import('@/lib/shows/audit')).logShowEvent('show.archive', updated.id, { actorRole: ctx?.actorRole }); } catch {}
  return updated;
}

export async function listPublic() {
  const now = new Date();
  const graceMs = 24 * 60 * 60 * 1000; // 24h de tolerancia para que no desaparezca inmediatamente
  const endsAfter = new Date(now.getTime() - graceMs);
  // Traer publicados activos (o expirados muy recientemente?) – sólo activos (endsAt null o > now)
  const shows = await prisma.show.findMany({
    where: {
      status: 'PUBLISHED',
      // Incluir activos y los que terminaron recientemente (gracia 24h)
      OR: [ { endsAt: null }, { endsAt: { gt: endsAfter } } ],
    },
    orderBy: [
      // Primero los que tienen slot (para luego ordenar manual si necesario)
      { slot: 'asc' },
      { startsAt: 'desc' },
    ],
    take: 20, // luego filtramos a 4
  });
  // Reordenar: todos los slotted en orden 1..4 luego los no slotted por startsAt desc
  const slotted = shows.filter(s => s.slot != null).sort((a,b)=> (a.slot! - b.slot!));
  const unslotted = shows.filter(s => s.slot == null).sort((a,b)=> b.startsAt.getTime() - a.startsAt.getTime());
  const primary = [...slotted, ...unslotted].slice(0,4);

  // Si hay menos de 4 activos+gracia, completar con los más recientes expirados publicados
  let final = primary;
  if (primary.length < 4) {
    const need = 4 - primary.length;
    const expired = await prisma.show.findMany({
      where: { status: 'PUBLISHED', endsAt: { lte: now } },
      orderBy: [ { slot: 'asc' }, { endsAt: 'desc' }, { startsAt: 'desc' } ],
      take: 12,
    });
    const usedIds = new Set(primary.map(s => s.id));
    const candidates = expired.filter(s => !usedIds.has(s.id));
    final = [...primary, ...candidates.slice(0, need)];
  }

  return final.map((s, idx) => ({
    id: s.id,
    title: s.title,
    slug: s.slug,
    imageWebpPath: s.imageWebpPath,
    imageBlurData: s.imageBlurData,
    width: s.width,
    height: s.height,
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt ? s.endsAt.toISOString() : null,
    order: s.slot ?? (slotted.length + idx + 1),
    updatedAt: s.updatedAt.toISOString(),
    isExpired: !!(s.endsAt && s.endsAt.getTime() <= now.getTime()),
  }));
}
