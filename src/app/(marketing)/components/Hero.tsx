import React from 'react';

interface HeroProps {
  title: string;
  subtitle?: string;
  ctaPrimary?: { label: string; href: string };
  ctaSecondary?: { label: string; href: string };
}

export const Hero: React.FC<HeroProps> = ({ title, subtitle, ctaPrimary, ctaSecondary }) => (
  <section className="relative overflow-hidden py-28 px-6 md:px-10">
    <div className="max-w-6xl mx-auto text-center">
      <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-br from-[#FF4D2E] via-[#FF7A3C] to-[#FFD166] text-transparent bg-clip-text drop-shadow">{title}</h1>
      {subtitle && <p className="mt-6 text-lg md:text-xl text-white/70 max-w-3xl mx-auto">{subtitle}</p>}
      <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
        {ctaPrimary && (
          <a href={ctaPrimary.href} className="px-8 py-3 rounded-full font-semibold bg-[#FF4D2E] hover:bg-[#FF632E] transition shadow-lg shadow-black/40">
            {ctaPrimary.label}
          </a>
        )}
        {ctaSecondary && (
          <a href={ctaSecondary.href} className="px-8 py-3 rounded-full font-semibold bg-white/10 hover:bg-white/20 transition backdrop-blur">
            {ctaSecondary.label}
          </a>
        )}
      </div>
    </div>
    <div className="pointer-events-none select-none absolute inset-0 -z-10 opacity-40" aria-hidden>
      <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] rounded-full bg-[#FF4D2E]/30 blur-3xl" />
      <div className="absolute top-1/3 -right-40 w-[50rem] h-[50rem] rounded-full bg-[#FF7A3C]/20 blur-3xl" />
    </div>
  </section>
);
