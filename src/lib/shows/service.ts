import { supabaseAdmin } from '@/lib/supabase';
import { ShowStatus } from '@prisma/client'; // keep for types
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
    const { data: existing, error } = await supabaseAdmin
      .from('Show')
      .select('id')
      .eq('slug', slug)
      .single();

    if (error && error.code === 'PGRST116') {
      // No existe
      return slug;
    }
    if (error) throw buildError('DATABASE_ERROR', error.message);
    if (!existing) return slug; // aunque single debería lanzar si no existe

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
export async function createDraft(input: CreateDraftInput, ctx?: { actorRole?: string }): Promise<any> {
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

  const { data: show, error } = await supabaseAdmin
    .from('Show')
    .insert({
      title,
      slug,
      status: 'DRAFT',
      startsAt: startsAt.toISOString(),
      endsAt: endsAt ? endsAt.toISOString() : null,
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
    })
    .select()
    .single();

  if (error) throw buildError('DATABASE_ERROR', error.message);
  if (!show) throw buildError('CREATE_FAILED', 'Failed to create show');
  try { (await import('@/lib/shows/audit')).logShowEvent('show.create_draft', show.id, { actorRole: ctx?.actorRole }); } catch {}
  return show;
}

export async function getById(id: string): Promise<any> {
  const { data: show, error } = await supabaseAdmin
    .from('Show')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw buildError('NOT_FOUND', 'Show not found', 404);
    throw buildError('DATABASE_ERROR', error.message);
  }
  return show;
}

// ---- Stubs (no implementados todavía) ----

export async function listAdmin(_filters: ListAdminFilters) {
  const filters = _filters || {};
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 20));

  let query = supabaseAdmin.from('Show').select('*', { count: 'exact' });

  // Filters
  if (filters.status && filters.status !== 'ANY') {
    query = query.eq('status', filters.status);
  }
  if (filters.slot != null) {
    query = query.eq('slot', filters.slot);
  }
  if (filters.hasImage === true) {
    query = query.gt('width', 0).gt('height', 0).neq('imageWebpPath', '');
  } else if (filters.hasImage === false) {
    query = query.or('width.eq.0,height.eq.0,imageWebpPath.is.null');
  }
  if (filters.from) {
    query = query.gte('startsAt', filters.from);
  }
  if (filters.to) {
    query = query.lte('startsAt', filters.to);
  }
  if (filters.search) {
    const term = filters.search.trim();
    if (term) {
      const searchTerm = `%${term}%`;
      // Simple search on title only for now
      query = query.ilike('title', searchTerm);
    }
  }

  // Order
  const orderCol = filters.order === 'createdAt_desc' ? 'createdAt' : 'startsAt';
  const ascending = filters.order === 'startsAt_asc';
  query = query.order(orderCol, { ascending });

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data: items, error, count } = await query;

  if (error) throw buildError('DATABASE_ERROR', error.message);

  return { page, pageSize, total: count || 0, items: items || [] };
}

export async function updatePartial(_id: string, _patch: UpdatePartialInput) {
  const id = _id;
  const patch = _patch || {};
  const existing = await getById(id);
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
    const { data: others, error: othersError } = await supabaseAdmin
      .from('Show')
      .select('id, slot, startsAt, endsAt')
      .eq('status', 'PUBLISHED')
      .neq('id', existing.id)
      .or(`endsAt.is.null,endsAt.gt.${now.toISOString()}`);

    if (othersError) throw buildError('DATABASE_ERROR', othersError.message);

    if (slot != null) {
      const conflict = others.find((o: any) => o.slot === slot);
      if (conflict) {
        throw buildError('SLOT_CONFLICT', `Slot ${slot} already in use`, 409, { conflictShowId: conflict.id, slot });
      }
    } else {
      // Non-slot overlap check (ignore slotted shows)
      const overlap = others.some((o: any) => {
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

  const { data: updated, error } = await supabaseAdmin
    .from('Show')
    .update(data)
    .eq('id', existing.id)
    .select()
    .single();

  if (error) throw buildError('DATABASE_ERROR', error.message);
  return updated;
}

export async function replaceImage(_id: string, _file: File | Blob) {
  throw buildError('NOT_IMPLEMENTED', 'replaceImage pending');
}

export async function publish(_id: string, ctx?: { actorRole?: string }) {
  const id = _id;
  const show = await getById(id);
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
  const { data: activePublished, error: apError } = await supabaseAdmin
    .from('Show')
    .select('id, slot, startsAt, endsAt')
    .eq('status', 'PUBLISHED')
    .neq('id', show.id)
    .or(`endsAt.is.null,endsAt.gt.${now.toISOString()}`);

  if (apError) throw buildError('DATABASE_ERROR', apError.message);
  if ((activePublished || []).length >= 4) {
    throw buildError('MAX_PUBLISHED_REACHED', 'Maximum 4 published shows reached', 409, { activeCount: (activePublished || []).length });
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
  const { count: recalc, error: countError } = await supabaseAdmin
    .from('Show')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'PUBLISHED')
    .or(`endsAt.is.null,endsAt.gt.${now.toISOString()}`);

  if (countError) throw buildError('DATABASE_ERROR', countError.message);
  if ((recalc || 0) >= 4) throw buildError('MAX_PUBLISHED_REACHED', 'Maximum 4 published shows reached', 409, { activeCount: recalc });

  // Si slot existe, asegurarse nuevamente que no haya conflicto
  if (show.slot != null) {
    const { data: slotConflict, error: slotError } = await supabaseAdmin
      .from('Show')
      .select('id')
      .eq('status', 'PUBLISHED')
      .eq('slot', show.slot)
      .single();

    if (slotError && slotError.code !== 'PGRST116') throw buildError('DATABASE_ERROR', slotError.message);
    if (slotConflict) throw buildError('SLOT_CONFLICT', `Slot ${show.slot} already in use`, 409, { conflictShowId: slotConflict.id, slot: show.slot });
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('Show')
    .update({ status: 'PUBLISHED', publishedAt: show.publishedAt ?? new Date().toISOString() })
    .eq('id', show.id)
    .select()
    .single();

  if (updateError) throw buildError('DATABASE_ERROR', updateError.message);

  try { (await import('@/lib/shows/audit')).logShowEvent('show.publish', updated.id, { actorRole: ctx?.actorRole, bytesOptimized: updated.bytesOptimized }); } catch {}
  return updated;
}

export async function archive(_id: string, ctx?: { actorRole?: string }) {
  const id = _id;
  const show = await getById(id); // already throws if not found
  if (show.status === 'ARCHIVED') return show; // idempotente
  const { data: updated, error } = await supabaseAdmin
    .from('Show')
    .update({ status: 'ARCHIVED' })
    .eq('id', show.id)
    .select()
    .single();

  if (error) throw buildError('DATABASE_ERROR', error.message);
  try { (await import('@/lib/shows/audit')).logShowEvent('show.archive', updated.id, { actorRole: ctx?.actorRole }); } catch {}
  return updated;
}

export async function listPublic() {
  const now = new Date();
  const graceMs = 24 * 60 * 60 * 1000; // 24h de tolerancia para que no desaparezca inmediatamente
  const endsAfter = new Date(now.getTime() - graceMs);
  // Traer publicados activos (o expirados muy recientemente?) – sólo activos (endsAt null o > now)
  const { data: shows, error: showsError } = await supabaseAdmin
    .from('Show')
    .select('*')
    .eq('status', 'PUBLISHED')
    .or(`endsAt.is.null,endsAt.gt.${endsAfter.toISOString()}`)
    .order('slot', { ascending: true, nullsFirst: false })
    .order('startsAt', { ascending: false })
    .limit(20);

  if (showsError) throw buildError('DATABASE_ERROR', showsError.message);
  // Reordenar: todos los slotted en orden 1..4 luego los no slotted por startsAt desc
  const slotted = shows.filter((s: any) => s.slot != null).sort((a: any, b: any) => (a.slot! - b.slot!));
  const unslotted = shows.filter((s: any) => s.slot == null).sort((a: any, b: any) => b.startsAt.getTime() - a.startsAt.getTime());
  const primary = [...slotted, ...unslotted].slice(0,4);

  // Si hay menos de 4 activos+gracia, completar con los más recientes expirados publicados
  let final = primary;
  if (primary.length < 4) {
    const need = 4 - primary.length;
    const { data: expired, error: expError } = await supabaseAdmin
      .from('Show')
      .select('*')
      .eq('status', 'PUBLISHED')
      .lte('endsAt', now.toISOString())
      .order('slot', { ascending: true, nullsFirst: false })
      .order('endsAt', { ascending: false })
      .order('startsAt', { ascending: false })
      .limit(12);

    if (expError) throw buildError('DATABASE_ERROR', expError.message);
    const usedIds = new Set(primary.map(s => s.id));
    const candidates = expired.filter((s: any) => !usedIds.has(s.id));
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

export async function cleanupExpiredShows(ctx?: { actorRole?: string }) {
  const now = new Date();
  // Archive published shows that have ended
  const { data: expiredPublished, error: epError } = await supabaseAdmin
    .from('Show')
    .select('id')
    .eq('status', 'PUBLISHED')
    .lte('endsAt', now.toISOString())
    .not('endsAt', 'is', null);

  if (epError) throw buildError('DATABASE_ERROR', epError.message);

  const idsToArchive = (expiredPublished || []).map((s: any) => s.id);
  if (idsToArchive.length > 0) {
    const { error: updateError } = await supabaseAdmin
      .from('Show')
      .update({ status: 'ARCHIVED' })
      .in('id', idsToArchive);

    if (updateError) throw buildError('DATABASE_ERROR', updateError.message);

    // Log audit
    for (const id of idsToArchive) {
      try { (await import('@/lib/shows/audit')).logShowEvent('show.auto_archive', id, { actorRole: ctx?.actorRole, reason: 'expired' }); } catch {}
    }
  }

  return { archivedCount: idsToArchive.length };
}
