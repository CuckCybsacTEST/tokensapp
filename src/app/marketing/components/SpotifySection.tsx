import React from 'react';
import { motion } from 'framer-motion';
import { brand } from '../styles/brand';
import { SectionTitle } from './ui/SectionTitle';

export function SpotifySection() {
  // Playlist específica solicitada por el usuario
  const DEFAULT_PLAYLIST = '4TAACGmKK7QuPDIa1MXp4M';
  const SPOTIFY_PROFILE_URL = process.env.NEXT_PUBLIC_SPOTIFY_PROFILE_URL ||
    `https://open.spotify.com/playlist/${DEFAULT_PLAYLIST}`;
  const SPOTIFY_EMBED_URL = process.env.NEXT_PUBLIC_SPOTIFY_EMBED_URL ||
    `https://open.spotify.com/embed/playlist/${DEFAULT_PLAYLIST}?utm_source=generator&theme=0`;

  return (
    <section id="spotify" className="py-14 md:py-20 relative overflow-hidden">
      {/* Glow background accents */}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{
        background: `radial-gradient(600px 240px at 10% 0%, ${brand.primary}12, transparent), radial-gradient(600px 240px at 90% 100%, ${brand.secondary}12, transparent)`
      }} />


      <div className="container mx-auto max-w-7xl px-4 md:px-8 relative z-10">
        <SectionTitle
          kicker="Sigue nuestras playlists"
          title="El Lounge suena donde estés"
          subtitle="Aunque no estés en la disco, el Lounge sigue sonando. Síguenos en Spotify y lleva la vibra de Sábados Estelares a cualquier momento."
        />

        <motion.div
          className="mt-8 md:mt-10 rounded-xl overflow-hidden border backdrop-blur-sm"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{
            background: 'rgba(255,255,255,0.03)',
            borderColor: 'rgba(255,255,255,0.08)',
            boxShadow: `0 16px 40px -18px ${brand.primary}66`,
          }}
        >
          <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-6">
            <div className="max-w-2xl">
              <h3 className="text-base md:text-lg font-bold">Playlist Sábados Estelares</h3>
              <p className="text-sm md:text-base opacity-80 mt-1" style={{ color: brand.text.secondary }}>
                Dale play antes de salir, o revívela al día siguiente. Síguela para no perderte las actualizaciones semanales.
              </p>
            </div>
            <div className="shrink-0">
              <a
                href={SPOTIFY_PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs md:text-sm font-semibold"
                style={{ background: brand.primary, boxShadow: `0 6px 20px -10px ${brand.primary}` }}
              >
                Seguir playlist
                <span aria-hidden>↗</span>
              </a>
            </div>
          </div>
          <div className="w-full">
            <iframe
              title="Spotify - Sábados Estelares"
              style={{ border: 0, width: '100%', height: 352 }}
              src={SPOTIFY_EMBED_URL}
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
