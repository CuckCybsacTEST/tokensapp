import React from 'react';

export const Section: React.FC<React.PropsWithChildren<{ id?: string; className?: string; containerClassName?: string }>> = ({
  id,
  className = '',
  containerClassName = '',
  children,
}) => (
  <section id={id} className={`py-20 px-6 md:px-10 ${className}`}>
    <div className={`max-w-6xl mx-auto ${containerClassName}`}>{children}</div>
  </section>
);

export const SectionTitle: React.FC<{ title: string; subtitle?: string; align?: 'center' | 'left' }>= ({ title, subtitle, align='center' }) => (
  <div className={`mb-14 ${align === 'center' ? 'text-center' : ''}`}>
    <h2 className="text-3xl md:text-4xl font-bold inline-block relative">
      {title}
      <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-24 h-[3px] bg-gradient-to-r from-[#FF4D2E] to-[#FF7A3C] rounded-full" />
    </h2>
    {subtitle && <p className="mt-6 text-white/60 max-w-2xl mx-auto">{subtitle}</p>}
  </div>
);
