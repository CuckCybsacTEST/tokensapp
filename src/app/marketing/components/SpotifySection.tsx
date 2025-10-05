import React, { useEffect, useState } from 'react';
import { SectionTitle } from './ui/SectionTitle';
import SpotifyPlayer from './SpotifyPlayer';

export function SpotifySection() {
  const [tallMobile, setTallMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const evalDims = () => {
      const h = window.innerHeight; const w = window.innerWidth;
      setTallMobile(w < 768 && h >= 780);
    };
    evalDims();
    window.addEventListener('resize', evalDims);
    window.addEventListener('orientationchange', evalDims);
    return () => { window.removeEventListener('resize', evalDims); window.removeEventListener('orientationchange', evalDims); };
  }, []);

  return (
    <section
      className={`relative overflow-hidden flex flex-col ${tallMobile ? 'justify-center pt-12' : 'justify-start pt-10'} md:justify-center pb-16 md:pt-16 md:pb-20 transition-[justify-content,padding] duration-300`}
    >

  <div className="container mx-auto max-w-5xl px-4 md:px-8 relative z-10 w-full">
        <SectionTitle
          kicker="Sigue nuestras playlists"
            title="El Lounge suena donde estés"
            compact
            dense
        />

        <SpotifyPlayer />
      </div>
    </section>
  );
}
