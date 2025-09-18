import React from 'react';

export default function RouletteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="roulette-layout fixed inset-0 w-full h-full overflow-hidden flex items-center justify-center">
      {children}
    </div>
  );
}
