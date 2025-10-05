"use client";
import React from 'react';
import { motion } from 'framer-motion';
import SpotifyEmbed from './SpotifyEmbed';

type Props = {
  idOrUrl?: string; // opcional: sobreescribe el ID/URL que viene del env
  showFollowButton?: boolean;
  className?: string;
};

const DEFAULT_PLAYLIST = '4TAACGmKK7QuPDIa1MXp4M';

function isSpotifyUrl(url: string): boolean {
  try { const u = new URL(url); return u.protocol === 'https:' && u.hostname === 'open.spotify.com'; } catch { return false; }
}

function extractPlaylistId(input?: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (trimmed.startsWith('http')) {
    if (!isSpotifyUrl(trimmed)) return null;
    try {
      const u = new URL(trimmed);
      const parts = u.pathname.split('/').filter(Boolean);
      const idx = parts.findIndex(p => p === 'playlist');
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    } catch {}
    return null;
  }
  if (/^[A-Za-z0-9]{10,60}$/.test(trimmed)) return trimmed;
  return null;
}

function computeSpotifyUrls(idOrUrl?: string) {
  const envIdOrUrl = idOrUrl || process.env.NEXT_PUBLIC_SPOTIFY_PLAYLIST;
  const legacyProfileUrl = process.env.NEXT_PUBLIC_SPOTIFY_PROFILE_URL;
  const legacyEmbedUrl = process.env.NEXT_PUBLIC_SPOTIFY_EMBED_URL;

  const id = extractPlaylistId(envIdOrUrl || undefined) || DEFAULT_PLAYLIST;
  const playlistUrl = `https://open.spotify.com/playlist/${id}`;
  const embedUrl = `https://open.spotify.com/embed/playlist/${id}?utm_source=generator&theme=0`;

  const finalPlaylistUrl = legacyProfileUrl && isSpotifyUrl(legacyProfileUrl) ? legacyProfileUrl : playlistUrl;
  const finalEmbedUrl = legacyEmbedUrl && isSpotifyUrl(legacyEmbedUrl) ? legacyEmbedUrl : embedUrl;
  return { playlistUrl: finalPlaylistUrl, embedUrl: finalEmbedUrl };
}

export function SpotifyPlayer({ idOrUrl, showFollowButton = true, className }: Props) {
  const { playlistUrl, embedUrl } = computeSpotifyUrls(idOrUrl);

  return (
    <div className={className ?? 'mx-auto w-[86%] sm:w-[82%] md:w-[92%] max-w-xl flex flex-col items-center pr-[26px] sm:pr-[36px] md:pr-0'}>
      <motion.div
        className="player-frame rounded-2xl overflow-hidden w-full border"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.65 }}
        style={{ background: '#0B0D10', borderColor: 'rgba(255,255,255,0.12)', boxShadow: '0 16px 40px -18px rgba(0,0,0,0.6)' }}
      >
        <SpotifyEmbed
          embedUrl={embedUrl}
          heights={{
            base: 360,
            h900: 340,
            h768: 320,
            h600: 300,
            // bump small widths so Spotify shows tracks instead of only header and avoids white fill
            h520: 280,
            h480: 260,
            h420: 240,
            h380: 232,
            h360: 224,
          }}
        />
      </motion.div>

      {showFollowButton && (
        <div className="mt-8 md:mt-10">
          <a
            href={playlistUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir playlist en Spotify (se abre en una nueva pestaña)"
            className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-xs md:text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/50"
            style={{ background: '#1DB954', boxShadow: '0 10px 24px -12px rgba(29,185,84,0.7)', color: '#ffffff' }}
          >
            Seguir en Spotify <span aria-hidden>↗</span>
          </a>
        </div>
      )}

      {/* Ajuste responsive de altura para pantallas angostas */}
      <style jsx>{`
  .player-frame { border-width: 1px; }
        /* heights handled by SpotifyEmbed */
      `}</style>
    </div>
  );
}

export default SpotifyPlayer;
