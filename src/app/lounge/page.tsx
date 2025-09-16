"use client";

import React from 'react';

export default function LoungePage() {
  // Simplemente redirigimos a la nueva página /fiesta
  React.useEffect(() => {
    window.location.href = '/fiesta';
  }, []);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-black text-white">
      <p className="text-lg mb-4">Redirigiendo a la nueva experiencia...</p>
      <div className="w-16 h-16 border-t-4 border-[#FF4D2E] border-solid rounded-full animate-spin"></div>
    </div>
  );
}
