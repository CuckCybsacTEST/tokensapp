import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { generateInviteCard } from '@/lib/birthdays/generateInviteCard';
import { generateInviteTokens } from '@/lib/birthdays/service';
import { uploadFileToSupabase, safeDeleteFile, getTempFilePath, BIRTHDAY_CARDS_BUCKET } from '@/lib/supabase-server';

// Shadow type until prisma generate creates the official InviteTokenCard delegate
type InviteTokenCardRow = { id: string; inviteTokenId: string; kind: 'host' | 'guest'; filePath: string; storageProvider?: string; storageKey?: string; storageUrl?: string; createdAt: Date };

export async function ensureBirthdayCards(reservationId: string, baseUrl: string) {
  // Fetch tokens (only guest now)
  const tokens = await prisma.inviteToken.findMany({ where: { reservationId }, orderBy: { code: 'asc' } });
  if (!tokens.length) {
    // Generate tokens idempotently
    await generateInviteTokens(reservationId, { force: false });
  }
  const updatedTokens = tokens.length ? tokens : await prisma.inviteToken.findMany({ where: { reservationId }, orderBy: { code: 'asc' } });
  const guest = updatedTokens.find(t => t.kind === 'guest');
  if (!guest) {
    throw new Error('MISSING_GUEST_TOKEN');
  }

  // Check existing cards via raw query (only for guest)
  let existing: InviteTokenCardRow[] = [];
  try {
    existing = await prisma.$queryRawUnsafe<InviteTokenCardRow[]>(
      'SELECT id, "inviteTokenId", kind, "filePath", "storageProvider", "storageKey", "storageUrl", "createdAt" FROM "InviteTokenCard" WHERE "inviteTokenId" = $1',
      guest.id
    );
  } catch (e) {
    // Table may not exist yet; proceed with creation which will fail similarly until migration applied.
    existing = [];
  }
  const hasGuest = existing.some(c => c.inviteTokenId === guest.id);
  if (hasGuest) {
    return {
      already: true,
      paths: existing.reduce<Record<string,string>>((acc, c) => {
        // Prefer storageUrl if available, fallback to filePath
        const url = c.storageUrl || (c.filePath ? '/' + c.filePath.replace(/^[\\/]+/, '') : '');
        acc[c.kind] = url;
        return acc;
      }, {}),
    };
  }

  // Compose directory
  const relDir = path.posix.join('birthday-cards', reservationId);
  const absDir = path.resolve(process.cwd(), 'public', relDir);
  await fs.promises.mkdir(absDir, { recursive: true });

  // Redeem URL (single for universal token)
  const guestUrl = `${baseUrl}/b/${encodeURIComponent(guest.code)}`;
  // celebrant first name for personalization
  const reservation = await prisma.birthdayReservation.findUnique({ where: { id: reservationId } });
  const celebrantFull = reservation?.celebrantName || '';
  const celebrantFirst = celebrantFull.trim().split(/\s+/)[0] || celebrantFull;
  const reservationDateISO = reservation?.date?.toISOString();

  const createdPaths: Record<string, string> = {};

  async function create(kind: 'guest', tokenId: string, code: string, url: string) {
    // If card exists skip
    const prior = existing.find(c => c.inviteTokenId === tokenId);
    if (prior) {
      createdPaths[kind] = prior.storageUrl || (prior.filePath ? '/' + prior.filePath.replace(/^[\\/]+/, '') : '');
      return;
    }

    // Generate image (use 'guest' kind for the card, but it's universal)
    const buf = await generateInviteCard(kind, code, url, 'png', celebrantFirst, reservationDateISO);

    // Create temp file
    const tempFilePath = getTempFilePath('birthday-card', 'png');
    await fs.promises.writeFile(tempFilePath, buf as unknown as Uint8Array);

    // Upload to Supabase
    const storageKey = `${reservationId}/${kind}.png`;
    const { url: storageUrl, storageKey: finalStorageKey } = await uploadFileToSupabase(
      tempFilePath,
      storageKey,
      BIRTHDAY_CARDS_BUCKET
    );

    // Save to database
    try {
      await prisma.$executeRawUnsafe(
        'INSERT INTO "InviteTokenCard" (id, "inviteTokenId", kind, "filePath", "storageProvider", "storageKey", "storageUrl", "createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7, NOW()) ON CONFLICT ("inviteTokenId") DO NOTHING',
        crypto.randomUUID(), tokenId, kind, `${reservationId}/${kind}.png`, 'supabase', finalStorageKey, storageUrl
      );
    } catch (e) {
      // ignore until migration is applied
      console.warn('Failed to save birthday card to database:', e);
    }

    createdPaths[kind] = storageUrl;
  }

  if (!hasGuest) await create('guest', guest.id, guest.code, guestUrl);

  return { already: false, paths: createdPaths };
}

export async function getBirthdayCards(reservationId: string) {
  const tokens = await prisma.inviteToken.findMany({ where: { reservationId } });
  if (!tokens.length) return { paths: {}, tokens: [] };
  let cards: InviteTokenCardRow[] = [];
  try {
    cards = await prisma.$queryRawUnsafe<InviteTokenCardRow[]>(
      `SELECT id, "inviteTokenId", kind, "filePath", "storageProvider", "storageKey", "storageUrl", "createdAt" FROM "InviteTokenCard" WHERE "inviteTokenId" IN (${tokens.map((_, i) => '$' + (i + 1)).join(',')})`,
      ...tokens.map(t => t.id)
    );
  } catch (e) {
    cards = [];
  }
  const paths: Record<string,string> = {};
  for (const c of cards) {
    // Prefer storageUrl if available, fallback to filePath
    paths[c.kind] = c.storageUrl || (c.filePath ? '/' + c.filePath.replace(/^[\\/]+/, '') : '');
  }
  return { paths, tokens };
}
