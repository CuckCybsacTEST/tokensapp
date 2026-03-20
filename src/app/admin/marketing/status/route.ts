import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySessionCookie, requireRole } from '@/lib/auth';
import { getSessionCookieFromRequest } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const rawCookie = getSessionCookieFromRequest(req as any);
    const session = await verifySessionCookie(rawCookie);
    const adminAuth = requireRole(session, ['ADMIN', 'STAFF']);
    if (!adminAuth.ok) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }

    const config = await prisma.systemConfig.findUnique({ where: { id: 1 } });
    if (!config) {
      // Return defaults
      return NextResponse.json({
        marketingHeroEnabled: true,
        marketingShowsEnabled: true,
        marketingBirthdayEnabled: true,
        marketingSpotifyEnabled: true,
        marketingGalleryEnabled: true,
        marketingFaqEnabled: true,
        marketingBlogEnabled: true,
        marketingMapEnabled: true,
        marketingFooterEnabled: true,
        marketingBackToTopEnabled: true,
        marketingUpDownDotsEnabled: true,
        marketingMobilePagerEnabled: true,
      });
    }

    return NextResponse.json({
      marketingHeroEnabled: config.marketingHeroEnabled,
      marketingShowsEnabled: config.marketingShowsEnabled,
      marketingBirthdayEnabled: config.marketingBirthdayEnabled,
      marketingSpotifyEnabled: config.marketingSpotifyEnabled,
      marketingGalleryEnabled: config.marketingGalleryEnabled,
      marketingFaqEnabled: config.marketingFaqEnabled,
      marketingBlogEnabled: config.marketingBlogEnabled,
      marketingMapEnabled: config.marketingMapEnabled,
      marketingFooterEnabled: config.marketingFooterEnabled,
      marketingBackToTopEnabled: config.marketingBackToTopEnabled,
      marketingUpDownDotsEnabled: config.marketingUpDownDotsEnabled,
      marketingMobilePagerEnabled: config.marketingMobilePagerEnabled,
    });
  } catch (e: any) {
    console.error('marketing/status error', e);
    return NextResponse.json({ ok: false, error: 'internal_server_error' }, { status: 500 });
  }
}