import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { brand } from '../styles/brand';
import { SectionTitle } from './ui/SectionTitle';

export function SpotifySection() {
  // Playlist solicitada (fallback)
  const DEFAULT_PLAYLIST = '4TAACGmKK7QuPDIa1MXp4M';
  const SPOTIFY_PROFILE_URL = process.env.NEXT_PUBLIC_SPOTIFY_PROFILE_URL ||
    `https://open.spotify.com/playlist/${DEFAULT_PLAYLIST}`;
  const SPOTIFY_EMBED_URL = process.env.NEXT_PUBLIC_SPOTIFY_EMBED_URL ||
    `https://open.spotify.com/embed/playlist/${DEFAULT_PLAYLIST}?utm_source=generator&theme=0`;

  const [tallMobile, setTallMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const evalDims = () => {
      const h = window.innerHeight; const w = window.innerWidth;
      setTallMobile(w < 768 && h >= 780);
    };
    evalDims();
    window.addEventListener('resize', evalDims);
    return () => window.removeEventListener('resize', evalDims);
  }, []);

  return (
    <section
      id="spotify"
      className={`relative overflow-hidden flex flex-col ${tallMobile ? 'justify-center pt-12' : 'justify-start pt-10'} md:justify-center pb-16 md:pt-16 md:pb-20 transition-[justify-content,padding] duration-300`}
      style={{ minHeight: 'var(--app-vh,100vh)' }}
    >
      {/* Fondos radiales suaves */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(600px 240px at 10% 0%, ${brand.primary}12, transparent), radial-gradient(600px 240px at 90% 100%, ${brand.secondary}12, transparent)`
        }}
      />

      <div className="container mx-auto max-w-5xl px-4 md:px-8 relative z-10 w-full">
        <SectionTitle
          kicker="Sigue nuestras playlists"
            title="El Lounge suena donde estés"
            compact
            dense
            subtitle={(
              <>
                <span className="hidden md:inline">Aunque no estés en la disco, el Lounge sigue sonando. Síguenos en Spotify y lleva la vibra a cualquier momento.</span>
                <span className="inline md:hidden text-sm">Llévate el Lounge donde vayas. Síguenos en Spotify.</span>
              </>
            )}
        />

        <div className="mx-auto max-w-xl w-full flex flex-col items-center">
          <div className="mb-4 md:mb-6">
            <a
              href={SPOTIFY_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-xs md:text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                background: brand.primary,
                boxShadow: `0 6px 20px -10px ${brand.primary}`,
                color: '#fff'
              }}
            >
              Seguir playlist <span aria-hidden>↗</span>
            </a>
          </div>

          <motion.div
            className="rounded-xl overflow-hidden border backdrop-blur-sm w-full"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65 }}
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderColor: 'rgba(255,255,255,0.08)',
              boxShadow: `0 16px 40px -18px ${brand.primary}66`
            }}
          >
            <iframe
              title="Spotify - Lounge"
              style={{ border: 0, width: '100%', height: 360 }}
              src={SPOTIFY_EMBED_URL}
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
