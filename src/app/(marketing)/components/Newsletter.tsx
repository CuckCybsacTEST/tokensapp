"use client";
import React from 'react';

export const Newsletter: React.FC = () => (
  <form
    className="max-w-xl mx-auto mt-8 flex flex-col sm:flex-row gap-3"
    onSubmit={(e) => {
      e.preventDefault();
      // TODO: enviar al endpoint /api/newsletter
    }}
  >
    <input
      type="email"
      required
      placeholder="Tu email"
      className="flex-1 rounded-lg bg-white/10 px-4 py-3 outline-none focus:ring-2 ring-[#FF4D2E] placeholder-white/40 text-sm"
    />
    <button type="submit" className="px-6 py-3 rounded-lg font-semibold bg-[#FF4D2E] hover:bg-[#FF632E] transition">
      Suscribirme
    </button>
  </form>
);
