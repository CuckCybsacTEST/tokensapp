import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { generateInviteCard } from '@/lib/birthdays/generateInviteCard';
import { generateInviteTokens } from '@/lib/birthdays/service';

// Shadow type until prisma generate creates the official InviteTokenCard delegate
type InviteTokenCardRow = { id: string; inviteTokenId: string; kind: 'host' | 'guest'; filePath: string; createdAt: Date };

export async function ensureBirthdayCards(reservationId: string, baseUrl: string) {
  // Fetch tokens (host + guest) first
  const tokens = await prisma.inviteToken.findMany({ where: { reservationId }, orderBy: { code: 'asc' } });
  if (!tokens.length) {
    // Generate tokens idempotently
    await generateInviteTokens(reservationId, { force: false });
  }
  const updatedTokens = tokens.length ? tokens : await prisma.inviteToken.findMany({ where: { reservationId }, orderBy: { code: 'asc' } });
  const host = updatedTokens.find(t => t.kind === 'host');
  const guest = updatedTokens.find(t => t.kind === 'guest');
  if (!host || !guest) {
    throw new Error('MISSING_TOKENS');
  }

  // Check existing cards via raw query (delegate may not exist yet if migration pending)
  let existing: InviteTokenCardRow[] = [];
  try {
    existing = await prisma.$queryRawUnsafe<InviteTokenCardRow[]>(
      'SELECT id, "inviteTokenId", kind, "filePath", "createdAt" FROM "InviteTokenCard" WHERE "inviteTokenId" IN ($1,$2)',
      host.id, guest.id
    );
  } catch (e) {
    // Table may not exist yet; proceed with creation which will fail similarly until migration applied.
    existing = [];
  }
  const hasHost = existing.some(c => c.inviteTokenId === host.id);
  const hasGuest = existing.some(c => c.inviteTokenId === guest.id);
  if (hasHost && hasGuest) {
    return {
      already: true,
      paths: existing.reduce<Record<string,string>>((acc, c) => { acc[c.kind] = '/' + c.filePath.replace(/^[\\/]+/, ''); return acc; }, {}),
    };
  }

  // Compose directory
  const relDir = path.posix.join('birthday-cards', reservationId);
  const absDir = path.resolve(process.cwd(), 'public', relDir);
  await fs.promises.mkdir(absDir, { recursive: true });

  // Redeem URLs
  const hostUrl = `${baseUrl}/b/${encodeURIComponent(host.code)}`;
  const guestUrl = `${baseUrl}/b/${encodeURIComponent(guest.code)}`;
  // celebrant first name for personalization
  const reservation = await prisma.birthdayReservation.findUnique({ where: { id: reservationId } });
  const celebrantFull = reservation?.celebrantName || '';
  const celebrantFirst = celebrantFull.trim().split(/\s+/)[0] || celebrantFull;
  const reservationDateISO = reservation?.date?.toISOString();

  const createdPaths: Record<string, string> = {};

  async function create(kind: 'host' | 'guest', tokenId: string, code: string, url: string) {
    // If card exists skip
    const prior = existing.find(c => c.inviteTokenId === tokenId);
    if (prior) { createdPaths[kind] = '/' + prior.filePath.replace(/^[\\/]+/, ''); return; }
    const buf = await generateInviteCard(kind, code, url, 'png', celebrantFirst, reservationDateISO);
    const relFile = path.posix.join(relDir, `${kind}.png`);
    const absFile = path.resolve(process.cwd(), 'public', relFile);
  // Cast to Uint8Array to satisfy writeFile overload differences in some TS lib configs
  await fs.promises.writeFile(absFile, buf as unknown as Uint8Array);
    try {
      await prisma.$executeRawUnsafe(
        'INSERT INTO "InviteTokenCard" (id, "inviteTokenId", kind, "filePath", "createdAt") VALUES ($1,$2,$3,$4, NOW()) ON CONFLICT ("inviteTokenId") DO NOTHING',
        crypto.randomUUID(), tokenId, kind, relFile
      );
    } catch (e) {
      // ignore until migration is applied
    }
    createdPaths[kind] = '/' + relFile.replace(/^[\\/]+/, '');
  }

  if (!hasHost) await create('host', host.id, host.code, hostUrl);
  if (!hasGuest) await create('guest', guest.id, guest.code, guestUrl);

  return { already: false, paths: createdPaths };
}

export async function getBirthdayCards(reservationId: string) {
  const tokens = await prisma.inviteToken.findMany({ where: { reservationId } });
  if (!tokens.length) return { paths: {}, tokens: [] };
  let cards: InviteTokenCardRow[] = [];
  try {
    cards = await prisma.$queryRawUnsafe<InviteTokenCardRow[]>(
      `SELECT id, "inviteTokenId", kind, "filePath", "createdAt" FROM "InviteTokenCard" WHERE "inviteTokenId" IN (${tokens.map((_, i) => '$' + (i + 1)).join(',')})`,
      ...tokens.map(t => t.id)
    );
  } catch (e) {
    cards = [];
  }
  const paths: Record<string,string> = {};
  for (const c of cards) paths[c.kind] = '/' + c.filePath.replace(/^[\\/]+/, '');
  return { paths, tokens };
}
